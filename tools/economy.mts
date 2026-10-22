// Economy pacing check (owner 2026-10-19): how fast money comes in and how long each league takes, straight from
// src/data/economy.ts. Change a number there, run `npm run economy`, see the effect in seconds.
const E = await import('../src/data/economy.ts');
const { CARS, CATALOG_ORDER, LEAGUES } = await import('../src/data/cars.ts');
const { levelReward, STRIP } = await import('../src/game/strip.ts');
type Lg = 'D' | 'C' | 'B' | 'A' | 'S';

// The typical player + league targets live in economy.ts (PACING) so the test console uses the same numbers.
const P = E.PACING, TARGET = P.targetHours, dragPerMin = E.dragPerMin, typingPerMin = E.typingPerMin;
const f = (n: number) => Math.round(n).toLocaleString('en-US');
const KINDS = Object.keys(E.PART_PRICES) as (keyof typeof E.PART_PRICES)[];
const upgradeCost = (l: Lg) => [2, 3, 4, 5].reduce((a, t) => a + KINDS.reduce((b, k) => b + E.partPrice(k, t, l), 0), 0);
const cheapestCar = (l: Lg) => Math.min(...CATALOG_ORDER.filter((id: string) => CARS[id].league === l && CARS[id].currency !== 'crowns' && CARS[id].price > 0).map((id: string) => CARS[id].price));
function stripCash(l: Lg) { let s = 0; for (let n = 1; n <= STRIP.rungs; n++) { const r = levelReward(l, n); s += r.vx + r.cash; } return s; }
function stripCrowns(l: Lg) { let s = 0; for (let n = 1; n <= STRIP.rungs; n++) s += levelReward(l, n).crowns; return s; }

const out: string[] = [];
const table = (title: string, head: string[], rows: (string | number)[][]) => {
  out.push('', `== ${title} ==`);
  const all = [head, ...rows.map(r => r.map(String))], w = head.map((_, i) => Math.max(...all.map(r => r[i].length)));
  all.forEach((r, j) => { out.push(r.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ')); if (!j) out.push(w.map(n => '-'.repeat(n)).join('  ')); });
};

table('VX per minute (typical player, Medium)', ['League', 'Street Race', `Typing ${P.wpm} wpm`, 'Typing 70 wpm', 'Typing ÷ Street', 'Drift', 'Drift ÷ Street'],
  (LEAGUES as Lg[]).map(l => [l, f(dragPerMin(l)), f(typingPerMin(l)), f(typingPerMin(l, 70)), (typingPerMin(l) / dragPerMin(l)).toFixed(2), f(E.driftPerMin(l)), (E.driftPerMin(l) / dragPerMin(l)).toFixed(2)]));

table('Hours to finish a league (buy its cheapest car + max it; the Strip pays along the way)',
  ['League', 'Car', 'Upgrades', 'Strip pays', 'Min per upgrade', 'Hours', 'Target', ''],
  (LEAGUES as Lg[]).map(l => {
    const rate = dragPerMin(l), need = cheapestCar(l) + upgradeCost(l) - stripCash(l) - E.ECONOMY.startingVoxels * +(l === 'D');
    const h = Math.max(0, need) / rate / 60, [lo, hi] = TARGET[l];
    return [l, f(cheapestCar(l)), f(upgradeCost(l)), f(stripCash(l)), (upgradeCost(l) / (KINDS.length * 4) / rate).toFixed(1), h.toFixed(1), `${lo}–${hi}`, h < lo ? 'TOO FAST' : h > hi ? 'TOO SLOW' : 'ok'];
  }));

// V0.17.1 (owner: a friend made 120k+ a race, 5–6 races a minute): the fastest possible earner — Hard, every shift Perfect, no pause
table('Fastest grinder (Hard, all Perfect, Race again at once) — hours for the same league goal',
  ['League', 'VX per race', 'Races / min', 'VX / min', 'Hours', 'vs typical'],
  (LEAGUES as Lg[]).map(l => {
    const G = P.grinder, sec = P.raceSec[l] * G.raceShare + G.overhead, rate = dragPerMin(l, 'grinder'), need = cheapestCar(l) + upgradeCost(l) - stripCash(l) - E.ECONOMY.startingVoxels * +(l === 'D');
    return [l, f(rate * sec / 60), (60 / sec).toFixed(1), f(rate), (Math.max(0, need) / rate / 60).toFixed(1), `${(dragPerMin(l, 'grinder') / dragPerMin(l)).toFixed(1)}× faster`];
  }));

const vxIds = Object.keys(E.COSMETIC_PRICES).filter(id => E.COSMETIC_PRICES[id].currency !== 'crowns');
table('Cosmetics (VX parts, league prices) in minutes of that league\'s earnings', ['League', 'Cheapest part', 'Dearest part', 'Every VX part'],
  (LEAGUES as Lg[]).map(l => { const p = vxIds.map(id => E.cosmeticPrice(id, l).price), r = dragPerMin(l);
    return [l, (Math.min(...p) / r).toFixed(1), (Math.max(...p) / r).toFixed(1), (p.reduce((a, b) => a + b, 0) / r).toFixed(0)]; }));

const crShop = Object.values(E.COSMETIC_PRICES).filter(c => c.currency === 'crowns').reduce((a, c) => a + c.price, 0) + E.PAINT.premium.reduce((a, p) => a + p.crowns, 0);
const crCars = Object.values(E.CAR_PRICES).filter(c => c.currency === 'crowns').reduce((a, c) => a + c.price, 0);
out.push('', '== Crowns ==', `Strip bosses pay ${(LEAGUES as Lg[]).map(l => `${l} ${stripCrowns(l)}`).join(' · ')} = ${(LEAGUES as Lg[]).reduce((a, l) => a + stripCrowns(l), 0)} Crowns in the whole game.`,
  `Dailies + calendar: about ${Math.round(7 * (E.DAILY.tasks * E.DAILY.crownsEach + E.DAILY.crownsAll) + 30 / 28 * 7)} Crowns a week (a garage slot = ${E.GARAGE.slotCrowns}).`,
  `Crowns shop: cosmetics + premium paints ${crShop} · Crowns cars ${crCars} · plate text ${E.PLATE_TEXT.crowns} a change.`);
out.push('', `Player model: ${P.wpm} wpm, Street Race win rate ${P.dragWinRate * 100}%, Typing win rate ${P.typingWinRate * 100}% (edit PACING in src/data/economy.ts).`);
console.log(out.join('\n'));
