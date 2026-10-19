// Catalog numbers for a car (owner Q97: each car accelerates, shifts, grips and tops out differently, with its own launch
// and shift windows). Worked out from the same physics the race uses, on stock parts. Cached.
import { Race } from './race';
import { AIController } from './ai';
import { carStats, wheelRpm } from './stats';
import { CARS } from '../data/cars';

export interface CarInfo { zeroTo60: number; topMph: number; gripG: number; shiftS: number; shiftWindow: number; launchWindow: number }
const cache = new Map<string, CarInfo>();

export function carInfo(id: string): CarInfo {
  const hit = cache.get(id); if (hit) return hit;
  const s = carStats(id, 1, 1);
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
  cache.set(id, info);
  return info;
}

/** Rows for the Catalog: label, value text, and a 0–1 bar relative to the other cars in the same league (1 = best). */
export function infoRows(id: string): { label: string; value: string; bar: number }[] {
  const league = CARS[id].league, peers = Object.keys(CARS).filter(k => CARS[k].league === league).map(carInfo), me = carInfo(id);
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
