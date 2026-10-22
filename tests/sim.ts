// Headless race simulation: checks timing targets and that transmission tiers behave as designed.
// Run: npx tsx tests/sim.ts
import { Race, Racer, Controller } from '../src/game/race';
import { AIController, makeRng as makeRngT } from '../src/game/ai';
import { carStats } from '../src/game/stats';
import { STAGES } from '../src/data/stages';
import { Tier, Tune, STOCK_TUNE, MAX_TUNE, allAt, GEARINGS, Gearing } from '../src/data/parts';
import { CARS, CATALOG_ORDER, LEAGUES } from '../src/data/cars';
import { makeRival, simTime, MATCH } from '../src/game/rivals';
import { CHANGELOG, VERSION } from '../src/data/changelog';
import { isNewer } from '../src/game/updates';
import { keysOf, keyMatches, keyName } from '../src/game/keys';
import { TypingRun, typistSchedule, makeTypingRace, placeOf, averageWpm, averageFor, wpmOf, typedBy, glide } from '../src/game/typing';
import { PASSAGES, PASSAGES_BY_DIFFICULTY } from '../src/data/passages';
import { typingPay, TYPING } from '../src/data/economy';
import { VISUAL_PARTS, isFactory, randomParts, ownsPart, PART_SLOTS } from '../src/data/visualParts';
import { COSMETIC_PRICES } from '../src/data/economy';
// @ts-ignore — node built-in (no @types/node in this repo)
import { readFileSync } from 'node:fs';
import { stripRung, stripBand, STRIP, levelReward } from '../src/game/strip';
import { dyno } from '../src/game/dyno';
import { wetStage } from '../src/data/stages';
import { PART_LEAGUE, DIST_PAY, racePay as racePayD } from '../src/data/economy';
import { TRANSMISSION, legalRatios, RATIO_TUNING } from '../src/data/parts';

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
  const r = race.add('p', carStats('panda_civix', { engine, trans }, stage), new AIController(skill, [0.2, 0.2], seed));
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
  const r = race.add('p', carStats('panda_civix', STOCK_TUNE, stage), ctl);
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
  const race = new Race(stage.distanceM); const r = race.add('p', carStats(id, STOCK_TUNE, stage), new AIController(1, [0.2, 0.2], 7));
  for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120);
  return r.finish === undefined ? 99 : r.finish - r.launchTime;   // the car's time from its launch (the driver's reaction is not the car)
};
const times = Object.fromEntries(CATALOG_ORDER.map(id => [id, carTime(id)]));
const line = CATALOG_ORDER.map(id => `${id} ${times[id].toFixed(2)}`).join(' · ');
check(CATALOG_ORDER.every(id => CARS[id] && times[id] < 28), `every catalog car finishes 800 m at T1 (${line})`);
check(CATALOG_ORDER.filter(id => id !== 'panda_civix').every(id => times[id] < times.panda_civix) && CATALOG_ORDER.every(id => id === 'hyper' || times[id] > times.hyper), 'bought cars beat the free Civix; the hypercar is the quickest');
const leagueD = CATALOG_ORDER.filter(id => CARS[id].league === 'D');   // Voxel cars by price, then the Crowns car
check(leagueD.every((id, i) => i === 0 || times[id] < times[leagueD[i - 1]]) && leagueD.every(id => times[id] > 23), `League D: each step up in price is a little quicker, all close to the Civix (${leagueD.map(id => times[id].toFixed(2)).join(' → ')})`);
// league pass (owner Q83): on stock parts, every car in a league is quicker than every car in the league below
const used = LEAGUES.filter(l => CATALOG_ORDER.some(id => CARS[id].league === l));
const band = (l: string) => CATALOG_ORDER.filter(id => CARS[id].league === l).map(id => times[id]);
check(used.every((l, i) => i === 0 || Math.max(...band(l)) < Math.min(...band(used[i - 1]))), `each league is clearly quicker than the one below (${used.map(l => `${l} ${Math.min(...band(l)).toFixed(1)}–${Math.max(...band(l)).toFixed(1)}`).join(' · ')})`);
// per-car tuning (owner 2026-10-18): small stock edge, fully upgraded cars converge, dash vs long-run character
const tAt = (id: string, tune: Partial<Tune>, d: number) => { const race = new Race(d); const r = race.add('p', carStats(id, tune, stage), new AIController(1, [0.25, 0.25], 7)); for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120); return r.finish!; };
/** quickest of the three gearings (the player picks it freely) */
const bestAt = (id: string, tune: Partial<Tune>, d: number) => Math.min(...GEARINGS.map(g => tAt(id, { ...tune, gearing: g.id }, d)));
let converge = true, stockSmall = true, character = true; const notes: string[] = [];
for (const l of used) {
  const ids = CATALOG_ORDER.filter(id => CARS[id].league === l); if (ids.length < 2) continue;
  // fully upgraded = every part at T5 on the car's best gearing; character = engine + gearbox maxed on factory gearing
  const t5 = ids.map(id => bestAt(id, MAX_TUNE, 800)), t1 = ids.map(id => tAt(id, STOCK_TUNE, 800)), d6 = ids.map(id => tAt(id, { engine: 5, trans: 5 }, 600)), c8 = ids.map(id => tAt(id, { engine: 5, trans: 5 }, 800));
  const spread5 = Math.max(...t5) - Math.min(...t5), spread1 = Math.max(...t1) - Math.min(...t1);
  converge &&= spread5 <= 0.2; stockSmall &&= spread1 <= 0.6;
  const best800 = ids[c8.indexOf(Math.min(...c8))], best600 = ids[d6.indexOf(Math.min(...d6))];
  character &&= best800 !== best600 && CARS[best600].character === 'dash' && CARS[best800].character === 'long';
  notes.push(`${l}: stock ±${spread1.toFixed(2)} → T5 ±${spread5.toFixed(2)} · 600 m ${best600} · 800 m ${best800}`);
}
check(stockSmall, `pricier cars start only slightly quicker (${notes.map(n => n.split(' → ')[0]).join(' | ')})`);
check(converge, `fully upgraded cars in a league (every part T5, best gearing) finish 800 m within 0.2 s of each other (${notes.map(n => n.split(": ")[0] + " " + n.split(" → ")[1].split(" · ")[0]).join(" | ")})`);
check(character, `dash cars win 600 m, long-run cars win 800 m with engine + gearbox maxed (${notes.map(n => n.split(' · ').slice(1).join(' / ')).join(' | ')})`);
check(times.hyper <= 12, `hypercar clears 800 m in 12 s or less on stock parts (${times.hyper.toFixed(2)} s, owner Q89)`);
// random rivals (owner Q87): same league, never faster than your perfect run, close enough that mistakes lose
const configs: [string, Tune][] = [['panda_civix', STOCK_TUNE], ['classic', { engine: 3, trans: 2, tires: 2, weight: 1, turbo: 3, nitrous: 2, gearing: 'short' }], ['muscle', STOCK_TUNE],
  ['rally', { engine: 4, trans: 5, tires: 3, weight: 4, turbo: 2, nitrous: 3 }], ['tuner', { ...MAX_TUNE, gearing: 'long' }], ['hyper', { engine: 2, trans: 4, tires: 1, weight: 5, turbo: 1, nitrous: 1 }]];
let sameLeague = true, inWindow = true, perfectWins = 0, sloppyWins = 0, n = 0; const gaps: number[] = [];
const rivalTunes = new Set<string>();
for (const [id, tune] of configs) for (let k = 1; k <= 8; k++) {
  const rv = makeRival(id, tune, stage, k * 7919); rivalTunes.add(JSON.stringify(rv.tune));
  sameLeague &&= CARS[rv.carId].league === CARS[id].league;
  const gap = rv.expect - rv.yours; gaps.push(gap); inWindow &&= gap >= MATCH.minGap && gap <= MATCH.maxGap + 0.15;
  const race = new Race(stage.distanceM);
  const me = race.add('p', carStats(id, tune, stage), new AIController(1, [MATCH.reaction, MATCH.reaction], 7));
  const them = race.add('r', carStats(rv.carId, rv.tune, stage), new AIController(rv.skill, rv.reaction, rv.seed));
  for (let i = 0; i < 120 * 90 && !race.done; i++) race.step(1 / 120);
  if (me.finish! < them.finish!) perfectWins++;
  if (simTime(id, tune, stage, 0.7, [MATCH.reaction, MATCH.reaction + 0.1], k, stage.distanceM, false) < rv.expect) sloppyWins++;   // skill only: no nitrous either side of the reference
  n++;
}
check(sameLeague, 'rivals always drive a car from your league');
check(rivalTunes.size >= n * 0.75, `rivals carry random parts and gearing for variety (${rivalTunes.size} different set-ups in ${n} rivals, owner Q173)`);
check(inWindow, `rivals finish just behind your perfect run (gaps ${Math.min(...gaps).toFixed(2)}–${Math.max(...gaps).toFixed(2)} s)`);
check(perfectWins === n, `a perfect run beats every rival (${perfectWins}/${n})`);
check(sloppyWins < n * 0.4, `a sloppy run (skill 0.7) mostly loses — races are a challenge (${sloppyWins}/${n} wins)`);
// the Strip (owner Q100): a stock starter clears the first rungs, mid upgrades get halfway, a maxed car reaches the top
// the player picks the best gearing for each rung's length
const climb = (id: string, tune: Tune) => { let n = 0; while (n < STRIP.rungs) { const r = stripRung(CARS[id].league, n + 1, stage); if (Math.min(...GEARINGS.map(g => simTime(id, { ...tune, gearing: g.id }, stage, 1, [MATCH.reaction, MATCH.reaction], 7, r.dist))) >= r.rival.expect) break; n++; } return n; };
const cl = [climb('panda_civix', STOCK_TUNE), climb('panda_civix', allAt(3)), climb('panda_civix', MAX_TUNE)];
check(cl[0] >= 10 && cl[0] < 30 && cl[1] > cl[0] && cl[1] < 50 && cl[2] >= 55, `Strip D climb with perfect driving: stock ${cl[0]} · T3 ${cl[1]} · T5 ${cl[2]} of ${STRIP.rungs} rungs`);
const rungs = Array.from({ length: STRIP.rungs }, (_, i) => stripRung('D', i + 1, stage));
check(rungs.every(r => r.dist === [800, 600, 700][(r.n - 1) % 3]) && rungs.filter(r => r.boss).length === 6, 'Strip rungs rotate 800 / 600 / 700 m with a boss every 10th');
// every rung harder than the last (owner): position of the rival between the easiest time and the final rival, at that length
const last = rungs[STRIP.rungs - 1].rival;
const rels = rungs.map(r => { const b = stripBand('D', r.dist, stage); return (b.easy - r.rival.expect) / (b.easy - b.final.expect); });
check(rels.every((v, i) => i === 0 || v >= rels[i - 1] - 0.01), `every Strip rung is harder than the one before (difficulty ${rels[0].toFixed(2)} → ${rels[29].toFixed(2)} → ${rels[59].toFixed(2)})`);
check(Object.entries(last.tune).every(([k, v]) => k === 'gearing' || v === 5) && last.skill >= 0.9 && last.expect - last.yours >= 0.02 && last.expect - last.yours < 0.15, `final rung: maxed-out car, near-perfect driver, beaten only by a perfect maxed run (${last.name} · ${last.carId} all T5 ${last.tune.gearing} · skill ${last.skill} · ${(last.expect - last.yours).toFixed(3)} s behind perfect)`);
const lr1 = levelReward('D', 1), lr10 = levelReward('D', 10), lr11 = levelReward('D', 11), lr60 = levelReward('D', 60);
check(lr1.vx === 100 && lr1.crowns === 0 && lr10.crowns === 5 && lr10.cash > 0 && !!lr10.decal && lr11.crowns === 0 && !lr11.decal && lr60.car === 'boss_d' && !lr10.car && levelReward('C', 1).vx > lr1.vx,
  `Strip rewards: L1 +100 VX · bosses +5 Crowns, cash (L10 +${lr10.cash.toLocaleString()} VX), a decal · L60 also the boss car · higher leagues pay more`);
// boss cars (owner 2026-10-19): head start in the next league, then outmatched by upgraded cars
const nextOf: Record<string, string> = { boss_d: 'C', boss_c: 'B', boss_b: 'A', boss_a: 'S', boss_s: 'S' };
let headStart = true, outmatched = true; const bn: string[] = [];
for (const [b, lg] of Object.entries(nextOf)) {
  const ids = CATALOG_ORDER.filter(id => CARS[id].league === lg), bt = bestAt(b, STOCK_TUNE, 800);
  const bestStock = Math.min(...ids.map(id => bestAt(id, STOCK_TUNE, 800))), bestMax = Math.min(...ids.map(id => bestAt(id, MAX_TUNE, 800)));
  headStart &&= CARS[b].league === lg && bt < bestStock; outmatched &&= bestMax < bt - 0.3; bn.push(`${b} ${bt.toFixed(2)} vs ${lg} stock ${bestStock.toFixed(2)} / maxed ${bestMax.toFixed(2)}`);
}
check(headStart && outmatched, `boss cars: quicker than any stock car in the next league, beaten by upgraded ones (${bn.join(' · ')})`);
// Tuning Update (V0.11.0, owner Q165–Q173): tyres, weight, turbo, gearing
{
  const { torqueAt } = await import('../src/game/stats');
  const lgs = used.filter(l => l !== 'S' || true);
  const avg = (l: string, tune: Partial<Tune>) => { const ids = CATALOG_ORDER.filter(id => CARS[id].league === l); return ids.reduce((a, id) => a + tAt(id, tune, 800), 0) / ids.length; };
  const helps = lgs.map(l => { const st = avg(l, STOCK_TUNE); return [l, st - avg(l, { tires: 5 }), st - avg(l, { weight: 5 }), st - avg(l, { turbo: 5 })] as [string, number, number, number]; });
  const everyCar = CATALOG_ORDER.every(id => tAt(id, { weight: 5 }, 800) < tAt(id, STOCK_TUNE, 800) && tAt(id, { turbo: 5 }, 800) < tAt(id, STOCK_TUNE, 800));
  check(helps.every(h => h[1] > 0 && h[2] > 0 && h[3] > 0) && everyCar,
    `tyres, weight and turbo T5 each make cars quicker (s saved at 800 m, league average — tyres / weight / turbo: ${helps.map(h => `${h[0]} ${h[1].toFixed(2)}/${h[2].toFixed(2)}/${h[3].toFixed(2)}`).join(' · ')})`);
  const c0 = carStats('panda_civix', STOCK_TUNE, stage), cT = carStats('panda_civix', { turbo: 5 }, stage), cW = carStats('panda_civix', { weight: 5, turbo: 5 }, stage), cY = carStats('panda_civix', { tires: 5 }, stage);
  const lo = 0.35 * c0.redline, hi = 0.95 * c0.redline;
  check(Math.abs(cT.massKg / c0.massKg - 1.05) < 1e-9 && Math.abs(cW.massKg / c0.massKg - 0.97) < 1e-9 && torqueAt(cT, lo) < torqueAt(c0, lo) && torqueAt(cT, hi) > torqueAt(c0, hi) * 1.2
    && cY.tractionN > c0.tractionN * 1.2 && cY.launch.perfectMax - cY.launch.perfectMin > (c0.launch.perfectMax - c0.launch.perfectMin) * 1.25,
    `turbo: less pull low in the revs, +${Math.round((torqueAt(cT, hi) / torqueAt(c0, hi) - 1) * 100)}% high up, +5% weight (Q168); weight T5 + turbo T5 = −3%; tyres T5 +22% grip, +30% launch window`);
  const gearBest = (id: string, tune: Partial<Tune>, d: number) => { const v = GEARINGS.map(g => tAt(id, { ...tune, gearing: g.id }, d)); return GEARINGS[v.indexOf(Math.min(...v))].id; };
  const stockShort = CATALOG_ORDER.every(id => gearBest(id, STOCK_TUNE, 800) === 'short');
  const maxPicks = CATALOG_ORDER.map(id => gearBest(id, MAX_TUNE, 800)), picks = (g: Gearing) => maxPicks.filter(x => x === g).length;
  check(stockShort && picks('long') >= 3 && picks('long') < maxPicks.length, `gearing is a real choice: every stock car is quickest on Short; maxed at 800 m — Short ${picks('short')} · Balanced ${picks('balanced')} · Long ${picks('long')} cars`);
  const limit = used.slice(1).map((l, i) => { const below = used[i], ids = (lg: string) => CATALOG_ORDER.filter(id => CARS[id].league === lg);
    return [below, Math.min(...ids(below).map(id => bestAt(id, MAX_TUNE, 800))), l, Math.min(...ids(l).map(id => bestAt(id, STOCK_TUNE, 800)))] as [string, number, string, number]; });
  check(limit.every(x => x[1] > x[3]), `class limit (U3): a maxed car never beats a stock car of the next league (${limit.map(x => `${x[0]} maxed ${x[1].toFixed(2)} > ${x[2]} stock ${x[3].toFixed(2)}`).join(' · ')})`);
  // saves from before the update: the new parts arrive at stock, nothing else changes
  const S = await import('../src/save/save'), E = await import('../src/data/economy');
  const old = { ...S.freshSave(), owned: { engine: [1, 2], trans: [1] }, equipped: { engine: 2, trans: 1 }, cars: { panda_civix: { owned: { engine: [1, 2], trans: [1] }, equipped: { engine: 2, trans: 1 }, paint: '', opts: {}, parts: {} } } };
  const store: Record<string, string> = { 'voxelcity.save': JSON.stringify(old) };
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  const ld = S.loadSave(), c = ld.cars.panda_civix;
  check(ld.equipped.engine === 2 && ld.equipped.tires === 1 && ld.equipped.turbo === 1 && c.owned.weight.join() === '1' && c.equipped.tires === 1 && JSON.stringify(ld.owned.engine) === '[1,2]'
    && E.sellValue('D', 10_000, { ...c.owned, turbo: [1, 3] }) === Math.round((5_000 + E.partPrice('engine', 2, 'D') / 2 + E.partPrice('turbo', 3, 'D') / 2) / 50) * 50,
    'old saves keep their engine/gearbox and get tyres, weight and turbo at stock; selling counts every part');
  delete (globalThis as any).localStorage;
}
// economy: harder Street Races pay more; each league's cheapest car takes no more Medium wins than the league below
const { racePay, CAR_PRICES } = await import('../src/data/economy');
const wins = LEAGUES.map(l => { const cheapest = Math.min(...CATALOG_ORDER.filter(id => CARS[id].league === l && CARS[id].currency !== 'crowns' && CAR_PRICES[id].price > 0).map(id => CAR_PRICES[id].price)); return cheapest / racePay(l as any, 'medium', true).result; });
check(racePay('D', 'hard', true).result > racePay('D', 'medium', true).result && racePay('D', 'medium', true).result > racePay('D', 'easy', true).result && wins.every((w, i) => i === 0 || w <= wins[i - 1] + 0.01),
  `pay: Hard > Medium > Easy; Medium wins to buy each league's cheapest car: ${LEAGUES.map((l, i) => `${l} ${wins[i].toFixed(1)}`).join(' · ')}`);
check(rungs.slice(0, 10).every(r => r.rival.skill < rungs[50].rival.skill), 'early Strip rivals drive worse than late ones');
// patch notes (owner 2026-10-19): newest first, versions unique and rising, package.json matches
{
  const vn = (v: string) => v.split('.').reduce((a, x) => a * 1000 + +x, 0);
  const pkgVer = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  check(CHANGELOG.every((v, i) => /^\d+\.\d+\.\d+$/.test(v.version) && (i === 0 || vn(v.version) < vn(CHANGELOG[i - 1].version))) && VERSION === pkgVer,
    `patch notes: ${CHANGELOG.length} versions, newest first; current V${VERSION} = package.json ${pkgVer}`);
}
// visual parts v2 (owner Q117/Q118): every sold part has a price, boss decals are never sold, rivals' parts are looks-only picks
{
  const sold = VISUAL_PARTS.filter(p => !isFactory(p) && !p.won), won = VISUAL_PARTS.filter(p => p.won);
  const r1 = randomParts(makeRngT(42)), r2 = randomParts(makeRngT(42));
  check(sold.every(p => COSMETIC_PRICES[p.id]?.price > 0) && won.every(p => !COSMETIC_PRICES[p.id]) && won.length === 30 && PART_SLOTS.length === 17
    && ownsPart('decal.boss_D_3', [], ['decal_D_3']) && !ownsPart('decal.boss_D_4', [], ['decal_D_3']) && JSON.stringify(r1) === JSON.stringify(r2)
    && Object.values(r1).every(v => !String(v).startsWith('boss_')),
    `visual parts: ${sold.length} for sale (all priced), ${won.length} boss decals (won, never sold), ${PART_SLOTS.length} tabs; rival parts repeatable: ${JSON.stringify(r1)}`);
}
// update notice (owner V0.2.1): a newer build time = update; same or older = none
{
  const mine = { version: '0.2.1', built: '2026-10-19T23:30:00.000Z' };
  check(isNewer({ version: '0.2.2', built: '2026-10-20T01:00:00.000Z' }, mine) && !isNewer({ version: '0.2.1', built: mine.built }, mine) && !isNewer({ version: '0.2.0', built: '2026-10-19T20:00:00.000Z' }, mine) && !isNewer(null, mine),
    'update notice: only a newer build on the site counts as an update');
}
// Typing Race (owner 2026-10-19, Q122–Q129)
{
  const T = PASSAGES_BY_DIFFICULTY, kb = (p: string) => /^[A-Za-z0-9 .,'"?!:;()&#/-]+$/.test(p) && !/  /.test(p) && !/^ | $/.test(p);
  const len = (a: string[]) => [Math.min(...a.map(p => p.length)), Math.max(...a.map(p => p.length))];
  const avgWord = (a: string[]) => a.join(' ').split(' ').reduce((x, w) => x + w.length, 0) / a.join(' ').split(' ').length;
  const hardMarks = T.hard.every(p => /[0-9]/.test(p) || /["():;]/.test(p));
  check(PASSAGES.every(kb) && T.easy.length >= 20 && T.medium.length >= 40 && T.hard.length >= 20 && len(T.easy)[1] <= 160 && len(T.medium)[0] >= 150 && len(T.hard)[0] >= 170
    && avgWord(T.easy) < avgWord(T.medium) && hardMarks && new Set(PASSAGES).size === PASSAGES.length,
    `typing passages by difficulty: Easy ${T.easy.length} (${len(T.easy).join('–')} chars, words ${avgWord(T.easy).toFixed(1)}), Medium ${T.medium.length} (${len(T.medium).join('–')}, ${avgWord(T.medium).toFixed(1)}), Hard ${T.hard.length} (${len(T.hard).join('–')}, numbers / quotes / colons)`);
  const tierOk = (['easy', 'medium', 'hard'] as const).every(d => [1, 2, 3, 4, 5].every(seed => T[d].includes(makeTypingRace(seed, 50, d, 'D').text)));
  check(tierOk, 'typing: each difficulty races its own passages');
  // nitro (owner 2026-10-19): two uses; Space mid-word finishes the word (and its space); clears a typo; no accuracy cost
  const nr = new TypingRun('one two three four');
  const n1 = [nr.key('o', 1), nr.nitro(1.2), nr.pos, nr.nitros, nr.key('t', 2), nr.key('x', 2.1), nr.typo, nr.nitro(2.2), nr.pos, nr.typo, nr.nitros, nr.key(' ', 3), nr.errors, nr.pos];
  check(JSON.stringify(n1) === JSON.stringify(['ok', 'nitro', 4, 1, 'ok', 'typo', true, 'nitro', 8, false, 0, 'typo', 2, 8]) && nr.keys === 4 + 0,
    `typing nitro (its own key, Enter): finishes the word, two per race, clears a red letter; Space only ever types a space (${JSON.stringify(n1)})`);
  const last = new TypingRun('go now'); last.key('g', 1); last.key('o', 1.1); last.key(' ', 1.2); last.key('n', 1.3); last.nitro(1.4);
  const sp = new TypingRun('ab cd'); sp.key('a', 1); sp.key('b', 1.1); sp.nitro(1.2);
  check(last.done && last.finish === 1.4 && sp.done, 'typing nitro: on a space it finishes the next word; on the last word it finishes the race');
  check(keyMatches('ShiftRight', 'ShiftLeft') && !keyMatches('KeyA', 'Space') && keyMatches('Enter', 'Enter') && keyName('KeyQ') === 'Q' && keyName('ShiftLeft') === 'SHIFT' && keyName('Space') === 'SPACE'
    && keysOf({}).typing.nitro === 'Enter' && keysOf({ keys: { drag: { gas: 'KeyW' } } }).drag.gas === 'KeyW' && keysOf({ keys: { drag: { gas: 'KeyW' } } }).drag.down === 'ShiftLeft',
    'controls: bindings fill in defaults (Typing nitro = Enter), Shift matches either side, key names read plainly');
  check(Math.abs(averageFor({ recent: [60] }, 'hard') - 60 * TYPING.textSpeed.hard) < 1e-9 && averageFor({ recent: [60], recentBy: { hard: [40, 42, 44] } }, 'hard') === 42,
    'typing: rivals match your average for that difficulty (starting from your overall average, adjusted for the text)');
  const run = new TypingRun('ab c');
  const a = [run.key('a', 1), run.key('x', 2), run.key('x', 2.1), run.pos, run.typo, run.key('b', 3), run.key(' ', 3.5), run.key('c', 4), run.done, run.finish, run.errors, run.keys];
  check(JSON.stringify(a) === JSON.stringify(['ok', 'typo', 'typo', 1, true, 'ok', 'ok', 'ok', true, 4, 2, 6]) && Math.abs(run.accuracy - 4 / 6) < 1e-9,
    `typing: a wrong key holds you on that letter until the right one; accuracy counts every key (${JSON.stringify(a)})`);
  const sch = typistSchedule(PASSAGES[3], 60, 9), fin = sch[sch.length - 1];
  check(Math.abs(wpmOf(PASSAGES[3].length, fin) - 60) < 1e-6 && sch.every((t, i) => i === 0 || t > sch[i - 1]), `typing: a 60 wpm rival finishes at exactly 60 wpm (${fin.toFixed(2)} s), typing in a human rhythm`);
  // matching (Q125): typing at your average beats every Medium rival; Easy is easier, Hard needs more than your average
  const avg = 60, field = (d: any) => [1, 2, 3, 4, 5, 6, 7, 8].map(seed => makeTypingRace(seed, avg, d, 'D'));
  const yourTime = (text: string, w: number) => (text.length / 5) / w * 60;
  const medWin = field('medium').every(r => placeOf(yourTime(r.text, avg), r.rivals) === 1);
  const hardLose = field('hard').every(r => placeOf(yourTime(r.text, avg), r.rivals) > 1);
  const easyWin = field('easy').every(r => placeOf(yourTime(r.text, avg * 0.85), r.rivals) === 1);
  const medClose = field('medium').every(r => Math.max(...r.rivals.map(x => x.wpm)) > avg * 0.95);
  check(medWin && hardLose && easyWin && medClose && averageWpm([]) === TYPING.defaultWpm && averageWpm([50, 70]) === 60,
    'typing rivals: at your average you just win Medium, Easy forgives a slow race, Hard needs better than your average');
  const p = [1, 2, 3, 4, 5].map(pl => typingPay('D', 'medium', pl, false, 0.9).result);
  check(p.every((v, i) => i === 0 || v < p[i - 1]) && typingPay('B', 'hard', 1, true, 0.99).result > typingPay('D', 'hard', 1, true, 0.99).result && typingPay('D', 'medium', 1, true, 0.99).newBest > 0 && typingPay('D', 'medium', 1, false, 0.97).accuracy === 0,
    `typing pay: places ${p.join(' / ')} VX (League D Medium), scales with league, best-WPM and 98%+ accuracy bonuses`);
  const r0 = makeTypingRace(5, 60, 'medium', 'D').rivals[0];
  check(typedBy(r0, 0) === 0 && typedBy(r0, r0.finish) === r0.schedule.length && JSON.stringify(makeTypingRace(5, 60, 'medium', 'D')) === JSON.stringify(makeTypingRace(5, 60, 'medium', 'D')), 'typing: rivals are seeded — the same race replays exactly');
}
// car glide (owner Q131): typing at 60 wpm then stopping → the car keeps rolling, slows smoothly, never passes your letters
{
  const perChar = 2226 / 160, dt = 1 / 60; let x = 0, v = 0, target = 0, t = 0; const after: number[] = [];
  for (; t < 5; t += dt) { target = Math.floor(t * 5) * perChar; [x, v] = glide(x, v, target, dt); }   // 5 chars/s = 60 wpm
  const stopAt = x, vStop = v; let moving = 0, smooth = true, never = true, prev = v;
  for (let i = 0; i < 180; i++) { [x, v] = glide(x, v, target, dt); after.push(x); if (v > 1) moving += dt; if (v > prev + 1e-6) smooth = false; if (x > target + 1e-9) never = false; prev = v; }
  check(vStop > 30 && moving > 0.6 && smooth && never && target - after[after.length - 1] < 1,
    `typing glide: stop typing at ${(vStop).toFixed(0)} blocks/s → the car rolls on ${(target - stopAt).toFixed(0)} blocks over ~${moving.toFixed(1)} s, slowing smoothly, never past your letters`);
}
// Body Shop (owner 2026-10-19): every part has a price, plate text rules, paint prices, pop-ups only where they fit
{
  const { VISUAL_PARTS, isFactory } = await import('../src/data/visualParts');
  const { COSMETIC_PRICES, PAINT, PLATE_TEXT, repaintPrice } = await import('../src/data/economy');
  const { cleanPlate } = await import('../src/data/plates');
  const unpriced = VISUAL_PARTS.filter(p => !isFactory(p) && !p.won && !COSMETIC_PRICES[p.id]).map(p => p.id);
  check(unpriced.length === 0, `body shop: every part has a price${unpriced.length ? ' — missing ' + unpriced.join(', ') : ''}`);
  check(cleanPlate('ab#c 12345') === 'ABC 123' && cleanPlate('vx-1') === 'VX-1' && PLATE_TEXT.crowns > 0, `plate text: upper case, A–Z 0–9 space -, max 7 ("${cleanPlate('ab#c 12345')}"), ${PLATE_TEXT.crowns} Crowns a change`);
  check(repaintPrice('S' as any) > repaintPrice('D' as any) && PAINT.premium.every(p => (p.crowns > 0 || !!p.calendar) && /^#[0-9a-f]{6}$/.test(p.color)), `paint: repaint ${repaintPrice('D' as any)} VX (League D) → ${repaintPrice('S' as any)} VX (League S); ${PAINT.premium.length} premium paints`);
}
// Economy Update (owner 2026-10-19, V0.9.0): league-priced visual parts owned per league, selling, garage slots,
// dailies + login calendar, typing pay parity
{
  const E = await import('../src/data/economy');
  const S = await import('../src/save/save');
  const Dy = await import('../src/game/daily');
  const gtD = E.cosmeticPrice('spoiler.gt', 'D').price, gtS = E.cosmeticPrice('spoiler.gt', 'S').price, crown = E.cosmeticPrice('hood.carbon', 'S');
  const own = ownsPart('spoiler.gt', ['C:spoiler.gt'], [], 'C') && !ownsPart('spoiler.gt', ['C:spoiler.gt'], [], 'D') && ownsPart('spoiler.gt', ['spoiler.gt'], [], 'S');
  check(gtD === 14_000 && gtS > gtD * 70 && crown.currency === 'crowns' && crown.price === 30 && own,
    `visual parts per league: GT wing ${gtD.toLocaleString()} VX (D) → ${gtS.toLocaleString()} VX (S); Crowns parts one price; owned per league (parts bought before V0.9.0 fit every car)`);
  const sv = S.freshSave(); S.addCar(sv, 'city'); sv.cars.city.owned.engine = [1, 2];
  const val = E.sellValue('D', CARS.city.price, sv.cars.city.owned);
  const blocks = [S.sellBlock(sv, 'panda_civix'), S.sellBlock(sv, 'city')];
  S.switchCar(sv, 'city'); const inUse = S.sellBlock(sv, 'city'); S.switchCar(sv, 'panda_civix');
  S.addCar(sv, 'boss_d'); S.addCar(sv, 'perfhatch');
  check(val === Math.round((CARS.city.price / 2 + E.partPrice('engine', 2, 'D') / 2) / 50) * 50 && !!blocks[0] && blocks[1] === null && !!inUse && !!S.sellBlock(sv, 'boss_d') && !!S.sellBlock(sv, 'perfhatch'),
    `selling: City car + T2 engine sells for ${val.toLocaleString()} VX (half of each); starter, boss, Crowns cars and the car in use can't be sold`);
  check(S.slotsUsed(sv) === 3 && S.slotsTotal(sv) === E.GARAGE.freeSlots && (sv.slotsBought = 2, S.slotsTotal(sv) === E.GARAGE.freeSlots + 2),
    `garage slots: ${E.GARAGE.freeSlots} free, ${E.GARAGE.slotCrowns} Crowns each; boss cars don't take one`);
  const d1 = Dy.dailyFor(sv), ids = [...d1.ids];
  const kinds = ids.map(id => Dy.TASK_BY_ID[id].kind);
  for (const id of ids) { const t = Dy.TASK_BY_ID[id]; Dy.dailyEvent(sv, t.event, t.target); }
  const vx0 = sv.voxels, cr0 = sv.crowns, got = [0, 1, 2].map(i => Dy.claimDaily(sv, i, 'D')), bonus = Dy.claimDaily(sv, -1, 'D'), again = Dy.claimDaily(sv, 0, 'D');
  Dy.shiftDay(1); const d2 = Dy.dailyFor(sv);
  check(new Set(ids).size === 3 && kinds.includes('drag') && kinds.includes('typing') && got.every(Boolean) && !!bonus && again === null
    && sv.crowns - cr0 === 3 * E.DAILY.crownsEach + E.DAILY.crownsAll && sv.voxels - vx0 === 3 * E.dailyVx('D', E.DAILY.vxShare) && d2.day !== d1.day && d2.claimed.every(c => !c),
    `dailies: 3 tasks a day (a Street Race one + a Typing Race one), claim each once (+${E.dailyVx('D', E.DAILY.vxShare)} VX, +${E.DAILY.crownsEach} Crowns), +${E.DAILY.crownsAll} Crowns for all three, new tasks the next day (today: ${ids.join(', ')})`);
  const cs = S.freshSave(); let crowns = 0, paint = false, twice = true;
  for (let day = 1; day <= 29; day++) { const r = Dy.claimCalendar(cs, 'D'); if (Dy.claimCalendar(cs, 'D')) twice = false; crowns += r?.crowns ?? 0; if (r?.paint) paint = true; Dy.shiftDay(1); }
  check(twice && paint && crowns === 30 && cs.cal!.month === 2 && cs.cal!.n === 1 && (cs.paintsOwned ?? []).includes(E.CALENDAR.finalPaint),
    `login calendar: one day per day, Crowns on days 7/14/21 (${crowns}), day 28 = ${Dy.paintName(E.CALENDAR.finalPaint)} paint, then month 2 starts`);
  const ratios = LEAGUES.map(l => E.typingPerMin(l as any) / E.dragPerMin(l as any));
  check(ratios.every(r => r > 0.88 && r < 1.12), `typing pay parity at ${E.PACING.wpm} wpm: Typing ÷ Street per minute ${ratios.map(r => r.toFixed(2)).join(' · ')} (D → S)`);
}

// ---- Pedal mode (owner 2026-10-21): gas held all race, tap shift-up on green to launch, lift to stop wheelspin ----
{
  /** Scripted Pedal driver: revs to `rev` × redline, taps shift-up at `tapAt` s of race clock (default: right on green),
   *  then AI-perfect shifts. `lift` = [from, to] seconds after green with the gas off; `spinLift` = lift just after launch. */
  const pedal = (o: { rev?: number; tapAt?: number; lift?: [number, number]; spinLift?: boolean; noTap?: boolean } = {}) => {
    const race = new Race(stage.distanceM), ai = new AIController(1, [0.2, 0.2], 7);
    let tapped = false, early = false;
    const ctl: Controller = { pedal: true,
      held: (r, rc) => !r.launched ? r.rpm / r.stats.redline < (o.rev ?? 0.63)
        : !(o.lift && rc.raceTime >= o.lift[0] && rc.raceTime < o.lift[1]) && !(o.spinLift && r.launchTimer < 0.06),
      shift: (r, rc) => { if (r.launched) return r.launchTimer > 0.3 && ai.shift(r); if (o.noTap || tapped || rc.t < (o.tapAt ?? 3)) return false; tapped = true; return true; } };
    const r = race.add('p', carStats('panda_civix', STOCK_TUNE, stage), ctl);
    for (let i = 0; i < 120 * 60 && !race.done; i++) { race.step(1 / 120); if (r.lastEvent?.text === 'Too early') early = true; }
    return { r, time: r.finish ?? 99, early };
  };
  const clean = pedal(), lifted = pedal({ lift: [6, 8] }), spin = pedal({ rev: 0.99 }), spinFix = pedal({ rev: 0.99, spinLift: true });
  check(clean.r.launchGrade === 'Perfect' && Math.abs(clean.time - stockPerfect.time) < 0.6,
    `pedal mode: holding gas + tapping shift-up on green launches (${clean.r.launchGrade}) and runs like Classic (${clean.time.toFixed(2)} vs ${stockPerfect.time.toFixed(2)} s)`);
  check(lifted.time > clean.time + 0.5, `pedal mode: letting go of the gas coasts — 2 s off costs time (${lifted.time.toFixed(2)} > ${clean.time.toFixed(2)})`);
  check(spin.r.launchGrade === 'Wheelspin' && spinFix.r.gripBack === true && spinFix.time < spin.time,
    `pedal mode: lifting off during wheelspin brings grip back and is faster (${spinFix.time.toFixed(2)} < ${spin.time.toFixed(2)}; ${spin.r.launchGrade}, grip back ${spinFix.r.gripBack})`);
  const jump = pedal({ tapAt: 2 }), none = pedal({ noTap: true });
  check(jump.early && jump.r.finish !== undefined, `pedal mode: a tap before green shows "Too early" and does not launch (the car still goes later)`);
  check(none.r.finish !== undefined && none.r.launchTime >= 3, `pedal mode: with no tap at all the car goes by itself ${none.r.launchTime.toFixed(1)} s after green, so the race always ends`);
  check(keysOf({}).drag.up === 'ArrowUp', 'pedal mode: shift up has its own key (default ↑)');
}
// ---- nitrous (V0.16.0) + test run ----
{
  const nosRun = (tier: Tier, fireAt: number) => { const race = new Race(800), ai = new AIController(1, [0.2, 0.2], 7); let fires = 0;
    const ctl: Controller = { held: (r, rc) => ai.held(r, rc), shift: r => ai.shift(r), nitrous: r => { const go = r.launched && r.launchTimer >= fireAt; if (go) fires++; return go; } };
    const r = race.add('p', carStats('panda_civix', { ...STOCK_TUNE, nitrous: tier }, stage), ctl); let burns = 0, was = 0;
    for (let i = 0; i < 120 * 60 && !race.done; i++) { race.step(1 / 120); if (r.nitro > 0 && was <= 0) burns++; was = r.nitro; }
    return { time: r.finish!, burns, used: r.nitroUsed }; };
  const none = nosRun(1, 4), t2 = nosRun(2, 4), t5 = nosRun(5, 4);
  check(none.burns === 0 && t2.burns === 1 && t5.burns === 1 && t5.used, `nitrous: one shot per race, none without the part (burns ${none.burns} / ${t2.burns} / ${t5.burns})`);
  check(t5.time < t2.time && t2.time < none.time, `nitrous: higher tiers are quicker (none ${none.time.toFixed(2)} · T2 ${t2.time.toFixed(2)} · T5 ${t5.time.toFixed(2)} s)`);
  const rows = dyno('panda_civix', STOCK_TUNE, stage), maxed = dyno('panda_civix', MAX_TUNE, stage);
  check(rows.length === 3 && rows.every(r => r.t60 > 0 && r.t600 < r.t800) && maxed[1].t800 < rows[1].t800,
    `test run: 0–60 / 600 m / 800 m on each gearing, maxed beats stock (balanced 800 m ${rows[1].t800.toFixed(2)} → ${maxed[1].t800.toFixed(2)} s)`);
  const wet = dyno('panda_civix', STOCK_TUNE, wetStage(stage));
  check(wet[1].t800 > rows[1].t800 && wet[1].t800 - rows[1].t800 < 1.5, `rain (Q190 B): less grip makes the same car slower, but not hugely (dry ${rows[1].t800.toFixed(2)} → wet ${wet[1].t800.toFixed(2)} s)`);
  // end game (owner 2026-10-22: a maxed hypercar with all-Perfect shifts kept losing). A human-like driver: perfect shifts and launch,
  // a reaction of 0.30 s (a bit slower than the 0.25 s reference), no nitrous — must beat Medium rivals and most Hard ones.
  const humanRun = (id: string, tune: Partial<Tune>, react: number) => { const race = new Race(800), r = race.add('p', carStats(id, tune, stage), new AIController(1, [react, react], 7, false));
    for (let i = 0; i < 120 * 60 && !race.done; i++) race.step(1 / 120); return r; };
  const ref = humanRun('hyper', MAX_TUNE, 0.25);
  check(Math.abs(ref.launchTime - 0.25) < 0.03, `AI launches after its reaction time, not the instant it goes green (${ref.launchTime.toFixed(3)} s for a 0.25 s reaction)`);
  for (const [id, lg] of [['hyper', 'S'], ['panda_civix', 'D'], ['muscle', 'C']] as [string, string][]) {
    const me = humanRun(id, MAX_TUNE, 0.30).finish!; let med = 0, hard = 0; const n = 12;
    for (let s = 1; s <= n; s++) { if (me < makeRival(id, MAX_TUNE, stage, s * 7919, 800, [0.04, 0.21]).expect) med++; if (me < makeRival(id, MAX_TUNE, stage, s * 104729, 800, [0.01, 0.07]).expect) hard++; }
    check(med === n && hard >= n - 1, `end game ${lg}: maxed ${id}, perfect shifts, 0.30 s reaction, no nitrous wins Medium ${med}/${n} and Hard ${hard}/${n}`);
  }
  { // owner V0.16.2: "1st to 8th in 2 seconds" — a maxed hypercar must use its gears across the run
    const r = humanRun('hyper', MAX_TUNE, 0.30); const race = new Race(800), rr = race.add('p', carStats('hyper', MAX_TUNE, stage), new AIController(1, [0.3, 0.3], 7, false)); const at: number[] = []; let g = 0;
    for (let i = 0; i < 120 * 60 && !race.done; i++) { race.step(1 / 120); if (rr.gear !== g) { g = rr.gear; at.push(race.raceTime - rr.launchTime); } }
    const gaps = at.map((t, i) => i ? t - at[i - 1] : t), top = at[at.length - 1];
    check(at.length === 7 && top >= 6 && Math.min(...gaps) >= 0.55 && r.finish! > 0, `maxed hypercar spreads its 7 shifts over the run (8th at ${top.toFixed(1)} s, shortest gear ${Math.min(...gaps).toFixed(2)} s)`);
  }
  { // gear ratio tuning (owner Q192, V0.17.0)
    const stock = TRANSMISSION.S[4].ratios, wild = legalRatios(stock, stock.map((r, i) => i % 2 ? r * 3 : r * 0.1)), S = RATIO_TUNING;
    const legal = wild.every((r, i) => r >= stock[i] * (1 - S.spread) - 0.001 && r <= stock[i] * (1 + S.spread) + 0.001 && (i === 0 || r <= wild[i - 1] * (1 - S.minStep) + 0.001));   // ratios are kept to 3 decimals
    const tall = stock.map(r => r * 0.8), used = carStats('hyper', { ...MAX_TUNE, ratios: tall }, stage), notT5 = carStats('hyper', { ...MAX_TUNE, trans: 4, ratios: tall }, stage);
    check(legal && used.trans.ratios[3] === legalRatios(stock, tall)[3] && notT5.trans.ratios[3] === TRANSMISSION.S[3].ratios[3],
      `gear ratios: any input is clamped to ±${S.spread * 100}% of stock and kept descending; used only with Transmission T5`);
    const extremes = [stock.map(r => r * 0.75), stock.map(r => r * 1.25)].map(rs => dyno('hyper', { ...MAX_TUNE, ratios: rs }, stage)[1].t800), base = dyno('hyper', MAX_TUNE, stage)[1].t800;
    const rv = makeRival('hyper', { ...MAX_TUNE, ratios: stock.map(r => r * 0.9) }, stage, 31337, 800, [0.04, 0.21]);
    check(extremes.every(t => t > 0 && t < 20) && rv.expect >= rv.yours + 0.04 - 1e-6,
      `gear ratios: extreme tunes still finish (all taller ${extremes[0].toFixed(2)} · stock ${base.toFixed(2)} · all shorter ${extremes[1].toFixed(2)} s) and rivals match your tuned car`);
  }
  { // gear setup (owner, V0.17.1): preset gearing OR custom ratios — never both
    const stock = TRANSMISSION.S[4].ratios, mine = stock.map(r => r * 0.85);
    const preset = carStats('hyper', { ...MAX_TUNE, ratios: mine, gearMode: 'preset', gearing: 'long' }, stage), custom = carStats('hyper', { ...MAX_TUNE, ratios: mine, gearMode: 'custom', gearing: 'long' }, stage);
    const longTop = carStats('hyper', { ...MAX_TUNE, gearing: 'long' }, stage).trans.ratios.at(-1)!, mineTop = legalRatios(stock, mine).at(-1)!;
    check(preset.trans.ratios[2] === stock[2] && preset.trans.ratios.at(-1) === longTop && custom.trans.ratios[2] === legalRatios(stock, mine)[2] && custom.trans.ratios.at(-1) === mineTop,
      'gear setup: Preset uses the Short/Balanced/Long box and ignores your ratios; Custom uses your ratios and ignores the preset');
  }
  { // 1200 m track (owner, V0.17.1)
    const ok = CATALOG_ORDER.every(id => { const race = new Race(1200), r = race.add('p', carStats(id, MAX_TUNE, stage), new AIController(1, [0.3, 0.3], 7, false)); for (let i = 0; i < 120 * 90 && !race.done; i++) race.step(1 / 120); return r.finish !== undefined; });
    const wins = ['hyper', 'panda_civix', 'muscle'].map(id => { const me = simTime(id, MAX_TUNE, stage, 1, [0.3, 0.3], 7, 1200, false); let w = 0; for (let s = 1; s <= 6; s++) if (me < makeRival(id, MAX_TUNE, stage, s * 7919, 1200, [0.04, 0.21]).expect) w++; return w; });
    check(ok && wins.every(w => w === 6) && racePay('D', 'medium', true, 1200).result > racePay('D', 'medium', true, 800).result,
      `1200 m: every car finishes it; a perfect run beats Medium rivals (${wins.join(' / ')} of 6 for hyper / Civix / muscle); it pays ×${DIST_PAY[1200]}`);
  }
  check(TRANSMISSION.A[4].ratios.length === 7 && TRANSMISSION.S[4].ratios.length === 8 && TRANSMISSION.D[4].ratios.length === 6,
    `gearboxes (owner): League A tops out at 7 gears, League S at 8 (D–B keep 6) — ${TRANSMISSION.S.map(t => t.ratios.length).join('/')} gears in S`);
  check(PART_LEAGUE.D < 1 && PART_LEAGUE.S > 1, `economy pass (Q181): League D parts cheaper (×${PART_LEAGUE.D}), League S dearer (×${PART_LEAGUE.S})`);
}
process.exit(fail ? 1 : 0);
