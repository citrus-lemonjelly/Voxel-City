// ============================================================================================================
// VOXEL CITY ECONOMY — every price and payout in the game lives in this one file (owner 2026-10-19: "make sure
// they are easily adjustable"). Change a number here and rebuild; nothing else needs touching.
// Currencies: VX = Voxels (earned), Crowns (special, E3/Q98). All figures are placeholders until the owner
// confirms them (car prices below are the owner's ranges).
// ============================================================================================================

import type { Tune } from './parts';

export type EcoLeague = 'D' | 'C' | 'B' | 'A' | 'S';
export type Difficulty = 'easy' | 'medium' | 'hard';

// ---------------- Cars ----------------
/** Car prices. Owner ranges (2026-10-19): D 17,750–35,550 · C 42,650–85,650 · B 100,500–185,650 ·
 *  A 315,650–565,600 · S 1,250,500–3,560,500. Cars inside a league are spread evenly across its range, cheapest → dearest.
 *  The starter is free; Crowns cars are priced in Crowns. */
export const CAR_PRICES: Record<string, { price: number; currency?: 'vx' | 'crowns' }> = {
  panda_civix: { price: 0 },              // starter
  city:        { price: 17_750 },         // D (range 17,750 – 35,550)
  supermini:   { price: 23_700 },
  classic:     { price: 29_650 },
  premium:     { price: 35_550 },
  perfhatch:   { price: 150, currency: 'crowns' },
  pony:        { price: 42_650 },         // C (42,650 – 85,650)
  muscle:      { price: 85_650 },
  sedan:       { price: 100_500 },        // B (100,500 – 185,650)
  sporthatch:  { price: 143_075 },
  rally:       { price: 185_650 },
  compact:     { price: 315_650 },        // A (315,650 – 565,600)
  tuner:       { price: 565_600 },
  hyper:       { price: 1_250_500 },      // S (1,250,500 – 3,560,500; room for more hypercars up to the top of the range)
};

/** How much bigger each league's money is than League D (payouts, part prices, Strip cash). Payouts grow a little faster
 *  than car prices from league to league, so moving up stays fair (owner Q88). */
export const LEAGUE_SCALE: Record<EcoLeague, number> = { D: 1, C: 2.5, B: 6, A: 18.9, S: 76.7 };

// ---------------- Street Races ----------------
export const ECONOMY = {
  startingVoxels: 5_000,
  /** League D Medium win; other leagues × LEAGUE_SCALE, other difficulties × DIFFICULTY.pay.
   *  Owner Q106: leagues should take time — ~30 Medium wins buy a league's cheapest car, ~170 max out its upgrades. */
  winPayout: 600,
  /** a loss pays this share of the win */
  lossShare: 0.25,
  /** bonuses, as a share of the win payout */
  perfectShiftBonus: 0.05,   // each Perfect shift
  perfectLaunchBonus: 0.08,
  newBestBonus: 0.10,
};
/** Street Race difficulty (owner 2026-10-19): same rival matching, closer races, higher stakes.
 *  gap = how far (s) behind YOUR perfect run the rival finishes; pay = × the win payout. */
export const DIFFICULTY: Record<Difficulty, { label: string; gap: [number, number]; pay: number }> = {
  easy:   { label: 'Easy',   gap: [0.30, 0.55], pay: 0.6 },
  medium: { label: 'Medium', gap: [0.04, 0.21], pay: 1.0 },
  hard:   { label: 'Hard',   gap: [0.01, 0.07], pay: 1.8 },
};
const round = (n: number, to = 10) => Math.round(n / to) * to;
/** VX paid for a Street Race (or a Strip race) result. */
export function racePay(league: EcoLeague, diff: Difficulty, won: boolean) {
  const win = ECONOMY.winPayout * LEAGUE_SCALE[league] * DIFFICULTY[diff].pay;
  return { result: round(won ? win : win * ECONOMY.lossShare), perfectShift: round(win * ECONOMY.perfectShiftBonus), perfectLaunch: round(win * ECONOMY.perfectLaunchBonus), newBest: round(win * ECONOMY.newBestBonus) };
}

// ---------------- Performance parts ----------------
/** League D prices per tier (T1 = stock, free); other leagues × LEAGUE_SCALE. Effects live in parts.ts. */
/** Tuning Update (owner Q172): tyres 60 %, weight 70 % and turbo 100 % of the engine's prices. */
export const PART_PRICES = {
  engine: [0, 4_000, 8_000, 14_000, 22_000], trans: [0, 4_500, 9_000, 15_500, 24_000],
  tires: [0, 2_400, 4_800, 8_400, 13_200], weight: [0, 2_800, 5_600, 9_800, 15_400], turbo: [0, 4_000, 8_000, 14_000, 22_000],
  nitrous: [0, 3_000, 6_000, 10_500, 16_500],   // V0.16.0 — first guess, to be timed in the economy pass (Q181)
};
export type PartKind = keyof typeof PART_PRICES;
export const partPrice = (kind: PartKind, tier: number, league: EcoLeague) => round(PART_PRICES[kind][tier - 1] * LEAGUE_SCALE[league], 50);

// ---------------- Visual parts (cosmetic, owner 2026-10-19) ----------------
/** Bought once, fit every car (Q110). Common/rare in VX, the special ones in Crowns (Q111). Factory parts are free. */
export const COSMETIC_PRICES: Record<string, { price: number; currency?: 'vx' | 'crowns' }> = {
  'spoiler.none': { price: 1_500 }, 'spoiler.lip': { price: 4_000 }, 'spoiler.ducktail': { price: 6_000 }, 'spoiler.roof': { price: 9_000 }, 'spoiler.gt': { price: 14_000 },
  'exhaust.dual': { price: 3_000 }, 'exhaust.split': { price: 3_500 }, 'exhaust.single': { price: 6_000 }, 'exhaust.twinCentre': { price: 8_000 }, 'exhaust.quad': { price: 25, currency: 'crowns' },
  'hood.vents': { price: 5_000 }, 'hood.bulge': { price: 8_000 }, 'hood.scoop': { price: 10_000 }, 'hood.carbon': { price: 30, currency: 'crowns' },
  'wheels.steel': { price: 2_000 }, 'wheels.fivespoke': { price: 5_000 }, 'wheels.dish': { price: 5_000 }, 'wheels.multi': { price: 9_000 }, 'wheels.mesh': { price: 11_000 },
  'wheels.twin5': { price: 11_000 }, 'wheels.sixblack': { price: 12_000 }, 'wheels.turbofan': { price: 40, currency: 'crowns' }, 'wheels.gold5': { price: 40, currency: 'crowns' },
  'finish.matte': { price: 8_000 }, 'finish.metallic': { price: 12_000 }, 'finish.pearl': { price: 50, currency: 'crowns' },
  // v2 (owner Q117). Boss decals are never sold — they are won on the Strip.
  'decal.side': { price: 3_500 }, 'decal.checker': { price: 4_500 }, 'decal.number': { price: 5_000 }, 'decal.stripes': { price: 9_000 }, 'decal.flames': { price: 35, currency: 'crowns' },
  'underglow.ice': { price: 9_000 }, 'underglow.green': { price: 9_000 }, 'underglow.violet': { price: 12_000 }, 'underglow.red': { price: 12_000 },
  'underglow.pink': { price: 12_000 }, 'underglow.white': { price: 12_000 }, 'underglow.split': { price: 40, currency: 'crowns' },
  'bumper.lip': { price: 4_000 }, 'bumper.aero': { price: 10_000 }, 'bumper.track': { price: 30, currency: 'crowns' },
  'skirts.black': { price: 3_500 }, 'skirts.painted': { price: 7_000 }, 'skirts.carbon': { price: 25, currency: 'crowns' },
  'diffuser.fins': { price: 4_000 }, 'diffuser.race': { price: 11_000 },
  // Body Shop update (owner 2026-10-19)
  'exhaust.side': { price: 9_000 },
  'wheels.rally8': { price: 4_000 }, 'wheels.deepdish': { price: 10_000 }, 'wheels.blade': { price: 10_000 }, 'wheels.center7': { price: 12_000 }, 'wheels.wire': { price: 35, currency: 'crowns' },
  'roof.rack': { price: 4_500 }, 'roof.scoop': { price: 7_000 }, 'roof.twin': { price: 8_000 },
  'headlights.rect': { price: 3_000 }, 'headlights.slim': { price: 4_000 }, 'headlights.round': { price: 4_000 }, 'headlights.quad': { price: 7_000 }, 'headlights.split': { price: 8_000 },
  'headlights.notch': { price: 8_000 }, 'headlights.bar': { price: 9_000 }, 'headlights.blade': { price: 25, currency: 'crowns' }, 'headlights.popup': { price: 30, currency: 'crowns' },
  'taillights.rect': { price: 2_500 }, 'taillights.tall': { price: 3_000 }, 'taillights.smoked': { price: 5_000 }, 'taillights.bar': { price: 6_000 }, 'taillights.quad': { price: 6_000 }, 'taillights.blade': { price: 20, currency: 'crowns' },
  'mirrors.body': { price: 1_500 }, 'mirrors.black': { price: 1_500 }, 'mirrors.chrome': { price: 3_500 }, 'mirrors.none': { price: 5_000 }, 'mirrors.carbon': { price: 15, currency: 'crowns' },
  'grille.slats': { price: 2_000 }, 'grille.mesh': { price: 2_500 }, 'grille.wide': { price: 5_000 }, 'grille.frame': { price: 6_000 }, 'grille.none': { price: 15, currency: 'crowns' },
  'tint.light': { price: 2_000 }, 'tint.dark': { price: 3_000 }, 'tint.limo': { price: 6_000 }, 'tint.blue': { price: 8_000 }, 'tint.gold': { price: 20, currency: 'crowns' },
  'plate.city': { price: 1_500 }, 'plate.classic': { price: 2_000 }, 'plate.euro': { price: 2_000 }, 'plate.racing': { price: 3_500 }, 'plate.gold': { price: 20, currency: 'crowns' },
};
/** Your own text on a license plate: Crowns for every change (owner 2026-10-19). Up to 7 letters / numbers. */
export const PLATE_TEXT = { crowns: 10, maxLength: 7 };
/** Paint (owner 2026-10-19): picked free when you buy a car; after that a repaint costs VX (× the car's league scale).
 *  Premium paints are bought once with Crowns, then free on every car. */
export const PAINT = {
  repaintVx: 1_500,
  premium: [
    { id: 'candy', name: 'Candy apple', color: '#c8102e', crowns: 25 }, { id: 'lime', name: 'Electric lime', color: '#9be03a', crowns: 25 },
    { id: 'midnight', name: 'Midnight purple', color: '#3d1f78', crowns: 30 }, { id: 'sunburst', name: 'Sunburst gold', color: '#e6a822', crowns: 30 },
    { id: 'ocean', name: 'Deep ocean', color: '#0b5a8c', crowns: 25 }, { id: 'magenta', name: 'Hot magenta', color: '#e0287a', crowns: 25 },
    { id: 'steel', name: 'Liquid steel', color: '#b4bcc6', crowns: 35 }, { id: 'onyx', name: 'Onyx black', color: '#0c0c0f', crowns: 35 },
    // login calendar only (owner Q151): never sold, won on day 28
    { id: 'champion', name: 'Champion teal', color: '#19b5a5', crowns: 0, calendar: true },
  ] as { id: string; name: string; color: string; crowns: number; calendar?: boolean }[],
};
export const repaintPrice = (league: EcoLeague) => round(PAINT.repaintVx * LEAGUE_SCALE[league], 50);
/** A visual part's price. VX parts cost more in higher leagues (owner 2026-10-19, Q156: × LEAGUE_SCALE of the car it is
 *  bought for) and are owned per league (Q158a: buy it once for every car in that league). Crowns parts stay one price,
 *  bought once for every car. */
export function cosmeticPrice(id: string, league: EcoLeague = 'D'): { price: number; currency?: 'vx' | 'crowns' } {
  const c = COSMETIC_PRICES[id] ?? { price: 0 };
  return c.currency === 'crowns' ? c : { price: round(c.price * LEAGUE_SCALE[league], 50) };
}

// ---------------- Garage: slots and selling (owner Q152–Q153) ----------------
export const GARAGE = {
  /** car slots: boss cars don't take one */
  freeSlots: 6, slotCrowns: 50, maxSlots: 30,
  /** selling: share of the car's price and of the upgrades bought for it. The starter, boss cars and Crowns cars can't be sold. */
  sellCar: 0.5, sellUpgrades: 0.5,
};
/** VX for selling a car: half its price + half of the performance tiers bought for it (owner Q153). */
export function sellValue(league: EcoLeague, carPrice: number, owned: Partial<Record<PartKind, number[]>>) {
  const upg = (Object.keys(PART_PRICES) as PartKind[]).reduce((a, k) => a + (owned[k] ?? []).filter(t => t > 1).reduce((b, t) => b + partPrice(k, t, league), 0), 0);
  return round(carPrice * GARAGE.sellCar + upg * GARAGE.sellUpgrades, 50);
}

// ---------------- Dailies + login calendar (owner Q150–Q151, trial) ----------------
/** Three tasks a day (new ones at midnight, your clock). VX = share of a Medium Street Race win in the league of the car in
 *  use when you claim; Crowns are flat. */
export const DAILY = { tasks: 3, vxShare: 0.75, crownsEach: 2, crownsAll: 3 };
/** 28 days; claim one day per calendar day, missed days don't reset. Day 28 = a calendar-only paint (Crowns once owned). */
export const CALENDAR = { days: 28, vxShare: 0.5, crownDays: { 7: 10, 14: 10, 21: 10 } as Record<number, number>, finalPaint: 'champion', finalCrownsIfOwned: 25 };
export const dailyVx = (league: EcoLeague, share: number) => round(ECONOMY.winPayout * LEAGUE_SCALE[league] * share, 10);

// ---------------- The Strip ----------------
/** One-time level rewards (owner): level 1 = 100 VX, +10 VX a level (× LEAGUE_SCALE); every 10th level is a boss. */
export const STRIP_REWARDS = {
  firstVx: 100, perLevelVx: 10,
  /** boss levels (every 10th) — owner 2026-10-19: Crowns, a lump sum of cash, a universal decal, and on the final boss the boss car */
  boss: { crowns: 5, cashPerBoss: 1_000 /* × boss number (1–6) × LEAGUE_SCALE (owner Q149: was 2,500 — the Strip paid ~2/3 of a league) */, decal: true, carOnFinal: true },
};

// ---------------- Typing Race (owner 2026-10-19, Q122–Q129) ----------------
/** Typing only — the car you drive is looks (Q124); pay scales with its league like Street Races. */
export const TYPING = {
  /** win pay in League D at Medium; × LEAGUE_SCALE × DIFFICULTY.pay */
  winPayout: 1_000,
  /** share of the win pay for 1st … 5th */
  place: [1, 0.6, 0.4, 0.3, 0.25],
  /** league boost (owner Q148): Street Races get shorter in higher leagues, so a 40 wpm typist earns about the same per
   *  minute in both race types (check with `npm run economy`) */
  leagueBoost: { D: 1, C: 1.2, B: 1.25, A: 1.35, S: 1.5 } as Record<EcoLeague, number>,
  /** bonuses as a share of the win pay */
  newBestBonus: 0.25, accuracyBonus: 0.25, accuracyAt: 0.98,
  /** typing speed assumed before your first race, and how many recent races make your average */
  defaultWpm: 35, recentRaces: 10,
  /** how fast each difficulty's text types compared with Medium (starting point for its average) */
  textSpeed: { easy: 1.08, medium: 1, hard: 0.85 } as Record<Difficulty, number>,
  /** nitro bars per race (owner 2026-10-19): Space mid-word finishes the word */
  nitros: 2,
  /** the 4 rivals' speeds as × your average WPM (Q125): typing at your average just wins on Medium */
  rivals: { easy: [0.62, 0.70, 0.76, 0.82], medium: [0.80, 0.88, 0.94, 0.99], hard: [0.92, 0.99, 1.04, 1.09] } as Record<Difficulty, number[]>,
};
/** VX for a Typing Race result (place 1–5). */
export function typingPay(league: EcoLeague, diff: Difficulty, place: number, newBest: boolean, accuracy: number) {
  const win = TYPING.winPayout * LEAGUE_SCALE[league] * TYPING.leagueBoost[league] * DIFFICULTY[diff].pay;
  return { result: round(win * (TYPING.place[place - 1] ?? 0)), newBest: newBest ? round(win * TYPING.newBestBonus) : 0, accuracy: accuracy >= TYPING.accuracyAt ? round(win * TYPING.accuracyBonus) : 0 };
}

// ---------------- Pacing (owner 2026-10-19): a typical player, for `npm run economy` and the test console ----------------
/** League targets (hours to finish a league) and the typical player the numbers are checked against. */
export const PACING = {
  targetHours: { D: [2, 3], C: [3, 4], B: [3, 6], A: [3, 6], S: [3, 6] } as Record<EcoLeague, [number, number]>,
  /** stock 800 m time per league (s, from the sim checks) — races get shorter in higher leagues */
  raceSec: { D: 24.3, C: 19.4, B: 17.6, A: 15.5, S: 11.8 } as Record<EcoLeague, number>,
  /** countdown + roll-out past the line + results and menus (s) */
  dragOverhead: 17, dragWinRate: 0.7, perfectShiftsWin: 4, perfectShiftsLoss: 2, perfectLaunchRate: 0.6,
  /** Typing Race: speed, Medium passage length (chars), countdown + results (s) */
  wpm: 40, typingChars: 190, typingOverhead: 13, typingWinRate: 0.5, typingOtherPlace: 2, accuracyRate: 0.6,
};
/** VX a minute from Street Races (Medium) for the typical player. */
export function dragPerMin(l: EcoLeague) {
  const P = PACING, w = racePay(l, 'medium', true), lo = racePay(l, 'medium', false);
  const win = w.result + P.perfectShiftsWin * w.perfectShift + P.perfectLaunchRate * w.perfectLaunch;
  const loss = lo.result + P.perfectShiftsLoss * w.perfectShift + P.perfectLaunchRate * w.perfectLaunch;
  return (P.dragWinRate * win + (1 - P.dragWinRate) * loss) / (P.raceSec[l] + P.dragOverhead) * 60;
}
/** VX a minute from Typing Races (Medium) for the typical player at `wpm`. */
export function typingPerMin(l: EcoLeague, wpm = PACING.wpm) {
  const P = PACING, best = typingPay(l, 'medium', 1, false, 1);
  const at = (pl: number) => typingPay(l, 'medium', pl, false, 1).result + P.accuracyRate * best.accuracy;
  return (P.typingWinRate * at(1) + (1 - P.typingWinRate) * at(P.typingOtherPlace)) / (P.typingChars / (wpm * 5) * 60 + P.typingOverhead) * 60;
}

// ---------------- Rivals ----------------
// Rival shape. Rivals are rolled at random per race (src/game/rivals.ts, owner Q87): name, a car from your league, paint,
// upgrade tiers and skill (how close its launch/shift timing lands to Perfect), matched to your car + upgrades.
export interface OpponentDef { id: string; name: string; carId: string; /** its parts + gearing (owner Q173: random for variety) */ tune: Tune; skill: number; reaction: [number, number]; paint: string }
