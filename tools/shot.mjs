// Review shots in one command (owner 2026-10-19: fewer steps, fewer tokens).
//   node tools/shot.mjs OUT.png "Title" "step; step; …" ["step; …" …]
// Each quoted argument after the title is one shot (a panel on the sheet). Steps, separated by ";":
//   url:?query      open build-test/index.html with that query (default ?dev)      click:SELECTOR    click an element
//   wait:MS         wait                                                      js:CODE           run code in the page
//   key:KEY         press a key                                               cap:TEXT          caption for this panel
//   size:WxH        window size for this panel (default 1280x720; phones e.g. size:844x390 with url:?dev&phone)
//   jsfile:PATH     run a file of page code (anything too long or with ; for a js: step)
//   hover:SELECTOR  move the mouse over an element                            touch             a touch-screen phone page (pointer:coarse)
//   waitfor:WHAT    wait for a race moment: green · launch · results · nitro · perfect (a Perfect shift) · typing (Typing Race running)
// Presets (T4, V0.16.0) — whole review sheets in one word instead of a list of steps:
//   node tools/shot.mjs OUT.png --preset phone   every main screen on a 844 × 390 touch phone (+ race, Typing Race)
//   node tools/shot.mjs OUT.png --preset pc      every main screen on PC
//   node tools/shot.mjs OUT.png --preset race    countdown, launch, mid-race, results (PC + phone)
// Example: node tools/shot.mjs build-test/shots/garage.png "Garage" "click:[data-panel=garage]; wait:1500; cap:Garage"
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2).filter(a => a !== '--no-build'), pi = argv.indexOf('--preset'), preset = pi >= 0 ? argv.splice(pi, 2)[1] : '';
const SCREENS = ['wait:1200; cap:Home', 'wait:1200; click:#menuBtn; wait:400; cap:Menu', 'click:[data-panel=profile]; wait:900; cap:Profile', 'click:[data-panel=garage]; wait:1200; cap:My cars',
  'click:[data-panel=garage]; wait:900; click:#gParts; wait:1300; cap:Body Shop', 'click:[data-panel=garage]; wait:900; click:#gUpg; wait:1000; cap:Upgrades', 'click:[data-panel=catalog]; wait:1500; cap:Catalog',
  'click:[data-panel=settings]; wait:800; cap:Settings', 'click:[data-panel=daily]; wait:800; cap:Daily', 'click:#notesBtn; wait:800; cap:Patch notes', 'click:#raceBtn; wait:600; cap:Race menu',
  'click:#raceBtn; wait:500; click:#stripOpen; wait:1500; cap:The Strip'];
const RACE = ['url:?dev&blur=off; click:#raceBtn; wait:400; click:#streetRace; wait:1800; cap:Countdown', 'url:?dev&autoplay&blur=off; click:#raceBtn; wait:400; click:#streetRace; waitfor:launch; wait:300; cap:Launch',
  'url:?dev&autoplay&blur=off; click:#raceBtn; wait:400; click:#streetRace; waitfor:green; wait:6000; cap:Mid-race', 'url:?dev&fast=4&autoplay; click:#raceBtn; wait:400; click:#streetRace; waitfor:results; wait:600; cap:Results',
  'url:?dev&fast=4&autoplay; click:#raceBtn; click:#typingRace; waitfor:typing; wait:1500; cap:Typing Race'];
const PRESETS = { pc: SCREENS, phone: [...SCREENS, ...RACE.slice(1, 3), RACE[4]].map(s => 'touch; size:844x390; ' + s + ' (phone)'), race: [...RACE, ...RACE.slice(0, 3).map(s => 'touch; size:844x390; ' + s + ' (phone)')] };
if (preset && !PRESETS[preset]) { console.log(`unknown preset "${preset}" — use ${Object.keys(PRESETS).join(' / ')}`); process.exit(1); }
const [outArg, title = preset ? `Preset: ${preset}` : 'Voxel City', ...shots] = preset ? [argv[0], argv[1], ...PRESETS[preset]] : argv;
/** waitfor:WHAT — page conditions for race moments */
const WAITS = { green: '__vc.race && __vc.race.green', launch: '__vc.race && __vc.race.racers[0].launched', results: "__vc.screen === 'results'", nitro: '__vc.race && __vc.race.racers[0].nitro > 0.5',
  perfect: "__vc.race && /Perfect/.test((__vc.race.racers[0].lastEvent || {}).text || '') && __vc.race.t - __vc.race.racers[0].lastEvent.t > 0.05", typing: '__vc.typing && performance.now() - __vc.typing.start > 4000' };
if (!outArg || !shots.length) { console.log('usage: node tools/shot.mjs OUT.png "Title" "step; step" …'); process.exit(1); }
const out = resolve(outArg); mkdirSync(dirname(out), { recursive: true });
// T1: always test the current code — build it into build-test/ first (seconds; never touches the live build/ folder)
if (!process.argv.includes('--no-build')) execFileSync(process.execPath, [resolve(root, 'tools/build.mjs'), '--out', 'build-test'], { stdio: 'ignore' });

const linux = process.platform === 'linux';
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || (linux ? '/opt/pw-browsers/chromium' : undefined),
  args: linux ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const desk = await b.newPage({ viewport: { width: 1280, height: 720 } }); desk.setDefaultTimeout(300000);
let touchPg = null, pg = desk;   // 'touch' step: a phone-like page (touch screen, so (pointer:coarse) styles apply)
const page = q => pathToFileURL(resolve(root, 'build-test/index.html')).href + (q || '?dev');
const panels = [];
for (const spec of shots) {
  let cap = '', url = '?dev';
  const steps = spec.split(';').map(s => s.trim()).filter(Boolean);
  if (steps.includes('touch')) { if (!touchPg) { touchPg = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); touchPg.setDefaultTimeout(300000); } pg = touchPg; } else pg = desk;
  const u = steps.find(s => s.startsWith('url:')); if (u) url = u.slice(4);
  const sz = steps.find(s => s.startsWith('size:')), [vw, vh] = sz ? sz.slice(5).split('x').map(Number) : [1280, 720];
  await pg.setViewportSize({ width: vw, height: vh });
  await pg.goto(page(url)); await pg.waitForFunction(() => window.__vc && window.__vc.screen); await pg.waitForTimeout(1500);
  for (const s of steps) {
    const [k, ...r] = s.split(':'), v = r.join(':');
    // garage tabs sit in the side rail behind the Menu button (V0.12.0): open it first when a step clicks one
    if (k === 'click' && v.startsWith('[data-panel') && await pg.evaluate(() => !!document.querySelector('.g-bar') && getComputedStyle(document.querySelector('.g-bar')).visibility === 'hidden')) await pg.click('#menuBtn');
    if (k === 'click') await pg.click(v); else if (k === 'hover') await pg.hover(v); else if (k === 'wait') await pg.waitForTimeout(+v);
    else if (k === 'js') await pg.evaluate(v); else if (k === 'jsfile') await pg.evaluate(readFileSync(v, 'utf8')); else if (k === 'key') await pg.keyboard.press(v); else if (k === 'cap') cap = v;
    else if (k === 'waitfor') { if (!WAITS[v]) throw new Error(`waitfor:${v}? use ${Object.keys(WAITS).join(' / ')}`); await pg.waitForFunction(WAITS[v], null, { timeout: 120000, polling: 15 }); }
  }
  panels.push({ cap, img: (await pg.screenshot()).toString('base64') });
}
// compose the sheet in the browser itself (no extra tools needed)
const cols = panels.length > 1 ? 2 : 1, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
await pg.setViewportSize({ width: cols * 980 + 30, height: 200 });
await pg.setContent(`<body style="margin:0;background:#14161c;font:700 22px system-ui;color:#e9ecf2;padding:20px 15px">
  <div style="color:#f2c230;font-size:32px;margin:0 0 14px 5px">${esc(title)}</div>
  <div style="display:grid;grid-template-columns:repeat(${cols},960px);gap:20px">${panels.map(p => `<div><div style="margin:0 0 8px">${esc(p.cap)}</div><img style="width:960px;display:block" src="data:image/png;base64,${p.img}"></div>`).join('')}</div></body>`);
await pg.waitForTimeout(300);
writeFileSync(out, await pg.screenshot({ fullPage: true }));
await b.close(); console.log(out);
