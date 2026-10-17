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
  /** Player settings (added in Step 1b; old saves pick up the defaults). */
  settings: Settings;
}
export interface Settings {
  camera: 'dynamic' | 'close';            // C = Dynamic, C2 = Dynamic close
  time: 'day' | 'dusk' | 'night';         // time-of-day preview (stages will set this later)
  nearSide: 'mixed' | 'curb' | 'barrier'; // near-side dressing (preview while we choose)
  blur: 'off' | 'low' | 'full';           // speed blur on the world (cars stay sharp)
}
export const DEFAULT_SETTINGS: Settings = { camera: 'dynamic', time: 'day', nearSide: 'mixed', blur: 'low' };
const KEY = 'voxelcity.save';

export function freshSave(): SaveV1 {
  return { version: 1, voxels: ECONOMY.startingVoxels, carId: STARTER_CAR, owned: { engine: [1], trans: [1] }, equipped: { engine: 1, trans: 1 }, bestTime: null, races: 0, wins: 0, settings: { ...DEFAULT_SETTINGS } };
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    if (data && data.version === 1) return { ...freshSave(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
  } catch { /* storage blocked or corrupt: start fresh */ }
  return freshSave();
}

export function writeSave(s: SaveV1) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. — game still works, just doesn't persist */ }
}
