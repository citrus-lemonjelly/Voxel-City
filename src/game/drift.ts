// Drift (owner, V0.18.0, ROADMAP E4.6 / E1–E7). A run has three parts (owner 2026-10-22):
//   1. DRAG  — the lights, then the car pulls away and drags up the first straight. Gears are automatic (owner, V0.18.1: "the player
//              should just be concerned about hitting the drift button and maintaining the revs").
//   2. DRIFT — 3–5 turns. The car brakes and drops gears by itself for them and follows the road (E4). Tap DRIFT at the turn-in to
//              kick the rear out, then feather the GAS to hold the revs inside the green band (E1) — its middle is Perfect. Above
//              the band the angle grows until you spin; below it the car straightens up and the drift ends.
//   3. DRAG  — the car levels out and drags to the finish, dropping into the right gear as it comes out of the turn.
// Score (E2): a drift earns angle × distance slid × the band bonus, banked × the chain
// multiplier when it reaches the end of its turn (×1.25, ×1.5 … ×3 for clean drifts in a row); esses link without stopping.
// Speed itself scores nothing (owner: points come first). Pure logic — the sim tests drive it, and the ghost rival is the AI (E7).
import { CarStats, torqueAt, wheelRpm } from './stats';
import { DriftPath, DriftTurn, pathAt } from '../data/driftCourses';
import { driftKitOf, LAUNCH } from '../data/parts';
import { SHIFT_TIME_MULT, LUG, LaunchGrade } from './race';
import { makeRng } from './ai';

export const DRIFT = {
  countdown: 3,
  /** the green rev band, as shares of the redline (drift tyres widen it); `perfect` = the middle share of it that counts as Perfect */
  // V0.18.1 (owner: "tap drift and spin out within 1 second"): wider band (0.17 → 0.26), slower revs, gentler angle, and the
  // turn-in puts the needle in the middle of the band instead of above it — holding the gas flat now spins after ~2 s, not 0.3 s
  band: { centre: 0.74, width: 0.26, perfect: 0.5 },
  /** turn-in window (m): how early before the turn you may tap, how close counts as Perfect / Good, how late (share of the turn) */
  entry: { before: 16, perfect: 4.5, good: 10, lateShare: 0.4 },
  /** revs while sliding (rpm per second up on the gas / down off it) */
  rev: { up: 2200, down: 2000 },
  /** drift angle (deg): low end of the band → min, top → max; past max + spinOver = spin; under lostBelow = straightened;
   *  `over` = how fast the angle target climbs per band-width of revs above the band */
  angle: { min: 14, max: 40, spinOver: 22, rate: 1.6, lostBelow: 5, over: 70 },
  /** speed in a drift: × the turn's grip speed, eased at `rate`; `scrub` = speed lost past the max angle */
  speed: { keep: 1.1, rate: 1.4, scrub: 0.3 },
  /** points per second = k × angle × speed (m/s) × zone bonus — that is angle × distance slid: a turn is worth the same in any car */
  pts: { k: 0.12, perfect: 1.5, band: 1, out: 0.3 },
  /** automatic gearbox (V0.18.1): up at `up` × redline, down when the revs fall under `down` × redline (never so low that the
   *  engine bogs coming out of a turn or a spin); no upshift in the last `hold` m before a turn (the car is about to brake) */
  auto: { up: 0.9, down: 0.55, hold: 25 },
  entryMult: { Perfect: 1.25, Good: 1.1, Early: 1, Late: 1 } as Record<EntryGrade, number>,
  /** chain: each clean drift in a row adds `step` to the multiplier, up to `max` steps (×3) */
  chain: { step: 0.25, max: 8 },
  spin: { slow: 0.35, time: 1.3 },
  /** the car brakes by itself to `overGrip` × the turn's grip speed at `brake` m/s² (steering assist, E4), dropping a gear
   *  whenever the revs fall under `downAt` × redline */
  brake: 7.5, overGrip: 1.12, downAt: 0.5,
};
/** drift cue timing: the three lights come on this many seconds before the turn-in (green = the Perfect window) */
export const CUE = { at: [1.5, 1.0, 0.5] };
export type EntryGrade = 'Perfect' | 'Good' | 'Early' | 'Late';
export type Zone = 'perfect' | 'band' | 'out' | '';
export const chainMult = (c: number) => 1 + Math.min(c, DRIFT.chain.max) * DRIFT.chain.step;

/** Anything that can drive a drift run: the player's keys and buttons, or the AI. */
export interface DriftControl {
  /** gas held right now? (before the launch: revs; in a drift: revs; on the straights the car pulls by itself) */
  gas(run: DriftRun): boolean;
  /** true once per tap of Drift */
  drift(run: DriftRun): boolean;
}

const G = 9.81, AIR = 1.2, DRIVELINE = 0.88;

export class DriftRun {
  t = 0; s = 0; ps = 0; v = 0; gear = 0; rpm: number; gasOn = false; wasGas = false;
  launched = false; launchGrade?: LaunchGrade; launchTimer = 0; shifting = 0; shiftDir: 1 | -1 = 1; boost = 0;
  drifting = false; turn = -1; dir: 1 | -1 = 1; angle = 0; entry: EntryGrade | null = null;
  runPts = 0; score = 0; chain = 0; bestChain = 0; spinT = 0; spins = 0; perfectEntries = 0; clean = 0;
  zone: Zone = ''; lateral = 0;
  done: boolean[];
  /** how each turn went, for the results: Clean, Linked, Short (straightened), Spin, Missed */
  outcomes: string[];
  lastEvent?: { text: string; t: number; pts?: number };
  finish?: number;
  readonly kit: ReturnType<typeof driftKitOf>;
  private mu: number;
  constructor(public path: DriftPath, public stats: CarStats, public ctl: DriftControl) {
    this.rpm = stats.idleRpm;
    this.done = path.turns.map(() => false); this.outcomes = path.turns.map(() => '');
    this.kit = driftKitOf(stats.tune);
    this.mu = Math.max(0.8, Math.min(1.35, stats.tractionN / (stats.massKg * G)));
  }
  get green() { return this.t >= DRIFT.countdown; }
  get time() { return Math.max(0, this.t - DRIFT.countdown); }
  /** which part of the run the car is in */
  get part(): 'drag' | 'turns' | 'final' {
    const T = this.path.turns; if (!T.length) return 'drag';
    return this.s < T[0].s0 - 40 ? 'drag' : this.s > T[T.length - 1].s1 + 4 ? 'final' : 'turns';
  }
  /** the rev band [low, high, perfect low, perfect high] as shares of the redline */
  band(): [number, number, number, number] {
    const w = DRIFT.band.width + this.kit.band, lo = DRIFT.band.centre - w / 2, hi = lo + w, p = w * DRIFT.band.perfect;
    return [lo, hi, DRIFT.band.centre - p / 2, DRIFT.band.centre + p / 2];
  }
  /** speed the car can hold round a turn on grip alone (m/s) */
  gripSpeed(tr: DriftTurn) { return Math.sqrt(this.mu * G * tr.r) * 0.92; }
  /** the turn containing s, or the next one ahead (index), or −1 */
  nextTurn(s = this.s) { return this.path.turns.findIndex(t => t.s1 > s); }
  get maxAngle() { return DRIFT.angle.max + this.kit.angle; }
  /** The drift cue (owner, V0.18.1: a small 3-2-1 light above the gauge): 0 = off, 1–3 = lights counting down to the next turn-in
   *  (≤ CUE.at seconds away each), 4 = green — you're in the Perfect window, tap Drift now. */
  cue(): number {
    if (!this.launched || this.drifting || this.spinT > 0 || this.finish !== undefined) return 0;
    const i = this.path.turns.findIndex((t, j) => !this.done[j] && t.s0 + DRIFT.entry.perfect >= this.s); if (i < 0) return 0;
    const d = this.path.turns[i].s0 - this.s; if (Math.abs(d) <= DRIFT.entry.perfect) return 4;
    const sec = d / Math.max(4, this.v);
    return sec <= CUE.at[2] ? 3 : sec <= CUE.at[1] ? 2 : sec <= CUE.at[0] ? 1 : 0;
  }

  private event(text: string, pts?: number) { this.lastEvent = { text, t: this.t, pts }; }
  private bank(share = 1, grow = true) {
    const pts = Math.round(this.runPts * share * (this.entry ? DRIFT.entryMult[this.entry] : 1) * chainMult(this.chain));
    this.score += pts; this.runPts = 0;
    if (grow) { this.chain = Math.min(this.chain + 1, DRIFT.chain.max); this.bestChain = Math.max(this.bestChain, this.chain); this.clean++; }
    else this.chain = 0;
    return pts;
  }
  private startDrift(i: number, grade: EntryGrade) {
    const tr = this.path.turns[i];
    this.drifting = true; this.turn = i; this.dir = tr.dir; this.done[i] = true; this.entry = grade; this.runPts = 0; this.shifting = 0;
    this.angle = DRIFT.angle.min + 4;
    this.rpm = this.stats.redline * DRIFT.band.centre;                     // the clutch kick lands the needle in the middle of the band
    if (grade === 'Perfect') this.perfectEntries++;
  }

  step(dt: number) {
    this.t += dt; this.ps = this.s;
    const st = this.stats, red = st.redline;
    const gas = this.gasOn = this.ctl.gas(this);
    this.wasGas = gas;
    if (!this.launched) {                                                  // the lights: blip the gas if you like; the car goes on green
      this.rpm = gas ? Math.min(red * 0.985, this.rpm + 5200 * dt) : Math.max(st.idleRpm, this.rpm - 7000 * dt);
      if (gas && this.rpm >= red * 0.985) this.rpm -= 450;                 // limiter bounce
      this.ctl.drift(this);
      if (this.green) { this.launched = true; this.launchGrade = 'Good'; this.launchTimer = 0; this.rpm = Math.max(this.rpm, red * st.launch.perfectMin); }
      return;
    }
    if (this.finish !== undefined) { this.v = Math.max(0, this.v - 6 * dt); this.s += this.v * dt; this.rpm = Math.max(st.idleRpm, this.rpm - 3000 * dt); this.angle *= Math.exp(-4 * dt); this.lateral *= Math.exp(-3 * dt); this.ctl.drift(this); return; }
    this.launchTimer += dt;
    const press = this.ctl.drift(this);
    if (this.spinT > 0) {                                                  // spun: sliding to a crawl, no control for a moment
      this.spinT -= dt; this.v = Math.max(3, this.v - 12 * dt); this.rpm = Math.max(st.idleRpm, this.rpm - 4000 * dt);
      this.angle = Math.max(0, this.angle - 60 * dt); this.lateral *= Math.exp(-2 * dt);
      this.s += this.v * dt; this.markMissed(); return this.checkFinish();
    }
    // ---- Drift tapped: kick into a drift if a turn is in reach ----
    if (press && !this.drifting) {
      const i = this.path.turns.findIndex((tr, j) => !this.done[j] && this.s >= tr.s0 - DRIFT.entry.before && this.s <= tr.s0 + (tr.s1 - tr.s0) * DRIFT.entry.lateShare);
      if (i < 0) this.event('No turn');
      else {
        const d = this.s - this.path.turns[i].s0, E = DRIFT.entry;
        const grade: EntryGrade = Math.abs(d) <= E.perfect ? 'Perfect' : Math.abs(d) <= E.good ? 'Good' : d < 0 ? 'Early' : 'Late';
        this.startDrift(i, grade); this.event(grade === 'Perfect' ? 'Perfect entry' : grade === 'Good' ? 'Good entry' : `${grade} entry`);
      }
    }
    if (this.drifting) this.slide(dt, gas);
    else { this.autoGear(); this.grip(dt); }
    this.s += this.v * dt;
    this.markMissed();
    this.checkFinish();
  }

  /** the automatic gearbox (not mid-drift): a quick clean upshift near the top of the revs, and down a gear whenever the revs fall
   *  too low — so the car always comes out of a turn (or a spin) in a gear that pulls */
  private autoGear() {
    const s = this.stats, n = s.trans.ratios.length, red = s.redline, A = DRIFT.auto;
    if (this.shifting > 0) return;
    if (this.gear > 0 && wheelRpm(s, this.v, this.gear) < red * A.down && wheelRpm(s, this.v, this.gear - 1) < red * A.up) { this.gear--; return; }
    const i = this.nextTurn(), soon = i >= 0 && this.s < this.path.turns[i].s0 && this.path.turns[i].s0 - this.s < A.hold;
    if (this.gear < n - 1 && !soon && this.rpm >= red * A.up) { this.shiftDir = 1; this.shifting = s.trans.shiftTime * SHIFT_TIME_MULT.Perfect; }
  }

  /** in a drift: the gas moves the revs, the revs set the angle, the angle and distance make the points */
  private slide(dt: number, gas: boolean) {
    const st = this.stats, red = st.redline, A = DRIFT.angle, tr = this.path.turns[this.turn];
    this.rpm += (gas ? DRIFT.rev.up : -DRIFT.rev.down) * this.kit.steady * dt;
    if (this.rpm >= red) this.rpm = red - 350;                             // limiter
    this.rpm = Math.max(st.idleRpm, this.rpm);
    const [lo, hi, plo, phi] = this.band(), f = this.rpm / red, u = (f - lo) / (hi - lo), max = this.maxAngle;
    const target = u < 0 ? A.min + u * 45 : u > 1 ? max + (u - 1) * A.over : A.min + u * (max - A.min);
    this.angle += (target - this.angle) * (1 - Math.exp(-A.rate * dt));
    this.zone = f >= plo && f <= phi ? 'perfect' : u >= 0 && u <= 1 ? 'band' : 'out';
    const want = this.gripSpeed(tr) * DRIFT.speed.keep * this.kit.keep * (1 - DRIFT.speed.scrub * Math.max(0, this.angle - max) / A.spinOver);
    this.v += (want - this.v) * (1 - Math.exp(-DRIFT.speed.rate * dt));
    this.runPts += DRIFT.pts.k * this.angle * this.v * DRIFT.pts[this.zone === 'perfect' ? 'perfect' : this.zone === 'band' ? 'band' : 'out'] * dt;
    this.lateral += (Math.min(1, this.angle / max) * 2.2 - this.lateral) * (1 - Math.exp(-2.5 * dt));   // slides to the outside of the turn
    if (this.angle > max + A.spinOver) {                                   // spin out
      this.runPts = 0; this.chain = 0; this.drifting = false; this.entry = null; this.zone = '';
      this.v *= DRIFT.spin.slow; this.spinT = DRIFT.spin.time; this.spins++; this.event('Spin out'); this.outcomes[this.turn] = 'Spin';
      return;
    }
    if (this.angle < A.lostBelow) {                                        // straightened up: half the points, chain gone
      this.outcomes[this.turn] = 'Short'; const pts = this.bank(0.5, false); this.end(); this.event('Straightened', pts); return;
    }
    if (this.s >= tr.s1) {
      const next = this.path.turns[this.turn + 1];
      if (tr.linked && next && !this.done[this.turn + 1]) {               // esses: flip straight into the next turn
        this.outcomes[this.turn] = 'Linked'; const pts = this.bank(); this.startDrift(this.turn + 1, 'Perfect'); this.perfectEntries--; this.event('Linked', pts);
      } else { this.outcomes[this.turn] = 'Clean'; const pts = this.bank(); this.end(); this.event('Clean', pts); }
    }
  }
  private end() { this.drifting = false; this.turn = -1; this.entry = null; this.zone = ''; }

  /** on grip: full throttle by itself (the drags), automatic gears; it brakes for the turns and drops gears as it does */
  private grip(dt: number) {
    const st = this.stats, red = st.redline, n = st.trans.ratios.length;
    if (this.shifting > 0) { this.shifting -= dt; if (this.shifting <= 0) this.gear = Math.max(0, Math.min(this.gear + this.shiftDir, n - 1)); }
    const wr = wheelRpm(st, this.v, this.gear), slip = Math.max(0, 1 - this.launchTimer / 0.9);
    // off the line the clutch slips (revs ease down from the launch revs), after a drift the revs settle back onto the gear
    const want = Math.max(wr, st.idleRpm, this.rpm * slip);
    this.rpm = this.shifting > 0 ? Math.max(wr, st.idleRpm) : this.rpm + (want - this.rpm) * (1 - Math.exp(-14 * dt));
    let drive = 0;
    if (this.shifting <= 0 && this.rpm < red) {
      let tq = torqueAt(st, this.rpm);
      if (this.gear > 0) { const f = this.rpm / red; if (f < LUG.below) tq *= Math.max(LUG.floor, 1 - LUG.slope * (LUG.below - f)); }
      if (this.boost > 0) { tq *= 1 + st.trans.perfectBoost; this.boost -= dt; }
      drive = tq * st.trans.ratios[this.gear] * st.finalDrive * DRIVELINE / st.wheelRadiusM;
      let traction = st.tractionN;
      if (this.launchGrade === 'Wheelspin' && this.launchTimer < LAUNCH.spinSeconds) traction *= LAUNCH.spinGrip;
      if (this.launchGrade === 'Bog' && this.launchTimer < 1) drive *= LAUNCH.bogPenalty;
      drive = Math.min(drive, traction);
    }
    if (this.rpm >= red) this.rpm = red;                                   // on the limiter (top gear): no more drive
    const resist = 0.5 * AIR * st.dragArea * this.v * this.v + st.rollingCoeff * st.massKg * G;
    this.v = Math.max(0, this.v + (drive - resist) / st.massKg * dt);
    // brake for the turn ahead (or hold its grip speed inside it), dropping gears on the way down
    const i = this.nextTurn();
    if (i >= 0) {
      const tr = this.path.turns[i], vg = this.gripSpeed(tr) * DRIFT.overGrip, d = Math.max(0, tr.s0 - this.s);
      const vmax = Math.sqrt(vg * vg + 2 * DRIFT.brake * d);
      if (this.v > vmax) {
        this.v = Math.max(vmax, this.v - DRIFT.brake * 1.6 * dt);
        if (this.shifting <= 0 && this.gear > 0 && wheelRpm(st, this.v, this.gear) < red * DRIFT.downAt) { this.gear--; this.rpm = wheelRpm(st, this.v, this.gear); }
      }
    }
    this.angle *= Math.exp(-6 * dt); this.lateral *= Math.exp(-3 * dt); this.zone = '';
  }
  /** a turn passed without a drift breaks the chain */
  private markMissed() {
    this.path.turns.forEach((tr, j) => { if (!this.done[j] && this.s > tr.s1) { this.done[j] = true; this.outcomes[j] = 'Missed'; if (this.chain > 0) this.event('Chain lost'); this.chain = 0; } });
  }
  private checkFinish() {
    if (this.finish === undefined && this.s >= this.path.length) {
      if (this.drifting) { this.outcomes[this.turn] = 'Clean'; const pts = this.bank(); this.end(); this.event('Clean', pts); }
      this.finish = this.time;
    }
  }
}

/** The AI driver (E7): taps Drift near each turn-in and feathers the gas round the middle of the band. Skill 1 = a sharp player;
 *  lower = later/earlier taps and a wobblier foot. */
export class DriftAI implements DriftControl {
  private rng: () => number; private err: number[] = []; private aim = 0.5; private nextT = 0; private on = false; private tapped = -1;
  constructor(public skill: number, seed = 1) { this.rng = makeRng(seed); }
  private gauss() { let u = 0; for (let i = 0; i < 6; i++) u += this.rng(); return (u - 3) / Math.sqrt(0.5); }
  gas(run: DriftRun): boolean {
    if (!run.launched) return run.rpm / run.stats.redline < 0.6;          // a blip on the lights
    if (!run.drifting) return true;
    if (run.t < this.nextT) return this.on;
    const k = 1 - this.skill;
    this.nextT = run.t + 0.03 + 0.2 * k;
    this.aim = Math.max(-0.2, Math.min(1.2, 0.5 + (this.aim - 0.5) * 0.8 + this.gauss() * 0.4 * k));
    const [lo, hi] = run.band(), u = (run.rpm / run.stats.redline - lo) / (hi - lo), hw = 0.05 + 0.4 * k;
    this.on = u < this.aim - hw ? true : u > this.aim + hw ? false : this.on;
    return this.on;
  }
  drift(run: DriftRun): boolean {
    if (!run.launched || run.drifting) return false;
    const i = run.done.findIndex(d => !d); if (i < 0 || i === this.tapped) return false;
    const tr = run.path.turns[i];
    this.err[i] ??= this.gauss() * 18 * (1 - this.skill) + (1 - this.skill) * 3;
    if (run.s >= tr.s0 + this.err[i]) { this.tapped = i; return true; }
    return false;
  }
}

/** Run a whole course with a controller (fixed 1/60 s steps); `trace` records the ghost (s, signed angle, lateral, score) every 0.05 s. */
export function simDrift(path: DriftPath, stats: CarStats, ctl: DriftControl, trace = false) {
  const run = new DriftRun(path, stats, ctl), tr: number[] = [];
  let next = 0;
  for (let i = 0; i < 60 * 240 && run.finish === undefined; i++) {
    run.step(1 / 60);
    if (trace && run.t >= next) { next += 0.05; tr.push(run.s, run.dir * run.angle, run.lateral * run.dir, run.score); }
  }
  return { score: run.score, time: run.finish ?? 999, spins: run.spins, clean: run.clean, perfect: run.perfectEntries, trace: new Float32Array(tr), run };
}

// ---------------------------------------------------------------- the ghost rival (E7)
import { carStats } from './stats';
import { CARS, CATALOG_ORDER } from '../data/cars';
import { NAMES, PAINTS } from './rivals';
import { Tier, Tune, PERF_KINDS, DRIFT_KINDS, fullTune } from '../data/parts';
import type { StageDef } from '../data/stages';
import type { Difficulty } from '../data/economy';

/** How far below YOUR perfect score the rival lands, by difficulty (share of your score). */
export const DRIFT_GAP: Record<Difficulty, [number, number]> = { easy: [0.32, 0.48], medium: [0.1, 0.22], hard: [0.03, 0.09] };
export interface DriftRival { name: string; carId: string; tune: Tune; paint: string; skill: number; seed: number; score: number; trace: Float32Array; yours: number }

/** A rival for this course: a car from your league at about your upgrade level, driven by the AI at the skill that lands its score
 *  in the difficulty's window below your perfect score. Its run is replayed as the ghost (same seed → the same run). */
export function makeDriftRival(carId: string, tune: Partial<Tune>, path: DriftPath, diff: Difficulty, stage?: StageDef, seed = (Date.now() & 0x7fffffff) || 1): DriftRival {
  const rng = makeRng(seed), pick = <T>(a: T[]) => a[Math.floor(rng() * a.length) % a.length];
  const yours = simDrift(path, carStats(carId, tune, stage), new DriftAI(1, 7)).score;
  const [g0, g1] = DRIFT_GAP[diff], target = yours * (1 - (g0 + rng() * (g1 - g0))), ceiling = yours * (1 - g0 * 0.6);
  const league = CARS[carId].league, pool = CATALOG_ORDER.filter(id => CARS[id].league === league && !CARS[id].unique);
  const t = fullTune(tune), lvl = Math.round(PERF_KINDS.reduce((a, k) => a + t[k], 0) / PERF_KINDS.length);
  const tiers = ([1, 2, 3, 4, 5] as Tier[]).filter(x => x >= lvl - 1 && x <= lvl + 1);
  let best: Omit<DriftRival, 'trace' | 'yours'> | null = null;
  for (let i = 0; i < 28; i++) {
    const c = pick(pool), rt = Object.fromEntries([...PERF_KINDS, ...DRIFT_KINDS].map(k => [k, pick(tiers)])) as unknown as Tune, s = (rng() * 0x7fffffff) | 1;
    const skill = 0.3 + rng() * 0.68, score = simDrift(path, carStats(c, rt, stage), new DriftAI(skill, s)).score;
    if (score > ceiling) continue;
    if (!best || Math.abs(score - target) < Math.abs(best.score - target)) best = { name: pick(NAMES), carId: c, tune: rt, paint: pick(PAINTS), skill, seed: s, score };
  }
  best ??= { name: pick(NAMES), carId: pool[0] ?? carId, tune: fullTune({}), paint: pick(PAINTS), skill: 0.4, seed: 3, score: 0 };
  const ghost = simDrift(path, carStats(best.carId, best.tune, stage), new DriftAI(best.skill, best.seed), true);
  return { ...best, score: ghost.score, trace: ghost.trace, yours };
}
/** The ghost's state at run time t (s): distance, signed angle, signed slide, score so far. */
export function ghostAt(tr: Float32Array, t: number) {
  const n = tr.length / 4; if (!n) return { s: 0, angle: 0, lat: 0, score: 0 };
  const f = Math.max(0, Math.min(n - 1.001, (t + DRIFT.countdown) / 0.05)), i = Math.floor(f), k = f - i, at = (j: number, o: number) => tr[Math.min(n - 1, j) * 4 + o];
  if (t + DRIFT.countdown >= (n - 1) * 0.05) return { s: at(n - 1, 0), angle: at(n - 1, 1), lat: at(n - 1, 2), score: at(n - 1, 3) };
  return { s: at(i, 0) + (at(i + 1, 0) - at(i, 0)) * k, angle: at(i, 1) + (at(i + 1, 1) - at(i, 1)) * k, lat: at(i, 2) + (at(i + 1, 2) - at(i, 2)) * k, score: at(i, 3) };
}
