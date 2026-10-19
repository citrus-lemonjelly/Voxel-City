// Cars are split into a BODY (what it looks like) and a SPEC (how it drives, which league) — owner Q47.
// One body can have several specs: e.g. a base tuner in D and a turbo version of the same body in B, with small visual
// tweaks (parts) on top. Pure data — edit numbers here to tune; no game logic lives in this file.
// Units: kg, horsepower, rpm, metres. Visual dimensions are in voxel blocks (see docs/PART_SLOTS.md).

export type League = 'D' | 'C' | 'B' | 'A' | 'S';
export type BodyType = 'hatch' | 'sedan' | 'muscle' | 'tuner' | 'hyper';

/** The look: designed first, independent of league or stats. */
export interface BodyDef {
  id: string;
  brand: string;
  model: string;
  type: BodyType;
  paint: string;            // default factory paint
  visual: { L: number; W: number; roof: number; ride: number; wheelRadius: number; wheelCentres: [number, number] };
  stockParts: Record<string, string | null>;
  /** Render profile in render/bodies.ts (omitted = the Civix builder). */
  profile?: string;
}

/** The performance: which body, which league, and the numbers the physics uses. */
export interface CarDef {
  id: string;
  bodyId: string;
  /** Optional variant name shown after the model (e.g. "Turbo", "RS"). */
  variant?: string;
  league: League;
  massKg: number;
  hp: number;               // peak horsepower at stock
  peakRpmFrac: number;      // where peak power sits, as a fraction of redline
  idleRpm: number;
  redline: number;
  finalDrive: number;
  wheelRadiusM: number;
  dragArea: number;         // Cd × frontal area (m²)
  rollingCoeff: number;
  gripG: number;            // max tractive force as a fraction of weight on the driven wheels
  drivenWeightShare: number;
  /** Which wheels drive (shown in the Catalog). */
  drive: 'FWD' | 'RWD' | 'AWD';
  /** Visual tweaks this spec adds on top of the body's stock parts (e.g. a wing on the turbo version). */
  partOverrides?: Record<string, string | null>;
  /** Paint override for this spec (falls back to the body's paint). */
  paint?: string;
  /** Catalog price (0 = starter car), in voxels unless `currency` says Crowns. Placeholder until the economy pass. */
  price: number;
  /** 'crowns' = bought with Crowns only (owner 2026-10-18); default voxels. */
  currency?: 'vx' | 'crowns';
  /** How much this car gains from engine upgrades (1 = the league table as written). Tuned per car so fully upgraded cars in
   *  a league end up close at 800 m while each keeps its character (owner: "each car needs its own tweaks"). */
  engineGain?: number;
  /** How the car drives (owner Q97: every car accelerates, shifts, grips and tops out differently, with its own launch and
   *  shift windows). shift = gear-change time × (lower = quicker shifts); window = shift-zone width × (higher = more
   *  forgiving); launch = launch-window width × (higher = easier launch). All default 1. */
  feel?: { shift?: number; window?: number; launch?: number };
  /** What the car is best at once upgraded: short dashes (600–700 m), long sprints (800 m), or balanced. */
  character?: 'dash' | 'long' | 'balanced';
}

export const BODIES: Record<string, BodyDef> = {
  panda_civix: {
    id: 'panda_civix', brand: 'Panda', model: 'Civix', type: 'hatch',
    paint: '#d23a2a',
    visual: { L: 58, W: 28, roof: 21, ride: 1, wheelRadius: 5.2, wheelCentres: [12, 46] },
    stockParts: { headlights: 'stock', taillights: 'stock', grille: 'slats', wing: null, exhaust: 'x1', wheels: 'steel' },
  },
  // concept bodies (S28) — brand/model are placeholders until the naming pass (owner: "I'll name these last")
  ...Object.fromEntries(([
    ['sedan', 'Sport sedan', 'sedan', '#3b6fa8', 68, 28, 21], ['compact', 'Sport coupe', 'tuner', '#2a7fd4', 62, 30, 20],
    ['muscle', 'Muscle coupe', 'muscle', '#f2a43a', 70, 30, 19], ['pony', 'Pony car', 'muscle', '#f2c230', 68, 30, 18],
    ['rally', 'Rally sedan', 'sedan', '#1f4fa8', 64, 29, 20], ['tuner', 'Tuner coupe', 'tuner', '#eeeae0', 62, 28, 18],
    ['hyper', 'Hypercar', 'hyper', '#6a3ad2', 68, 30, 15],
    // League D hatchbacks (owner 2026-10-18: Golf / A3-type cars alongside the Civix)
    ['classic', 'Classic hatch', 'hatch', '#eeeae0', 60, 28, 21], ['premium', 'Premium hatch', 'hatch', '#8e9bb3', 62, 28, 19],
    ['city', 'City car', 'hatch', '#2f9a5a', 50, 28, 22], ['supermini', 'Supermini', 'hatch', '#f2a43a', 56, 28, 20],
    ['sporthatch', 'Sport fastback', 'sedan', '#1f8a8a', 62, 30, 19], ['perfhatch', 'Performance hatch', 'hatch', '#2a7fd4', 60, 29, 20],
  ] as [string, string, BodyType, string, number, number, number][]).map(([id, model, type, paint, L, W, roof]) => [id, {
    id, brand: 'Concept', model, type, paint, profile: id,
    visual: { L, W, roof, ride: 1, wheelRadius: 5.4, wheelCentres: [12, L - 12] as [number, number] }, stockParts: {},
  } as BodyDef])),
};

export const CARS: Record<string, CarDef> = {
  panda_civix: {
    id: 'panda_civix',
    bodyId: 'panda_civix',
    league: 'D',
    massKg: 1020,
    hp: 118,
    peakRpmFrac: 0.86,
    idleRpm: 900,
    redline: 7200,
    finalDrive: 4.8,
    wheelRadiusM: 0.29,
    dragArea: 0.66,
    rollingCoeff: 0.013,
    gripG: 0.95,
    drivenWeightShare: 0.62,  // front-wheel drive, nose-heavy
    drive: 'FWD',
    price: 0,
    engineGain: 1,
    character: 'balanced',
    feel: { shift: 1.0, window: 1.1, launch: 1.1 },
  },
  // Placeholder specs (owner Q79: buy + drive now, names later). Leagues (owner 2026-10-18, Q81–Q83): hatchbacks D, muscle C,
  // street racers B, tuners / grand tourers and super sports A, hypercars S. Each league is clearly quicker than the one
  // below (stock parts, perfect driving, 800 m): D 24.6–23.6 s · C 19.5–19.0 · B 17.8–17.0 · A 15.6–15.0 · S 11.8 (owner Q89: hypercars
  // ≤ 12 s). hp, weight and grip are real-world-like from League C up. Prices are placeholders.
  // Per-car tuning (owner 2026-10-18): you never need a second car in a league to progress. Pricier cars start slightly
  // quicker; upgrades (engineGain) bring every car in a league close together at 800 m when fully upgraded, and each keeps a
  // character: 'dash' cars launch/pull harder and win 600–700 m runs, 'long' cars have the top end for the full 800 m.
  // League D — Civix-class hatchbacks: small steps up from the free Civix
  city:       { id: 'city',       bodyId: 'city',       league: 'D', price: 1500,  massKg: 1000, hp: 120, peakRpmFrac: 0.86, idleRpm: 850, redline: 6800, finalDrive: 4.9, wheelRadiusM: 0.29, dragArea: 0.7, rollingCoeff: 0.013, gripG: 0.95, drivenWeightShare: 0.62, drive: 'FWD', engineGain: 1.14, character: 'dash', feel: { shift: 1.0, window: 1.2, launch: 1.15 } },
  supermini:  { id: 'supermini',  bodyId: 'supermini',  league: 'D', price: 2000,  massKg: 1040, hp: 123, peakRpmFrac: 0.86, idleRpm: 900, redline: 7000, finalDrive: 4.8, wheelRadiusM: 0.29, dragArea: 0.67, rollingCoeff: 0.013, gripG: 0.96, drivenWeightShare: 0.62, drive: 'FWD', engineGain: 0.867, character: 'dash', feel: { shift: 0.9, window: 1.05, launch: 1.0 } },
  classic:    { id: 'classic',    bodyId: 'classic',    league: 'D', price: 2500,  massKg: 1200, hp: 138, peakRpmFrac: 0.84, idleRpm: 850, redline: 6800, finalDrive: 4.3, wheelRadiusM: 0.30, dragArea: 0.62, rollingCoeff: 0.013, gripG: 0.96, drivenWeightShare: 0.62, drive: 'FWD', engineGain: 0.87, character: 'long', feel: { shift: 1.05, window: 1.0, launch: 1.05 } },
  premium:    { id: 'premium',    bodyId: 'premium',    league: 'D', price: 3000,  massKg: 1320, hp: 140, peakRpmFrac: 0.84, idleRpm: 850, redline: 6800, finalDrive: 4.5, wheelRadiusM: 0.30, dragArea: 0.64, rollingCoeff: 0.013, gripG: 0.97, drivenWeightShare: 1.0, drive: 'AWD', engineGain: 0.596, character: 'dash', feel: { shift: 0.82, window: 1.15, launch: 1.3 } },
  perfhatch:  { id: 'perfhatch',  bodyId: 'perfhatch',  league: 'D', price: 150,  massKg: 1280, hp: 147, peakRpmFrac: 0.86, idleRpm: 900, redline: 6900, finalDrive: 4.2, wheelRadiusM: 0.30, dragArea: 0.6, rollingCoeff: 0.013, gripG: 1.0,  drivenWeightShare: 0.62, drive: 'FWD', engineGain: 0.723, character: 'long', currency: 'crowns', feel: { shift: 0.9, window: 0.9, launch: 0.9 } },
  // League C — muscle (owner Q81)
  pony:    { id: 'pony',    bodyId: 'pony',    league: 'C', price: 5500, massKg: 1500, hp: 358, peakRpmFrac: 0.72, idleRpm: 750, redline: 6800, finalDrive: 4.2, wheelRadiusM: 0.34, dragArea: 0.74, rollingCoeff: 0.013, gripG: 1.4, drivenWeightShare: 0.55, drive: 'RWD', engineGain: 1.269, character: 'dash', feel: { shift: 1.1, window: 1.0, launch: 0.9 } },
  muscle:  { id: 'muscle',  bodyId: 'muscle',  league: 'C', price: 6500, massKg: 1850, hp: 443, peakRpmFrac: 0.75, idleRpm: 700, redline: 6400, finalDrive: 3.2, wheelRadiusM: 0.35, dragArea: 0.68, rollingCoeff: 0.013, gripG: 1.3,  drivenWeightShare: 0.55, drive: 'RWD', engineGain: 1.211, character: 'long', feel: { shift: 1.15, window: 1.2, launch: 0.8 } },
  // League B — street racers (Sport coupe moved to A as a super sport, owner Q82; Sport fastback moved up from D, owner Q86e)
  sedan:   { id: 'sedan',   bodyId: 'sedan',   league: 'B', price: 8000,  massKg: 1550, hp: 449, peakRpmFrac: 0.85, idleRpm: 850, redline: 7000, finalDrive: 3.9, wheelRadiusM: 0.33, dragArea: 0.62, rollingCoeff: 0.013, gripG: 1.0, drivenWeightShare: 1.0, drive: 'AWD', engineGain: 1.188, character: 'balanced', feel: { shift: 0.95, window: 1.1, launch: 1.2 } },
  sporthatch: { id: 'sporthatch', bodyId: 'sporthatch', league: 'B', price: 9000,   massKg: 1450, hp: 424, peakRpmFrac: 0.86, idleRpm: 900, redline: 7000, finalDrive: 3.7, wheelRadiusM: 0.33, dragArea: 0.58, rollingCoeff: 0.013, gripG: 1.05,  drivenWeightShare: 1.0, drive: 'AWD', engineGain: 0.89, character: 'long', feel: { shift: 0.9, window: 0.95, launch: 1.2 } },
  rally:   { id: 'rally',   bodyId: 'rally',   league: 'B', price: 10000, massKg: 1500, hp: 450, peakRpmFrac: 0.8,  idleRpm: 900, redline: 7200, finalDrive: 4.1, wheelRadiusM: 0.33, dragArea: 0.68, rollingCoeff: 0.014, gripG: 1.1, drivenWeightShare: 1.0, drive: 'AWD', engineGain: 0.826, character: 'dash', feel: { shift: 0.85, window: 1.0, launch: 1.3 } },   // AWD: every wheel drives
  // League A — tuners / grand tourers, super sports
  compact: { id: 'compact', bodyId: 'compact', league: 'A', price: 18000, massKg: 1600, hp: 691, peakRpmFrac: 0.82, idleRpm: 850, redline: 7200, finalDrive: 3.9, wheelRadiusM: 0.34, dragArea: 0.66, rollingCoeff: 0.013, gripG: 2.25, drivenWeightShare: 0.56, drive: 'RWD', engineGain: 2.091, character: 'dash', feel: { shift: 0.8, window: 1.0, launch: 0.85 } },
  tuner:   { id: 'tuner',   bodyId: 'tuner',   league: 'A', price: 20000, massKg: 1500, hp: 737, peakRpmFrac: 0.9,  idleRpm: 950, redline: 8000, finalDrive: 3.6, wheelRadiusM: 0.33, dragArea: 0.58,  rollingCoeff: 0.013, gripG: 2.0,  drivenWeightShare: 0.55, drive: 'RWD', engineGain: 1.155, character: 'long', feel: { shift: 0.95, window: 0.85, launch: 0.8 } },
  // League S — hypercars
  hyper:   { id: 'hyper',   bodyId: 'hyper',   league: 'S', price: 60000, massKg: 1450, hp: 1687, peakRpmFrac: 0.88, idleRpm: 1000, redline: 8500, finalDrive: 3.4, wheelRadiusM: 0.34, dragArea: 0.6, rollingCoeff: 0.012, gripG: 1.75, drivenWeightShare: 1.0, drive: 'RWD', engineGain: 1, character: 'balanced', feel: { shift: 0.7, window: 0.8, launch: 1.0 } },
};
export const LEAGUES: League[] = ['D', 'C', 'B', 'A', 'S'];
/** Catalog order: by league, then Voxel cars cheapest first, then Crowns-only cars. */
export const CATALOG_ORDER = Object.keys(CARS).sort((a, b) => LEAGUES.indexOf(CARS[a].league) - LEAGUES.indexOf(CARS[b].league)
  || +(CARS[a].currency === 'crowns') - +(CARS[b].currency === 'crowns') || CARS[a].price - CARS[b].price);

export const STARTER_CAR = 'panda_civix';

/** Helpers so screens never have to know about the split. */
export const carBody = (carId: string): BodyDef => BODIES[CARS[carId].bodyId];
export const carName = (carId: string): string => { const c = CARS[carId], b = BODIES[c.bodyId]; return c.variant ? `${b.model} ${c.variant}` : b.model; };
export const carBrand = (carId: string): string => carBody(carId).brand;
export const carPaint = (carId: string): string => CARS[carId].paint ?? carBody(carId).paint;
export const carParts = (carId: string): Record<string, string | null> => ({ ...carBody(carId).stockParts, ...(CARS[carId].partOverrides || {}) });
