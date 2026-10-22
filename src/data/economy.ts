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
  winPayout: 450,   // V0.17.1: 600 → 450 with the real (faster) race loop
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
  hard:   { label: 'Hard',   gap: [0.01, 0.07], pay: 1.3 },   // V0.17.1: 1.8 → 1.3 (with the faster race loop it paid far too much)
};
const round = (n: number, to = 10) => Math.round(n / to) * to;
/** VX paid for a Street Race (or a Strip race) result. */
/** Longer races pay more so they earn about the same VX a minute as 800 m (owner 2026-10-22: 1200 m ≈ 40 % longer). */
// V0.17.1: shorter tracks pay less (600 m was the quickest money — a race every ~10 s)
export const DIST_PAY: Record<number, number> = { 600: 0.8, 700: 0.9, 800: 1, 1200: 1.4 };
export function racePay(league: EcoLeague, diff: Difficulty, won: boolean, distM = 800) {
  const win = ECONOMY.winPayout * LEAGUE_SCALE[league] * DIFFICULTY[diff].pay * (DIST_PAY[distM] ?? 1);
  return { result: round(won ? win : win * ECONOMY.lossShare), perfectShift: round(win * ECONOMY.perfectShiftBonus), perfectLaunch: round(win * ECONOMY.perfectLaunchBonus), newBest: round(win * ECONOMY.newBestBonus) };
}

// ---------------- Drift (owner, V0.18.0) ----------------
/** Drift pay: a win is k × a Street Race win × the league factor (a run is ~25 s in every league; Street Races get much shorter
 *  in the fast leagues, so those leagues' drift pays more to keep up), a loss a quarter; bonuses as a share of the win:
 *  each Perfect entry, a clean run (no spins), a new best score on that course. Tuned so a typical player earns about the same VX
 *  a minute as in Street Races (`npm run economy`, sim check "drift pay parity"). */
export const DRIFT_PAY = { k: 1.16, lossShare: 0.25, perfectEntry: 0.03, clean: 0.1, newBest: 0.1, league: { D: 0.93, C: 1.19, B: 1.2, A: 1.28, S: 1.55 } as Record<EcoLeague, number> };
export function driftPay(league: EcoLeague, diff: Difficulty, won: boolean) {
  const win = ECONOMY.winPayout * LEAGUE_SCALE[league] * DIFFICULTY[diff].pay * DRIFT_PAY.k * DRIFT_PAY.league[league];
  return { result: round(won ? win : win * DRIFT_PAY.lossShare), perfectEntry: round(win * DRIFT_PAY.perfectEntry), clean: round(win * DRIFT_PAY.clean), newBest: round(win * DRIFT_PAY.newBest) };
}

// ---------------- Performance parts ----------------
/** League D prices per tier (T1 = stock, free); other leagues × LEAGUE_SCALE. Effects live in parts.ts. */
/** Tuning Update (owner Q172): tyres 60 %, weight 70 % and turbo 100 % of the engine's prices. */
export const PART_PRICES = {
  engine: [0, 4_000, 8_000, 14_000, 22_000], trans: [0, 4_500, 9_000, 15_500, 24_000],
  tires: [0, 2_400, 4_800, 8_400, 13_200], weight: [0, 2_800, 5_600, 9_800, 15_400], turbo: [0, 4_000, 8_000, 14_000, 22_000],
  nitrous: [0, 3_000, 6_000, 10_500, 16_500],   // V0.16.0 — first guess, to be timed in the economy pass (Q181)
};
/** Drift parts (owner E6, V0.18.0): Drift only, so they're cheaper than the drag parts and don't count toward the league goal. */
export const DRIFT_PART_PRICES = { dtyres: [0, 1_800, 3_600, 6_300, 9_900], lsd: [0, 2_200, 4_400, 7_700, 12_100], angle: [0, 1_600, 3_200, 5_600, 8_800] };
export type PartKind = keyof typeof PART_PRICES | keyof typeof DRIFT_PART_PRICES;
const ALL_PART_PRICES: Record<PartKind, number[]> = { ...PART_PRICES, ...DRIFT_PART_PRICES };
/** Economy pass (owner Q181, V0.16.0): part prices per league on top of LEAGUE_SCALE, so each league takes its target time with
 *  every part (nitrous included) — D was 4.1 h (target 2–3), S 2.9 h (target 3–6). `npm run economy` shows the result. */
export const PART_LEAGUE: Record<EcoLeague, number> = { D: 0.66, C: 1, B: 1, A: 1, S: 1.25 };   // V0.17.1: S 1.1 → 1.25
export const partPrice = (kind: PartKind, tier: number, league: EcoLeague) => round(ALL_PART_PRICES[kind][tier - 1] * LEAGUE_SCALE[league] * PART_LEAGUE[league], 50);

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
  winPayout: 1_025,   // V0.17.1: 1,000 → 1,025 — Street Races now count the real (quicker) race loop, Typing stays level with them
  /** share of the win pay for 1st … 5th */
  place: [1, 0.6, 0.4, 0.3, 0.25],
  /** league boost (owner Q148): Street Races get shorter in higher leagues, so a 40 wpm typist earns about the same per
   *  minute in both race types (check with `npm run economy`) */
  leagueBoost: { D: 1, C: 1.23, B: 1.3, A: 1.43, S: 1.71 } as Record<EcoLeague, number>,
  /** bonuses as a share of the win pay */
  newBestBonus: 0.25, accuracyBonus: 0.25, accuracyAt: 0.98,
  /** typing speed assumed before your first race, and how many recent races make your average */
  defaultWpm: 35, recentRaces: 10,
  /** how fast each level's text types compared with Medium (starting point for its average) */
  textSpeed: { easy: 1.08, medium: 1, hard: 0.85, expert: 0.75 } as Record<TypingLevel, number>,
  /** nitro bars per race (owner 2026-10-19): Space mid-word finishes the word */
  nitros: 2,
  /** the 4 rivals' speeds as × your average WPM (Q125): typing at your average just wins on Medium. Expert (V0.19.0, owner B1)
   *  is × your recent BEST at Expert instead — to win you have to beat your best by a few percent */
  rivals: { easy: [0.62, 0.70, 0.76, 0.82], medium: [0.80, 0.88, 0.94, 0.99], hard: [0.92, 0.99, 1.04, 1.09], expert: [0.90, 0.96, 1.01, 1.05] } as Record<TypingLevel, number[]>,
  /** share of races that get a made-up passage (textGen.ts, owner B6) instead of a handwritten one */
  generatedShare: 0.5,
};
/** Typing levels (V0.19.0): the Street Race three plus Expert (symbols), picked on the Typing Race card itself. */
export type TypingLevel = Difficulty | 'expert';
export const TYPING_LEVELS: Record<TypingLevel, { label: string; pay: number }> = {
  easy: { label: 'Easy', pay: DIFFICULTY.easy.pay }, medium: { label: 'Medium', pay: DIFFICULTY.medium.pay }, hard: { label: 'Hard', pay: DIFFICULTY.hard.pay },
  expert: { label: 'Expert', pay: 1.5 },
};
/** VX for a Typing Race result (place 1–5). */
export function typingPay(league: EcoLeague, level: TypingLevel, place: number, newBest: boolean, accuracy: number) {
  const win = TYPING.winPayout * LEAGUE_SCALE[league] * TYPING.leagueBoost[league] * TYPING_LEVELS[level].pay;
  return { result: round(win * (TYPING.place[place - 1] ?? 0)), newBest: newBest ? round(win * TYPING.newBestBonus) : 0, accuracy: accuracy >= TYPING.accuracyAt ? round(win * TYPING.accuracyBonus) : 0 };
}

/** Rival Ladder (V0.19.0, owner B4): 15 rivals at FIXED speeds — they don't follow yours. Win (1st) to clear a rung and unlock
 *  the next; each rung's text level is set. The first clear pays a bonus of one win (`clearBonus` × win pay). */
export const TYPING_LADDER = {
  rungs: [
    { wpm: 25, text: 'easy' }, { wpm: 30, text: 'easy' }, { wpm: 35, text: 'easy' },
    { wpm: 40, text: 'medium' }, { wpm: 45, text: 'medium' }, { wpm: 50, text: 'medium' },
    { wpm: 50, text: 'hard' }, { wpm: 55, text: 'hard' }, { wpm: 60, text: 'hard' },
    { wpm: 55, text: 'expert' }, { wpm: 60, text: 'expert' }, { wpm: 70, text: 'expert' },
    { wpm: 80, text: 'expert' }, { wpm: 90, text: 'expert' }, { wpm: 100, text: 'expert' },
  ] as { wpm: number; text: TypingLevel }[],
  /** the other three racers as × the rung's speed */
  pack: [0.80, 0.88, 0.94],
  clearBonus: 1,
};

/** Typing XP and typing leagues (V0.19.0, owner: "your typing league should be different" from your car's league). XP per
 *  race = letters typed × the level's factor × a place bonus, +20 % at 98 %+ accuracy; a Ladder clear adds a flat bonus. */
export const TYPING_XP = {
  perChar: 1, level: { easy: 0.8, medium: 1, hard: 1.25, expert: 1.5 } as Record<TypingLevel, number>,
  place: [1.5, 1.25, 1.1, 1, 1], accuracy: 0.2, ladderClear: 150,
  /** Crowns when you move up (owner Q213): a new division, a new league */ crowns: { division: 2, league: 10 },
};
/** The typing leagues and the total XP each starts at. Owner Q216: "should be hard to get" — ×2.5 (Legend 80k → 200k XP,
 *  about 750 races) and each league split into divisions 1–4 (Silver 1 … Silver 4); Legend is the top, no divisions. */
export const TYPING_LEAGUES = [
  { id: 'wood', name: 'Wood', xp: 0 }, { id: 'bronze', name: 'Bronze', xp: 5_000 }, { id: 'silver', name: 'Silver', xp: 15_000 },
  { id: 'gold', name: 'Gold', xp: 30_000 }, { id: 'platinum', name: 'Platinum', xp: 55_000 }, { id: 'diamond', name: 'Diamond', xp: 90_000 },
  { id: 'neon', name: 'Neon', xp: 140_000 }, { id: 'legend', name: 'Legend', xp: 200_000 },
];
export const TYPING_DIVISIONS = 4;
/** Every typing rank in order — each league's divisions 1–4 evenly across its XP, then Legend — and the XP each starts at. */
export const TYPING_RANKS = TYPING_LEAGUES.flatMap((l, i) => {
  const next = TYPING_LEAGUES[i + 1];
  if (!next) return [{ i, div: 0, xp: l.xp, name: l.name }];
  return Array.from({ length: TYPING_DIVISIONS }, (_, k) => ({ i, div: k + 1, xp: Math.round(l.xp + (next.xp - l.xp) * k / TYPING_DIVISIONS), name: `${l.name} ${k + 1}` }));
});
/** Typing XP for one race. */
export function typingXp(level: TypingLevel, chars: number, place: number, accuracy: number, ladderClear = false) {
  const X = TYPING_XP;
  return Math.round(chars * X.perChar * X.level[level] * (X.place[place - 1] ?? 1) * (accuracy >= TYPING.accuracyAt ? 1 + X.accuracy : 1)) + (ladderClear ? X.ladderClear : 0);
}
/** Your typing rank for a total XP: `rank` (index into TYPING_RANKS), league `i`, division (0 = Legend), its name ("Silver 3"),
 *  the next rank and the progress to it (0–1; 1 at the top). */
export function typingLeagueOf(xp: number) {
  let r = 0; while (r + 1 < TYPING_RANKS.length && xp >= TYPING_RANKS[r + 1].xp) r++;
  const cur = TYPING_RANKS[r], next = TYPING_RANKS[r + 1] ?? null;
  return { rank: r, i: cur.i, div: cur.div, name: cur.name, league: TYPING_LEAGUES[cur.i], next, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}
/** Crowns for moving from rank `from` to rank `to` (owner Q213): each new division pays a little, a new league more. */
export function typingRankCrowns(from: number, to: number) {
  let c = 0; for (let r = from + 1; r <= to; r++) c += TYPING_RANKS[r].div <= 1 ? TYPING_XP.crowns.league : TYPING_XP.crowns.division;
  return c;
}

// ---------------- Pacing (owner 2026-10-19): a typical player, for `npm run economy` and the test console ----------------
/** League targets (hours to finish a league) and the typical player the numbers are checked against. */
export const PACING = {
  targetHours: { D: [2, 3], C: [3, 4], B: [3, 6], A: [3, 6], S: [3, 6] } as Record<EcoLeague, [number, number]>,
  /** stock 800 m time per league (s, from the sim checks) — races get shorter in higher leagues */
  raceSec: { D: 24.3, C: 19.4, B: 17.6, A: 15.5, S: 11.8 } as Record<EcoLeague, number>,
  /** countdown + roll-out past the line + results and menus (s). V0.17.1: 17 → 7 — players hit Race again right away (owner: a
   *  friend fit 5–6 hypercar races in a minute) */
  dragOverhead: 7, dragWinRate: 0.7, perfectShiftsWin: 4, perfectShiftsLoss: 2, perfectLaunchRate: 0.6,
  /** the fastest earner: Hard every time, wins nearly all, every shift and launch Perfect, a quicker (upgraded) car, no pause */
  grinder: { winRate: 0.95, perfectShare: 1, launchRate: 1, raceShare: 0.7, overhead: 4, dist: 600 },
  /** Drift (V0.18.0): a run's length per league (s, `npm run drift-pace`), countdown + results between runs, and the typical player */
  driftSec: { D: 24.6, C: 24.5, B: 23.3, A: 22.7, S: 22.8 } as Record<EcoLeague, number>, driftOverhead: 8, driftWinRate: 0.6, perfectEntries: 5, cleanRate: 0.6,
  /** Typing Race: speed, Medium passage length (chars), countdown + results (s) */
  wpm: 40, typingChars: 190, typingOverhead: 13, typingWinRate: 0.5, typingOtherPlace: 2, accuracyRate: 0.6,
};
/** VX a minute from Street Races (Medium) for the typical player. */
export function dragPerMin(l: EcoLeague, who: 'typical' | 'grinder' = 'typical') {
  const P = PACING, G = P.grinder, hard = who === 'grinder', d: Difficulty = hard ? 'hard' : 'medium', m = hard ? G.dist : 800, w = racePay(l, d, true, m), lo = racePay(l, d, false, m);
  // perfect-shift pay is a pool split over the car's shifts (V0.17.1), so it's counted as a share of the 4-shift reference
  const ps = (n: number) => n * w.perfectShift;
  const win = w.result + (hard ? ps(4 * G.perfectShare) : ps(P.perfectShiftsWin)) + (hard ? G.launchRate : P.perfectLaunchRate) * w.perfectLaunch;
  const loss = lo.result + (hard ? ps(4 * G.perfectShare) : ps(P.perfectShiftsLoss)) + (hard ? G.launchRate : P.perfectLaunchRate) * w.perfectLaunch;
  const rate = hard ? G.winRate : P.dragWinRate, sec = hard ? P.raceSec[l] * G.raceShare + G.overhead : P.raceSec[l] + P.dragOverhead;
  return (rate * win + (1 - rate) * loss) / sec * 60;
}
/** Drift VX a minute for the typical player (Medium). */
export function driftPerMin(l: EcoLeague) {
  const P = PACING, w = driftPay(l, 'medium', true), lo = driftPay(l, 'medium', false);
  const extra = P.perfectEntries * w.perfectEntry + P.cleanRate * w.clean;
  return (P.driftWinRate * w.result + (1 - P.driftWinRate) * lo.result + extra) / (P.driftSec[l] + P.driftOverhead) * 60;
}
/** Perfect-shift pay per Perfect shift for a car with this many shifts: the same total (4 × the reference) whatever the gearbox
 *  (V0.17.1 — an 8-speed used to earn 7 bonuses to a 5-speed's 4). */
export const perfectShiftPay = (perShift: number, shifts: number) => round(perShift * 4 / Math.max(4, shifts));
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
