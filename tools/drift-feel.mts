// Drift feel check (V0.18.1, owner: "I tap drift and spin out within 1 second"): drives the first turn of a few roads with
// human-like players — a person reacts ~0.2 s late to the needle — and prints when each one spins or how the drift ends.
//   npm run drift-feel
const { driftPath } = await import('../src/data/driftCourses.ts');
const { DriftRun, DRIFT } = await import('../src/game/drift.ts');
const { carStats } = await import('../src/game/stats.ts');
const { allAt } = await import('../src/data/parts.ts');
type P = { name: string; gas: (r: any, seen: number) => boolean };
// "seen" = the rev share the player saw `react` seconds ago (a human's delay)
const players: P[] = [
  { name: 'holds the gas', gas: () => true },
  { name: 'lets go of the gas', gas: () => false },
  { name: 'taps around the middle', gas: (r, f) => { const [lo, hi] = r.band(); return f < (lo + hi) / 2; } },
  { name: 'aims high in the band', gas: (r, f) => { const [lo, hi] = r.band(); return f < lo + (hi - lo) * 0.75; } },
];
const react = 0.2;
for (const [car, lg] of [['panda_civix', 'D'], ['muscle', 'C'], ['hyper', 'S']] as [string, string][]) for (const p of players) {
  const out: string[] = [];
  for (let v = 0; v < 6; v++) {
    const path = driftPath('downtown', v, lg), t0 = path.turns[0];
    const hist: number[] = []; let fired = false;
    const run = new DriftRun(path, carStats(car, allAt(3)), {
      gas: (r: any) => !r.launched ? false : r.drifting ? p.gas(r, hist[Math.max(0, hist.length - 1 - Math.round(react * 60))] ?? r.rpm / r.stats.redline) : true,
      drift: (r: any) => { if (!fired && r.s >= t0.s0) { fired = true; return true; } return false; },
    });
    let start = -1, res = '';
    for (let i = 0; i < 60 * 60 && !res; i++) {
      run.step(1 / 60); hist.push(run.rpm / run.stats.redline);
      if (run.drifting && start < 0) start = run.t;
      const ev = run.lastEvent?.text ?? '';
      if (start >= 0 && /Spin/.test(ev)) res = `spin ${(run.t - start).toFixed(2)}s`;
      else if (start >= 0 && /Straight/.test(ev)) res = `straight ${(run.t - start).toFixed(2)}s`;
      else if (start >= 0 && /Clean|Linked/.test(ev)) res = `clean ${(run.t - start).toFixed(1)}s`;
    }
    out.push(res || 'none');
  }
  console.log(`${car.padEnd(12)} ${p.name.padEnd(24)} ${out.join(' · ')}`);
}
