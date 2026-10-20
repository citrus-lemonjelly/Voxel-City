// Catalog numbers for a car (owner Q97: each car accelerates, shifts, grips and tops out differently, with its own launch
// and shift windows). Worked out from the same physics the race uses, on stock parts. Cached.
import { Race } from './race';
import { AIController } from './ai';
import { carStats, wheelRpm } from './stats';
import { CARS } from '../data/cars';
import { Tier } from '../data/parts';

export interface CarInfo { zeroTo60: number; topMph: number; gripG: number; shiftS: number; shiftWindow: number; launchWindow: number }
const cache = new Map<string, CarInfo>();

export function carInfo(id: string, eng: Tier = 1, trans: Tier = 1): CarInfo {
  const key = `${id}:${eng}:${trans}`, hit = cache.get(key); if (hit) return hit;
  const s = carStats(id, eng, trans);
  // 0–60 mph with a perfect launch and shifts
  const race = new Race(2000), r = race.add('x', s, new AIController(1, [0.25, 0.25], 7));
  let t60 = 99;
  for (let i = 0; i < 120 * 30; i++) { race.step(1 / 120); if (r.v >= 26.82) { t60 = race.raceTime; break; } }
  // top speed: the lower of the gearing limit (redline in top gear) and where drag + rolling use up all the power
  const top = s.trans.ratios.length - 1;
  let vGear = 1; while (wheelRpm(s, vGear, top) < s.redline) vGear += 0.25;
  let vDrag = 1; while (0.5 * 1.2 * s.dragArea * vDrag ** 3 + s.rollingCoeff * s.massKg * 9.81 * vDrag < s.peakPowerW * 0.88 && vDrag < 200) vDrag += 0.25;
  const info: CarInfo = {
    zeroTo60: t60, topMph: Math.min(vGear, vDrag) * 2.237, gripG: s.tractionN / (s.massKg * 9.81),
    shiftS: s.trans.shiftTime, shiftWindow: s.trans.zoneWidth, launchWindow: s.launch.perfectMax - s.launch.perfectMin,
  };
  cache.set(key, info);
  return info;
}

/** Rows for the Catalog: label, value text, and a 0–1 bar relative to the other cars in the same league (1 = best). */
export function infoRows(id: string): { label: string; value: string; bar: number }[] {
  const league = CARS[id].league, peers = Object.keys(CARS).filter(k => CARS[k].league === league && !CARS[k].unique).concat(id).map(k => carInfo(k)), me = carInfo(id);
  const rel = (f: (c: CarInfo) => number, lowerIsBetter = false) => {
    const xs = peers.map(f), lo = Math.min(...xs), hi = Math.max(...xs), v = f(me);
    if (hi - lo < 1e-6) return 0.75;
    const t = (v - lo) / (hi - lo); return 0.3 + 0.7 * (lowerIsBetter ? 1 - t : t);
  };
  return [
    { label: 'Acceleration', value: `0–60 ${me.zeroTo60.toFixed(1)} s`, bar: rel(c => c.zeroTo60, true) },
    { label: 'Top speed', value: `${Math.round(me.topMph)} mph`, bar: rel(c => c.topMph) },
    { label: 'Grip', value: `${me.gripG.toFixed(2)} g`, bar: rel(c => c.gripG) },
    { label: 'Shift speed', value: `${me.shiftS.toFixed(2)} s`, bar: rel(c => c.shiftS, true) },
    { label: 'Shift window', value: `${Math.round(me.shiftWindow * 100)}%`, bar: rel(c => c.shiftWindow) },
    { label: 'Launch window', value: `${Math.round(me.launchWindow * 100)}%`, bar: rel(c => c.launchWindow) },
  ];
}

/** Garage rows (owner 2026-10-19): the car's stock value and its value with your upgrades, as 0–1 bars on one scale that
 *  spans the league from the weakest stock car to the best fully upgraded one, so the upgrade part of each bar shows. */
export function garageRows(id: string, eng: Tier, trans: Tier): { label: string; value: string; base: number; now: number }[] {
  const league = CARS[id].league, ids = Object.keys(CARS).filter(k => CARS[k].league === league && !CARS[k].unique).concat(id);
  const pool = ids.flatMap(k => [carInfo(k), carInfo(k, CARS[k].unique ? 1 : 5, CARS[k].unique ? 1 : 5)]), base = carInfo(id), now = carInfo(id, eng, trans);
  const rel = (f: (c: CarInfo) => number, lowerIsBetter = false) => {
    const xs = pool.map(f), lo = Math.min(...xs), hi = Math.max(...xs);
    const r = (c: CarInfo) => hi - lo < 1e-6 ? 0.75 : 0.15 + 0.85 * (lowerIsBetter ? (hi - f(c)) / (hi - lo) : (f(c) - lo) / (hi - lo));
    return { base: r(base), now: r(now) };
  };
  return [
    { label: 'Acceleration', value: `0–60 ${now.zeroTo60.toFixed(1)} s`, ...rel(c => c.zeroTo60, true) },
    { label: 'Top speed', value: `${Math.round(now.topMph)} mph`, ...rel(c => c.topMph) },
    { label: 'Grip', value: `${now.gripG.toFixed(2)} g`, ...rel(c => c.gripG) },
    { label: 'Shift speed', value: `${now.shiftS.toFixed(2)} s`, ...rel(c => c.shiftS, true) },
    { label: 'Shift window', value: `${Math.round(now.shiftWindow * 100)}%`, ...rel(c => c.shiftWindow) },
    { label: 'Launch window', value: `${Math.round(now.launchWindow * 100)}%`, ...rel(c => c.launchWindow) },
  ];
}
