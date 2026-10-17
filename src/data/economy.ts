// Economy values (E1: Voxels are the only currency in Step 1). Tune freely.
export const ECONOMY = {
  startingVoxels: 1000,
  winPayout: 450,
  lossPayout: 150,
  perfectShiftBonus: 25,
  perfectLaunchBonus: 40,
  newBestBonus: 100,
};

// AI opponents for the D league. Skill = how close its launch/shift timing lands to Perfect.
export interface OpponentDef { id: string; name: string; carId: string; engineTier: number; transTier: number; skill: number; reaction: [number, number]; paint: string }
export const OPPONENTS: OpponentDef[] = [
  { id: 'rookie_rico', name: 'Rico', carId: 'panda_civix', engineTier: 1, transTier: 1, skill: 0.55, reaction: [0.22, 0.38], paint: '#eeeae0' },
];
