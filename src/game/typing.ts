// Typing Race engine (owner 2026-10-19, Q122–Q129): Nitro Type-style. Each correct key moves your car; a wrong key turns
// that letter red and you must type the right letter to go on (no backspace, Q126). Rivals are seeded "typists" whose
// speed is matched to your recent average WPM by difficulty (Q125), so their finish times are known before the race.
// Typing only — the car is looks (Q124). Pure logic, no DOM: tests drive it directly.
import { makeRng } from './ai';
import { PASSAGES } from '../data/passages';
import { TYPING, Difficulty } from '../data/economy';
import { NAMES, PAINTS } from './rivals';
import { CARS, CATALOG_ORDER } from '../data/cars';

export const wpmOf = (chars: number, seconds: number) => (seconds > 0 ? (chars / 5) / (seconds / 60) : 0);

/** Your side of the race. Times are seconds since GO. */
export class TypingRun {
  pos = 0;              // characters done
  typo = false;         // the current letter was mistyped and is waiting for the right key
  keys = 0;             // every key that counted (right or wrong)
  errors = 0;
  finish: number | null = null;
  /** last time a correct key landed (the car eases to a stop while you're stuck on a typo) */
  lastHit = 0;
  constructor(public text: string) {}
  get done() { return this.pos >= this.text.length; }
  get progress() { return this.pos / this.text.length; }
  /** A typed character at time t → 'ok' | 'typo' | 'ignored'. */
  key(ch: string, t: number): 'ok' | 'typo' | 'ignored' {
    if (this.done || ch.length !== 1) return 'ignored';
    this.keys++;
    if (ch === this.text[this.pos]) {
      this.pos++; this.typo = false; this.lastHit = t;
      if (this.done) this.finish = t;
      return 'ok';
    }
    this.errors++; this.typo = true;
    return 'typo';
  }
  get accuracy() { return this.keys ? (this.keys - this.errors) / this.keys : 1; }
  wpm(t: number) { return wpmOf(this.pos, this.finish ?? t); }
}

/** A rival: car, looks and a schedule of when each character gets typed. */
export interface TypingRival { name: string; carId: string; paint: string; seed: number; wpm: number; schedule: number[]; finish: number }

/** Character-by-character timing for a typist at `wpm`, with human rhythm: words go in bursts, a short pause between
 *  words, and the odd typo that costs a moment. Scaled so the whole passage takes exactly the time `wpm` implies. */
export function typistSchedule(text: string, wpm: number, seed: number): number[] {
  const rng = makeRng(seed), gaps: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let g = 0.6 + rng() * 0.8;                                   // per-key rhythm
    if (text[i] === ' ') g += 0.5 + rng() * 0.6;                 // word gap
    if (rng() < 0.035) g += 2.5 + rng() * 3;                     // a typo, fixed
    gaps.push(g);
  }
  const total = (text.length / 5) / wpm * 60, sum = gaps.reduce((a, b) => a + b, 0);
  let t = 0;
  return gaps.map(g => (t += g * total / sum));
}
/** How many characters a rival has typed by time t. */
export function typedBy(r: TypingRival, t: number): number {
  let lo = 0, hi = r.schedule.length;                            // first index with schedule > t
  while (lo < hi) { const m = (lo + hi) >> 1; if (r.schedule[m] <= t) lo = m + 1; else hi = m; }
  return lo;
}

/** Your average WPM over recent Typing Races (or the starting assumption). */
export function averageWpm(recent: number[] = []) {
  const r = recent.slice(-TYPING.recentRaces);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : TYPING.defaultWpm;
}

/** Pick a passage and four rivals for a race (seeded: the same seed gives the same race). */
export function makeTypingRace(seed: number, avgWpm: number, diff: Difficulty, league: string) {
  const rng = makeRng(seed);
  const text = PASSAGES[Math.floor(rng() * PASSAGES.length) % PASSAGES.length];
  const pool = CATALOG_ORDER.filter(id => CARS[id].league === league && !CARS[id].unique);
  const names = [...NAMES].sort(() => rng() - 0.5);
  const rivals: TypingRival[] = TYPING.rivals[diff].map((f, i) => {
    const wpm = Math.max(8, avgWpm * f * (0.97 + rng() * 0.03)), s = (rng() * 0x7fffffff) | 1;   // never above f × your average
    const schedule = typistSchedule(text, wpm, s);
    return { name: names[i], carId: pool[Math.floor(rng() * pool.length) % pool.length], paint: PAINTS[Math.floor(rng() * PAINTS.length) % PAINTS.length], seed: s, wpm, schedule, finish: schedule[schedule.length - 1] };
  });
  rivals.sort(() => rng() - 0.5);                                 // lanes in random order
  return { text, rivals };
}

/** Your place (1–5) when you finish at `myFinish` (or null = didn't finish → last). */
export const placeOf = (myFinish: number | null, rivals: TypingRival[]) => myFinish === null ? rivals.length + 1 : 1 + rivals.filter(r => r.finish < myFinish).length;
