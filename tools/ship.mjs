// Ship It (owner 2026-10-19): release → commit → push, in one go. No smoke test here (owner: it already ran while the
// update was built — run `npm run smoke` before shipping). GitHub Pages then publishes `build`.
//   node tools/ship.mjs              the full routine (stops at the first problem, nothing is pushed)
//   node tools/ship.mjs --no-push    everything except the push (commit stays on this PC)
//   node tools/ship.mjs --smoke      also run the browser smoke test before committing
//   node tools/ship.mjs --same       ship a version built here but never pushed (e.g. built for a smoke test)
//   node tools/ship.mjs --trailer "Co-Authored-By: …"   extra line at the end of the commit message
// The release step refuses if the version in src/data/changelog.ts wasn't raised.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const SITE = 'https://citrus-lemonjelly.github.io/Voxel-City/';
const t0 = Date.now(), say = m => console.log(m);
const fail = m => { console.error(`\n✗ ${m}\n  Nothing was pushed.`); process.exit(1); };
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const run = (label, file, a = []) => {
  say(`\n== ${label} ==`);
  try { execFileSync(process.execPath, [resolve(root, file), ...a], { cwd: root, stdio: 'inherit' }); }
  catch { fail(`${label} failed (see above)`); }
};

// 1. git is ready: on main, nothing new on GitHub that this PC doesn't have
say('== Git check ==');
let branch;
try { branch = git('rev-parse', '--abbrev-ref', 'HEAD'); } catch { fail('this folder is not a git clone of the GitHub repo'); }
if (branch !== 'main') fail(`on branch "${branch}" — switch to main first`);
if (!flag('--no-push')) {
  try { git('fetch', 'origin', 'main'); } catch { fail('could not reach GitHub (internet / sign-in)'); }
  const behind = +git('rev-list', '--count', 'HEAD..origin/main');
  if (behind) fail(`GitHub has ${behind} change(s) this PC doesn't have (uploaded on the website?) — run "git pull" first`);
}
say(flag('--no-push') ? 'on main' : 'on main, up to date with GitHub');

// 2. release (version check, sim, collisions, build); 3. smoke test only when asked (--smoke)
run('Release', 'tools/release.mjs', flag('--same') ? ['--same'] : []);
if (flag('--smoke')) run('Smoke test', 'tests/smoke.mjs');

// 4. commit
const { version } = JSON.parse(readFileSync(resolve(root, 'build/version.json'), 'utf8'));
say('\n== Commit ==');
git('-c', 'core.safecrlf=false', 'add', '-A');
if (!git('status', '--porcelain')) fail('nothing to commit');
const msg = [`V${version}`, ...(opt('--trailer') ? ['', opt('--trailer')] : [])].join('\n');
git('commit', '-q', '-m', msg);
say(`committed "${msg.split('\n')[0]}"`);

// 5. push
if (flag('--no-push')) { say(`\n✓ V${version} committed on this PC (not pushed). Push later with: git push`); process.exit(0); }
say('\n== Push ==');
try { execFileSync('git', ['push', 'origin', 'main'], { cwd: root, stdio: 'inherit' }); }
catch { console.error('\n✗ push failed — the commit is saved on this PC; run "git push" once GitHub is reachable.'); process.exit(1); }
say(`\n✓ V${version} shipped in ${Math.round((Date.now() - t0) / 1000)} s. The website updates in about a minute: ${SITE}`);
