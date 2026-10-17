// Local save (P5: localStorage until the backend exists). Versioned so later steps can migrate old saves.
import { ECONOMY } from '../data/economy';
import { STARTER_CAR } from '../data/cars';
import { Tier } from '../data/parts';

export interface SaveV1 {
  version: 1;
  voxels: number;
  carId: string;
  owned: { engine: Tier[]; trans: Tier[] };
  equipped: { engine: Tier; trans: Tier };
  bestTime: number | null;
  races: number;
  wins: number;
}
const KEY = 'voxelcity.save';

export function freshSave(): SaveV1 {
  return { version: 1, voxels: ECONOMY.startingVoxels, carId: STARTER_CAR, owned: { engine: [1], trans: [1] }, equipped: { engine: 1, trans: 1 }, bestTime: null, races: 0, wins: 0 };
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    if (data && data.version === 1) return { ...freshSave(), ...data };
  } catch { /* storage blocked or corrupt: start fresh */ }
  return freshSave();
}

export function writeSave(s: SaveV1) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. — game still works, just doesn't persist */ }
}
