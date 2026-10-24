// Drag balance bench (F4, 2026-10-24; Build & Tune modes V0.21.0): the game's own race sim, driven perfectly (skill 1, 0.25 s
// reaction, nitrous on), so every time here is "the best this build can do". "Default" = every Car Lab slider in the middle;
// "tuned" = the quickest slider settings for that length (rating.ts bestTune: final drive, tire pressure, nitrous mix).
//   npm run balance                       every league: car × build (Stock / All T3 / Max / Max tuned) × distance, ★ = quickest
//   npm run balance -- ladder             price ladder (owner Q243): maxed cars by price — pricier = quicker, a good tune closes the gap
//   npm run balance -- rating             car ratings (PP) per build + tuner points (TP), and a check that a higher PP is always quicker
//   npm run balance -- tune               maxed cars: default vs tuned per length, and the settings that won
//   npm run balance -- parts              what each part is worth: seconds lost when one part drops from T5 to T1 on a maxed car
//   npm run balance -- tiers              seconds saved by each tier of each part, from stock (feeds the Upgrades "before → after")
//   npm run balance -- presets            maxed cars on the rivals' Short / Balanced / Long gearing presets
//   npm run balance -- niche              per league: which car wins launch (0–100 m), 600, 800, 1200 m on a maxed build
// Narrow any of them: a league letter (D C B A S) or a car id, e.g. `npm run balance -- parts C` or `-- tiers muscle`.
// Options: --dist=600,800 (distances) · --no-nitro (nobody fires nitrous).
const { simTime } = await import('../src/game/rivals.ts');
const { STAGES, START_STAGE } = await import('../src/data/stages.ts');
const { CARS, CATALOG_ORDER, LEAGUES } = await import('../src/data/cars.ts');
const { STOCK_TUNE, MAX_TUNE, allAt, GEARINGS, PERF_KINDS, PERF_LABEL, TIERS } = await import('../src/data/parts.ts');
const { carRating, tunerPoints, bestTune, RATING } = await import('../src/game/rating.ts');
const { Race } = await import('../src/game/race.ts');
const { carStats } = await import('../src/game/stats.ts');
const { AIController } = await import('../src/game/ai.ts');

const args = process.argv.slice(2);
const opt = (k: string) => args.find(a => a.startsWith(`--${k}`));
const words = args.filter(a => !a.startsWith('--'));
const MODES = ['ladder', 'rating', 'tune', 'parts', 'tiers', 'presets', 'gearing', 'niche'];
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
/** finish time (s) for a tune as given (no gearing preset = the default tune) */
function t(id: string, tune: any, d: number): number {
  const key = `${id}|${JSON.stringify(tune)}|${d}`;
  if (!cache.has(key)) cache.set(key, simTime(id, tune, stage, 1, REACT, 7, d, NITRO));
  return cache.get(key)!;
}
const tuned = (id: string, parts: any, d: number) => NITRO ? bestTune(id, parts, d).time : t(id, bestTune(id, parts, d).tune, d);
/** time to cover the first 100 m (the launch), default tune */
function launch(id: string, tune: any): number {
  const race = new Race(100); const r = race.add('x', carStats(id, tune, stage), new AIController(1, REACT, 7, NITRO));
  for (let i = 0; i < 120 * 30 && !race.done; i++) race.step(1 / 120);
  return r.finish ?? 99;
}
const name = (id: string) => (CARS[id].displayName ?? id).slice(0, 16).padEnd(16);
const f2 = (x: number) => x.toFixed(2).padStart(6);
const sg = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const head = (s: string) => console.log(`\n== ${s} ==`);
const price = (id: string) => CARS[id].currency === 'crowns' ? `${CARS[id].price} Cr` : `${CARS[id].price.toLocaleString()} VX`;
const started = Date.now();
console.log(`Drag balance · ${stage.name} dry · perfect driver · nitrous ${NITRO ? 'on' : 'off'} · default tune unless stated`);

if (mode === 'summary') {
  const builds: [string, (id: string, d: number) => number][] = [['Stock', (id, d) => t(id, STOCK_TUNE, d)], ['T3', (id, d) => t(id, allAt(3), d)], ['Max', (id, d) => t(id, MAX_TUNE, d)], ['Tuned', (id, d) => tuned(id, MAX_TUNE, d)]];
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}  (seconds; ★ = quickest in the league for that column; Tuned = maxed + the best tune for that length)`);
    console.log(''.padEnd(16) + builds.map(([b]) => DISTS.map(d => `${b} ${d}`.padStart(11)).join('')).join('  '));
    const grid = ids.map(id => builds.map(([, f]) => DISTS.map(d => f(id, d))));
    const best = builds.map((_, b) => DISTS.map((_, k) => Math.min(...grid.map(g => g[b][k]))));
    ids.forEach((id, i) => console.log(name(id) + grid[i].map((row, b) => row.map((x, k) => f2(x).padStart(10) + (x === best[b][k] && ids.length > 1 ? '★' : ' ')).join('')).join('  ')));
    if (ids.length > 1) console.log('spread'.padEnd(16) + builds.map((_, b) => DISTS.map((_, k) => { const col = grid.map(g => g[b][k]); return ('±' + (Math.max(...col) - Math.min(...col)).toFixed(2)).padStart(10) + ' '; }).join('')).join('  '));
  }
} else if (mode === 'ladder') {
  head('Price ladder (owner Q243): maxed cars in price order at 800 m — default tune, and tuned for 800 m');
  console.log('league  car               price       Max    Tuned   gain   vs top car (default)   ok');
  let bad = 0;
  for (const l of leagues) {
    const ids = CATALOG_ORDER.filter(id => CARS[id].league === l), def = ids.map(id => t(id, MAX_TUNE, 800)), tun = ids.map(id => tuned(id, MAX_TUNE, 800)), top = def[def.length - 1];
    ids.forEach((id, i) => {
      const ok = i === 0 || def[i] < def[i - 1]; if (!ok) bad++;
      console.log(`${l.padEnd(8)}${name(id)} ${price(id).padStart(9)}  ${f2(def[i])}  ${f2(tun[i])}  ${sg(tun[i] - def[i]).padStart(6)}   ${(i === ids.length - 1 ? 'top' : `tuned ${sg(tun[i] - top)} · default ${sg(def[i] - top)}`).padEnd(21)}  ${ok ? '✓' : '✗ not quicker than the cheaper car'}`);
    });
  }
  console.log(bad ? `\n${bad} car(s) break the ladder` : '\nLadder holds: every pricier car is quicker maxed (default tune).');
} else if (mode === 'rating') {
  head(`Car rating (PP, ${RATING.dist} m, default tune) per build, and tuner points (TP) of the best ${RATING.dist} m tune on a maxed car`);
  console.log('car               league     price   Stock     T2     T3     T4    Max   Max TP');
  const all: { id: string; b: number; pp: number; t: number }[] = [];
  for (const l of leagues) for (const id of carsOf(l)) {
    const pps = TIERS.map(tr => { const tune = allAt(tr), pp = carRating(id, tune); all.push({ id, b: tr, pp, t: t(id, tune, RATING.dist) }); return pp; });
    console.log(`${name(id)}  ${l.padEnd(6)} ${price(id).padStart(9)} ${pps.map(p => String(p).padStart(6)).join(' ')}  ${('+' + tunerPoints(id, bestTune(id, MAX_TUNE, RATING.dist).tune)).padStart(6)}`);
  }
  // E3: ratings never lie — a higher PP is a quicker 800 m, across every car and build
  const sorted = all.sort((a, b) => a.pp - b.pp), bad = sorted.filter((x, i) => i > 0 && x.pp > sorted[i - 1].pp && x.t > sorted[i - 1].t + 0.005);
  console.log(bad.length ? `\n✗ ${bad.length} rating(s) higher but slower: ${bad.slice(0, 6).map(x => `${x.id} T${x.b} ${x.pp}`).join(', ')}` : `\n✓ Every higher rating is a quicker ${RATING.dist} m (${all.length} car × build pairs).`);
} else if (mode === 'tune') {
  for (const l of leagues) {
    head(`League ${l}: maxed cars, default tune vs the best tune for each length (fd = final drive, tp = tire pressure, nm = nitrous mix)`);
    for (const id of carsOf(l)) {
      const cells = DISTS.map(d => { const b = bestTune(id, MAX_TUNE, d), d0 = t(id, MAX_TUNE, d);
        return `${d} m ${f2(d0).trim()}→${b.time.toFixed(2)} (${sg(b.time - d0)}) fd ${b.tune.fd?.toFixed(2)} tp ${(b.tune.tp ?? 0).toFixed(1)} nm ${(b.tune.nm ?? 0).toFixed(1)} TP ${tunerPoints(id, b.tune)}`; });
      console.log(name(id) + ' ' + cells.join('  |  '));
    }
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
} else if (mode === 'presets' || mode === 'gearing') {
  for (const l of leagues) {
    const ids = carsOf(l);
    head(`League ${l}: maxed cars on the rivals' gearing presets (${GEARINGS.map(g => g.label).join(' / ')}); ★ = best preset at that distance`);
    console.log(''.padEnd(17) + DISTS.map(d => `${d} m`.padStart(GEARINGS.length * 8 + 2)).join(''));
    for (const id of ids) console.log(name(id) + DISTS.map(d => {
      const row = GEARINGS.map(g => t(id, { ...MAX_TUNE, gearing: g.id }, d)), m = Math.min(...row);
      return '  ' + row.map(x => f2(x).padStart(7) + (x === m ? '★' : ' ')).join('');
    }).join(''));
  }
} else if (mode === 'niche') {
  head('Who wins where, maxed builds, default tune');
  console.log('league  ' + ['launch 100 m', ...DISTS.map(d => `${d} m`)].map(s => s.padEnd(22)).join(''));
  for (const l of leagues) {
    const ids = carsOf(l), cols = [ids.map(id => launch(id, MAX_TUNE)), ...DISTS.map(d => ids.map(id => t(id, MAX_TUNE, d)))];
    const win = cols.map(c => ids[c.indexOf(Math.min(...c))]);
    console.log(l.padEnd(8) + win.map((id, i) => `${id} ${Math.min(...cols[i]).toFixed(2)}`.padEnd(22)).join(''));
  }
}
console.log(`\n(${((Date.now() - started) / 1000).toFixed(1)} s)`);
