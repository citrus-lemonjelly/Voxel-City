// Scripted AI driver (R12): rev-holds toward a target launch rpm, releases after a reaction delay,
// and shifts at an rpm sampled around the shift zone. Skill 1.0 = always Perfect; lower = wider scatter.
import { Controller, Racer, Race, COUNTDOWN } from './race';
import { LAUNCH } from '../data/parts';

export function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const gauss = (rng: () => number) => { let u = 0; for (let i = 0; i < 6; i++) u += rng(); return (u - 3) / Math.sqrt(0.5); };

export class AIController implements Controller {
  private rng: () => number;
  private launchTarget: number;
  private reaction: number;
  private shiftTargets: number[] = [];
  constructor(public skill: number, reaction: [number, number], seed = 1) {
    this.rng = makeRng(seed);
    const mid = (LAUNCH.perfectMin + LAUNCH.perfectMax) / 2;
    this.launchTarget = mid + gauss(this.rng) * (1 - skill) * 0.28;
    this.reaction = reaction[0] + this.rng() * (reaction[1] - reaction[0]);
  }
  held(r: Racer, race: Race): boolean {
    if (r.launched) return true;
    const frac = r.rpm / r.stats.redline;
    if (race.t >= COUNTDOWN + this.reaction) return false;            // release = launch
    return frac < this.launchTarget;                                   // feather the throttle around the target
  }
  /** Nitrous (V0.16.0): rivals that carry it fire it 4 s after the launch, between shifts — once the tyres have stopped spinning, so the boost is not wasted and every car gets the same help (keeps maxed cars within 0.2 s, sim). */
  nitrous(r: Racer): boolean { return r.launchTimer > 4 && r.shifting <= 0; }
  shift(r: Racer): boolean {
    const t = r.stats.trans;
    if (this.shiftTargets.length <= r.gear) this.shiftTargets[r.gear] = t.zoneCentre + gauss(this.rng) * (1 - this.skill) * 0.22;
    return r.rpm / r.stats.redline >= Math.min(0.995, this.shiftTargets[r.gear]);
  }
}
