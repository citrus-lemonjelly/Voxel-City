// Headless race simulation: checks timing targets and that transmission tiers behave as designed.
// Run: npx tsx tests/sim.ts
import { Race, Racer, Controller } from '../src/game/race';
import { AIController } from '../src/game/ai';
import { carStats } from '../src/game/stats';
import { STAGES } from '../src/data/stages';
import { Tier } from '../src/data/parts';
import { CARS, CATALOG_ORDER, LEAGUES } from '../src/data/cars';
import { makeRival, simTime, MATCH } from '../src/game/rivals';

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
// catalog cars (owner Q79): every car finishes, the starter is the slowest, the hypercar the quickest
const carTime = (id: string) => {
  const race = new Race(stage.distanceM); const r = race.add('p', carStats(id, 1, 1, stage), new AIController(1, [0.2, 0.2], 7));
  for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120);
  return r.finish ?? 99;
};
const times = Object.fromEntries(CATALOG_ORDER.map(id => [id, carTime(id)]));
const line = CATALOG_ORDER.map(id => `${id} ${times[id].toFixed(2)}`).join(' · ');
check(CATALOG_ORDER.every(id => CARS[id] && times[id] < 28), `every catalog car finishes 800 m at T1 (${line})`);
check(CATALOG_ORDER.filter(id => id !== 'panda_civix').every(id => times[id] < times.panda_civix) && CATALOG_ORDER.every(id => id === 'hyper' || times[id] > times.hyper), 'bought cars beat the free Civix; the hypercar is the quickest');
const leagueD = CATALOG_ORDER.filter(id => CARS[id].league === 'D');
check(leagueD.every((id, i) => i === 0 || times[id] < times[leagueD[i - 1]]) && leagueD.every(id => times[id] > 23), `League D: each step up in price is a little quicker, all close to the Civix (${leagueD.map(id => times[id].toFixed(2)).join(' → ')})`);
// league pass (owner Q83): on stock parts, every car in a league is quicker than every car in the league below
const used = LEAGUES.filter(l => CATALOG_ORDER.some(id => CARS[id].league === l));
const band = (l: string) => CATALOG_ORDER.filter(id => CARS[id].league === l).map(id => times[id]);
check(used.every((l, i) => i === 0 || Math.max(...band(l)) < Math.min(...band(used[i - 1]))), `each league is clearly quicker than the one below (${used.map(l => `${l} ${Math.min(...band(l)).toFixed(1)}–${Math.max(...band(l)).toFixed(1)}`).join(' · ')})`);
check(times.hyper <= 12, `hypercar clears 800 m in 12 s or less on stock parts (${times.hyper.toFixed(2)} s, owner Q89)`);
// random rivals (owner Q87): same league, never faster than your perfect run, close enough that mistakes lose
const configs: [string, Tier, Tier][] = [['panda_civix', 1, 1], ['classic', 3, 2], ['muscle', 1, 1], ['rally', 4, 5], ['tuner', 5, 5], ['hyper', 2, 4]];
let sameLeague = true, inWindow = true, perfectWins = 0, sloppyWins = 0, n = 0; const gaps: number[] = [];
for (const [id, e, t] of configs) for (let k = 1; k <= 8; k++) {
  const rv = makeRival(id, e, t, stage, k * 7919);
  sameLeague &&= CARS[rv.carId].league === CARS[id].league;
  const gap = rv.expect - rv.yours; gaps.push(gap); inWindow &&= gap >= MATCH.minGap && gap <= MATCH.maxGap + 0.15;
  const race = new Race(stage.distanceM);
  const me = race.add('p', carStats(id, e, t, stage), new AIController(1, [MATCH.reaction, MATCH.reaction], 7));
  const them = race.add('r', carStats(rv.carId, rv.engineTier as Tier, rv.transTier as Tier, stage), new AIController(rv.skill, rv.reaction, rv.seed));
  for (let i = 0; i < 120 * 90 && !race.done; i++) race.step(1 / 120);
  if (me.finish! < them.finish!) perfectWins++;
  if (simTime(id, e, t, stage, 0.7, [MATCH.reaction, MATCH.reaction + 0.1], k) < rv.expect) sloppyWins++;
  n++;
}
check(sameLeague, 'rivals always drive a car from your league');
check(inWindow, `rivals finish just behind your perfect run (gaps ${Math.min(...gaps).toFixed(2)}–${Math.max(...gaps).toFixed(2)} s)`);
check(perfectWins === n, `a perfect run beats every rival (${perfectWins}/${n})`);
check(sloppyWins < n * 0.35, `a sloppy run (skill 0.7) mostly loses — races are a challenge (${sloppyWins}/${n} wins)`);
process.exit(fail ? 1 : 0);
