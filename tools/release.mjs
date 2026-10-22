// One-command release (owner 2026-10-19: save time and tokens). Works on any computer with Node.js.
//   node tools/release.mjs                 check the version went up, sync package.json, build, run the sim checks,
//                                           list the files that changed since the last release
//   node tools/release.mjs --stage DIR [--device "C:\path\Voxel-City"]
//                                           also copy those files to DIR and write DIR/commit-N.json (≤ 50 files each)
//   --same      allow re-building the same version (only for a rebuild that ships nothing new)
//   --no-sim    skip the sim checks
//   --no-collide  skip the parts collision check
// Rules (owner): every update raises the version (V0.x.y); a big update gets a `header` in src/data/changelog.ts.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const require = createRequire(import.meta.url);
const esbuild = require(process.env.ESBUILD_PATH || 'esbuild');
const t0 = Date.now(), say = m => console.log(m), fail = m => { console.error('✗ ' + m); process.exit(1); };

// 1. version from the patch notes; must be higher than the last build's
const notes = await esbuild.build({ entryPoints: [resolve(root, 'src/data/changelog.ts')], bundle: true, format: 'esm', write: false, logLevel: 'warning' });
const { CHANGELOG, VERSION } = await import('data:text/javascript;base64,' + Buffer.from(notes.outputFiles[0].text).toString('base64'));
const vn = v => v.split('.').reduce((a, x) => a * 1000 + +x, 0);
const prevFile = resolve(root, 'build/version.json'), prev = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, 'utf8')) : null;
if (prev && vn(VERSION) < vn(prev.version)) fail(`patch notes say V${VERSION}, older than the last build V${prev.version}`);
if (prev && VERSION === prev.version && !flag('--same')) fail(`V${VERSION} was already built — add a new entry at the top of src/data/changelog.ts (patch 0.x.Y for fixes/tweaks, minor 0.X.0 for a big update with a header)`);
const top = CHANGELOG[0];
if (!top.added?.length && !top.changed?.length && !top.fixed?.length && !top.removed?.length) fail(`V${VERSION} has no Added / Changed / Fixed / Removed lines`);
if (/^0\.\d+\.0$/.test(VERSION) && !top.header) say(`! V${VERSION} is a minor version — consider a header (e.g. "Garage Update")`);
const pkgPath = resolve(root, 'package.json'), pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.version !== VERSION) { pkg.version = VERSION; writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n'); say(`package.json → ${VERSION}`); }

// 2. sim checks first (seconds) — a failure stops before anything is built
if (!flag('--no-sim')) {
  // run tsx through node itself (a .cmd + shell breaks on folders with spaces, e.g. "AI Games")
  const [cmd, pre] = process.env.TSX_PATH ? [process.env.TSX_PATH, []] : [process.execPath, [require.resolve('tsx/cli')]];
  let out = '';
  try { out = execFileSync(cmd, [...pre, resolve(root, 'tests/sim.ts')], { encoding: 'utf8' }); }
  catch (e) { out = String(e.stdout || ''); console.log(out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')); fail('sim checks failed'); }
  say(`sim: ${out.split('\n').filter(l => l.startsWith('PASS')).length} checks passed`);
}

// 2b. collision check (owner: always check base cars + parts) — a clash stops the release
if (!flag('--no-collide')) {
  try { const o = execFileSync(process.execPath, [resolve(root, 'tools/collide.mjs'), '--strict'], { encoding: 'utf8', env: process.env }); say(o.trim().split('\n').pop()); }
  catch (e) { console.log(String(e.stdout || '')); fail('collision check found clashing blocks'); }
}

// 3. build (+ the root copy the owner opens)
execFileSync(process.execPath, [resolve(root, 'tools/build.mjs')], { stdio: 'inherit', env: process.env });
copyFileSync(resolve(root, 'build/VoxelCity.html'), resolve(root, 'VoxelCity.html'));

// 4. what changed since the last release (hash manifest)
const TRACK = ['src', 'tests', 'tools', 'docs', 'build/index.html', 'build/VoxelCity.html', 'build/version.json', 'build/manifest.webmanifest', 'build/icons', 'assets', 'package.json', 'README.md', 'VoxelCity.html', 'index.html', 'tsconfig.json'];
const walk = p => { const a = resolve(root, p); if (!existsSync(a)) return []; if (statSync(a).isFile()) return [a]; return readdirSync(a).flatMap(n => n.startsWith('.') || n === 'e2e' ? [] : walk(relative(root, join(a, n)))); };
const files = TRACK.flatMap(walk), hash = f => createHash('sha1').update(readFileSync(f)).digest('hex');
const manPath = resolve(root, 'tools/release-manifest.json'), man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
const now = Object.fromEntries(files.map(f => [relative(root, f).split(sep).join('/'), hash(f)]));
const changed = Object.keys(now).filter(k => man[k] !== now[k] && k !== 'tools/release-manifest.json');
writeFileSync(manPath, JSON.stringify(now, null, 1) + '\n'); changed.push('tools/release-manifest.json');
say(`\nV${VERSION}${top.header ? ` — ${top.header}` : ''} · ${top.title} · ${changed.length} files changed since the last release:`);
say(changed.map(f => '  ' + f).join('\n'));

// 5. optional staging for the computer link
const stage = opt('--stage'), device = opt('--device');
if (stage) {
  for (const f of changed) { const d = resolve(stage, f); mkdirSync(dirname(d), { recursive: true }); copyFileSync(resolve(root, f), d); }
  if (device) {
    const list = changed.map(f => ({ stagedPath: resolve(stage, f), devicePath: device.replace(/[\\/]$/, '') + '\\' + f.split('/').join('\\') }));
    for (let i = 0; i * 50 < list.length; i++) writeFileSync(resolve(stage, `commit-${i + 1}.json`), JSON.stringify(list.slice(i * 50, i * 50 + 50)));
    say(`staged in ${stage} (${Math.ceil(list.length / 50)} commit list${list.length > 50 ? 's' : ''})`);
  }
}
say(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
