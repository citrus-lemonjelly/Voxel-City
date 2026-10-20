// Local save (P5: localStorage until the backend exists). Versioned so later steps can migrate old saves.
import { ECONOMY } from '../data/economy';
import { STARTER_CAR, CARS } from '../data/cars';
import { Tier } from '../data/parts';
import { PaddleShape, PedalStyle, STANDARD_PADDLE, STANDARD_PEDAL, STANDARD_SHAPES } from '../data/cosmetics';

export interface SaveV1 {
  version: 1;
  voxels: number;
  /** Crowns — the special currency (E3): earned, never buys performance parts. Crowns-only cars are owner 2026-10-18. */
  crowns: number;
  carId: string;
  owned: { engine: Tier[]; trans: Tier[] };
  equipped: { engine: Tier; trans: Tier };
  /** Best time at 800 m (kept for old saves; same as best[800]). */
  bestTime: number | null;
  /** Best time per race length (owner Q100: 600 / 700 / 800 m). */
  best: Record<RaceDist, number | null>;
  /** The Strip: rungs cleared per league (owner Q100). */
  strip: Record<string, number>;
  /** Strip levels whose one-time reward has been claimed, per league. */
  stripClaimed: Record<string, number[]>;
  /** Street Race difficulty picked in the race menu (owner 2026-10-19). */
  raceDiff: 'easy' | 'medium' | 'hard';
  /** Visual parts owned — bought once, fit every car (owner Q110). Factory parts are always owned. */
  partsOwned: string[];
  /** Universal decals won (Strip bosses) — used when decals arrive with parts/visuals. */
  decals: string[];
  /** Newest patch notes version the player has opened (the notes button shows NEW until then). */
  seenVersion?: string;
  /** Typing Race stats (owner 2026-10-19). */
  typing?: TypingStats;
  /** Game version this save last ran on (announces "Updated to …" once after an update). */
  lastVersion?: string;
  /** Street Race length picked in the race menu. */
  raceDist: RaceDist;
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
  /** Every car the player owns (owner Q79), keyed by car id: its own parts, paint and body options. `owned`/`equipped`
   *  above always mirror the car in use (`carId`), so the rest of the game only ever looks at the active car. */
  cars: Record<string, CarState>;
}
export type RaceDist = 600 | 700 | 800;
export const RACE_DISTS: RaceDist[] = [600, 700, 800];
export interface CarState {
  owned: { engine: Tier[]; trans: Tier[] };
  equipped: { engine: Tier; trans: Tier };
  /** chosen paint (empty = the car's factory paint) */
  paint: string;
  /** body options (e.g. popups: 'up', roof: 'black') */
  opts: Record<string, string>;
  /** visual parts fitted to this car, by slot → part id (owner 2026-10-19) */
  parts: Record<string, string>;
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

const stockParts = () => ({ owned: { engine: [1] as Tier[], trans: [1] as Tier[] }, equipped: { engine: 1 as Tier, trans: 1 as Tier } });
export const freshCar = (paint = '', opts: Record<string, string> = {}): CarState => ({ ...stockParts(), paint, opts: { ...opts }, parts: {} });
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function freshSave(): SaveV1 {
  return { raceDiff: 'medium', partsOwned: [], decals: [], stripClaimed: {}, strip: { D: 0, C: 0, B: 0, A: 0, S: 0 }, best: { 600: null, 700: null, 800: null }, raceDist: 800, crowns: 0, cars: { [STARTER_CAR]: freshCar() }, version: 1, voxels: ECONOMY.startingVoxels, carId: STARTER_CAR, owned: { engine: [1], trans: [1] }, equipped: { engine: 1, trans: 1 }, bestTime: null, races: 0, wins: 0, settings: { ...DEFAULT_SETTINGS }, paddles: freshPaddles(), pedals: { owned: [STANDARD_PEDAL], equipped: STANDARD_PEDAL }, perfectShifts: 0 };
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    if (data && data.version === 1) {
      const s: SaveV1 = { ...freshSave(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }, paddles: { ...freshPaddles(), ...(data.paddles || {}) }, pedals: { owned: [STANDARD_PEDAL], equipped: STANDARD_PEDAL, ...(data.pedals || {}) } };
      for (const c of Object.values(s.cars)) c.parts ??= {};   // saves from before visual parts
      s.strip = { D: 0, C: 0, B: 0, A: 0, S: 0, ...(data.strip || {}) }; s.stripClaimed = { ...(data.stripClaimed || {}) };
      if (!data.best) s.best = { 600: null, 700: null, 800: s.bestTime ?? null };   // saves from before 600/700 m races
      // saves from before car buying (Q79): the one car they had keeps its parts
      if (!data.cars) s.cars = { [s.carId]: { owned: clone(s.owned), equipped: clone(s.equipped), paint: '', opts: {}, parts: {} } };
      if (!CARS[s.carId] || !s.cars[s.carId]) { s.carId = STARTER_CAR; s.cars[STARTER_CAR] ??= freshCar(); Object.assign(s, clone(stockFor(s))); }
      return s;
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return freshSave();
}

const stockFor = (s: SaveV1) => ({ owned: s.cars[s.carId].owned, equipped: s.cars[s.carId].equipped });
/** Copy the active car's parts into its entry in `cars`. */
function syncActive(s: SaveV1) { const c = s.cars[s.carId]; if (c) { c.owned = clone(s.owned); c.equipped = clone(s.equipped); } }

export const ownsCar = (s: SaveV1, id: string) => !!s.cars[id];
/** Add a newly bought car (keeps the paint/options the player picked in the Catalog). */
export function addCar(s: SaveV1, id: string, paint = '', opts: Record<string, string> = {}) { if (!s.cars[id]) s.cars[id] = freshCar(paint, opts); }
/** Make an owned car the one in use: its parts become `owned`/`equipped`. */
export function switchCar(s: SaveV1, id: string) {
  if (!s.cars[id]) return;
  syncActive(s);
  s.carId = id;
  s.owned = clone(s.cars[id].owned); s.equipped = clone(s.cars[id].equipped);
}

export function writeSave(s: SaveV1) {
  syncActive(s);
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. — game still works, just doesn't persist */ }
}

/** Typing Race stats: races, wins, best WPM, the last few WPMs (rival matching uses their average), keys and errors. */
export interface TypingStats { races: number; wins: number; best: number; recent: number[]; keys: number; errors: number }
export function typingStats(s: SaveV1): TypingStats {
  return (s.typing ??= { races: 0, wins: 0, best: 0, recent: [], keys: 0, errors: 0 });
}
