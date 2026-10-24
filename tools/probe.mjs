// Page probe (V0.18.1): open the test build, optionally run a start step, wait for a condition, then print what a page
// expression returns — for "where is this element / what state is the game in" questions, without a screenshot.
//   node tools/probe.mjs "?dev&course=downtown" "__vc.startDrift()" "__vc.drift && __vc.drift.run.cue() === 2" "document.querySelector('.d-cue').getBoundingClientRect()"
//   add --build to rebuild build-test first (shot / smoke / layout build it themselves)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2).filter(a => a !== '--build');
if (process.argv.includes('--build')) execFileSync(process.execPath, [resolve(root, 'tools/build.mjs'), '--out', 'build-test'], { stdio: 'ignore' });
const [query = '?dev', start = '', until = 'true', expr = '__vc.screen'] = args;
const linux = process.platform === 'linux';   // Linux / cloud sessions: the pre-installed browser + software WebGL (as shot.mjs and smoke)
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || (linux ? '/opt/pw-browsers/chromium' : undefined),
  args: linux ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] }); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
pg.on('pageerror', e => console.log('page error: ' + e.message));
await pg.goto(pathToFileURL(resolve(root, 'build-test/index.html')).href + query);
await pg.waitForFunction(() => window.__vc && window.__vc.screen);
if (start) await pg.evaluate(start);
await pg.waitForFunction(until, null, { timeout: 60000 });
// the expression may return a promise (e.g. a value read a few seconds later) — it is awaited
const out = await pg.evaluate(`Promise.resolve(${expr}).then(v => JSON.stringify(v && v.toJSON ? v.toJSON() : v, null, 1))`);
console.log(out); await b.close();
