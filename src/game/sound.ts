// Sound (owner C1, V0.16.0): every sound is made in code with Web Audio — no sound files, so the single-file game stays small.
// Engine: two detuned oscillators through a low-pass filter, pitch from the rpm, louder on the gas. One-shots: shift clunk,
// launch screech, Perfect-shift chime, nitrous hiss, countdown beeps, Typing Race key clicks, menu ticks.
// Settings ▸ Sound: Off / Low / Full. Browsers only allow audio after a tap or key press, so start() runs on the first one.
import type { Racer, Race } from './race';

export type SoundLevel = 'off' | 'low' | 'full';
const LEVEL: Record<SoundLevel, number> = { off: 0, low: 0.35, full: 0.8 };

let ac: AudioContext | null = null, master: GainNode | null = null, noiseBuf: AudioBuffer | null = null, level: SoundLevel = 'full';

export function setSoundLevel(l: SoundLevel) { level = l; if (master && ac) master.gain.setTargetAtTime(LEVEL[l], ac.currentTime, 0.05); if (l === 'off') engineStop(); }
/** Call from a tap / key press (browser rule); safe to call often. */
export function startSound() {
  if (ac || level === 'off') { if (ac?.state === 'suspended') ac.resume(); return; }
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
  ac = new AC() as AudioContext; master = ac.createGain(); master.gain.value = LEVEL[level]; master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
const ready = () => !!ac && !!master && level !== 'off' && ac.state === 'running';

/** A short tone: frequency f (Hz), length (s), wave, volume. */
function tone(f: number, len: number, type: OscillatorType = 'sine', vol = 0.2, f2?: number, delay = 0) {
  if (!ready()) return;
  const t = ac!.currentTime + delay, o = ac!.createOscillator(), g = ac!.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(master!); o.start(t); o.stop(t + len + 0.02);
}
/** A burst of filtered noise (screech, hiss, clunk, click). */
function noise(len: number, freq: number, q = 1, vol = 0.2, type: BiquadFilterType = 'bandpass', delay = 0) {
  if (!ready()) return;
  const t = ac!.currentTime + delay, src = ac!.createBufferSource(), f = ac!.createBiquadFilter(), g = ac!.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(master!); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
}

// ---- engine (player car loud, rival quieter) ----
interface Engine { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode }
const engines: Engine[] = [];
function engine(i: number): Engine | null {
  if (!ready()) return null;
  if (!engines[i]) {
    const o1 = ac!.createOscillator(), o2 = ac!.createOscillator(), f = ac!.createBiquadFilter(), g = ac!.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 9; f.type = 'lowpass'; f.Q.value = 3; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g).connect(master!); o1.start(); o2.start();
    engines[i] = { o1, o2, f, g };
  }
  return engines[i];
}
export function engineStop() { for (const e of engines) if (e && ac) e.g.gain.setTargetAtTime(0, ac.currentTime, 0.08); }

// ---- race: called every frame; events come from the racers' state ----
const seen = { ev: -1, oppEv: -1, lights: -1, nitro: false, spin: 0 };
export function raceReset() { seen.ev = -1; seen.oppEv = -1; seen.lights = -1; seen.nitro = false; seen.spin = 0; }
export function raceSound(me: Racer, opp: Racer, race: Race, held: boolean) {
  if (!ready()) return;
  const t = ac!.currentTime;
  [me, opp].forEach((r, i) => {
    const e = engine(i); if (!e) return;
    const frac = Math.min(1.05, r.rpm / r.stats.redline), hz = 32 + r.rpm / 60 * 2 * 0.55;     // 4-cylinder firing note, a bit lower
    const gas = r.finish !== undefined ? 0.25 : r.launched ? (r.shifting > 0 ? 0.35 : 1) : held || i === 1 ? 0.8 : 0.3;
    e.o1.frequency.setTargetAtTime(hz, t, 0.03); e.o2.frequency.setTargetAtTime(hz * 0.5, t, 0.03);
    e.f.frequency.setTargetAtTime(300 + frac * 2200 * gas + (r.nitro > 0 ? 800 : 0), t, 0.05);
    e.g.gain.setTargetAtTime((i === 0 ? 0.11 : 0.035) * (0.35 + 0.65 * gas), t, 0.05);
  });
  // countdown beeps: one per light, a higher one on green
  const lit = race.green ? 3 : Math.min(3, Math.floor(race.t));
  if (lit !== seen.lights) { if (lit > 0 && lit < 3) tone(440, 0.14, 'square', 0.07); if (lit === 3 && race.green) tone(880, 0.35, 'square', 0.08); seen.lights = lit; }
  // events from your car
  const ev = me.lastEvent;
  if (ev && ev.t !== seen.ev) {
    seen.ev = ev.t;
    if (/launch|Bog|Wheelspin/.test(ev.text)) { noise(ev.text === 'Wheelspin' ? 0.9 : 0.45, 2400, 4, ev.text === 'Wheelspin' ? 0.16 : 0.08); }
    else if (ev.text === 'Perfect') { shiftClunk(); tone(1046, 0.12, 'triangle', 0.09); tone(1568, 0.22, 'triangle', 0.08, undefined, 0.07); }
    else if (/Good|Early|Late/.test(ev.text)) shiftClunk();
    else if (ev.text === 'Downshift') { shiftClunk(); tone(180, 0.15, 'sawtooth', 0.05, 320); }
    else if (ev.text === 'Nitrous') { noise(1.6, 5200, 0.6, 0.12, 'highpass'); tone(90, 0.4, 'sine', 0.12, 50); }
    else if (ev.text === 'Too early') tone(160, 0.2, 'square', 0.06);
  }
  if (opp.lastEvent && opp.lastEvent.t !== seen.oppEv) { seen.oppEv = opp.lastEvent.t; if (/Perfect|Good|Early|Late/.test(opp.lastEvent.text)) noise(0.06, 900, 1, 0.03); }
}
function shiftClunk() { noise(0.07, 420, 0.8, 0.18, 'lowpass'); tone(70, 0.09, 'sine', 0.12, 45); }

// ---- Typing Race and menus ----
export const keyClick = (ok: boolean) => ok ? noise(0.03, 3200 + Math.random() * 800, 2, 0.07) : tone(150, 0.09, 'square', 0.05);
export const nitroSound = () => { noise(0.9, 5000, 0.6, 0.1, 'highpass'); tone(110, 0.3, 'sine', 0.1, 60); };
export const uiTick = () => noise(0.025, 2200, 3, 0.05);
export const winSound = (won: boolean) => won ? [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, undefined, i * 0.09)) : [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, undefined, i * 0.12));
