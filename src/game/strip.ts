// The Strip (owner Q87/Q100): a side quest of fixed races per league, ~50–100 long. Unlike Street Races (matched to you),
// every rung has a set rival who gets quicker as you climb: the first rungs fall to a stock starter car, the last need a
// fully upgraded car and near-perfect driving. Distances rotate 800 / 600 / 700 m, so dash and long-run cars both get their
// races; every 10th rung is a boss. Every rung is harder than the one before (owner 2026-10-18): rivals drive better and run
// bigger upgrades as you climb, and the last rung is a fully upgraded car with a near-perfect driver. Build & Tune Update: six
// chapters with a wall at each boss; any car of the league, maxed and well tuned, can finish; a Hard Strip opens after Level 60.
// Lose and you face the same rival again. Numbers are placeholders (economy pass).
import { CARS, CATALOG_ORDER, League } from '../data/cars';
import { StageDef } from '../data/stages';
import { makeRng } from './ai';
import { rivalName } from './usernames';
import { Rival, rivalNear, simTime, MATCH } from './rivals';
import { allAt, GEARINGS, STOCK_TUNE, MAX_TUNE, Tune } from '../data/parts';
import { bestTune, perfectTime } from './rating';
import { STRIP_REWARDS, LEAGUE_SCALE } from '../data/economy';

export const STRIP = { rungs: 60, bossEvery: 10, dists: [800, 600, 700] as const,
  /** easiest rung: this much slower than the league's slowest stock car (perfect run) */ easyPad: 0.8,
  /** the final rival: a maxed car with this reaction off the green (s); a perfect run in ANY car of the league, maxed and well tuned, beats it by
   *  at least `margin` (Build & Tune Update, owner: "any car can finish its league's Strip"; it was the league's best car before) */ final: { reaction: [0.18, 0.21] as [number, number], margin: 0.05 },
  curve: 1.15,
  /** six chapters of ten (owner 2026-10-24: "the Strip should get harder after each boss"): a chapter's levels rise from `from` to `to`
   *  of its step, the boss is the whole step (a wall), and the next chapter's first level starts above the boss */
  chapter: { from: 0.1, to: 0.7 },
  /** Hard mode, open after Level 60: starts at `start` of the normal Strip's difficulty and ends at the league's BEST car, maxed and well
   *  tuned, driven perfectly, winning by `margin`; pays `pay` × the VX, and bosses give double Crowns (no decals or cars — those come once) */
  hard: { start: 0.5, margin: 0.03, pay: 1.5 },
};
/** The Hard Strip opens per league once its Level 60 is cleared; `stripPick.hard` = the Strip screen's Normal / Hard switch. */
export const stripHardOpen = (strip: Record<string, number>, lg: string) => (strip[lg] ?? 0) >= STRIP.rungs;
export const stripPick = { hard: false };
/** The perfect run the Strip is measured against (a good human: 0.30 s off the green, no nitrous — using it well is your edge). */
const REF = { reaction: [MATCH.reaction, MATCH.reaction] as [number, number], nitrous: false };
/** How hard level n is, 0 → 1, in chapters: rising inside a chapter, a step up at each boss, then a little more after it. */
export function stripStep(n: number): number {
  const B = STRIP.bossEvery, c = Math.floor((n - 1) / B), i = (n - 1) % B + 1, C = STRIP.chapter;
  return (c + (i === B ? 1 : C.from + (C.to - C.from) * (i - 1) / (B - 2))) / (STRIP.rungs / B);
}

/** One-time level reward (numbers in data/economy.ts): VX every level; boss levels add Crowns, a lump sum, a universal decal,
 *  and the final boss level adds the boss car. */
export interface StripReward { vx: number; crowns: number; cash: number; decal?: string; car?: string }
export const BOSS_CARS: Record<League, string> = { D: 'boss_d', C: 'boss_c', B: 'boss_b', A: 'boss_a', S: 'boss_s' };
const R10 = (n: number) => Math.round(n / 10) * 10;
export function levelReward(league: League, n: number, hard = false): StripReward {
  const k = LEAGUE_SCALE[league], R = STRIP_REWARDS, boss = n % STRIP.bossEvery === 0, b = n / STRIP.bossEvery, H = hard ? STRIP.hard.pay : 1;
  const r: StripReward = { vx: R10((R.firstVx + R.perLevelVx * (n - 1)) * k * H), crowns: 0, cash: 0 };
  if (boss) {
    r.crowns = R.boss.crowns * (hard ? 2 : 1); r.cash = R10(R.boss.cashPerBoss * b * k * H);
    if (R.boss.decal && !hard) r.decal = `decal_${league}_${b}`;
    if (R.boss.carOnFinal && n === STRIP.rungs && !hard) r.car = BOSS_CARS[league];
  }
  return r;
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** Name of a boss decal (decal_D_3 → "Rook III"). */
export const decalName = (id: string) => { const [, lg, b] = id.split('_'); return `${BOSSES[lg as League].name} ${ROMAN[+b - 1] ?? b}`; };
/** Cheap facts about a level (no simulation): for the scroller cards. `hard` = the Hard Strip (after Level 60). */
export interface LevelInfo { n: number; league: League; dist: number; boss: boolean; hard: boolean; reward: StripReward; name: string }
export function levelInfo(league: League, n: number, hard = false): LevelInfo {
  // each level's rival has its own username (V0.19.0, Q212); bosses keep their names
  const boss = n % STRIP.bossEvery === 0;
  return { n, league, dist: STRIP.dists[(n - 1) % STRIP.dists.length], boss, hard, reward: levelReward(league, n, hard), name: boss ? BOSSES[league].name : rivalName(0x9a11 + n * 31337 + league.charCodeAt(0) * 7 + (hard ? 0x4a2d : 0)) };
}

const BOSSES: Record<League, { name: string; paint: string }> = {
  D: { name: 'Rook', paint: '#1a1a1e' }, C: { name: 'Brass', paint: '#b8901c' },
  B: { name: 'Viper', paint: '#2f9a5a' }, A: { name: 'Nova', paint: '#6a3ad2' }, S: { name: 'Apex', paint: '#eeeae0' },
};
export interface Rung extends LevelInfo { rival: Rival; target: number }

const bandCache = new Map<string, { easy: number; final: Rival }>();
/** For a league at a distance: the easiest rung's time, and the final rival (maxed car, near-perfect driver). Normal: the final can be
 *  beaten by EVERY car of the league maxed and well tuned (the slowest one's best run sets it). Hard: it starts halfway up the normal
 *  Strip, and its final needs the league's best car maxed and well tuned. */
export function stripBand(league: League, dist: number, stage: StageDef, hard = false): { easy: number; final: Rival } {
  const k = `${league}:${dist}:${hard}`, hit = bandCache.get(k); if (hit) return hit;
  const ids = CATALOG_ORDER.filter(id => CARS[id].league === league);
  const F = STRIP.final, seed = 0xf1a1 + dist + (hard ? 0x77 : 0), margin = hard ? STRIP.hard.margin : F.margin;
  // the player's best here, per car: maxed, the quickest Car Lab tune for this length, driven perfectly (REF)
  const tuned = ids.map(id => bestTune(id, MAX_TUNE, dist, REF).time);
  const perfect = hard ? Math.min(...tuned) : Math.max(...tuned);
  let easy: number;
  if (hard) { const n = stripBand(league, dist, stage); easy = n.easy + (n.final.expect - n.easy) * Math.pow(STRIP.hard.start, STRIP.curve); }
  else easy = Math.max(...ids.map(id => perfectTime(id, STOCK_TUNE, dist, REF))) + STRIP.easyPad;
  // rival cars: maxed, on the best of the rivals' gearing presets for this length
  const maxed: Record<string, Tune> = {}, best: Record<string, number> = {};
  for (const id of ids) for (const g of GEARINGS) { const t = perfectTime(id, allAt(5, g.id), dist, REF); if (!(t >= best[id])) { best[id] = t; maxed[id] = allAt(5, g.id); } }
  // final rival: maxed car, the most competent driver that the player's best run still beats (by ≥ margin)
  let final: Rival | null = null;
  for (let skill = 0.99; skill >= 0.9; skill -= 0.005) for (const id of ids) {
    const t = simTime(id, maxed[id], stage, skill, F.reaction, seed, dist);
    if (t >= perfect + margin && (!final || t < final.expect))
      final = { id: 'rival', name: BOSSES[league].name, carId: id, tune: maxed[id], skill: +skill.toFixed(3), reaction: F.reaction, paint: BOSSES[league].paint, seed, expect: t, yours: perfect };
  }
  final ??= { id: 'rival', name: BOSSES[league].name, carId: ids[0], tune: maxed[ids[0]], skill: 0.9, reaction: F.reaction, paint: BOSSES[league].paint, seed, expect: perfect + margin, yours: perfect };
  const b = { easy, final }; bandCache.set(k, b); return b;
}

const rungCache = new Map<string, Rung>();
/** Rung n (1-based) of a league's Strip (or its Hard Strip) — the same every time you look at it. */
export function stripRung(league: League, n: number, stage: StageDef, hard = false): Rung {
  const k = `${league}:${n}:${hard}`, hit = rungCache.get(k); if (hit) return hit;
  const dist = STRIP.dists[(n - 1) % STRIP.dists.length], boss = n % STRIP.bossEvery === 0;
  const { easy, final } = stripBand(league, dist, stage, hard);
  const step = stripStep(n), target = easy + (final.expect - easy) * Math.pow(step, STRIP.curve);   // chapters: a wall at each boss
  let rival: Rival;
  if (n === STRIP.rungs) rival = final;                                          // the top: maxed out, extremely competent
  else {
    const rng = makeRng(0x5717 + n * 7919 + league.charCodeAt(0) * 104729 + (hard ? 31 : 0));
    // rivals drive better and carry bigger upgrades as you climb (the Hard Strip starts halfway)
    const q = hard ? STRIP.hard.start + (1 - STRIP.hard.start) * step : step, skill: [number, number] = [Math.max(0, 0.3 + 0.6 * q - 0.12), Math.min(0.99, 0.3 + 0.6 * q + 0.12)];
    rival = rivalNear(league, target, final.expect, stage, dist, rng, 0, { skill, minTier: 1 + Math.floor(q * 3.2), maxTier: 2 + Math.floor(q * 3.2), candidates: 128 });
    // missed the target by much? search again with a wider driving range and keep the closer one
    for (let k = 0; k < 3 && Math.abs(rival.expect - target) > 0.02; k++) {
      const alt = rivalNear(league, target, final.expect, stage, dist, rng, 0, { skill: [Math.max(0, skill[0] - 0.1 * (k + 1)), Math.min(0.99, skill[1] + 0.1 * (k + 1))], minTier: Math.max(1, 1 + Math.floor(q * 3.2) - k - 1), maxTier: Math.min(5, 3 + Math.floor(q * 3.2) + k), candidates: 128 });
      if (Math.abs(alt.expect - target) < Math.abs(rival.expect - target)) rival = alt;
    }
    if (boss) { const B = BOSSES[league]; rival = { ...rival, name: B.name, paint: B.paint }; }
  }
  const info = levelInfo(league, n, hard);
  rival = { ...rival, name: info.name };
  const rung: Rung = { ...info, rival, target };
  rungCache.set(k, rung); return rung;
}
