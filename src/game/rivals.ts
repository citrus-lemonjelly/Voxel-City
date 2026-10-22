// Random rivals (owner Q87): every race rolls a new rival — name, car from your league, paint, upgrade tiers and driving
// skill — picked so the race is close for the car and upgrades you have right now. A perfect run should just win; small
// mistakes should lose it. The rival's driving is seeded, so its time can be worked out exactly before the race.
import { Race } from './race';
import { AIController, makeRng } from './ai';
import { carStats } from './stats';
import { CARS, CATALOG_ORDER } from '../data/cars';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { Tier, Tune, PERF_KINDS, GEARINGS, STOCK_TUNE, fullTune } from '../data/parts';
import { rivalName } from './usernames';

export interface Rival extends OpponentDef { seed: number; /** the rival's finish time (s), known ahead */ expect: number; /** your perfect-run time (s) */ yours: number }

/** How close races are (seconds the rival finishes behind YOUR perfect run). Tune here. */
export const MATCH = { minGap: 0.04, maxGap: 0.21, candidates: 64, /** your reference reaction off the green (s) — a good human incl. a little input delay (0.25 → 0.30 in V0.16.1) */ reaction: 0.30 };

/** The city's people — used in passages and for the Strip bosses' story. Rivals use usernames (V0.19.0, Q212). */
export const NAMES = ['Rico', 'Marisol', 'Kenji', 'Vee', 'Halden', 'Juno', 'Dax', 'Priya', 'Mateo', 'Sable', 'Oren', 'Lux', 'Tamsin', 'Bodie', 'Nia', 'Kaito',
  'Rhea', 'Cruz', 'Ines', 'Wren', 'Zeke', 'Amara', 'Fitz', 'Noor', 'Ozzie', 'Lena', 'Rafe', 'Suki', 'Teo', 'Yara'];
export const PAINTS = ['#d23a2a', '#f2a43a', '#f2c230', '#2f9a5a', '#1f8a8a', '#3b6fa8', '#1f4fa8', '#6a3ad2', '#b83a7a', '#eeeae0', '#8e9bb3', '#5a5e66', '#1a1a1e'];
const TIERS: Tier[] = [1, 2, 3, 4, 5];

/** Finish time of one racer over the stage (same fixed step as the game). */
export function simTime(carId: string, tune: Partial<Tune>, stage: StageDef, skill: number, reaction: [number, number], seed: number, distanceM = stage.distanceM, nitrous = true): number {
  const race = new Race(distanceM);
  const r = race.add('x', carStats(carId, tune, stage), new AIController(skill, reaction, seed, nitrous));
  for (let i = 0; i < 120 * 90 && !race.done; i++) race.step(1 / 120);
  return r.finish ?? 999;
}
export const reactionFor = (skill: number): [number, number] => { const a = 0.36 - skill * 0.22; return [a, a + 0.12]; };

/** Search the league's cars, tunes and driving levels for a rival whose finish lands closest to `target` and never below
 *  `floor` (seconds). Shared by street-race matching and the Strip. */
export function rivalNear(league: string, target: number, floor: number, stage: StageDef, distanceM: number, rng: () => number, yours = 0,
  opts: { skill?: [number, number]; minTier?: number; maxTier?: number; candidates?: number } = {}): Rival {
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length) % a.length];
  const named = (s: number) => (rng(), rivalName(s));               // the draw the old first-name pick used, so matching is unchanged
  const pool = CATALOG_ORDER.filter(id => CARS[id].league === league);
  let best: Rival | null = null;
  for (let i = 0; i < (opts.candidates ?? MATCH.candidates); i++) {
    const tiers = TIERS.filter(x => x >= (opts.minTier ?? 1) && x <= Math.max(opts.minTier ?? 1, opts.maxTier ?? 5)), [sLo, sHi] = opts.skill ?? [0, 1];
    // owner Q173: rivals get every part, each at a random tier, and a random gearing — for variety
    const c = pick(pool), tune = Object.fromEntries(PERF_KINDS.map(k => [k, pick(tiers)])) as unknown as Tune, s = (rng() * 0x7fffffff) | 1, jitter = rng() * 0.08;
    tune.gearing = pick(GEARINGS).id;
    for (const base of [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {                // try this car/tune at several driving levels
      const skill = Math.min(0.99, base + jitter), reaction = reactionFor(skill);
      if (skill < sLo || skill > sHi) continue;
      const time = simTime(c, tune, stage, skill, reaction, s, distanceM);
      if (time < floor) continue;                                                // never faster than your perfect run (owner Q92)
      if (!best || Math.abs(time - target) < Math.abs(best.expect - target))
        best = { id: 'rival', name: named(s), carId: c, tune, skill, reaction, paint: pick(PAINTS), seed: s, expect: time, yours };
    }
  }
  // fallback (should not happen): the slowest stock car of the league with a middling driver
  return best ?? { id: 'rival', name: named(1), carId: pool[0], tune: { ...STOCK_TUNE }, skill: 0.55, reaction: reactionFor(0.55), paint: pick(PAINTS), seed: 1, expect: simTime(pool[0], STOCK_TUNE, stage, 0.55, reactionFor(0.55), 1, distanceM), yours };
}

/** Street Race rival: close to YOUR perfect run with the car + upgrades you have now. */
export function makeRival(carId: string, tune: Partial<Tune>, stage: StageDef, seed = (Date.now() & 0x7fffffff) || 1, distanceM = stage.distanceM,
  gap: [number, number] = [MATCH.minGap, MATCH.maxGap]): Rival {
  const rng = makeRng(seed);
  // your reference: perfect shifts and launch, a sharp human's reaction, no nitrous (owner 2026-10-22: a maxed car driven perfectly
  // must win — nitrous used well only widens the gap)
  const yours = simTime(carId, tune, stage, 1, [MATCH.reaction, MATCH.reaction], 7, distanceM, false);
  const target = yours + gap[0] + rng() * (gap[1] - gap[0]);                    // difficulty sets the window (Easy / Medium / Hard)
  // parts are random per rival but stay near your level (±1 tier around your average), so a close match is always there
  const t = fullTune(tune), lvl = Math.round(PERF_KINDS.reduce((a, k) => a + t[k], 0) / PERF_KINDS.length);
  return rivalNear(CARS[carId].league, target, yours + gap[0], stage, distanceM, rng, yours, { minTier: Math.max(1, lvl - 1), maxTier: Math.min(5, lvl + 1) });
}
