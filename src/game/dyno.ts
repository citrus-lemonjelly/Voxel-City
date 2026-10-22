// Test run / dyno (owner C11, V0.16.0): race a set-up on an empty strip with a perfect driver and read off 0–60 mph, 600 m and
// 800 m — for each of the three gearings, so the free gearing choice and every part can be compared before a real race.
// Pure and quick (a few thousand physics steps per run), so it runs right in the Upgrades panel.
import { Race } from './race';
import { AIController } from './ai';
import { carStats } from './stats';
import { GEARINGS, Gearing, Tune } from '../data/parts';
import { StageDef } from '../data/stages';

export interface DynoRow { gearing: Gearing; t60: number; t600: number; t800: number; top: number }
const MPH60 = 60 / 2.237;

export function dynoRun(carId: string, tune: Partial<Tune>, stage: StageDef, gearing: Gearing): DynoRow {
  const race = new Race(800), r = race.add('dyno', carStats(carId, { ...tune, gearing }, stage), new AIController(1, [0.2, 0.2], 7));
  let t60 = NaN, t600 = NaN;
  for (let i = 0; i < 120 * 60 && !race.done; i++) {
    race.step(1 / 120);
    if (r.launched && isNaN(t60) && r.v >= MPH60) t60 = race.raceTime - r.launchTime;
    if (isNaN(t600) && r.x >= 600) t600 = race.raceTime;
  }
  return { gearing, t60, t600, t800: r.finish ?? NaN, top: r.v * 2.237 };
}
export const dyno = (carId: string, tune: Partial<Tune>, stage: StageDef): DynoRow[] => GEARINGS.map(g => dynoRun(carId, tune, stage, g.id));
