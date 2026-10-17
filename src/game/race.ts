// Race state machine + 1-D physics (decisions R1, R4, R5, R8–R10, R12).
// countdown → (hold to rev, release on green) launch → gears with graded shifts → finish → results.
import { CarStats, torqueAt, wheelRpm } from './stats';
import { LAUNCH } from '../data/parts';

export type LaunchGrade = 'Perfect' | 'Good' | 'Bog' | 'Wheelspin';
export type ShiftGrade = 'Perfect' | 'Good' | 'Early' | 'Late';

/** Anything that can drive a car: the keyboard/mouse, or the AI. */
export interface Controller {
  /** Is the throttle/rev input held right now? (Space or the on-screen button) */
  held(r: Racer, race: Race): boolean;
  /** Return true once to request a gear change. */
  shift(r: Racer, race: Race): boolean;
}

export interface Racer {
  id: string;
  stats: CarStats;
  ctl: Controller;
  x: number;               // metres from the start line
  v: number;               // m/s
  gear: number;            // index into ratios
  rpm: number;
  wasHeld: boolean;
  launched: boolean;
  launchTime: number;      // seconds after green when the car launched
  launchGrade?: LaunchGrade;
  launchTimer: number;     // seconds since launch
  shifting: number;        // seconds left in the current gear change
  boost: number;           // seconds of Perfect-shift torque bonus remaining
  shifts: { gear: number; grade: ShiftGrade; rpmFrac: number }[];
  finish?: number;         // finish time after green (s)
  lastEvent?: { text: string; t: number };
}

export const COUNTDOWN = 3.0;        // seconds of lights before green
/** How long the gear change takes, relative to the transmission's shift time, by grade. */
export const SHIFT_TIME_MULT: Record<ShiftGrade, number> = { Perfect: 0.55, Good: 0.85, Early: 1.25, Late: 1.25 };
const DRIVELINE = 0.88;
const G = 9.81, AIR = 1.2;

export class Race {
  t = 0;                             // seconds since the countdown started
  racers: Racer[] = [];
  done = false;
  constructor(public distanceM: number) {}

  get green() { return this.t >= COUNTDOWN; }
  get raceTime() { return Math.max(0, this.t - COUNTDOWN); }

  add(id: string, stats: CarStats, ctl: Controller): Racer {
    const r: Racer = { id, stats, ctl, x: 0, v: 0, gear: 0, rpm: stats.idleRpm, wasHeld: false, launched: false, launchTime: 0, launchTimer: 0, shifting: 0, boost: 0, shifts: [] };
    this.racers.push(r);
    return r;
  }

  step(dt: number) {
    if (this.done) return;
    this.t += dt;
    for (const r of this.racers) this.stepRacer(r, dt);
    this.done = this.racers.every(r => r.finish !== undefined);
  }

  private stepRacer(r: Racer, dt: number) {
    const s = r.stats;
    if (r.finish !== undefined) { r.v = Math.max(0, r.v - 6 * dt); r.x += r.v * dt; return; }
    const held = r.ctl.held(r, this);

    // ---- before launch: free-revving engine ----
    if (!r.launched) {
      if (held) r.rpm = Math.min(s.redline * 0.985, r.rpm + 5200 * dt);
      else r.rpm = Math.max(s.idleRpm, r.rpm - 7000 * dt);
      if (r.rpm >= s.redline * 0.985 && held) r.rpm -= 450;           // limiter bounce
      const released = r.wasHeld && !held;
      if (this.green && (released || (!held && !r.wasHeld && this.raceTime > 0))) this.launch(r);
      r.wasHeld = held;
      return;
    }
    r.wasHeld = held;
    r.launchTimer += dt;

    // ---- shifting ----
    if (r.shifting > 0) {
      r.shifting -= dt;
      if (r.shifting <= 0) r.gear = Math.min(r.gear + 1, s.trans.ratios.length - 1);
    } else if (r.gear < s.trans.ratios.length - 1 && r.ctl.shift(r, this)) {
      const frac = r.rpm / s.redline;
      const half = s.trans.zoneWidth / 2, c = s.trans.zoneCentre;
      let grade: ShiftGrade;
      if (Math.abs(frac - c) <= half) grade = 'Perfect';
      else if (Math.abs(frac - c) <= half + s.trans.zoneWidth * 0.6) grade = 'Good';
      else grade = frac < c ? 'Early' : 'Late';
      r.shifts.push({ gear: r.gear + 1, grade, rpmFrac: frac });
      r.shifting = s.trans.shiftTime * SHIFT_TIME_MULT[grade];
      if (grade === 'Perfect') r.boost = 0.8;
      r.lastEvent = { text: grade, t: this.t };
    }

    // ---- forces ----
    const rpmWheel = wheelRpm(s, r.v, r.gear);
    // clutch slip off the line: engine rpm eases from launch rpm down to wheel rpm
    const slip = Math.max(0, 1 - r.launchTimer / 0.9);
    r.rpm = r.shifting > 0 ? Math.max(rpmWheel, s.idleRpm) : Math.max(rpmWheel, s.idleRpm, r.rpm * slip);
    let drive = 0;
    if (r.shifting <= 0 && r.rpm < s.redline) {
      let tq = torqueAt(s, r.rpm);
      if (r.boost > 0) { tq *= 1 + s.trans.perfectBoost; r.boost -= dt; }
      drive = tq * s.trans.ratios[r.gear] * s.finalDrive * DRIVELINE / s.wheelRadiusM;
      let traction = s.tractionN;
      if (r.launchGrade === 'Wheelspin' && r.launchTimer < LAUNCH.spinSeconds) traction *= LAUNCH.spinGrip;
      if (r.launchGrade === 'Bog' && r.launchTimer < 1.0) drive *= LAUNCH.bogPenalty;
      drive = Math.min(drive, traction);
    }
    if (r.rpm >= s.redline) r.rpm = s.redline;                           // bouncing off the limiter = no drive
    const resist = 0.5 * AIR * s.dragArea * r.v * r.v + s.rollingCoeff * s.massKg * G;
    const a = (drive - resist) / s.massKg;
    r.v = Math.max(0, r.v + a * dt);
    r.x += r.v * dt;
    if (r.x >= this.distanceM) r.finish = this.raceTime - (r.x - this.distanceM) / Math.max(r.v, 1);
  }

  private launch(r: Racer) {
    const s = r.stats, frac = r.rpm / s.redline;
    let g: LaunchGrade;
    if (frac >= LAUNCH.perfectMin && frac <= LAUNCH.perfectMax) g = 'Perfect';
    else if (frac >= LAUNCH.perfectMin - LAUNCH.goodPad && frac <= LAUNCH.perfectMax + LAUNCH.goodPad) g = 'Good';
    else g = frac < LAUNCH.perfectMin ? 'Bog' : 'Wheelspin';
    r.launched = true; r.launchGrade = g; r.launchTime = this.raceTime; r.launchTimer = 0;
    r.lastEvent = { text: g === 'Perfect' ? 'Perfect launch' : g === 'Good' ? 'Good launch' : g, t: this.t };
  }
}
