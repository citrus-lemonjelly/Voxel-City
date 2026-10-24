// Drag balance bench (F4, 2026-10-24): the game's own race sim, driven perfectly (skill 1, 0.25 s reaction, nitrous on),
// so every time here is "the best this build can do". Each time uses the quickest of the three gearings unless stated.
//   npm run balance                       every league: car × build (Stock / All T3 / Max) × distance, ★ = quickest in its league
//   npm run balance -- parts              what each part is worth: seconds lost when one part drops from T5 to T1 on a maxed car
//   npm run balance -- tiers              seconds saved by each tier of each part, from stock (feeds the Upgrades "before → after")
//   npm run balance -- gearing            maxed cars: time per gearing per distance (which gearing wins where)
//   npm run balance -- niche              per league: which car wins launch (0–100 m), 600, 800, 1200 m on a maxed build
// Narrow any of them: a league letter (D C B A S) or a car id, e.g. `npm run balance -- parts C` or `-- tiers muscle`.
// Options: --dist=600,800 (distances) · --no-nitro (nobody fires nitrous).
const { simTime } = await import('../src/game/rivals.ts');
const { STAGES, START_STAGE } = await import('../src/data/stages.ts');
const { CARS, CATALOG_ORDER, LEAGUES } = await import('../src/data/cars.ts');
const { STOCK_TUNE, MAX_TUNE, allAt, GEARINGS, PERF_KINDS, PERF_LABEL, TIERS } = await import('../src/data/parts.ts');
const { Race } = await import('../src/game/race.ts');
const { carStats } = await import('../src/game/stats.ts');
const { AIController } = await import('../src/game/ai.ts');

const args = process.argv.slice(2);
const opt = (k: string) => args.find(a => a.startsWith(`--${k}`));
const words = args.filter(a => !a.startsWith('--'));
const MODES = ['parts', 'tiers', 'gearing', 'niche'];
const mode = words.find(w => MODES.includes(w)) ?? 'summary';
const filter = words.find(w => !MODES.includes(w));
const DISTS = opt('dist') ? opt('dist')!.split('=')[1].split(',').map(Number) : [600, 800, 1200];
const NITRO = !opt('no-nitro');
const stage = STAGES[START_STAGE];
const REACT: [number, number] = [0.25, 0.25];

if (filter && !LEAGUES.includes(filter as any) && !CARS[filter]) { console.log(`Unknown league or car "${filter}". Cars: ${CATALOG_ORDER.join(' ')}`); process.exit(1); }
const leagues = LEAGUES.filter(l => (!filter || filter === l || CARS[filter]?.league === l) && CATALOG_ORDER.some(id => CARS[id].league === l));
const carsOf = (l: string) => CATALOG_ORDER.filter(id => CARS[id].league === l && (!CARS[filter ?? ''] || id === filter));

const cache = new Map<string, number>();
/** finish time (s) on one gearing, or the quickest of the three when gearing is left out */
function t(id: string, tune: any, d: number, gearing?: string): number {
  if (!gearing) return Math.min(...GEARINGS.map(g => t(id, tune, d, g.id)));
  const key = `${id}|${JSON.stringify(tune)}|${d}|${gearing}`;
  if (!cache.has(key)) cache.set(key, simTime(id, { ...tune, gearing }, stage, 1, REACT, 7, d, NITRO));
  return cache.get(key)!;
}
/** time to cover the first 100 m (the launch), quickest gearing */
function launch(id: string, tune: any): number {
  return Math.min(...GEARINGS.map(g => {
    const race = new Race(100); const r = race.add('x', carStats(id, { ...tune, gearing: g.id }, stage), new AIController(1, REACT, 7, NITRO));
    for (let i = 0; i < 120 * 30 && !race.done; i++) race.step(1 / 120);
    return r.finish ?? 99;
  }));
}
const name = (id: string) => (CARS[id].displayName ?? id).slice(0, 16).padEnd(16);
const f2 = (x: number) => x.toFixed(2).padStart(6);
const sg = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const head = (s: string) => console.log(`\n== ${s} ==`);
const started = Date.now();
console.log(`Drag balance · ${stage.name} dry · perfect driver · nitrous ${NITRO ? 'on' : 'off'} · best gearing unless stated`);

if (mode === 'summary') {
  const builds: [string, any][] = [['Stock', STOCK_TUNE], ['T3', allAt(3)], ['Max', MAX_TUNE]];
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}  (seconds; ★ = quickest in the league for that column)`);
    console.log(''.padEnd(16) + builds.map(([b]) => DISTS.map(d => `${b} ${d}`.padStart(11)).join('')).join('  '));
    const grid = ids.map(id => builds.map(([, tune]) => DISTS.map(d => t(id, tune, d))));
    const best = builds.map((_, b) => DISTS.map((_, k) => Math.min(...grid.map(g => g[b][k]))));
    ids.forEach((id, i) => console.log(name(id) + grid[i].map((row, b) => row.map((x, k) => f2(x).padStart(10) + (x === best[b][k] && ids.length > 1 ? '★' : ' ')).join('')).join('  ')));
    if (ids.length > 1) console.log('spread'.padEnd(16) + builds.map((_, b) => DISTS.map((_, k) => { const col = grid.map(g => g[b][k]); return ('±' + (Math.max(...col) - Math.min(...col)).toFixed(2)).padStart(10) + ' '; }).join('')).join('  '));
  }
} else if (mode === 'parts') {
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}: seconds lost when ONE part drops from T5 to T1 (everything else maxed), ${DISTS.join(' / ')} m`);
    console.log(''.padEnd(17) + PERF_KINDS.map(k => PERF_LABEL[k].padStart(DISTS.length * 7 + 1)).join(''));
    for (const id of ids) {
      const base = DISTS.map(d => t(id, MAX_TUNE, d));
      console.log(name(id) + PERF_KINDS.map(k => ' ' + DISTS.map((d, i) => sg(t(id, { ...MAX_TUNE, [k]: 1 }, d) - base[i]).padStart(6)).join(' ')).join(''));
    }
  }
} else if (mode === 'tiers') {
  const d = DISTS.includes(800) ? 800 : DISTS[0];
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}: seconds saved at ${d} m by each tier of ONE part, everything else stock (T2 · T3 · T4 · T5)`);
    console.log(''.padEnd(17) + '  stock' + PERF_KINDS.map(k => PERF_LABEL[k].padStart(29)).join(''));
    for (const id of ids) {
      const base = t(id, STOCK_TUNE, d);
      console.log(name(id) + f2(base) + ' ' + PERF_KINDS.map(k => TIERS.slice(1).map(tr => sg(t(id, { ...STOCK_TUNE, [k]: tr }, d) - base).padStart(6)).join(' ').padStart(29)).join(''));
    }
  }
} else if (mode === 'gearing') {
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}: maxed cars, time per gearing (${GEARINGS.map(g => g.label).join(' / ')}); ★ = best gearing at that distance`);
    console.log(''.padEnd(17) + DISTS.map(d => `${d} m`.padStart(GEARINGS.length * 8 + 2)).join(''));
    for (const id of ids) console.log(name(id) + DISTS.map(d => {
      const row = GEARINGS.map(g => t(id, MAX_TUNE, d, g.id)), m = Math.min(...row);
      return '  ' + row.map(x => f2(x).padStart(7) + (x === m ? '★' : ' ')).join('');
    }).join(''));
  }
} else if (mode === 'niche') {
  head('Who wins where, maxed builds (owner goal for Build & Tune: every car best — or within 0.1 s — somewhere)');
  console.log('league  ' + ['launch 100 m', ...DISTS.map(d => `${d} m`)].map(s => s.padEnd(22)).join('') + 'cars with no niche');
  for (const l of leagues) {
    const ids = carsOf(l), cols = [ids.map(id => launch(id, MAX_TUNE)), ...DISTS.map(d => ids.map(id => t(id, MAX_TUNE, d)))];
    const win = cols.map(c => ids[c.indexOf(Math.min(...c))]);
    const none = ids.filter(id => cols.every(c => c[ids.indexOf(id)] - Math.min(...c) > 0.1));
    console.log(l.padEnd(8) + win.map((id, i) => `${id} ${Math.min(...cols[i]).toFixed(2)}`.padEnd(22)).join('') + (none.length ? none.join(', ') : '—'));
  }
}
console.log(`\n(${cache.size} runs, ${((Date.now() - started) / 1000).toFixed(1)} s)`);
