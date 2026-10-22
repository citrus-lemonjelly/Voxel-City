// Race state machine + 1-D physics (decisions R1, R4, R5, R8–R10, R12).
// countdown → (hold to rev, release on green — Pedal mode: tap shift-up on green) launch → gears with graded shifts → finish → results.
import { CarStats, torqueAt, wheelRpm } from './stats';
import { LAUNCH } from '../data/parts';

export type LaunchGrade = 'Perfect' | 'Good' | 'Bog' | 'Wheelspin';
export type ShiftGrade = 'Perfect' | 'Good' | 'Early' | 'Late';

/** Anything that can drive a car: the keyboard/mouse, or the AI. */
export interface Controller {
  /** Is the throttle/rev input held right now? (Space or the on-screen button) */
  held(r: Racer, race: Race): boolean;
  /** Return true once to request a gear change. */
  shift(r: Racer, race: Race): boolean;
  /** Return true once to request a downshift (owner: recover from an upshift made too early). AI never downshifts. */
  downshift?(r: Racer, race: Race): boolean;
  /** Pedal mode (owner 2026-10-21): the gas is held the whole race (let go = coast), a tap of shift-up on green drops
   *  the clutch, and lifting off during wheelspin brings the grip back. Missing/false = Classic (the car pulls by itself). */
  pedal?: boolean;
}

export interface Racer {
  id: string;
  stats: CarStats;
  ctl: Controller;
  x: number;               // metres from the start line
  px?: number;             // x at the previous physics step (render interpolation)
  v: number;               // m/s
  gear: number;            // index into ratios
  rpm: number;
  wasHeld: boolean;
  launched: boolean;
  launchTime: number;      // seconds after green when the car launched
  launchGrade?: LaunchGrade;
  launchTimer: number;     // seconds since launch
  shifting: number;        // seconds left in the current gear change
  shiftDir: 1 | -1;        // direction of the gear change in progress
  downshifts: number;      // downshifts used this race
  boost: number;           // seconds of Perfect-shift torque bonus remaining
  /** One graded upshift per gear (redoing a gear after a downshift replaces its grade, so bonuses can't be farmed). */
  shifts: { gear: number; grade: ShiftGrade; rpmFrac: number }[];
  finish?: number;         // finish time after green (s)
  lastEvent?: { text: string; t: number };
  /** Pedal mode: lifted off during launch wheelspin, so the tyres have grip again. */
  gripBack?: boolean;
}

export const COUNTDOWN = 3.0;        // seconds of lights before green
/** How long the gear change takes, relative to the transmission's shift time, by grade. */
export const SHIFT_TIME_MULT: Record<ShiftGrade, number> = { Perfect: 0.55, Good: 0.85, Early: 1.25, Late: 1.25 };
/** Downshift: takes this × the transmission's shift time. No safety net (owner): drop a gear too fast and the engine
 *  over-revs — it sits on the limiter making no power, and engine braking slows the car until the revs come back down. */
export const DOWNSHIFT = { timeMult: 0.35, engineBrake: 0.45 };
/** Lugging: in 2nd gear and up, below `below` × redline the engine is out of its power band and torque falls off
 *  (× max(floor, 1 − slope × (below − rpm share))). Normal driving never gets this low; it is what makes a badly early
 *  upshift worth fixing with a quick downshift. */
/** Pedal mode: if nobody taps shift-up, the car goes by itself this many seconds after green (so a race always ends). */
export const PEDAL = { autoLaunch: 3 };
export const LUG = { below: 0.55, slope: 1.5, floor: 0.4 };
const DRIVELINE = 0.88;
const G = 9.81, AIR = 1.2;

export class Race {
  t = 0;                             // seconds since the countdown started
  racers: Racer[] = [];
  done = false;
  constructor(public distanceM: number) {}

  get green() { return this.t >= COUNTDOWN; }
  get raceTime() { return Math.max(0, this.t - COUNTDOWN); }

  add(id: string, stats: CarStats, ctl: Controller): Racer {
    const r: Racer = { id, stats, ctl, x: 0, v: 0, gear: 0, rpm: stats.idleRpm, wasHeld: false, launched: false, launchTime: 0, launchTimer: 0, shifting: 0, shiftDir: 1, downshifts: 0, boost: 0, shifts: [] };
    this.racers.push(r);
    return r;
  }

  step(dt: number) {
    if (this.done) return;
    this.t += dt;
    for (const r of this.racers) this.stepRacer(r, dt);
    this.done = this.racers.every(r => r.finish !== undefined);
  }

  private stepRacer(r: Racer, dt: number) {
    const s = r.stats;
    if (r.finish !== undefined) { r.v = Math.max(0, r.v - (6 + r.v * 0.08) * dt); r.x += r.v * dt; return; }   // brake past the line, harder from high speed
    const held = r.ctl.held(r, this);

    // ---- before launch: free-revving engine ----
    if (!r.launched) {
      if (held) r.rpm = Math.min(s.redline * 0.985, r.rpm + 5200 * dt);
      else r.rpm = Math.max(s.idleRpm, r.rpm - 7000 * dt);
      if (r.rpm >= s.redline * 0.985 && held) r.rpm -= 450;           // limiter bounce
      if (r.ctl.pedal) {                                              // Pedal mode: tap shift-up on green to drop the clutch
        if (r.ctl.shift(r, this)) { if (this.green) this.launch(r); else r.lastEvent = { text: 'Too early', t: this.t }; }
        else if (this.green && this.raceTime > PEDAL.autoLaunch) this.launch(r);
      } else {
        const released = r.wasHeld && !held;
        if (this.green && (released || (!held && !r.wasHeld && this.raceTime > 0))) this.launch(r);
      }
      r.wasHeld = held;
      return;
    }
    const lifted = r.wasHeld && !held;
    r.wasHeld = held;
    const throttle = r.ctl.pedal && !held ? 0 : 1;                      // Classic: always full gas after the launch
    if (r.ctl.pedal && lifted && r.launchGrade === 'Wheelspin' && r.launchTimer < LAUNCH.spinSeconds && !r.gripBack) { r.gripBack = true; r.lastEvent = { text: 'Grip back', t: this.t }; }
    r.launchTimer += dt;

    // ---- shifting ----
    if (r.shifting > 0) {
      r.shifting -= dt;
      if (r.shifting <= 0) {
        r.gear = Math.max(0, Math.min(r.gear + r.shiftDir, s.trans.ratios.length - 1));
        if (r.shiftDir < 0 && wheelRpm(s, r.v, r.gear) > s.redline) r.lastEvent = { text: 'Over-rev', t: this.t };
      }
    } else if (r.gear > 0 && r.ctl.downshift?.(r, this)) {
      r.shiftDir = -1; r.shifting = s.trans.shiftTime * DOWNSHIFT.timeMult; r.boost = 0; r.downshifts++; r.lastEvent = { text: 'Downshift', t: this.t };
    } else if (r.gear < s.trans.ratios.length - 1 && r.ctl.shift(r, this)) {
      const frac = r.rpm / s.redline;
      const half = s.trans.zoneWidth / 2, c = s.trans.zoneCentre;
      let grade: ShiftGrade;
      if (Math.abs(frac - c) <= half) grade = 'Perfect';
      else if (Math.abs(frac - c) <= half + s.trans.zoneWidth * 0.6) grade = 'Good';
      else grade = frac < c ? 'Early' : 'Late';
      const prev = r.shifts.findIndex(e => e.gear === r.gear + 1), wasPerfect = prev >= 0 && r.shifts[prev].grade === 'Perfect';
      if (prev >= 0) r.shifts[prev] = { gear: r.gear + 1, grade, rpmFrac: frac };   // redo after a downshift replaces that gear's grade
      else r.shifts.push({ gear: r.gear + 1, grade, rpmFrac: frac });
      r.shiftDir = 1;
      r.shifting = s.trans.shiftTime * SHIFT_TIME_MULT[grade];
      if (grade === 'Perfect' && !wasPerfect) r.boost = 0.8;                   // no boost farming: redoing a gear only earns it if that gear wasn't Perfect already
      r.lastEvent = { text: grade, t: this.t };
    }

    // ---- forces ----
    const rpmWheel = wheelRpm(s, r.v, r.gear);
    // clutch slip off the line: engine rpm eases from launch rpm down to wheel rpm
    const slip = Math.max(0, 1 - r.launchTimer / 0.9);
    r.rpm = r.shifting > 0 || !throttle ? Math.max(rpmWheel, s.idleRpm) : Math.max(rpmWheel, s.idleRpm, r.rpm * slip);
    let drive = 0;
    if (r.shifting <= 0 && r.rpm < s.redline) {
      let tq = torqueAt(s, r.rpm);
      if (r.gear > 0) { const f = r.rpm / s.redline; if (f < LUG.below) tq *= Math.max(LUG.floor, 1 - LUG.slope * (LUG.below - f)); }
      if (r.boost > 0) { tq *= 1 + s.trans.perfectBoost; r.boost -= dt; }
      drive = throttle * tq * s.trans.ratios[r.gear] * s.finalDrive * DRIVELINE / s.wheelRadiusM;
      let traction = s.tractionN;
      if (r.gear <= 1) { drive *= s.pull; traction *= s.pull; }       // gearing: Short pulls harder in 1st and 2nd, Long softer
      if (r.launchGrade === 'Wheelspin' && r.launchTimer < LAUNCH.spinSeconds && !r.gripBack) traction *= LAUNCH.spinGrip;
      if (r.launchGrade === 'Bog' && r.launchTimer < 1.0) drive *= LAUNCH.bogPenalty;
      drive = Math.min(drive, traction);
    }
    if (r.rpm >= s.redline) {                                          // on the limiter = no drive
      // over-revved (a downshift at too high a speed): engine braking drags the car until the revs fall below redline
      if (r.shifting <= 0 && rpmWheel > s.redline) drive = -DOWNSHIFT.engineBrake * torqueAt(s, s.redline) * s.trans.ratios[r.gear] * s.finalDrive * DRIVELINE / s.wheelRadiusM * Math.min(1, (rpmWheel / s.redline - 1) * 4 + 0.25);
      r.rpm = s.redline;
    }
    const resist = 0.5 * AIR * s.dragArea * r.v * r.v + s.rollingCoeff * s.massKg * G;
    const a = (drive - resist) / s.massKg;
    r.v = Math.max(0, r.v + a * dt);
    r.x += r.v * dt;
    if (r.x >= this.distanceM) r.finish = this.raceTime - (r.x - this.distanceM) / Math.max(r.v, 1);
  }

  private launch(r: Racer) {
    const s = r.stats, frac = r.rpm / s.redline;
    let g: LaunchGrade;
    const L = s.launch;                                                // this car's launch window (owner Q97)
    if (frac >= L.perfectMin && frac <= L.perfectMax) g = 'Perfect';
    else if (frac >= L.perfectMin - L.goodPad && frac <= L.perfectMax + L.goodPad) g = 'Good';
    else g = frac < L.perfectMin ? 'Bog' : 'Wheelspin';
    r.launched = true; r.launchGrade = g; r.launchTime = this.raceTime; r.launchTimer = 0;
    r.lastEvent = { text: g === 'Perfect' ? 'Perfect launch' : g === 'Good' ? 'Good launch' : g, t: this.t };
  }
}
