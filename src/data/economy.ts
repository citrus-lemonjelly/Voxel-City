// ============================================================================================================
// VOXEL CITY ECONOMY — every price and payout in the game lives in this one file (owner 2026-10-19: "make sure
// they are easily adjustable"). Change a number here and rebuild; nothing else needs touching.
// Currencies: VX = Voxels (earned), Crowns (special, E3/Q98). All figures are placeholders until the owner
// confirms them (car prices below are the owner's ranges).
// ============================================================================================================

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
export const PART_PRICES = { engine: [0, 4_000, 8_000, 14_000, 22_000], trans: [0, 4_500, 9_000, 15_500, 24_000] };
export const partPrice = (kind: 'engine' | 'trans', tier: number, league: EcoLeague) => round(PART_PRICES[kind][tier - 1] * LEAGUE_SCALE[league], 50);

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
};
export const cosmeticPrice = (id: string) => COSMETIC_PRICES[id] ?? { price: 0 };

// ---------------- The Strip ----------------
/** One-time level rewards (owner): level 1 = 100 VX, +10 VX a level (× LEAGUE_SCALE); every 10th level is a boss. */
export const STRIP_REWARDS = {
  firstVx: 100, perLevelVx: 10,
  /** boss levels (every 10th) — owner 2026-10-19: Crowns, a lump sum of cash, a universal decal, and on the final boss the boss car */
  boss: { crowns: 5, cashPerBoss: 2_500 /* × boss number (1–6) × LEAGUE_SCALE */, decal: true, carOnFinal: true },
};

// ---------------- Rivals ----------------
// Rival shape. Rivals are rolled at random per race (src/game/rivals.ts, owner Q87): name, a car from your league, paint,
// upgrade tiers and skill (how close its launch/shift timing lands to Perfect), matched to your car + upgrades.
export interface OpponentDef { id: string; name: string; carId: string; engineTier: number; transTier: number; skill: number; reaction: [number, number]; paint: string }
