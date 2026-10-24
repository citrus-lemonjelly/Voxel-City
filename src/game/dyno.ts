// Test run / dyno (owner C11, V0.16.0; Car Lab V0.21.0): race a set-up on an empty strip with a perfect driver and read off
// 0–60 mph, 600 m, 800 m and 1200 m — for your tune and for the factory tune (every Car Lab slider in the middle), so a slider
// change can be judged at each race length. Pure and quick (a few thousand physics steps per run).
import { Race } from './race';
import { AIController } from './ai';
import { carStats } from './stats';
import { Tune, fullTune, untuned } from '../data/parts';
import { StageDef } from '../data/stages';

export interface DynoRow { label: 'Your tune' | 'Factory'; t60: number; t600: number; t800: number; t1200: number; top: number }
const MPH60 = 60 / 2.237;

export function dynoRun(carId: string, tune: Partial<Tune>, stage: StageDef, label: DynoRow['label'] = 'Your tune'): DynoRow {
  const race = new Race(1200), r = race.add('dyno', carStats(carId, tune, stage), new AIController(1, [0.2, 0.2], 7));
  let t60 = NaN, t600 = NaN, t800 = NaN;
  for (let i = 0; i < 120 * 90 && !race.done; i++) {
    race.step(1 / 120);
    if (r.launched && isNaN(t60) && r.v >= MPH60) t60 = race.raceTime - r.launchTime;
    if (isNaN(t600) && r.x >= 600) t600 = race.raceTime;
    if (isNaN(t800) && r.x >= 800) t800 = race.raceTime;
  }
  return { label, t60, t600, t800, t1200: r.finish ?? NaN, top: r.v * 2.237 };
}
/** Your tune, then the factory tune (the same parts, every slider in the middle). */
export const dyno = (carId: string, tune: Partial<Tune>, stage: StageDef): DynoRow[] => [dynoRun(carId, tune, stage), dynoRun(carId, untuned(fullTune(tune)), stage, 'Factory')];
