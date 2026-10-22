// Drift tuning bench (V0.18.0): courses × cars × AI skill → score, time per part of the run, spins, clean drifts.
// The run shape the owner asked for: drag 5–7 s · drift 10–12 s (3–5 turns) · drag 5–7 s.
//   npm run drift-lab              every course, a car per league, skill 1 / 0.85 / 0.7 / 0.5
//   npm run drift-lab -- harbour   one course
//   npm run drift-lab -- pace      average part times per league over 12 layouts × 4 courses (for PACING.driftSec)
const { DRIFT_COURSES, driftPath } = await import('../src/data/driftCourses.ts');
const { DriftRun, DriftAI } = await import('../src/game/drift.ts');
const { carStats } = await import('../src/game/stats.ts');
const { MAX_TUNE, allAt } = await import('../src/data/parts.ts');
const { CARS, CATALOG_ORDER } = await import('../src/data/cars.ts');
const arg = process.argv[2];

/** one run, with the clock at the first turn-in and at the last turn's exit */
function timed(path: any, st: any, skill: number, seed = 7) {
  const run = new DriftRun(path, st, new DriftAI(skill, seed)), T = path.turns;
  let t1 = 0, t2 = 0;
  for (let i = 0; i < 60 * 240 && run.finish === undefined; i++) { run.step(1 / 60); if (!t1 && run.s >= T[0].s0) t1 = run.time; if (!t2 && run.s >= T[T.length - 1].s1) t2 = run.time; }
  return { score: run.score, drag1: t1, drift: t2 - t1, drag2: (run.finish ?? 99) - t2, time: run.finish ?? 99, spins: run.spins, clean: run.clean, perfect: run.perfectEntries };
}
const f1 = (x: number) => x.toFixed(1).padStart(5);

if (arg === 'pace') {
  console.log('league  drag 1  drift  drag 2  total   (skill 0.85, tier-3 cars; target 5–7 · 10–12 · 5–7)');
  for (const l of ['D', 'C', 'B', 'A', 'S']) {
    const ids = CATALOG_ORDER.filter((id: string) => CARS[id].league === l && !CARS[id].unique); let a = [0, 0, 0, 0], n = 0;
    for (const c of DRIFT_COURSES) for (let v = 0; v < 12; v++) { const id = ids[v % ids.length], r = timed(driftPath(c.id, v, l), carStats(id, allAt(3)), 0.85, v + 1); a = [a[0] + r.drag1, a[1] + r.drift, a[2] + r.drag2, a[3] + r.time]; n++; }
    console.log(`${l.padEnd(6)} ${a.map(x => f1(x / n)).join('  ')}`);
  }
} else {
  const cars: [string, any][] = [['panda_civix', allAt(1)], ['muscle', MAX_TUNE], ['hyper', MAX_TUNE], ['hyper', { ...MAX_TUNE, dtyres: 5, lsd: 5, angle: 5 }]];
  for (const c of DRIFT_COURSES) {
    if (arg && c.id !== arg) continue;
    console.log(`\n== ${c.name} ==`);
    console.log('car                    skill   score  drag1  drift  drag2  total spins clean perf');
    for (const [id, tune] of cars) {
      const p = driftPath(c.id, 1, CARS[id].league);
      for (const skill of [1, 0.85, 0.7, 0.5]) {
        const r = timed(p, carStats(id, tune), skill);
        console.log(`${(id + (tune.engine === 1 ? ' stock' : ' max') + (tune.dtyres ? '+kit' : '')).padEnd(22)} ${skill.toFixed(2).padStart(5)} ${String(Math.round(r.score)).padStart(7)} ${f1(r.drag1)}  ${f1(r.drift)}  ${f1(r.drag2)}  ${f1(r.time)} ${String(r.spins).padStart(5)} ${String(r.clean).padStart(5)} ${String(r.perfect).padStart(4)}`);
      }
    }
  }
}
