// The Strip (owner Q87/Q100): a side quest of fixed races per league, ~50–100 long. Unlike Street Races (matched to you),
// every rung has a set rival who gets quicker as you climb: the first rungs fall to a stock starter car, the last need a
// fully upgraded car and near-perfect driving. Distances rotate 800 / 600 / 700 m, so dash and long-run cars both get their
// races; every 10th rung is a boss. Every rung is harder than the one before (owner 2026-10-18): rivals drive better and run
// bigger upgrades as you climb, and the last rung is the league's best car fully upgraded with a near-perfect driver.
// Lose and you face the same rival again. Numbers are placeholders (economy pass).
import { CARS, CATALOG_ORDER, League } from '../data/cars';
import { StageDef } from '../data/stages';
import { makeRng } from './ai';
import { Rival, rivalNear, simTime, MATCH } from './rivals';
import { Tier } from '../data/parts';

export const STRIP = { rungs: 60, bossEvery: 10, dists: [800, 600, 700] as const,
  /** easiest rung: this much slower than the league's slowest stock car (perfect run) */ easyPad: 0.8,
  /** the final rival: league's quickest car at T5/T5 with this driving skill and reaction off the green (s) */ final: { reaction: [0.18, 0.21] as [number, number], /** a perfect run in the best car wins by at least this (s) */ margin: 0.02 },
  curve: 1.15,
  /** one-time level rewards, claimed in the Strip screen (owner): level 1 = 100 VX, +10 VX a level; every 10th level +5 Crowns */
  reward: { firstVx: 100, perLevelVx: 10, crownsEvery: 10, crowns: 5 } };

export interface StripReward { vx: number; crowns: number }
export const levelReward = (n: number): StripReward => ({ vx: STRIP.reward.firstVx + STRIP.reward.perLevelVx * (n - 1), crowns: n % STRIP.reward.crownsEvery === 0 ? STRIP.reward.crowns : 0 });
const NAMES = ['Lux', 'Juno', 'Dax', 'Priya', 'Mateo', 'Sable', 'Oren', 'Tamsin', 'Bodie', 'Nia', 'Kaito', 'Rhea', 'Cruz', 'Ines', 'Wren', 'Zeke', 'Amara', 'Fitz', 'Noor', 'Ozzie', 'Lena', 'Rafe', 'Suki', 'Teo', 'Yara', 'Halden', 'Vee', 'Kenji', 'Marisol', 'Rico'];
/** Cheap facts about a level (no simulation): for the scroller cards. */
export interface LevelInfo { n: number; league: League; dist: number; boss: boolean; reward: StripReward; name: string }
export function levelInfo(league: League, n: number): LevelInfo {
  const boss = n % STRIP.bossEvery === 0, rng = makeRng(0x9a11 + n * 31337 + league.charCodeAt(0) * 7);
  return { n, league, dist: STRIP.dists[(n - 1) % STRIP.dists.length], boss, reward: levelReward(n), name: boss ? BOSSES[league].name : NAMES[Math.floor(rng() * NAMES.length) % NAMES.length] };
}

const BOSSES: Record<League, { name: string; paint: string }> = {
  D: { name: 'Rook', paint: '#1a1a1e' }, C: { name: 'Brass', paint: '#b8901c' },
  B: { name: 'Viper', paint: '#2f9a5a' }, A: { name: 'Nova', paint: '#6a3ad2' }, S: { name: 'Apex', paint: '#eeeae0' },
};
export interface Rung extends LevelInfo { rival: Rival; target: number }

const bandCache = new Map<string, { easy: number; final: Rival }>();
/** For a league at a distance: the easiest rung's time, and the final rival (maxed car, near-perfect driver). */
export function stripBand(league: League, dist: number, stage: StageDef) {
  const k = `${league}:${dist}`, hit = bandCache.get(k); if (hit) return hit;
  const ids = CATALOG_ORDER.filter(id => CARS[id].league === league), me: [number, number] = [MATCH.reaction, MATCH.reaction];
  const easy = Math.max(...ids.map(id => simTime(id, 1, 1, stage, 1, me, 7, dist))) + STRIP.easyPad;
  const F = STRIP.final, seed = 0xf1a1 + dist;
  // the best a player can do here: the league's quickest car, maxed, driven perfectly
  const perfect = Math.min(...ids.map(id => simTime(id, 5, 5, stage, 1, me, 7, dist)));
  // final rival: maxed car, the most competent driver that a perfect run in the right car still beats (by ≥ F.margin)
  let final: Rival | null = null;
  for (let skill = 0.99; skill >= 0.9; skill -= 0.005) for (const id of ids) {
    const t = simTime(id, 5, 5, stage, skill, F.reaction, seed, dist);
    if (t >= perfect + F.margin && (!final || t < final.expect))
      final = { id: 'rival', name: BOSSES[league].name, carId: id, engineTier: 5 as Tier, transTier: 5 as Tier, skill: +skill.toFixed(3), reaction: F.reaction, paint: BOSSES[league].paint, seed, expect: t, yours: perfect };
  }
  final ??= { id: 'rival', name: BOSSES[league].name, carId: ids[0], engineTier: 5 as Tier, transTier: 5 as Tier, skill: 0.9, reaction: F.reaction, paint: BOSSES[league].paint, seed, expect: perfect + F.margin, yours: perfect };
  const b = { easy, final }; bandCache.set(k, b); return b;
}

const rungCache = new Map<string, Rung>();
/** Rung n (1-based) of a league's Strip — the same every time you look at it. */
export function stripRung(league: League, n: number, stage: StageDef): Rung {
  const k = `${league}:${n}`, hit = rungCache.get(k); if (hit) return hit;
  const dist = STRIP.dists[(n - 1) % STRIP.dists.length], boss = n % STRIP.bossEvery === 0;
  const { easy, final } = stripBand(league, dist, stage);
  const p = Math.pow((n - 1) / (STRIP.rungs - 1), STRIP.curve);                   // 0 → 1, rising every rung
  const target = easy + (final.expect - easy) * p;
  let rival: Rival;
  if (n === STRIP.rungs) rival = final;                                          // the top: maxed out, extremely competent
  else {
    const rng = makeRng(0x5717 + n * 7919 + league.charCodeAt(0) * 104729);
    // rivals drive better and carry bigger upgrades as you climb
    const q = (n - 1) / (STRIP.rungs - 1), skill: [number, number] = [Math.max(0, 0.3 + 0.6 * q - 0.12), Math.min(0.99, 0.3 + 0.6 * q + 0.12)];
    rival = rivalNear(league, target, final.expect, stage, dist, rng, 0, { skill, minTier: 1 + Math.floor(q * 3.2), maxTier: 2 + Math.floor(q * 3.2), candidates: 128 });
    // missed the target by much? search again with a wider driving range and keep the closer one
    for (let k = 0; k < 3 && Math.abs(rival.expect - target) > 0.02; k++) {
      const alt = rivalNear(league, target, final.expect, stage, dist, rng, 0, { skill: [Math.max(0, skill[0] - 0.1 * (k + 1)), Math.min(0.99, skill[1] + 0.1 * (k + 1))], minTier: Math.max(1, 1 + Math.floor(q * 3.2) - k - 1), maxTier: 3 + Math.floor(q * 3.2) + k, candidates: 128 });
      if (Math.abs(alt.expect - target) < Math.abs(rival.expect - target)) rival = alt;
    }
    if (boss) { const B = BOSSES[league]; rival = { ...rival, name: B.name, paint: B.paint }; }
  }
  const info = levelInfo(league, n);
  rival = { ...rival, name: info.name };
  const rung: Rung = { ...info, rival, target };
  rungCache.set(k, rung); return rung;
}
