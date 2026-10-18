// Local save (P5: localStorage until the backend exists). Versioned so later steps can migrate old saves.
import { ECONOMY } from '../data/economy';
import { STARTER_CAR } from '../data/cars';
import { Tier } from '../data/parts';
import { PaddleShape, PedalStyle, STANDARD_PADDLE, STANDARD_PEDAL, STANDARD_SHAPES } from '../data/cosmetics';

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
  /** Paddle shifters (cosmetic, owner Q39): skins and shapes owned separately; any owned skin fits any owned shape. */
  paddles: { owned: string[]; equipped: string; shapes: PaddleShape[]; shape: PaddleShape };
  /** Gas pedals owned / fitted (cosmetic, owner Q55). Drilled alloy is standard. */
  pedals: { owned: PedalStyle[]; equipped: PedalStyle };
  /** Lifetime perfect shifts (unlocks the Perfect Shift paddle at 100). */
  perfectShifts: number;
}
export interface Settings {
  camera: 'dynamic' | 'close';            // C = Dynamic, C2 = Dynamic close
  time: 'day' | 'dusk' | 'night';         // time-of-day preview (stages will set this later)
  nearSide: 'mixed' | 'curb' | 'barrier'; // near-side dressing (preview while we choose)
  blur: 'off' | 'low' | 'full';           // speed blur on the world (cars stay sharp)
}
export const DEFAULT_SETTINGS: Settings = { camera: 'dynamic', time: 'day', nearSide: 'mixed', blur: 'low' };
const KEY = 'voxelcity.save';

const freshPaddles = (): SaveV1['paddles'] => ({ owned: [STANDARD_PADDLE], equipped: STANDARD_PADDLE, shapes: [...STANDARD_SHAPES], shape: 'arc' });

export function freshSave(): SaveV1 {
  return { version: 1, voxels: ECONOMY.startingVoxels, carId: STARTER_CAR, owned: { engine: [1], trans: [1] }, equipped: { engine: 1, trans: 1 }, bestTime: null, races: 0, wins: 0, settings: { ...DEFAULT_SETTINGS }, paddles: freshPaddles(), pedals: { owned: [STANDARD_PEDAL], equipped: STANDARD_PEDAL }, perfectShifts: 0 };
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    if (data && data.version === 1) return { ...freshSave(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }, paddles: { ...freshPaddles(), ...(data.paddles || {}) }, pedals: { owned: [STANDARD_PEDAL], equipped: STANDARD_PEDAL, ...(data.pedals || {}) } };
  } catch { /* storage blocked or corrupt: start fresh */ }
  return freshSave();
}

export function writeSave(s: SaveV1) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. — game still works, just doesn't persist */ }
}
