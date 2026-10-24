// Strip check (C1d, Build & Tune Update): how far each car climbs the Strip per build, and whether the ladder is built right.
//   npm run strip-check            every league        npm run strip-check -- D      one league
// For each car × build (Stock / All T2 / T3 / T4 / Max / Max + best tune) a perfect driver (the Strip's reference: 0.30 s off the
// green, no nitrous) races every level in order until it loses: the table shows the last level cleared (★ = finished all 60).
// Then the Hard Strip for Max + best tune. Fails (exit 1) when:
//   • a level is not harder than the one before (difficulty as a share of the way from the easiest rival to the final one, per length)
//   • a boss is not a wall (its step up is smaller than twice a normal step) or the level after a boss is easier than the boss
//   • a car of the league can't finish the normal Strip maxed and well tuned, or no car can finish the Hard Strip
const { CARS, CATALOG_ORDER, LEAGUES } = await import('../src/data/cars.ts');
const { STAGES, START_STAGE } = await import('../src/data/stages.ts');
const { STRIP, stripRung, stripBand, stripStep } = await import('../src/game/strip.ts');
const { bestTune, perfectTime } = await import('../src/game/rating.ts');
const { STOCK_TUNE, MAX_TUNE, allAt } = await import('../src/data/parts.ts');
const { MATCH } = await import('../src/game/rivals.ts');

const stage = STAGES[START_STAGE], REF = { reaction: [MATCH.reaction, MATCH.reaction] as [number, number], nitrous: false };
const only = process.argv.slice(2).find(a => LEAGUES.includes(a as any));
const leagues = LEAGUES.filter(l => (!only || l === only) && CATALOG_ORDER.some(id => CARS[id].league === l));
const N = STRIP.rungs, B = STRIP.bossEvery, started = Date.now();
let fails = 0; const fail = (m: string) => { fails++; console.log('  ✗ ' + m); };

/** last level cleared in order by this car + build (a function of the length: the tuned build re-tunes per length) */
function climb(lg: string, id: string, tuneAt: (d: number) => any, hard: boolean): number {
  for (let n = 1; n <= N; n++) { const r = stripRung(lg as any, n, stage, hard); if (perfectTime(id, tuneAt(r.dist), r.dist, REF) >= r.rival.expect) return n - 1; }
  return N;
}
const cell = (n: number) => (n === N ? `${n}★` : String(n)).padStart(6);

for (const lg of leagues) {
  console.log(`\n== League ${lg} — the Strip, ${N} levels in ${N / B} chapters (boss every ${B}) ==`);
  // 1. ladder shape: difficulty share rel = (easy − rival) / (easy − final) for each level's own length
  for (const hard of [false, true]) {
    const rel = Array.from({ length: N }, (_, i) => { const r = stripRung(lg as any, i + 1, stage, hard), b = stripBand(lg as any, r.dist, stage, hard); return (b.easy - r.rival.expect) / (b.easy - b.final.expect); });
    const tag = hard ? 'Hard' : 'Normal';
    const dips = rel.map((x, i) => i > 0 && x <= rel[i - 1] - 0.01 ? i + 1 : 0).filter(Boolean);
    if (dips.length) fail(`${tag}: level(s) ${dips.join(', ')} are not harder than the level before`);
    for (let b = B; b <= N; b += B) {
      const wall = rel[b - 1] - rel[b - 2], normal = (rel[b - 2] - rel[b - B]) / (B - 2);
      if (wall < 2 * normal) fail(`${tag}: boss ${b} is not a wall (step ${wall.toFixed(3)} vs normal ${normal.toFixed(3)})`);
      if (b < N && rel[b] < rel[b - 1] - 0.01) fail(`${tag}: level ${b + 1} is easier than boss ${b}`);
    }
    const chap = Array.from({ length: N / B }, (_, c) => `${(rel[c * B] * 100).toFixed(0)}→${(rel[c * B + B - 1] * 100).toFixed(0)}%`);
    console.log(`  ${tag.padEnd(6)} difficulty per chapter (first level → boss, % of the way to the final rival): ${chap.join(' · ')}`);
  }
  // 2. how far each car gets
  const ids = CATALOG_ORDER.filter(id => CARS[id].league === lg);
  const builds: [string, (id: string) => (d: number) => any][] = [['Stock', () => () => STOCK_TUNE], ['T2', () => () => allAt(2)], ['T3', () => () => allAt(3)], ['T4', () => () => allAt(4)],
    ['Max', () => () => MAX_TUNE], ['Max+tune', id => d => bestTune(id, MAX_TUNE, d, REF).tune]];
  console.log(`  ${'car'.padEnd(16)}${builds.map(([b]) => b.padStart(6)).join(' ')}   Hard (Max+tune)`);
  let hardBest = 0;
  for (const id of ids) {
    const row = builds.map(([, f]) => climb(lg, id, f(id), false)), hardN = climb(lg, id, d => bestTune(id, MAX_TUNE, d, REF).tune, true);
    hardBest = Math.max(hardBest, hardN);
    console.log(`  ${(CARS[id].displayName ?? id).slice(0, 16).padEnd(16)}${row.map(cell).join(' ')}   ${cell(hardN)}`);
    if (row[row.length - 1] < N) fail(`${id} maxed + tuned stops at level ${row[row.length - 1]} — every car must be able to finish`);
  }
  if (hardBest < N) fail(`no car finishes the Hard Strip (best: level ${hardBest})`);
}
console.log(fails ? `\n${fails} problem(s)` : `\n✓ Strip OK: every level harder than the last, a wall at every boss, every car can finish maxed + tuned, the best car can finish Hard.`);
console.log(`(${((Date.now() - started) / 1000).toFixed(0)} s)`);
process.exit(fails ? 1 : 0);
