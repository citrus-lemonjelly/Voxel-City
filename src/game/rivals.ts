// Random rivals (owner Q87): every race rolls a new rival — name, car from your league, paint, upgrade tiers and driving
// skill — picked so the race is close for the car and upgrades you have right now. A perfect run should just win; small
// mistakes should lose it. The rival's driving is seeded, so its time can be worked out exactly before the race.
import { Race } from './race';
import { AIController, makeRng } from './ai';
import { carStats } from './stats';
import { CARS, CATALOG_ORDER } from '../data/cars';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { Tier } from '../data/parts';

export interface Rival extends OpponentDef { seed: number; /** the rival's finish time (s), known ahead */ expect: number; /** your perfect-run time (s) */ yours: number }

/** How close races are (seconds the rival finishes behind YOUR perfect run). Tune here. */
export const MATCH = { minGap: 0.03, maxGap: 0.18, candidates: 64, /** your reference reaction off the green (s) — a sharp human */ reaction: 0.25 };

const NAMES = ['Rico', 'Marisol', 'Kenji', 'Vee', 'Halden', 'Juno', 'Dax', 'Priya', 'Mateo', 'Sable', 'Oren', 'Lux', 'Tamsin', 'Bodie', 'Nia', 'Kaito',
  'Rhea', 'Cruz', 'Ines', 'Wren', 'Zeke', 'Amara', 'Fitz', 'Noor', 'Ozzie', 'Lena', 'Rafe', 'Suki', 'Teo', 'Yara'];
const PAINTS = ['#d23a2a', '#f2a43a', '#f2c230', '#2f9a5a', '#1f8a8a', '#3b6fa8', '#1f4fa8', '#6a3ad2', '#b83a7a', '#eeeae0', '#8e9bb3', '#5a5e66', '#1a1a1e'];
const TIERS: Tier[] = [1, 2, 3, 4, 5];

/** Finish time of one racer over the stage (same fixed step as the game). */
export function simTime(carId: string, eng: Tier, trans: Tier, stage: StageDef, skill: number, reaction: [number, number], seed: number): number {
  const race = new Race(stage.distanceM);
  const r = race.add('x', carStats(carId, eng, trans, stage), new AIController(skill, reaction, seed));
  for (let i = 0; i < 120 * 90 && !race.done; i++) race.step(1 / 120);
  return r.finish ?? 999;
}
const reactionFor = (skill: number): [number, number] => { const a = 0.34 - skill * 0.2; return [a, a + 0.12]; };

export function makeRival(carId: string, eng: Tier, trans: Tier, stage: StageDef, seed = (Date.now() & 0x7fffffff) || 1): Rival {
  const rng = makeRng(seed), pick = <T>(a: T[]) => a[Math.floor(rng() * a.length) % a.length];
  const league = CARS[carId].league;
  const pool = CATALOG_ORDER.filter(id => CARS[id].league === league);
  const yours = simTime(carId, eng, trans, stage, 1, [MATCH.reaction, MATCH.reaction], 7);
  const target = yours + MATCH.minGap + rng() * (MATCH.maxGap - MATCH.minGap);
  let best: Rival | null = null;
  for (let i = 0; i < MATCH.candidates; i++) {
    const c = pick(pool), e = pick(TIERS), t = pick(TIERS), skill = 0.5 + rng() * 0.48, reaction = reactionFor(skill), s = (rng() * 0x7fffffff) | 1;
    const time = simTime(c, e, t, stage, skill, reaction, s);
    if (time - yours < MATCH.minGap) continue;                                   // never faster than your perfect run
    if (!best || Math.abs(time - target) < Math.abs(best.expect - target))
      best = { id: 'rival', name: pick(NAMES), carId: c, engineTier: e, transTier: t, skill, reaction, paint: pick(PAINTS), seed: s, expect: time, yours };
  }
  // fallback (should not happen): the slowest stock car of the league with a middling driver
  return best ?? { id: 'rival', name: pick(NAMES), carId: pool[0], engineTier: 1, transTier: 1, skill: 0.55, reaction: reactionFor(0.55), paint: pick(PAINTS), seed: 1, expect: simTime(pool[0], 1, 1, stage, 0.55, reactionFor(0.55), 1), yours };
}
