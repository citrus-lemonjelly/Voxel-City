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
  /** Catalog price in voxels (0 = starter car). Placeholder until the league/economy pass. */
  price: number;
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
    ['sporthatch', 'Sport fastback', 'sedan', '#1f8a8a', 62, 30, 19],
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
  },
  // Placeholder specs (owner Q79: buy + drive now, names later). Leagues (owner 2026-10-18, Q81–Q83): hatchbacks D, muscle C,
  // street racers B, tuners / grand tourers and super sports A, hypercars S. Each league is clearly quicker than the one
  // below (stock parts, perfect driving, 800 m): D 24.6–23.6 s · C 19.5–19.0 · B 17.8–17.0 · A 15.6–15.0 · S 11.8 (owner Q89: hypercars
  // ≤ 12 s). hp, weight and grip are real-world-like from League C up. Prices are placeholders.
  // League D — Civix-class hatchbacks: small steps up from the free Civix
  city:       { id: 'city',       bodyId: 'city',       league: 'D', price: 1500,  massKg: 1060, hp: 128, peakRpmFrac: 0.86, idleRpm: 850, redline: 6800, finalDrive: 4.6, wheelRadiusM: 0.29, dragArea: 0.64, rollingCoeff: 0.013, gripG: 0.95, drivenWeightShare: 0.62, drive: 'FWD' },
  supermini:  { id: 'supermini',  bodyId: 'supermini',  league: 'D', price: 2000,  massKg: 1080, hp: 134, peakRpmFrac: 0.86, idleRpm: 900, redline: 7000, finalDrive: 4.7, wheelRadiusM: 0.29, dragArea: 0.64, rollingCoeff: 0.013, gripG: 0.96, drivenWeightShare: 0.62, drive: 'FWD' },
  classic:    { id: 'classic',    bodyId: 'classic',    league: 'D', price: 2500,  massKg: 1200, hp: 150, peakRpmFrac: 0.84, idleRpm: 850, redline: 6800, finalDrive: 4.4, wheelRadiusM: 0.30, dragArea: 0.66, rollingCoeff: 0.013, gripG: 0.96, drivenWeightShare: 0.62, drive: 'FWD' },
  premium:    { id: 'premium',    bodyId: 'premium',    league: 'D', price: 3000,  massKg: 1300, hp: 150, peakRpmFrac: 0.84, idleRpm: 850, redline: 6800, finalDrive: 4.4, wheelRadiusM: 0.30, dragArea: 0.65, rollingCoeff: 0.013, gripG: 0.97, drivenWeightShare: 1.0, drive: 'AWD' },
  // League C — muscle (owner Q81)
  pony:    { id: 'pony',    bodyId: 'pony',    league: 'C', price: 5500, massKg: 1650, hp: 471, peakRpmFrac: 0.78, idleRpm: 750, redline: 6800, finalDrive: 3.55, wheelRadiusM: 0.34, dragArea: 0.7, rollingCoeff: 0.013, gripG: 1.05, drivenWeightShare: 0.55, drive: 'RWD' },
  muscle:  { id: 'muscle',  bodyId: 'muscle',  league: 'C', price: 6500, massKg: 1800, hp: 560, peakRpmFrac: 0.75, idleRpm: 700, redline: 6400, finalDrive: 3.4, wheelRadiusM: 0.35, dragArea: 0.74, rollingCoeff: 0.013, gripG: 1.1,  drivenWeightShare: 0.55, drive: 'RWD' },
  // League B — street racers (Sport coupe moved to A as a super sport, owner Q82; Sport fastback moved up from D, owner Q86e)
  sedan:   { id: 'sedan',   bodyId: 'sedan',   league: 'B', price: 8000,  massKg: 1550, hp: 452, peakRpmFrac: 0.85, idleRpm: 850, redline: 7000, finalDrive: 3.9, wheelRadiusM: 0.33, dragArea: 0.62, rollingCoeff: 0.013, gripG: 1.0, drivenWeightShare: 1.0, drive: 'AWD' },
  sporthatch: { id: 'sporthatch', bodyId: 'sporthatch', league: 'B', price: 9000,   massKg: 1450, hp: 460, peakRpmFrac: 0.86, idleRpm: 900, redline: 7000, finalDrive: 3.9, wheelRadiusM: 0.33, dragArea: 0.62, rollingCoeff: 0.013, gripG: 1.05,  drivenWeightShare: 1.0, drive: 'AWD' },
  rally:   { id: 'rally',   bodyId: 'rally',   league: 'B', price: 10000, massKg: 1500, hp: 508, peakRpmFrac: 0.8,  idleRpm: 900, redline: 7200, finalDrive: 3.9, wheelRadiusM: 0.33, dragArea: 0.66, rollingCoeff: 0.014, gripG: 1.1, drivenWeightShare: 1.0, drive: 'AWD' },   // AWD: every wheel drives
  // League A — tuners / grand tourers, super sports
  compact: { id: 'compact', bodyId: 'compact', league: 'A', price: 18000, massKg: 1650, hp: 772, peakRpmFrac: 0.82, idleRpm: 850, redline: 7200, finalDrive: 3.6, wheelRadiusM: 0.34, dragArea: 0.64, rollingCoeff: 0.013, gripG: 2.0, drivenWeightShare: 0.56, drive: 'RWD' },
  tuner:   { id: 'tuner',   bodyId: 'tuner',   league: 'A', price: 20000, massKg: 1500, hp: 870, peakRpmFrac: 0.9,  idleRpm: 950, redline: 8000, finalDrive: 3.8, wheelRadiusM: 0.33, dragArea: 0.6,  rollingCoeff: 0.013, gripG: 2.0,  drivenWeightShare: 0.55, drive: 'RWD' },
  // League S — hypercars
  hyper:   { id: 'hyper',   bodyId: 'hyper',   league: 'S', price: 60000, massKg: 1450, hp: 1835, peakRpmFrac: 0.88, idleRpm: 1000, redline: 8500, finalDrive: 3.4, wheelRadiusM: 0.34, dragArea: 0.6, rollingCoeff: 0.012, gripG: 1.75, drivenWeightShare: 1.0, drive: 'RWD' },
};
export const LEAGUES: League[] = ['D', 'C', 'B', 'A', 'S'];
/** Catalog order: by league, then cheapest first. */
export const CATALOG_ORDER = Object.keys(CARS).sort((a, b) => LEAGUES.indexOf(CARS[a].league) - LEAGUES.indexOf(CARS[b].league) || CARS[a].price - CARS[b].price);

export const STARTER_CAR = 'panda_civix';

/** Helpers so screens never have to know about the split. */
export const carBody = (carId: string): BodyDef => BODIES[CARS[carId].bodyId];
export const carName = (carId: string): string => { const c = CARS[carId], b = BODIES[c.bodyId]; return c.variant ? `${b.model} ${c.variant}` : b.model; };
export const carBrand = (carId: string): string => carBody(carId).brand;
export const carPaint = (carId: string): string => CARS[carId].paint ?? carBody(carId).paint;
export const carParts = (carId: string): Record<string, string | null> => ({ ...carBody(carId).stockParts, ...(CARS[carId].partOverrides || {}) });
