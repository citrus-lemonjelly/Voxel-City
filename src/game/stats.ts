// Effective car stats = base car data + equipped performance tiers. Pure functions (testable headless).
import { CARS, CarDef } from '../data/cars';
import { ENGINE, TRANSMISSION, TIRES, WEIGHT, TURBO, NITROUS, legalRatios, LEAGUE_EFFECT, TransmissionTier, LAUNCH, SPOOL, Tune, fullTune, GEARING_BY_ID } from '../data/parts';
import { StageDef } from '../data/stages';

export interface CarStats {
  car: CarDef;
  massKg: number;
  peakPowerW: number;
  peakRpm: number;
  idleRpm: number;
  redline: number;
  finalDrive: number;
  wheelRadiusM: number;
  dragArea: number;
  rollingCoeff: number;
  tractionN: number;        // max tractive force before wheelspin
  trans: TransmissionTier;
  /** this car's launch window (fractions of redline) — LAUNCH widened/narrowed by the car's feel */
  launch: { perfectMin: number; perfectMax: number; goodPad: number };
  /** turbo: extra power at full boost, and the share lost below the boost (owner Q168 B) */
  boost: number;
  lowLoss: number;
  /** gearing: drive multiplier in 1st and 2nd gear */
  pull: number;
  /** nitrous (V0.16.0): extra power share while it burns, and how long one shot lasts (0 = none) */
  nitro: { boost: number; seconds: number };
  tune: Tune;
}

export function carStats(carId: string, tuneIn: Partial<Tune>, stage?: StageDef): CarStats {
  const car = CARS[carId], tune = fullTune(car.unique ? { gearing: tuneIn.gearing } : tuneIn);   // boss cars: parts as they come, gearing free
  const eng = ENGINE[car.league][tune.engine - 1], tyre = TIRES[car.league][tune.tires - 1];
  const wt = WEIGHT[car.league][tune.weight - 1], turbo = TURBO[car.league][tune.turbo - 1], nos = NITROUS[car.league][tune.nitrous - 1], k = LEAGUE_EFFECT[car.league], gain = (car.engineGain ?? 1) * k;
  const base = TRANSMISSION[car.league][tune.trans - 1], f = car.feel || {};
  // T5 boxes take your own ratios when you have tuned them (owner Q192, V0.17.0); gearing still moves the top gear
  const own = tune.trans === 5 && tune.ratios?.length === base.ratios.length ? legalRatios(base.ratios, tune.ratios) : base.ratios;
  const gear = GEARING_BY_ID[tune.gearing ?? 'balanced'], ratios = own.map((r, i, a) => i === a.length - 1 ? r * gear.top : r);
  const trans: TransmissionTier = { ...base, ratios, shiftTime: base.shiftTime * (f.shift ?? 1), zoneWidth: base.zoneWidth * (f.window ?? 1) };
  const lc = (LAUNCH.perfectMin + LAUNCH.perfectMax) / 2, lh = (LAUNCH.perfectMax - LAUNCH.perfectMin) / 2 * (f.launch ?? 1) * tyre.launchMult;
  const gripMult = 1 + (tyre.gripMult - 1) * k;
  const launch = { perfectMin: lc - lh, perfectMax: lc + lh, goodPad: LAUNCH.goodPad * (f.launch ?? 1) * tyre.launchMult };
  const massKg = car.massKg * (1 - (1 - wt.massMult) * k + turbo.massAdd * k + nos.massAdd * k);
  const redline = car.redline + eng.redlineAdd;
  const grip = stage ? stage.modifiers.gripMult : 1;
  return {
    car,
    massKg,
    peakPowerW: car.hp * (1 + (eng.hpMult - 1) * gain) * 745.7,
    peakRpm: redline * car.peakRpmFrac,
    idleRpm: car.idleRpm,
    redline,
    finalDrive: car.finalDrive,
    wheelRadiusM: car.wheelRadiusM,
    dragArea: car.dragArea * (stage ? stage.modifiers.dragMult : 1),
    rollingCoeff: car.rollingCoeff,
    tractionN: car.gripG * gripMult * grip * massKg * 9.81 * car.drivenWeightShare,
    trans,
    launch,
    boost: turbo.boost * (car.turboGain ?? car.engineGain ?? 1) * k,
    lowLoss: turbo.lowLoss * (car.turboGain ?? car.engineGain ?? 1) * k,
    pull: gear.pull,
    nitro: { boost: nos.boost * k, seconds: nos.seconds },          // the same bottle on every car (league strength only), so maxed cars stay close
    tune,
  };
}

/** Engine torque (N·m) at an rpm. Power follows a smooth hump peaking at peakRpm; torque = P / ω. */
export function torqueAt(s: CarStats, rpm: number): number {
  const r = Math.max(rpm, s.idleRpm);
  const x = r / s.peakRpm;
  let p = s.peakPowerW * Math.max(0.12, x * (2 - x));
  if (s.boost > 0) { const k = spool(r / s.redline); p *= 1 + s.boost * k - s.lowLoss * (1 - k); }
  return p / (r * Math.PI / 30);
}
/** Turbo boost share 0–1 at an rpm (share of redline): smooth from SPOOL.from to SPOOL.full. */
export function spool(frac: number): number {
  const t = Math.min(1, Math.max(0, (frac - SPOOL.from) / (SPOOL.full - SPOOL.from)));
  return t * t * (3 - 2 * t);
}

export function wheelRpm(s: CarStats, speedMs: number, gear: number): number {
  return (speedMs / s.wheelRadiusM) * s.trans.ratios[gear] * s.finalDrive * 30 / Math.PI;
}

/** Summary numbers for the garage screen. */
export function displayStats(s: CarStats) {
  return {
    hp: Math.round(s.peakPowerW * (1 + s.boost) / 745.7),
    redline: s.redline,
    gears: s.trans.ratios.length,
    shifts: s.trans.ratios.length - 1,
    shiftTime: s.trans.shiftTime,
    zone: s.trans.zoneWidth,
  };
}
