import { partPrice } from './economy';
// Performance parts. Each league has its own T1–T5 scale (decision U3). The C–S tables follow the D table's effects at a
// higher price (league pass, owner Q83) — tune per league later.
// Tier effects are stored as multipliers/values so one table can serve every car in the league.
// Cosmetic parts live elsewhere and never change these numbers (A24).

export type Tier = 1 | 2 | 3 | 4 | 5;
export const TIERS: Tier[] = [1, 2, 3, 4, 5];

export interface EngineTier { tier: Tier; hpMult: number; redlineAdd: number; price: number; label: string }
export interface TransmissionTier {
  tier: Tier;
  ratios: number[];        // gear ratios; more gears = more shifts (R5)
  shiftTime: number;       // seconds with no drive while changing gear
  zoneCentre: number;      // shift-zone centre as a fraction of redline
  zoneWidth: number;       // shift-zone width as a fraction of redline (tighter at higher tiers)
  perfectBoost: number;    // brief torque bonus after a Perfect shift (higher payoff at higher tiers)
  price: number;
  label: string;
}

const ENGINE_D: EngineTier[] = [
    { tier: 1, hpMult: 1.00, redlineAdd: 0,   price: 0,    label: 'Stock' },
    { tier: 2, hpMult: 1.08, redlineAdd: 100, price: 600,  label: 'Intake + exhaust' },
    { tier: 3, hpMult: 1.16, redlineAdd: 200, price: 1200, label: 'Cams + tune' },
    { tier: 4, hpMult: 1.25, redlineAdd: 300, price: 2200, label: 'Ported head' },
    { tier: 5, hpMult: 1.35, redlineAdd: 400, price: 3600, label: 'Built motor' },
];

const TRANS_D: TransmissionTier[] = [
    { tier: 1, ratios: [3.25, 1.90, 1.30, 1.00, 0.80],        shiftTime: 0.50, zoneCentre: 0.90, zoneWidth: 0.10, perfectBoost: 0.05, price: 0,    label: 'Stock 5-speed' },
    { tier: 2, ratios: [3.25, 1.95, 1.36, 1.05, 0.84],        shiftTime: 0.42, zoneCentre: 0.90, zoneWidth: 0.09, perfectBoost: 0.07, price: 700,  label: 'Short shifter' },
    { tier: 3, ratios: [3.25, 2.20, 1.62, 1.26, 1.02, 0.84],  shiftTime: 0.34, zoneCentre: 0.91, zoneWidth: 0.08, perfectBoost: 0.09, price: 1400, label: 'Close-ratio 6-speed' },
    { tier: 4, ratios: [3.30, 2.25, 1.68, 1.32, 1.07, 0.88],  shiftTime: 0.26, zoneCentre: 0.91, zoneWidth: 0.07, perfectBoost: 0.11, price: 2500, label: 'Sport 6-speed' },
    { tier: 5, ratios: [3.35, 2.32, 1.74, 1.38, 1.12, 0.92],  shiftTime: 0.18, zoneCentre: 0.92, zoneWidth: 0.06, perfectBoost: 0.13, price: 3900, label: 'Sequential 6-speed' },
];

export type PartLeague = 'D' | 'C' | 'B' | 'A' | 'S';

// ---- Tuning Update (V0.11.0, owner Q165–Q173): tyres, weight, turbo and a gearing choice ----
/** Tyres: more grip (traction before wheelspin) and a wider Perfect-launch window (owner Q166 B). */
export interface TiresTier { tier: Tier; gripMult: number; launchMult: number; price: number; label: string }
/** Weight: a lighter car (owner Q167 A). */
export interface WeightTier { tier: Tier; massMult: number; price: number; label: string }
/** Turbo: more power that arrives higher in the revs, a little less down low, and a little weight back (owner Q168 B). */
export interface TurboTier { tier: Tier; boost: number; lowLoss: number; massAdd: number; price: number; label: string }

const TIRES_D: TiresTier[] = [
    { tier: 1, gripMult: 1.00, launchMult: 1.00, price: 0, label: 'Stock tyres' },
    { tier: 2, gripMult: 1.05, launchMult: 1.08, price: 0, label: 'Street radials' },
    { tier: 3, gripMult: 1.10, launchMult: 1.15, price: 0, label: 'Sport compound' },
    { tier: 4, gripMult: 1.16, launchMult: 1.22, price: 0, label: 'Semi-slicks' },
    { tier: 5, gripMult: 1.22, launchMult: 1.30, price: 0, label: 'Drag radials' },
];
const WEIGHT_D: WeightTier[] = [
    { tier: 1, massMult: 1.00, price: 0, label: 'Stock body' },
    { tier: 2, massMult: 0.98, price: 0, label: 'Light seats' },
    { tier: 3, massMult: 0.96, price: 0, label: 'Stripped interior' },
    { tier: 4, massMult: 0.94, price: 0, label: 'Carbon panels' },
    { tier: 5, massMult: 0.92, price: 0, label: 'Race shell' },
];
const TURBO_D: TurboTier[] = [
    { tier: 1, boost: 0.00, lowLoss: 0.00, massAdd: 0.00, price: 0, label: 'No turbo' },
    { tier: 2, boost: 0.06, lowLoss: 0.03, massAdd: 0.02, price: 0, label: 'Small turbo' },
    { tier: 3, boost: 0.12, lowLoss: 0.04, massAdd: 0.03, price: 0, label: 'Twin-scroll turbo' },
    { tier: 4, boost: 0.18, lowLoss: 0.05, massAdd: 0.04, price: 0, label: 'Big single turbo' },
    { tier: 5, boost: 0.25, lowLoss: 0.06, massAdd: 0.05, price: 0, label: 'Twin turbo' },
];
/** Nitrous (owner Q176 A / Q180 A, V0.16.0): one shot per race on key 1 — extra power for a couple of seconds, stronger and
 *  longer at higher tiers; the bottle adds a little weight. T1 = no nitrous. */
export interface NitrousTier { tier: Tier; boost: number; seconds: number; massAdd: number; price: number; label: string }
const NITROUS_D: NitrousTier[] = [
    { tier: 1, boost: 0.00, seconds: 0.0, massAdd: 0.000, price: 0, label: 'No nitrous' },
    { tier: 2, boost: 0.12, seconds: 1.6, massAdd: 0.006, price: 0, label: 'Small shot' },
    { tier: 3, boost: 0.15, seconds: 2.0, massAdd: 0.008, price: 0, label: 'Street kit' },
    { tier: 4, boost: 0.19, seconds: 2.3, massAdd: 0.010, price: 0, label: 'Wet kit' },
    { tier: 5, boost: 0.24, seconds: 2.6, massAdd: 0.012, price: 0, label: 'Twin bottles' },
];
/** Where the turbo comes on, as a share of redline: none below `from`, full boost from `full` up (smooth between). */
export const SPOOL = { from: 0.45, full: 0.80 };

/** Gearing (owner Q170 B): one free choice per car. Short = harder pull in 1st and 2nd gear, but a shorter top gear that
 *  runs out of revs sooner; Long = a softer start, a taller top gear. `pull` multiplies the drive (and the grip it can use)
 *  in the first two gears; `top` multiplies the top-gear ratio. */
export type Gearing = 'short' | 'balanced' | 'long';
export const GEARINGS: { id: Gearing; label: string; pull: number; top: number; desc: string }[] = [
  { id: 'short', label: 'Short', pull: 1.06, top: 1.08, desc: 'Harder launch, runs out of revs sooner' },
  { id: 'balanced', label: 'Balanced', pull: 1.00, top: 1.00, desc: 'The factory gearing' },
  { id: 'long', label: 'Long', pull: 0.96, top: 0.88, desc: 'Softer launch, more top speed' },
];
export const GEARING_BY_ID = Object.fromEntries(GEARINGS.map(g => [g.id, g])) as Record<Gearing, (typeof GEARINGS)[number]>;

/** How strong upgrades are in each league (1 = the tables as written). Class limit (U3): a fully upgraded car never beats
 *  a stock car of the next league, and leagues C and B sit close to the league above, so their parts do less.
 *  Scales the power, grip, weight and turbo effects; transmissions are the same everywhere. */
export const LEAGUE_EFFECT: Record<PartLeague, number> = { D: 1, C: 0.38, B: 0.6, A: 1, S: 1 };

/** Every performance part a car can upgrade (U1); nitrous since V0.16.0. */
export type PerfKind = 'engine' | 'trans' | 'tires' | 'weight' | 'turbo' | 'nitrous';
export const PERF_KINDS: PerfKind[] = ['engine', 'trans', 'tires', 'weight', 'turbo', 'nitrous'];
export const PERF_LABEL: Record<PerfKind, string> = { engine: 'Engine', trans: 'Transmission', tires: 'Tyres', weight: 'Weight', turbo: 'Turbo', nitrous: 'Nitrous' };
/** A car's performance set-up: a tier per part + its gearing (missing gearing = balanced). */
export type Tune = Record<PerfKind, Tier> & { gearing?: Gearing };
export const STOCK_TUNE: Tune = { engine: 1, trans: 1, tires: 1, weight: 1, turbo: 1, nitrous: 1 };
export const MAX_TUNE: Tune = { engine: 5, trans: 5, tires: 5, weight: 5, turbo: 5, nitrous: 5 };
/** Every part at one tier (tests, the Strip). */
export const allAt = (t: Tier, gearing?: Gearing): Tune => ({ engine: t, trans: t, tires: t, weight: t, turbo: t, nitrous: t, ...(gearing ? { gearing } : {}) });
/** Fill in parts missing from an older save / rival (stock) — returns a full tune. */
export const fullTune = (t: Partial<Tune> | undefined): Tune => ({ ...STOCK_TUNE, ...(t || {}) });

// Prices come from the economy file (PART_PRICES × LEAGUE_SCALE); the tier effects above are the same in every league for now.
const priced = <T extends { price: number; tier: Tier }>(rows: T[], kind: PerfKind, l: PartLeague): T[] => rows.map(r => ({ ...r, price: partPrice(kind, r.tier, l) }));
const LG: PartLeague[] = ['D', 'C', 'B', 'A', 'S'];
const perLeague = <T extends { price: number; tier: Tier }>(rows: T[], kind: PerfKind) => Object.fromEntries(LG.map(l => [l, priced(rows, kind, l)])) as Record<PartLeague, T[]>;
export const ENGINE = perLeague(ENGINE_D, 'engine');
/** Gearboxes by league (owner 2026-10-22, V0.16.1): A cars go to 7 gears and S cars to 8 — gears per tier [T1…T5] below; D, C
 *  and B keep the 5-speed → 6-speed boxes. Extra gears sit between the same first and top ratios (closer spacing), and the
 *  shift gets quicker in step, so a race doesn't lose more time changing gear than a 6-speed would. */
export const GEARS_BY_LEAGUE: Partial<Record<PartLeague, number[]>> = { A: [6, 6, 7, 7, 7], S: [7, 7, 8, 8, 8] };
const SPEED_NAME: Record<number, string> = { 5: '5-speed', 6: '6-speed', 7: '7-speed', 8: '8-speed' };
function moreGears(t: TransmissionTier, n: number): TransmissionTier {
  const a = t.ratios[0], z = t.ratios[t.ratios.length - 1], have = t.ratios.length;
  if (n <= have) return t;
  const ratios = Array.from({ length: n }, (_, i) => +(a * Math.pow(z / a, i / (n - 1))).toFixed(3));
  return { ...t, ratios, shiftTime: +(t.shiftTime * (have - 1) / (n - 1)).toFixed(3), label: t.label.replace(/[0-9]-speed/, SPEED_NAME[n]).replace('Short shifter', `Short shifter ${SPEED_NAME[n]}`) };
}
export const TRANSMISSION = Object.fromEntries(LG.map(l => [l, priced(TRANS_D, 'trans', l).map((t, i) => GEARS_BY_LEAGUE[l] ? moreGears(t, GEARS_BY_LEAGUE[l]![i]) : t)])) as Record<PartLeague, TransmissionTier[]>;
export const TIRES = perLeague(TIRES_D, 'tires');
export const WEIGHT = perLeague(WEIGHT_D, 'weight');
export const TURBO = perLeague(TURBO_D, 'turbo');
export const NITROUS = perLeague(NITROUS_D, 'nitrous');
/** A part's tier row (label + price) for any kind. */
export const PART_TABLE: Record<PerfKind, Record<PartLeague, { tier: Tier; price: number; label: string }[]>> = { engine: ENGINE, trans: TRANSMISSION, tires: TIRES, weight: WEIGHT, turbo: TURBO, nitrous: NITROUS };

// Launch window (hold to rev, release on green): RPM at release as a fraction of redline (R9).
export const LAUNCH = { perfectMin: 0.55, perfectMax: 0.72, goodPad: 0.10, bogPenalty: 0.55, spinSeconds: 0.7, spinGrip: 0.55 };
