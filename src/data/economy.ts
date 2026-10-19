// Economy values (E1: Voxels are the only currency in Step 1). Tune freely.
export const ECONOMY = {
  startingVoxels: 1000,
  winPayout: 450,
  lossPayout: 150,
  perfectShiftBonus: 25,
  perfectLaunchBonus: 40,
  newBestBonus: 100,
};

// Rival shape. Rivals are rolled at random per race (src/game/rivals.ts, owner Q87): name, a car from your league, paint,
// upgrade tiers and skill (how close its launch/shift timing lands to Perfect), matched to your car + upgrades.
export interface OpponentDef { id: string; name: string; carId: string; engineTier: number; transTier: number; skill: number; reaction: [number, number]; paint: string }
