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
  /** Visual tweaks this spec adds on top of the body's stock parts (e.g. a wing on the turbo version). */
  partOverrides?: Record<string, string | null>;
  /** Paint override for this spec (falls back to the body's paint). */
  paint?: string;
}

export const BODIES: Record<string, BodyDef> = {
  panda_civix: {
    id: 'panda_civix', brand: 'Panda', model: 'Civix', type: 'hatch',
    paint: '#d23a2a',
    visual: { L: 58, W: 28, roof: 21, ride: 1, wheelRadius: 5.2, wheelCentres: [12, 46] },
    stockParts: { headlights: 'stock', taillights: 'stock', grille: 'slats', wing: null, exhaust: 'x1', wheels: 'steel' },
  },
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
  },
};

export const STARTER_CAR = 'panda_civix';

/** Helpers so screens never have to know about the split. */
export const carBody = (carId: string): BodyDef => BODIES[CARS[carId].bodyId];
export const carName = (carId: string): string => { const c = CARS[carId], b = BODIES[c.bodyId]; return c.variant ? `${b.model} ${c.variant}` : b.model; };
export const carBrand = (carId: string): string => carBody(carId).brand;
export const carPaint = (carId: string): string => CARS[carId].paint ?? carBody(carId).paint;
export const carParts = (carId: string): Record<string, string | null> => ({ ...carBody(carId).stockParts, ...(CARS[carId].partOverrides || {}) });
