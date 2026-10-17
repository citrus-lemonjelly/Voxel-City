// Car definitions. Pure data — edit numbers here to tune; no game logic lives in this file.
// Units: kg, horsepower, rpm, metres. Visual dimensions are in voxel blocks (see docs/PART_SLOTS.md).

export interface CarDef {
  id: string;
  name: string;
  brand: string;
  league: 'D' | 'C' | 'B' | 'A' | 'S';
  // performance (stock)
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
  // visuals
  paint: string;
  visual: { L: number; W: number; roof: number; ride: number; wheelRadius: number; wheelCentres: [number, number] };
  stockParts: Record<string, string | null>;
}

export const CARS: Record<string, CarDef> = {
  panda_civix: {
    id: 'panda_civix',
    name: 'Civix',
    brand: 'Panda',
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
    paint: '#d23a2a',
    visual: { L: 58, W: 28, roof: 21, ride: 1, wheelRadius: 5.2, wheelCentres: [12, 46] },
    stockParts: { headlights: 'stock', taillights: 'stock', grille: 'slats', wing: null, exhaust: 'x1', wheels: 'steel' },
  },
};

export const STARTER_CAR = 'panda_civix';
