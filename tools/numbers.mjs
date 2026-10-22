// Next free numbers across every session (S91, D3): reads the patch notes and docs on this PC, on GitHub's main and on every
// other branch on GitHub (cloud sessions push to their own claude/… branches), so two sessions never hand out the same
// version, S-row or Q-number. Also warns when two places already used the same new number for different work.
//   npm run numbers            fetch GitHub, then report
//   npm run numbers -- --local skip the fetch (offline)
// `npm run sync` prints the same report at the end.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return ''; } };
const lines = s => s ? s.split('\n').filter(Boolean) : [];

const DOCS = ['docs/DECISIONS.md', 'docs/ROADMAP.md', 'CLAUDE.md'];
const read = (rev, f) => rev ? tryGit('show', `${rev}:${f}`) : (() => { try { return readFileSync(resolve(root, f), 'utf8'); } catch { return ''; } })();
const vn = v => v.split('.').reduce((a, x) => a * 1000 + +x, 0);
const nums = (text, re) => new Set([...text.matchAll(re)].map(m => +m[1]));

// what one place (a branch, or this PC's files when rev is '') has used
function scan(rev) {
  const docs = DOCS.map(f => read(rev, f)).join('\n');
  const versions = [...read(rev, 'src/data/changelog.ts').matchAll(/version: '(\d+\.\d+\.\d+)'/g)].map(m => m[1]);
  return { versions: new Set(versions), S: nums(docs, /\bS(\d{2,3})\b/g), Q: nums(docs, /\bQ(\d{2,3})\b/g) };
}

export function numbersReport({ fetch = true } = {}) {
  const out = [];
  if (fetch) try { git('fetch', '-q', '--prune', 'origin'); } catch { out.push('! could not reach GitHub — showing what this PC already knows'); }
  const here = tryGit('rev-parse', '--abbrev-ref', 'HEAD');
  const upstream = tryGit('rev-parse', '--abbrev-ref', '@{upstream}');
  const main = scan('origin/main');
  // places that can hold numbers main doesn't have yet: this PC's files + every other branch on GitHub
  const places = [{ name: `this ${process.env.CLAUDE_CODE_REMOTE ? 'session' : 'PC'} (${here})`, ...scan('') }];
  for (const b of lines(tryGit('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'))) {
    if (b === 'origin/main' || b === 'origin/HEAD' || b === 'origin' || b === upstream) continue;
    if (!tryGit('log', '-1', '--format=%h', `origin/main..${b}`)) continue; // nothing main doesn't have
    places.push({ name: `GitHub ${b.replace('origin/', '')}`, ...scan(b) });
  }

  const live = (() => { try { return JSON.parse(read('origin/main', 'build/version.json')).version; } catch { return '?'; } })();
  const all = [main, ...places];
  const topV = all.flatMap(p => [...p.versions]).sort((a, b) => vn(b) - vn(a))[0] || '0.0.0';
  const maxOf = k => Math.max(0, ...all.flatMap(p => [...p[k]]));
  const [ma, mi, pa] = topV.split('.').map(Number);
  out.push(`live on the website: V${live} · newest anywhere: V${topV}`);
  out.push(`next free: patch V${ma}.${mi}.${pa + 1} · minor V${ma}.${mi + 1}.0 · decision row S${maxOf('S') + 1} · question Q${maxOf('Q') + 1}`);

  // new numbers per place (not on main yet) and clashes between places
  const fresh = p => ({ V: [...p.versions].filter(v => !main.versions.has(v)), S: [...p.S].filter(n => !main.S.has(n)), Q: [...p.Q].filter(n => !main.Q.has(n)) });
  const used = { V: new Map(), S: new Map(), Q: new Map() };
  for (const p of places) {
    const f = fresh(p), parts = [];
    for (const k of ['V', 'S', 'Q']) {
      for (const n of f[k]) used[k].set(n, [...(used[k].get(n) || []), p.name]);
      if (f[k].length) parts.push(`${k} ${f[k].sort((a, b) => k === 'V' ? vn(a) - vn(b) : a - b).join(', ')}`);
    }
    if (parts.length) out.push(`  not on main yet — ${p.name}: ${parts.join(' · ')}`);
  }
  for (const [k, m] of Object.entries(used)) for (const [n, who] of m) if (who.length > 1)
    out.push(`! ${k}${n} used in ${who.length} places (${who.join(', ')}) — renumber one before it ships`);
  if (process.env.CLAUDE_CODE_REMOTE) out.push('cloud session: work and push on this claude/… branch only — never ship from here (CLAUDE.md "Cloud sessions")');
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('== Numbers (this PC + every branch on GitHub) ==');
  numbersReport({ fetch: !process.argv.includes('--local') }).forEach(l => console.log(l));
}
