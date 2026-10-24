// Layout check (T3, V0.16.0): opens every garage screen on a PC and three phone sizes and flags what screenshots kept catching
// by eye — anything sticking out of the window, the always-there buttons overlapping each other, text spilling out of its box,
// and (as a warning) text drawn smaller than 10 px. Builds build-test/ first, like the smoke test.
//   npm run layout            all sizes        npm run layout -- pc      one size (pc · small · phone · large)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--no-build')) execFileSync(process.execPath, [resolve(root, 'tools/build.mjs'), '--out', 'build-test'], { stdio: 'ignore' });

const SIZES = { pc: { w: 1280, h: 720, touch: false }, small: { w: 667, h: 375, touch: true }, phone: { w: 844, h: 390, touch: true }, large: { w: 932, h: 430, touch: true } };
const only = process.argv.slice(2).find(a => SIZES[a]);
/** [name, steps] — steps: a CSS selector to click, or a number of ms to wait; '#rail' opens the side menu if it is closed */
const SCREENS = [['Home', []], ['Menu open', ['#rail']], ['Profile', ['#rail', '[data-panel=profile]']], ['My cars', ['#rail', '[data-panel=garage]']],
  ['Body Shop', ['#rail', '[data-panel=garage]', '#gParts']], ['Upgrades', ['#rail', '[data-panel=garage]', '#gUpg']], ['Car Lab', ['#rail', '[data-panel=garage]', '#gUpg', '#openLab']], ['Car Lab + test run', ['#rail', '[data-panel=garage]', '#gUpg', '#openLab', '#dynoBtn']],
  ['Catalog', ['#rail', '[data-panel=catalog]', 900]], ['Settings', ['#rail', '[data-panel=settings]']], ['Daily', ['#rail', '[data-panel=daily]']], ['Calendar', ['#rail', '[data-panel=calendar]']],
  ['Patch notes', ['#notesBtn']], ['City map', ['#raceBtn', 6000]], ['City map · whole', ['#raceBtn', 4000, '#cmCity', 1500]], ['Typing menu', ['#typingBtn']], ['The Strip', ['#raceBtn', 4000, '#stripOpen', 900]]];

/** Runs in the page: returns [kind, text] problems for what is on screen now. */
function check() {
  const out = [], vw = innerWidth, vh = innerHeight, seen = el => { const s = getComputedStyle(el); return el.getClientRects().length && s.visibility !== 'hidden' && +s.opacity > 0.05 && s.display !== 'none'; };
  const name = el => el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase();
  const label = el => `${name(el)}${el.textContent.trim() ? ` "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}"` : ''}`;
  const inScroller = el => { for (let p = el.parentElement; p && p.id !== 'garage'; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(o.overflowY + o.overflowX)) return true; } return false; };
  const g = document.getElementById('garage') || document.getElementById('citymap'); if (!g) return [['error', 'no garage or city map screen']];   // RACE opens the city map (V0.20.0)
  // 1. off screen
  for (const el of g.querySelectorAll('button:not(.cm-tag), .g-panel, .cat-list, .pt-tabs, .cat-under, .gr-info, .strip-wrap, .g-util, .g-raceside, .g-bar, .g-wallet, .g-title, .g-racemenu, #garage > .g-sub, .cm-panel, .cm-btns, .cm-title')) {
    if (!seen(el) || (el.tagName === 'BUTTON' && inScroller(el))) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -2 || r.top < -2 || r.right > vw + 2 || r.bottom > vh + 2) out.push(['off screen', `${label(el)} (${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)})`]);
  }
  // 2. the always-there buttons overlapping each other
  const chrome = [...g.querySelectorAll('.g-util, .g-raceside, #garage > .g-sub, .g-wallet, .g-title, .g-bar, .cm-panel, .cm-btns, .cm-title')].filter(seen);
  for (let i = 0; i < chrome.length; i++) for (let j = i + 1; j < chrome.length; j++) {
    const a = chrome[i].getBoundingClientRect(), b = chrome[j].getBoundingClientRect();
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (x > 2 && y > 2) out.push(['overlap', `${name(chrome[i])} and ${name(chrome[j])} (${Math.round(x)}×${Math.round(y)} px)`]);
  }
  // 3. text spilling out of its box (ellipsis is on purpose)
  for (const el of g.querySelectorAll('button, h1, h2, h3, .setrow > span, .g-sub-name, .sl-card .hd, .cat-row b')) {
    if (!seen(el) || getComputedStyle(el).textOverflow === 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.push(['text overflow', `${label(el)} needs ${el.scrollWidth} px, has ${el.clientWidth}`]);
  }
  // 4. tiny text (warning): font size × how much the screen is scaled down
  let min = 99, minEl = null;
  for (const el of g.querySelectorAll('*')) {
    if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize) * (r.height / (el.offsetHeight || r.height));
    if (fs < min) { min = fs; minEl = el; }
  }
  if (min < 10) out.push(['small text', `${label(minEl)} drawn at ${min.toFixed(1)} px`]);
  return out;
}

const linux = process.platform === 'linux';   // Linux / cloud sessions: the pre-installed browser + software WebGL (as shot.mjs and smoke)
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || (linux ? '/opt/pw-browsers/chromium' : undefined),
  args: linux ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const url = pathToFileURL(resolve(root, 'build-test/index.html')).href + '?dev&weather=clear';
let errors = 0, warnings = 0; const t0 = Date.now();
for (const [size, S] of Object.entries(SIZES)) {
  if (only && size !== only) continue;
  const pg = await (await b.newContext({ viewport: { width: S.w, height: S.h }, hasTouch: S.touch, isMobile: S.touch })).newPage();
  const found = [];
  await pg.goto(url); await pg.waitForFunction(() => window.__vc && window.__vc.screen === 'garage'); await pg.waitForTimeout(800);
  for (const [screen, steps] of SCREENS) {
    await pg.evaluate(() => window.__vc.homeUI()); await pg.waitForTimeout(150);   // back home without reloading the 3D garage
    try {
      for (const s of steps) {
        if (typeof s === 'number') { await pg.waitForTimeout(s); continue; }
        if (s === '#rail') { if (await pg.evaluate(() => getComputedStyle(document.querySelector('.g-bar')).visibility === 'hidden')) await pg.click('#menuBtn'); continue; }
        await pg.click(s); await pg.waitForTimeout(250);
      }
    } catch (e) { found.push([screen, 'error', `could not open: ${String(e.message).split('\n')[0]}`]); continue; }
    for (const [kind, text] of await pg.evaluate(check)) found.push([screen, kind, text]);
  }
  const errs = found.filter(f => f[1] !== 'small text'), warns = found.filter(f => f[1] === 'small text');
  errors += errs.length; warnings += warns.length;
  console.log(`\n== ${size} ${S.w}×${S.h} — ${errs.length ? `${errs.length} problem(s)` : 'clean'}${warns.length ? `, ${warns.length} small-text warning(s)` : ''} ==`);
  for (const [screen, kind, text] of found) console.log(`${kind === 'small text' ? '  warn' : '  FAIL'}  ${screen.padEnd(20)} ${kind.padEnd(14)} ${text}`);
  await pg.close();
}
await b.close();
console.log(`\n${errors ? `${errors} layout problem(s)` : 'layout clean'} · ${warnings} warning(s) · ${SCREENS.length} screens · ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(errors ? 1 : 0);
