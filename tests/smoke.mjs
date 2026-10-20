// Quick smoke test (owner 2026-10-19: shorter test times). ~3 min here (software graphics), well under a minute on a PC
// with a graphics card. Every screen opens, one drag race and one Typing Race finish (auto-driven, clock ×4), Car Lab
// opens, no page errors. The full browser test (tests/e2e.py) is for big versions.
//   node tests/smoke.mjs            (first time on a new computer: npx playwright install chromium)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || resolve(root, 'build/smoke'); mkdirSync(out, { recursive: true });
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

await pg.goto(pathToFileURL(resolve(root, 'build/index.html')).href + '?fast=4&autoplay&dev');
await pg.waitForFunction(() => window.__vc && window.__vc.screen === 'garage');
const v = await ev(() => [window.__vc.version, document.querySelector('#notesBtn span')?.textContent]);
ok('garage loads, version shown', v[1] === `V${v[0]}`, v.join(' / '));
for (const tab of ['profile', 'garage', 'upgrades', 'catalog', 'settings']) {
  await pg.click(`[data-panel="${tab}"]`); await pg.waitForTimeout(400);
  const open = await ev(() => !!document.querySelector('.g-panel, .cat-list, .gr-list'));
  ok(`tab opens: ${tab}`, open);
  if (tab === 'garage') { await pg.click('.gr-card'); await pg.waitForTimeout(300); ok('garage: Drive / Parts / Upgrade pop out', await ev(() => document.querySelectorAll('.gr-dbtn').length === 3)); }
  await pg.click(`[data-panel="${tab}"]`); await pg.waitForTimeout(200);
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
// Car Lab (dev only)
await ev(() => window.__vc.openLab()); await pg.waitForTimeout(800);
await pg.fill('#carlab [data-n="L"]', '70'); await pg.dispatchEvent('#carlab [data-n="L"]', 'input'); await pg.waitForTimeout(600);
ok('Car Lab opens and rebuilds the car', await ev(() => !!document.querySelector('#carlab') && document.querySelector('#labJson').value.includes('"L":70')));
await pg.screenshot({ path: `${out}/carlab.png` });
ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await browser.close();
console.log(`\n${res.length - fails}/${res.length} passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
