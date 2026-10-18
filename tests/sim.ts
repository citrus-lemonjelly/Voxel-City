// Headless race simulation: checks timing targets and that transmission tiers behave as designed.
// Run: npx tsx tests/sim.ts
import { Race, Racer, Controller } from '../src/game/race';
import { AIController } from '../src/game/ai';
import { carStats } from '../src/game/stats';
import { STAGES } from '../src/data/stages';
import { Tier } from '../src/data/parts';

declare const process: { exit(code: number): never };
const stage = STAGES.downtown_grid;
function run(engine: Tier, trans: Tier, skill: number, seed = 7) {
  // average over several seeds so skill comparisons aren't luck
  const n = 12; const runs = Array.from({ length: n }, (_, i) => run1(engine, trans, skill, seed + i * 31));
  const avg = runs.reduce((a, r) => a + r.time, 0) / n;
  return { ...runs[0], time: avg };
}
function run1(engine: Tier, trans: Tier, skill: number, seed: number) {
  const race = new Race(stage.distanceM);
  const r = race.add('p', carStats('panda_civix', engine, trans, stage), new AIController(skill, [0.2, 0.2], seed));
  for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120);
  return { time: r.finish!, shifts: r.shifts.length, grades: r.shifts.map(s => s.grade[0]).join(''), launch: r.launchGrade, top: Math.round(r.v * 2.237) };
}
const rows: any[] = [];
for (const [e, t] of [[1, 1], [1, 3], [1, 5], [5, 1], [5, 5]] as [Tier, Tier][])
  for (const skill of [1, 0.75, 0.55]) rows.push({ engine: `E${e}`, trans: `T${t}`, skill, ...run(e, t, skill) });
console.table(rows.map(r => ({ ...r, time: r.time.toFixed(2) })));

let fail = 0;
const check = (ok: boolean, msg: string) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fail++; };
const stockPerfect = rows.find(r => r.engine === 'E1' && r.trans === 'T1' && r.skill === 1);
check(stockPerfect.time > 22 && stockPerfect.time < 28, `stock car, perfect driving finishes in 22–28 s (${stockPerfect.time.toFixed(2)})`);
check(stockPerfect.shifts === 4, `stock transmission = 4 shifts (${stockPerfect.shifts})`);
const t5 = rows.find(r => r.engine === 'E1' && r.trans === 'T5' && r.skill === 1);
check(t5.shifts === 5, `T5 transmission = 5 shifts (${t5.shifts})`);
check(t5.time < stockPerfect.time, `T5 is faster than T1 (${t5.time.toFixed(2)} < ${stockPerfect.time.toFixed(2)})`);
const sloppy = rows.find(r => r.engine === 'E1' && r.trans === 'T1' && r.skill === 0.55);
check(sloppy.time > stockPerfect.time, `skill matters: sloppy driving is slower (${sloppy.time.toFixed(2)} > ${stockPerfect.time.toFixed(2)})`);
const maxed = rows.find(r => r.engine === 'E5' && r.trans === 'T5' && r.skill === 1);
check(maxed.time < t5.time, `engine upgrades help (${maxed.time.toFixed(2)})`);

// ---- downshift (owner request): recover from an upshift made too early ----
// Scripted driver: AI launch + Perfect shifts, except the 2→3 upshift is made far too early (45% of redline).
// "recover" then taps downshift once that early shift completes, and re-shifts in the zone.
function fumble(recover: boolean, downAt?: (r: Racer) => boolean) {
  const race = new Race(stage.distanceM), ai = new AIController(1, [0.2, 0.2], 7);
  let fumbled = false, downDone = false;
  const ctl: Controller = {
    held: (r, rc) => ai.held(r, rc),
    shift: (r) => {
      const f = r.rpm / r.stats.redline;
      if (r.gear === 1 && !fumbled) { if (f >= 0.45) { fumbled = true; return true; } return false; }
      return f >= r.stats.trans.zoneCentre;
    },
    downshift: (r) => {
      if (downAt) return downAt(r);
      if (recover && fumbled && !downDone && r.gear === 2 && r.shifting <= 0) { downDone = true; return true; }
      return false;
    },
  };
  const r = race.add('p', carStats('panda_civix', 1, 1, stage), ctl);
  for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120);
  return r;
}
const clean = run1(1, 1, 1, 7), stay = fumble(false), rec = fumble(true);
console.log(`downshift: clean ${clean.time.toFixed(2)} s · early 2→3 and stay ${stay.finish!.toFixed(2)} s · early 2→3 then downshift + redo ${rec.finish!.toFixed(2)} s`);
check(rec.downshifts === 1 && rec.shifts.length === 4, `downshift used once, still one graded shift per gear (${rec.shifts.map(s => s.grade[0]).join('')})`);
check(rec.shifts[1].grade === 'Perfect', `redoing 2→3 replaces the Early grade (${rec.shifts[1].grade})`);
check(rec.finish! < stay.finish!, `downshifting to recover beats living with an early shift (${rec.finish!.toFixed(2)} < ${stay.finish!.toFixed(2)})`);
check(rec.finish! > clean.time, `…but is still slower than shifting right the first time (${rec.finish!.toFixed(2)} > ${clean.time.toFixed(2)})`);
// no safety net (owner): a downshift at speed over-revs — no drive + engine braking, and it costs real time
let asked = false, said = '', vBefore = 0, vMin = 1e9;
const fast = fumble(false, (r) => {
  if (!asked && r.gear === 3 && r.shifting <= 0 && r.rpm / r.stats.redline > 0.85) { asked = true; vBefore = r.v; return true; }
  if (asked) { if (r.lastEvent && r.lastEvent.text === 'Over-rev') said = 'Over-rev'; if (r.gear === 2 && r.rpm >= r.stats.redline) vMin = Math.min(vMin, r.v); }
  return false;
});
check(fast.downshifts === 1 && said === 'Over-rev' && vMin < vBefore, `downshift at speed is allowed and over-revs: engine braking slows the car (${(vBefore * 2.237).toFixed(0)} → ${(vMin * 2.237).toFixed(0)} mph)`);
check(fast.finish! > stay.finish!, `over-revving costs time (${fast.finish!.toFixed(2)} s)`);
process.exit(fail ? 1 : 0);
