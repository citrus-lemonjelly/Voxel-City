// Quick smoke test (owner 2026-10-19: shorter test times). ~3 min here (software graphics), well under a minute on a PC
// with a graphics card. Every screen opens, one drag race and one Typing Race finish (auto-driven, clock ×4), Car Lab
// opens, no page errors. The full browser test (tests/e2e.py) is for big versions.
//   node tests/smoke.mjs            (first time on a new computer: npx playwright install chromium)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(root, 'build-test/smoke'); mkdirSync(out, { recursive: true });
// T1: always test the current code — build it into build-test/ first (seconds; never touches the live build/ folder)
if (!process.argv.includes('--no-build')) execFileSync(process.execPath, [resolve(root, 'tools/build.mjs'), '--out', 'build-test'], { stdio: 'ignore' });

const linux = process.platform === 'linux';
const browser = await chromium.launch({
  headless: true, executablePath: process.env.PW_CHROMIUM || (linux ? '/opt/pw-browsers/chromium' : undefined),
  args: linux ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [],
});
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
pg.setDefaultTimeout(300000);
const t0 = Date.now(), res = []; let fails = 0;
const ok = (name, cond, detail = '') => { res.push([name, !!cond]); if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const ev = f => pg.evaluate(f);
/** Garage tabs live in the side rail behind the Menu button (V0.12.0): open it first if it is closed. */
const tab = async name => { if (await ev(() => getComputedStyle(document.querySelector('.g-bar')).visibility === 'hidden')) await pg.click('#menuBtn'); await pg.click('[data-panel="' + name + '"]'); };

await pg.goto(pathToFileURL(resolve(root, 'build-test/index.html')).href + '?fast=4&autoplay&dev');
await pg.waitForFunction(() => window.__vc && window.__vc.screen === 'garage');
const v = await ev(() => [window.__vc.version, document.querySelector('#notesBtn span')?.textContent]);
ok('garage loads, version shown', v[1] === `V${v[0]}`, v.join(' / '));
ok('PC: the side rail is always shown (no Menu button)', await ev(() => getComputedStyle(document.querySelector('.g-bar')).visibility === 'visible' && getComputedStyle(document.querySelector('#menuBtn')).display === 'none'));
ok('home screen: Garage sub-tabs beside Settings', await ev(() => !!document.querySelector('#garage.home-mode > .g-sub #gParts')));
ok('bottom bar: no separate Upgrades tab (it lives in Garage ▸ Upgrade)', await ev(() => !document.querySelector('[data-panel="upgrades"]')));
for (const t of ['profile', 'garage', 'catalog', 'settings', 'daily', 'calendar']) {
  await tab(t); await pg.waitForTimeout(400);
  const open = await ev(() => !!document.querySelector('.g-panel, .cat-list, .gr-list'));
  ok(`tab opens: ${t}`, open);
  if (t === 'garage') { ok('garage: Drive / Body Shop / Upgrade / Sell show as soon as it opens', await ev(() => document.querySelectorAll('.g-subtab').length === 4 && document.querySelectorAll('[data-gtab]').length === 2));
    await pg.click('#gParts'); await pg.waitForTimeout(500);
    const paint = await ev(() => document.querySelectorAll('.pt-swatch').length);
    await pg.click('[data-slot="plate"]'); await pg.waitForTimeout(500);
    ok('body shop: paint tab + plate text box', paint >= 20 && await ev(() => !!document.querySelector('#plateText')), `${paint} paints`);
    await pg.click('[data-slot="paint"]'); await pg.waitForTimeout(200); await pg.click('#garage .g-close'); await pg.waitForTimeout(300);
    await pg.click('#gUpg'); await pg.waitForTimeout(400);
    ok('garage ▸ Upgrade opens the Upgrades panel', await ev(() => !!document.querySelector('button.tier[data-kind="engine"]')));
    await pg.click('#garage .g-close'); await pg.waitForTimeout(300); await pg.click('#garage .g-close'); await pg.waitForTimeout(300); continue; }
  await tab(t); await pg.waitForTimeout(200);
}
await pg.click('#notesBtn'); await pg.waitForTimeout(300); ok('patch notes open', await ev(() => !!document.querySelector('.pn-ver'))); await pg.click('#notesBtn');
// one drag race (auto-driven)
await pg.click('#raceBtn'); await pg.click('#streetRace');
await pg.waitForFunction(() => window.__vc.screen === 'results');
ok('drag race finishes with a result', await ev(() => window.__vc.lastResult && window.__vc.lastResult.total > 0));
await pg.click('#toGarage'); await pg.waitForFunction(() => window.__vc.screen === 'garage');
// one Typing Race (auto-typed), with a nitro
await pg.click('#raceBtn'); await pg.click('#typingRace');
await pg.waitForFunction(() => window.__vc.screen === 'typing' && window.__vc.typing && window.__vc.typing.run.pos > 3);
await pg.keyboard.press('Enter');                                   // nitro
await pg.waitForFunction(() => window.__vc.screen === 'results' && window.__vc.lastTyping);
const ty = await ev(() => [window.__vc.lastTyping.place, Math.round(window.__vc.lastTyping.wpm), window.__vc.lastTyping.total]);
ok('Typing Race finishes with places and pay', ty[0] >= 1 && ty[0] <= 5 && ty[1] > 0 && ty[2] > 0, JSON.stringify(ty));
await pg.screenshot({ path: `${out}/typing-results.png` });
await pg.click('#tyGarage');
// one Drift run (V0.18.0) from the race menu: the AI drives (autoplay), launch → drifts → finish → results with pay
await pg.click('#raceBtn'); await pg.click('#driftRun');
await pg.waitForFunction(() => window.__vc.screen === 'drift' && window.__vc.drift && window.__vc.drift.run.drifting);
await pg.screenshot({ path: `${out}/drift.png` });
await pg.waitForFunction(() => window.__vc.screen === 'results' && window.__vc.lastDrift);
const dft = await ev(() => [window.__vc.lastDrift.score, window.__vc.lastDrift.turns.length, window.__vc.lastDrift.total]);
ok('Drift run: launch, drifts, results with pay', dft[0] > 0 && dft[1] >= 3 && dft[2] > 0, JSON.stringify(dft));
await pg.click('#toGarage');
// Daily + calendar (V0.9.0): the two races count towards today's tasks; claim calendar day 1
await tab('daily'); await pg.waitForTimeout(300);
const dl = await ev(() => [document.querySelectorAll('.dl-task').length, window.__vc.save.daily?.prog.join(',')]);
await tab('calendar'); await pg.waitForTimeout(300); await pg.click('#calClaim'); await pg.waitForTimeout(300);
ok('daily tasks + login calendar', dl[0] === 4 && await ev(() => window.__vc.save.cal?.n === 1), JSON.stringify(dl));
await pg.screenshot({ path: `${out}/calendar.png` }); await tab('calendar');
// Car Lab (dev only)
await ev(() => window.__vc.openLab()); await pg.waitForTimeout(800);
await pg.fill('#carlab [data-n="L"]', '70'); await pg.dispatchEvent('#carlab [data-n="L"]', 'input'); await pg.waitForTimeout(600);
ok('Car Lab opens and rebuilds the car', await ev(() => !!document.querySelector('#carlab') && document.querySelector('#labJson').value.includes('"L":70')));
await pg.screenshot({ path: `${out}/carlab.png` });
ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await browser.close();
console.log(`\n${res.length - fails}/${res.length} passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
