// Start-of-session check (T2, V0.16.0): what GitHub has that this PC doesn't (and the other way round), whether those changes
// touch the same files as the work here, and the next free numbers — so two sessions never reuse a version, S-row or Q.
//   npm run sync            report only
//   npm run sync -- --pull  also bring GitHub's changes in when that can be done without a merge (fast-forward)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return ''; } };
const lines = s => s ? s.split('\n').filter(Boolean) : [];

console.log('== GitHub ==');
try { git('fetch', '-q', 'origin', 'main'); } catch { console.log('! could not reach GitHub — showing local state only'); }
const incoming = lines(tryGit('log', '--oneline', 'HEAD..origin/main')), outgoing = lines(tryGit('log', '--oneline', 'origin/main..HEAD'));
const dirty = lines(tryGit('status', '--short')).filter(l => !/ build(-test)?\//.test(l));
console.log(`incoming (on GitHub, not here): ${incoming.length}`); incoming.slice(0, 10).forEach(l => console.log('  ' + l));
console.log(`outgoing (here, not pushed):    ${outgoing.length}`); outgoing.slice(0, 10).forEach(l => console.log('  ' + l));
console.log(`changed files not committed:     ${dirty.length}`);
if (incoming.length) {
  const theirs = new Set(lines(tryGit('diff', '--name-only', 'HEAD...origin/main')));
  const ours = new Set([...lines(tryGit('diff', '--name-only', 'origin/main...HEAD')), ...dirty.map(l => l.slice(3))]);
  const both = [...theirs].filter(f => ours.has(f));
  console.log(both.length ? `! both sides changed ${both.length} file(s): ${both.join(', ')}` : 'no overlapping files');
}

// next free numbers, looking at both this PC and GitHub
const read = (rev, f) => rev ? tryGit('show', `${rev}:${f}`) : (() => { try { return readFileSync(resolve(root, f), 'utf8'); } catch { return ''; } })();
const vn = v => v.split('.').reduce((a, x) => a * 1000 + +x, 0);
const versions = ['', 'origin/main'].map(r => (read(r, 'src/data/changelog.ts').match(/version: '(\d+\.\d+\.\d+)'/) || [])[1]).filter(Boolean);
const live = (() => { try { return JSON.parse(read('origin/main', 'build/version.json')).version; } catch { return '?'; } })();
const maxNum = (re, files) => Math.max(0, ...['', 'origin/main'].flatMap(r => files.flatMap(f => [...read(r, f).matchAll(re)].map(m => +m[1]))));
const docs = ['docs/DECISIONS.md', 'docs/ROADMAP.md', 'CLAUDE.md'];
const topV = versions.sort((a, b) => vn(b) - vn(a))[0] || '?';
console.log('\n== Numbers ==');
console.log(`live on the website: V${live} · newest in patch notes (here or GitHub): V${topV}`);
if (versions.length === 2 && versions[0] !== versions[1]) console.log(`! this PC says V${versions[0]}, GitHub says V${versions[1]}`);
console.log(`next decision row: S${maxNum(/\bS(\d{2,3})\b/g, docs) + 1} · next question: Q${maxNum(/\bQ(\d{2,3})\b/g, docs) + 1}`);

if (process.argv.includes('--pull') && incoming.length) {
  if (outgoing.length || dirty.length) console.log('\n! not pulling: this PC has its own changes — merge by hand (or ask Claude) so nothing is lost');
  else { git('merge', '--ff-only', 'origin/main'); console.log(`\n✓ pulled ${incoming.length} change(s) from GitHub`); }
}
