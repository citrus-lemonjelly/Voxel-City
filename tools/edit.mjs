// Safe multi-file find-and-replace (T5, V0.16.0) — for Claude's code changes on this PC (no Python here, and shell quoting
// mangles code). Reads a JSON list of edits, checks every one first, then writes all or nothing; keeps each file's line endings.
//   node tools/edit.mjs edits.json [--check]
//   edits.json: [{ "file": "src/main.ts", "find": "old text", "replace": "new text", "all": false }, …]
//   find must appear exactly once (or use "all": true). Text is matched with \n line endings whatever the file uses.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [list, flag] = process.argv.slice(2);
if (!list) { console.log('usage: node tools/edit.mjs edits.json [--check]'); process.exit(1); }
const edits = JSON.parse(readFileSync(resolve(list), 'utf8'));
const files = new Map(), problems = [];
for (const [i, e] of edits.entries()) {
  const p = resolve(root, e.file);
  if (!files.has(p)) { let raw; try { raw = readFileSync(p, 'utf8'); } catch { raw = e.create ? '' : null; }
    if (raw === null) { problems.push(`#${i + 1} ${e.file}: file not found`); continue; }
    files.set(p, { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n'), changed: 0 }); }
  const f = files.get(p), find = e.find.replace(/\r\n/g, '\n'), n = find ? f.text.split(find).length - 1 : 0;
  if (e.create && !find) { f.text = e.replace; f.changed++; continue; }
  if (n === 0) { problems.push(`#${i + 1} ${e.file}: text not found — "${find.slice(0, 60).replace(/\n/g, '⏎')}…"`); continue; }
  if (n > 1 && !e.all) { problems.push(`#${i + 1} ${e.file}: text found ${n} times (add "all": true or more context)`); continue; }
  f.text = e.all ? f.text.split(find).join(e.replace) : f.text.replace(find, () => e.replace); f.changed++;
}
if (problems.length) { console.log('✗ nothing written:\n  ' + problems.join('\n  ')); process.exit(1); }
if (flag === '--check') { console.log(`✓ all ${edits.length} edits would apply`); process.exit(0); }
for (const [p, f] of files) writeFileSync(p, f.crlf ? f.text.replace(/\n/g, '\r\n') : f.text);
console.log(`✓ ${edits.length} edits in ${files.size} file(s): ${[...files.keys()].map(p => p.slice(root.length + 1)).join(', ')}`);
