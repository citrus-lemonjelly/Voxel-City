// Effective car stats = base car data + equipped performance tiers. Pure functions (testable headless).
import { CARS, CarDef } from '../data/cars';
import { ENGINE, TRANSMISSION, Tier, TransmissionTier, LAUNCH } from '../data/parts';
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
  engineTier: Tier;
  transTier: Tier;
}

export function carStats(carId: string, engineTier: Tier, transTier: Tier, stage?: StageDef): CarStats {
  const car = CARS[carId];
  const eng = ENGINE[car.league][engineTier - 1];
  const base = TRANSMISSION[car.league][transTier - 1], f = car.feel || {};
  const trans: TransmissionTier = { ...base, shiftTime: base.shiftTime * (f.shift ?? 1), zoneWidth: base.zoneWidth * (f.window ?? 1) };
  const lc = (LAUNCH.perfectMin + LAUNCH.perfectMax) / 2, lh = (LAUNCH.perfectMax - LAUNCH.perfectMin) / 2 * (f.launch ?? 1);
  const launch = { perfectMin: lc - lh, perfectMax: lc + lh, goodPad: LAUNCH.goodPad * (f.launch ?? 1) };
  const redline = car.redline + eng.redlineAdd;
  const grip = stage ? stage.modifiers.gripMult : 1;
  return {
    car,
    massKg: car.massKg,
    peakPowerW: car.hp * (1 + (eng.hpMult - 1) * (car.engineGain ?? 1)) * 745.7,
    peakRpm: redline * car.peakRpmFrac,
    idleRpm: car.idleRpm,
    redline,
    finalDrive: car.finalDrive,
    wheelRadiusM: car.wheelRadiusM,
    dragArea: car.dragArea * (stage ? stage.modifiers.dragMult : 1),
    rollingCoeff: car.rollingCoeff,
    tractionN: car.gripG * grip * car.massKg * 9.81 * car.drivenWeightShare,
    trans,
    launch,
    engineTier,
    transTier,
  };
}

/** Engine torque (N·m) at an rpm. Power follows a smooth hump peaking at peakRpm; torque = P / ω. */
export function torqueAt(s: CarStats, rpm: number): number {
  const r = Math.max(rpm, s.idleRpm);
  const x = r / s.peakRpm;
  const p = s.peakPowerW * Math.max(0.12, x * (2 - x));
  return p / (r * Math.PI / 30);
}

export function wheelRpm(s: CarStats, speedMs: number, gear: number): number {
  return (speedMs / s.wheelRadiusM) * s.trans.ratios[gear] * s.finalDrive * 30 / Math.PI;
}

/** Summary numbers for the garage screen. */
export function displayStats(s: CarStats) {
  return {
    hp: Math.round(s.peakPowerW / 745.7),
    redline: s.redline,
    gears: s.trans.ratios.length,
    shifts: s.trans.ratios.length - 1,
    shiftTime: s.trans.shiftTime,
    zone: s.trans.zoneWidth,
  };
}
