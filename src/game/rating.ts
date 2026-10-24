// Car rating + tuner points (Build & Tune Update, owner Q246 / Q256 / Q257 — the CSR Racing "PP + Evo" idea).
// Rating (PP): how quick the car is with the parts fitted, every Car Lab slider in the middle — one scale across every league
// (D ~100–250 … S ~700–900), worked out from a perfect 800 m run, so a higher number is always a quicker car.
// Tuner points (TP): what your Car Lab sliders add or cost, as an overall score over 600 / 800 / 1200 m. The best tune for one
// length is NOT the one with the most points, so the Test run still decides (owner: "the player has to experiment").
import { STAGES, START_STAGE } from '../data/stages';
import { CARS } from '../data/cars';
import { PERF_KINDS, Tune, fullTune, untuned, TUNING, tuneOpen } from '../data/parts';
import { simTime } from './rivals';

export const RATING = {
  /** PP = perSpeed × average speed over `dist` (m/s) + offset */ dist: 800, perSpeed: 16.5, offset: -436,
  /** TP = scale × the average share of time saved over these lengths */ tpScale: 4000, tpDists: [600, 800, 1200],
  /** the perfect driver the numbers use: reaction off the green (s) */ reaction: [0.25, 0.25] as [number, number],
};
const stage = STAGES[START_STAGE];
const cache = new Map<string, number>();
/** Who drives a perfect run: reaction off the green and whether it fires nitrous (the Strip's reference: 0.30 s, no nitrous). */
export interface Driver { reaction?: [number, number]; nitrous?: boolean }
/** A perfect run's time over `dist` m for a tune (nitrous fired as the AI does, unless the driver says not). Cached. */
export function perfectTime(carId: string, tune: Partial<Tune>, dist: number, drv: Driver = {}): number {
  const re = drv.reaction ?? RATING.reaction, nos = drv.nitrous ?? true;
  const k = `${carId}|${dist}|${re.join()}|${nos}|${JSON.stringify(tune)}`, hit = cache.get(k); if (hit !== undefined) return hit;
  const t = simTime(carId, tune, stage, 1, re, 7, dist, nos);
  cache.set(k, t); return t;
}
/** The car's rating with these parts (the sliders don't count — that is what tuner points are for). */
export function carRating(carId: string, tune: Partial<Tune> = {}): number {
  const t = perfectTime(carId, untuned(fullTune(CARS[carId].unique ? {} : tune)), RATING.dist);
  return Math.max(1, Math.round(RATING.perSpeed * RATING.dist / t + RATING.offset));
}
/** Has the tune moved any slider that is working with the parts fitted? */
export function isTuned(t: Partial<Tune>): boolean {
  return (t.fd !== undefined && Math.abs(t.fd - 1) > 1e-6) || (tuneOpen('tp', t) && !!t.tp) || (tuneOpen('nm', t) && !!t.nm) || (tuneOpen('ratios', t) && !!t.ratios?.length && t.gearMode !== 'preset');
}
/** Tuner points: + = the sliders make the car quicker overall, − = slower. 0 when nothing is tuned. */
export function tunerPoints(carId: string, tune: Partial<Tune>): number {
  const full = fullTune(tune); if (!isTuned(full)) return 0;
  const base = untuned(full), D = RATING.tpDists;
  const gain = D.reduce((a, d) => { const t0 = perfectTime(carId, base, d); return a + (t0 - perfectTime(carId, full, d)) / t0; }, 0) / D.length;
  return Math.round(RATING.tpScale * gain);
}

/** The quickest slider settings for one length (a coarse search; tools, the Strip and the sim checks use it).
 *  Gear ratios stay stock — the search moves final drive, tire pressure and nitrous mix. */
export function bestTune(carId: string, parts: Partial<Tune>, dist: number, drv: Driver = {}): { tune: Tune; time: number } {
  const base = untuned(fullTune(parts));
  const axes: [keyof Tune, number[]][] = [['fd', range(TUNING.fd.min, TUNING.fd.max, 0.03)]];
  if (tuneOpen('tp', base)) axes.push(['tp', range(-1, 1, 0.5)]);
  if (tuneOpen('nm', base)) axes.push(['nm', range(-1, 1, 0.5)]);
  let best: Tune = { ...base, fd: 1 }, time = perfectTime(carId, best, dist, drv);
  for (let pass = 0; pass < 2; pass++) for (const [key, vals] of axes) for (const v of vals) {
    const cand = { ...best, [key]: v } as Tune, t = perfectTime(carId, cand, dist, drv);
    if (t < time - 1e-4) { best = cand; time = t; }
  }
  return { tune: best, time };
}
const range = (a: number, b: number, s: number) => { const out: number[] = []; for (let x = a; x <= b + 1e-9; x += s) out.push(+x.toFixed(3)); return out; };
/** Every performance tier the same (rating tables). */
export const partsKey = (t: Partial<Tune>) => PERF_KINDS.map(k => t[k] ?? 1).join('');
