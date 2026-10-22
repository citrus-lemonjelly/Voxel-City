// Review shots in one command (owner 2026-10-19: fewer steps, fewer tokens).
//   node tools/shot.mjs OUT.png "Title" "step; step; …" ["step; …" …]
// Each quoted argument after the title is one shot (a panel on the sheet). Steps, separated by ";":
//   url:?query      open build/index.html with that query (default ?dev)      click:SELECTOR    click an element
//   wait:MS         wait                                                      js:CODE           run code in the page
//   key:KEY         press a key                                               cap:TEXT          caption for this panel
//   size:WxH        window size for this panel (default 1280x720; phones e.g. size:844x390 with url:?dev&phone)
//   hover:SELECTOR  move the mouse over an element                            touch             a touch-screen phone page (pointer:coarse)
// Example: node tools/shot.mjs build/shots/garage.png "Garage" "click:[data-panel=garage]; wait:1500; cap:Garage"
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, title = 'Voxel City', ...shots] = process.argv.slice(2);
if (!outArg || !shots.length) { console.log('usage: node tools/shot.mjs OUT.png "Title" "step; step" …'); process.exit(1); }
const out = resolve(outArg); mkdirSync(dirname(out), { recursive: true });
const linux = process.platform === 'linux';
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || (linux ? '/opt/pw-browsers/chromium' : undefined),
  args: linux ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const desk = await b.newPage({ viewport: { width: 1280, height: 720 } }); desk.setDefaultTimeout(300000);
let touchPg = null, pg = desk;   // 'touch' step: a phone-like page (touch screen, so (pointer:coarse) styles apply)
const page = q => pathToFileURL(resolve(root, 'build/index.html')).href + (q || '?dev');
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
    if (k === 'click' && v.startsWith('[data-panel') && await pg.evaluate(() => !!document.querySelector('#menuBtn') && !document.querySelector('#garage.rail-open'))) await pg.click('#menuBtn');
    if (k === 'click') await pg.click(v); else if (k === 'hover') await pg.hover(v); else if (k === 'wait') await pg.waitForTimeout(+v);
    else if (k === 'js') await pg.evaluate(v); else if (k === 'key') await pg.keyboard.press(v); else if (k === 'cap') cap = v;
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
