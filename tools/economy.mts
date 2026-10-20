// Economy pacing check (owner 2026-10-19): how fast money comes in and how long each league takes, straight from
// src/data/economy.ts. Change a number there, run `npm run economy`, see the effect in seconds.
// The player model below is a typical player, not a perfect one — change it here if the owner's play-tests disagree.
const E = await import('../src/data/economy.ts');
const { CARS, CATALOG_ORDER, LEAGUES } = await import('../src/data/cars.ts');
const { levelReward, STRIP } = await import('../src/game/strip.ts');
type Lg = 'D' | 'C' | 'B' | 'A' | 'S';

// ---------------- typical player ----------------
const PLAYER = {
  /** stock 800 m time per league (s, from the sim checks) — races get shorter in higher leagues */
  raceSec: { D: 24.3, C: 19.4, B: 17.6, A: 15.5, S: 11.8 } as Record<Lg, number>,
  /** countdown + roll-out past the line + results and menus (s) */
  dragOverhead: 3 + 4 + 10,
  dragWinRate: 0.7, perfectShiftsWin: 4, perfectShiftsLoss: 2, perfectLaunchRate: 0.6,
  /** Typing Race: typing speed, Medium passage length (chars), countdown + results (s) */
  wpm: 40, typingChars: 190, typingOverhead: 3 + 10,
  typingWinRate: 0.5, typingOtherPlace: 2, accuracyRate: 0.6,
};
/** owner targets (2026-10-19): hours to finish each league */
const TARGET: Record<Lg, [number, number]> = { D: [2, 3], C: [3, 4], B: [3, 6], A: [3, 6], S: [3, 6] };

const f = (n: number) => Math.round(n).toLocaleString('en-US');
const P = PLAYER;
function dragPerMin(l: Lg) {
  const w = E.racePay(l, 'medium', true), lo = E.racePay(l, 'medium', false);
  const win = w.result + P.perfectShiftsWin * w.perfectShift + P.perfectLaunchRate * w.perfectLaunch;
  const loss = lo.result + P.perfectShiftsLoss * w.perfectShift + P.perfectLaunchRate * w.perfectLaunch;
  return (P.dragWinRate * win + (1 - P.dragWinRate) * loss) / (P.raceSec[l] + P.dragOverhead) * 60;
}
function typingPerMin(l: Lg, wpm = P.wpm) {
  const acc = (pl: number) => E.typingPay(l, 'medium', pl, false, 1).result + P.accuracyRate * E.typingPay(l, 'medium', 1, false, 1).accuracy;
  const pay = P.typingWinRate * acc(1) + (1 - P.typingWinRate) * acc(P.typingOtherPlace);
  return pay / (P.typingChars / (wpm * 5) * 60 + P.typingOverhead) * 60;
}
const upgradeCost = (l: Lg) => [2, 3, 4, 5].reduce((a, t) => a + E.partPrice('engine', t, l) + E.partPrice('trans', t, l), 0);
const cheapestCar = (l: Lg) => Math.min(...CATALOG_ORDER.filter((id: string) => CARS[id].league === l && CARS[id].currency !== 'crowns' && CARS[id].price > 0).map((id: string) => CARS[id].price));
function stripCash(l: Lg) { let s = 0; for (let n = 1; n <= STRIP.rungs; n++) { const r = levelReward(l, n); s += r.vx + r.cash; } return s; }
function stripCrowns(l: Lg) { let s = 0; for (let n = 1; n <= STRIP.rungs; n++) s += levelReward(l, n).crowns; return s; }

const out: string[] = [];
const table = (title: string, head: string[], rows: (string | number)[][]) => {
  out.push('', `== ${title} ==`);
  const all = [head, ...rows.map(r => r.map(String))], w = head.map((_, i) => Math.max(...all.map(r => r[i].length)));
  all.forEach((r, j) => { out.push(r.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ')); if (!j) out.push(w.map(n => '-'.repeat(n)).join('  ')); });
};

table('VX per minute (typical player, Medium)', ['League', 'Street Race', `Typing ${P.wpm} wpm`, 'Typing 70 wpm', 'Typing ÷ Street'],
  (LEAGUES as Lg[]).map(l => [l, f(dragPerMin(l)), f(typingPerMin(l)), f(typingPerMin(l, 70)), (typingPerMin(l) / dragPerMin(l)).toFixed(2)]));

table('Hours to finish a league (buy its cheapest car + max it; the Strip pays along the way)',
  ['League', 'Car', 'Upgrades', 'Strip pays', 'Min per upgrade', 'Hours', 'Target', ''],
  (LEAGUES as Lg[]).map(l => {
    const rate = dragPerMin(l), need = cheapestCar(l) + upgradeCost(l) - stripCash(l) - E.ECONOMY.startingVoxels * +(l === 'D');
    const h = Math.max(0, need) / rate / 60, [lo, hi] = TARGET[l];
    return [l, f(cheapestCar(l)), f(upgradeCost(l)), f(stripCash(l)), (upgradeCost(l) / 8 / rate).toFixed(1), h.toFixed(1), `${lo}–${hi}`, h < lo ? 'TOO FAST' : h > hi ? 'TOO SLOW' : 'ok'];
  }));

const vxParts = Object.values(E.COSMETIC_PRICES).filter(c => c.currency !== 'crowns').map(c => c.price);
table('Cosmetics (VX parts) in minutes of that league\'s earnings', ['League', 'Cheapest part', 'Dearest part', 'Every VX part'],
  (LEAGUES as Lg[]).map(l => [l, (Math.min(...vxParts) / dragPerMin(l)).toFixed(1), (Math.max(...vxParts) / dragPerMin(l)).toFixed(1), (vxParts.reduce((a, b) => a + b, 0) / dragPerMin(l)).toFixed(0)]));

const crShop = Object.values(E.COSMETIC_PRICES).filter(c => c.currency === 'crowns').reduce((a, c) => a + c.price, 0) + E.PAINT.premium.reduce((a, p) => a + p.crowns, 0);
const crCars = Object.values(E.CAR_PRICES).filter(c => c.currency === 'crowns').reduce((a, c) => a + c.price, 0);
out.push('', '== Crowns ==', `Strip bosses pay ${(LEAGUES as Lg[]).map(l => `${l} ${stripCrowns(l)}`).join(' · ')} = ${(LEAGUES as Lg[]).reduce((a, l) => a + stripCrowns(l), 0)} Crowns in the whole game.`,
  `Crowns shop: cosmetics + premium paints ${crShop} · Crowns cars ${crCars} · plate text ${E.PLATE_TEXT.crowns} a change.`);
out.push('', `Player model: ${P.wpm} wpm, Street Race win rate ${P.dragWinRate * 100}%, Typing win rate ${P.typingWinRate * 100}% (edit PLAYER in tools/economy.mts).`);
console.log(out.join('\n'));
