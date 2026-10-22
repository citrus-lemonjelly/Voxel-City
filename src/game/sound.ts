// Sound (owner C1, V0.16.0): every sound is made in code with Web Audio — no sound files, so the single-file game stays small.
// Engine: two detuned oscillators through a low-pass filter, pitch from the rpm, louder on the gas. One-shots: shift clunk,
// launch screech, Perfect-shift chime, nitrous hiss, countdown beeps, Typing Race key clicks, menu ticks.
// Settings ▸ Sound: Off / Low / Full. Browsers only allow audio after a tap or key press, so start() runs on the first one.
import type { Racer, Race } from './race';

/** Settings ▸ Sound volume / Engine volume (owner Q191, V0.16.0): 0–100 in steps of 25. Older saves said off / low / full. */
export const volOf = (v: string | undefined, def: number) => v === 'off' ? 0 : v === 'low' ? 50 : v === 'full' ? 75 : v != null && !isNaN(+v) ? +v : def;
let ac: AudioContext | null = null, master: GainNode | null = null, engBus: GainNode | null = null, noiseBuf: AudioBuffer | null = null, vol = 75, engVol = 75;

export function setSoundLevel(v: number, engine: number) {
  vol = v; engVol = engine;
  if (master && ac) master.gain.setTargetAtTime(v / 100, ac.currentTime, 0.05);
  if (engBus && ac) engBus.gain.setTargetAtTime(engine / 100, ac.currentTime, 0.05);
  if (v === 0) engineStop();
}
/** Call from a tap / key press (browser rule); safe to call often. */
export function startSound() {
  if (ac || vol === 0) { if (ac?.state === 'suspended') ac.resume(); return; }
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
  // output chain (V0.16.2, owner: "blown speakers" on the muscle car): master → limiter → speakers, so nothing ever clips;
  // engines → engine volume → high-pass at 40 Hz → master, so no rumble below what speakers can play (it made the cones flap)
  ac = new AC() as AudioContext; master = ac.createGain(); master.gain.value = vol / 100;
  const lim = ac.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
  master.connect(lim).connect(ac.destination);
  engBus = ac.createGain(); engBus.gain.value = engVol / 100;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 40; hp.Q.value = 0.7; engBus.connect(hp).connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
const ready = () => !!ac && !!master && vol > 0 && ac.state === 'running';

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

// ---- engine (player car loud, rival quieter); its voice depends on the body type (owner E3, V0.16.0) ----
type Body = 'hatch' | 'sedan' | 'muscle' | 'tuner' | 'hyper';
/** pitch × the firing note, the two waves, filter sharpness, and a low sub-rumble (muscle V8) */
const VOICE: Record<Body, { pitch: number; w1: OscillatorType; w2: OscillatorType; q: number; sub: number }> = {
  // V0.17.1 (owner: "take the high-pitch notes and squabble out"): softer waves, no filter peak, a deeper floor
  hatch: { pitch: 0.9, w1: 'triangle', w2: 'sawtooth', q: 0.7, sub: 0.25 },
  sedan: { pitch: 0.8, w1: 'triangle', w2: 'triangle', q: 0.7, sub: 0.35 },
  muscle: { pitch: 0.72, w1: 'sawtooth', w2: 'triangle', q: 2, sub: 0.3 },     // not used since V0.17.1 — muscle cars get the cross-plane V8 voice (v8Voice)
  tuner: { pitch: 1.05, w1: 'triangle', w2: 'sawtooth', q: 0.9, sub: 0.2 },
  hyper: { pitch: 1.1, w1: 'triangle', w2: 'sawtooth', q: 0.8, sub: 0.3 },
};
const voices: Body[] = ['hatch', 'hatch'];
/** One engine voice: set(rpm, gas 0–1, loudness, time) every frame; quiet(time) fades it out. */
interface EngineVoice { set(rpm: number, redline: number, gas: number, level: number, nitro: boolean, t: number): void; quiet(t: number): void }

/** Oscillator voice (hatch / sedan / tuner / hyper): two detuned waves + a sub through a low-pass, pitch from the rpm. */
function oscVoice(ctx: BaseAudioContext, dest: AudioNode, body: Body): EngineVoice {
  const v = VOICE[body], o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), sub = ctx.createOscillator(), subG = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = v.w1; o2.type = v.w2; o2.detune.value = 0; sub.type = 'sine';                     // no detune: two notes beating = the warble
  // start at idle values (not the 440 Hz / 350 Hz defaults) so switching a voice on doesn't pop
  o1.frequency.value = 55; o2.frequency.value = 45; sub.frequency.value = 42; f.frequency.value = 160; f.type = 'lowpass'; f.Q.value = v.q; subG.gain.value = v.sub; g.gain.value = 0;
  o1.connect(f); o2.connect(f); sub.connect(subG).connect(g); f.connect(g).connect(dest); o1.start(); o2.start(); sub.start();
  return {
    set(rpm, redline, gas, level, nitro, t) {
      const frac = Math.min(1.05, rpm / redline), hz = (32 + rpm / 60 * 2 * 0.55) * v.pitch;
      // nothing below 40–55 Hz (speakers can't play it — it only rattles them)
      o1.frequency.setTargetAtTime(Math.max(55, hz), t, 0.03); o2.frequency.setTargetAtTime(Math.max(45, hz * 0.5), t, 0.03); sub.frequency.setTargetAtTime(Math.max(42, hz * 0.5), t, 0.03);
      f.frequency.setTargetAtTime(160 + frac * 650 * gas + (nitro ? 250 : 0), t, 0.06);       // a muffled engine: no bright buzz on top
      g.gain.setTargetAtTime(level * 1.15 * (0.4 + 0.6 * gas), t, 0.05);
    },
    quiet(t) { g.gain.setTargetAtTime(0, t, 0.08); },
  };
}

/** Cross-plane V8 (muscle cars; owner 2026-10-22: "too high pitched — it needs a rumble and growl"). A real cross-plane V8 fires
 *  every 90° but unevenly within each bank, and each bank's four ports merge into one pipe, so the pulses bunch up into the
 *  "potato-potato" burble. So: one bank's actual firing pulses over a full 720° cycle (left bank 0°, 270°, 450°, 540°; right
 *  bank 90°, 180°, 360°, 630°, firing order 1-8-4-3-6-5-7-2) are turned into a waveform that plays at rpm ÷ 120 — the burble
 *  sits in its low harmonics, the firing note (rpm ÷ 15, 50 Hz at idle) above them. Then: growl (soft clipping, more on the
 *  gas), a muffler low-pass that opens with revs and throttle, two fixed exhaust resonances, and a 40 Hz floor for speakers. */
const V8_BANKS = [[0, 270, 450, 540], [90, 180, 360, 630]];
let v8Waves: PeriodicWave[] | null = null, v8Ctx: BaseAudioContext | null = null;
function v8Wave(ctx: BaseAudioContext, fires: number[], seed: number): PeriodicWave {
  const N = 2048, H = 110, x = new Float32Array(N);
  fires.forEach((deg, c) => {
    const amp = 1 + 0.12 * Math.sin(seed * 7.1 + c * 2.3);                     // cylinders are never quite equal
    for (let k = 0; k < N; k++) {
      const ph = ((k / N * 720 - deg) % 720 + 720) % 720;                    // crank degrees since this cylinder fired
      x[k] += amp * (ph < 160 ? Math.exp(-ph / 14) * (1 - Math.exp(-ph / 2)) - 0.22 * Math.exp(-ph / 55) * (ph / 160) : 0);   // sharp pulse + a little suck-back
    }
  });
  const re = new Float32Array(H + 1), im = new Float32Array(H + 1);
  for (let n = 1; n <= H; n++) { let a = 0, b = 0; for (let k = 0; k < N; k++) { const w = 2 * Math.PI * n * k / N; a += x[k] * Math.cos(w); b += x[k] * Math.sin(w); } re[n] = a * 2 / N; im[n] = b * 2 / N; }
  return ctx.createPeriodicWave(re, im);
}
function v8Voice(ctx: BaseAudioContext, dest: AudioNode): EngineVoice {
  if (v8Ctx !== ctx || !v8Waves) { v8Waves = V8_BANKS.map((b, i) => v8Wave(ctx, b, i + 1)); v8Ctx = ctx; }
  const banks = v8Waves.map((w, i) => { const o = ctx.createOscillator(), p = (ctx as any).createStereoPanner ? ctx.createStereoPanner() : null, g = ctx.createGain();
    o.setPeriodicWave(w); g.gain.value = i ? 0.75 : 1; o.connect(g); if (p) { p.pan.value = i ? 0.35 : -0.35; g.connect(p); } return { o, out: p ?? g }; });
  const drive = ctx.createGain(), shaper = ctx.createWaveShaper(), muffler = ctx.createBiquadFilter(), body = ctx.createBiquadFilter(), throat = ctx.createBiquadFilter(), floor = ctx.createBiquadFilter(), g = ctx.createGain();
  const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const xx = i / 511.5 - 1; curve[i] = Math.tanh(2.2 * xx) / Math.tanh(2.2); } shaper.curve = curve; shaper.oversample = '2x';
  // exhaust resonances (fixed, like a real pipe): a chesty body at 95 Hz and the growl at 260 Hz — the band PC and phone speakers
  // actually play, so the rumble comes through on them too
  muffler.type = 'lowpass'; muffler.Q.value = 0.6; body.type = 'peaking'; body.frequency.value = 90; body.Q.value = 0.9; body.gain.value = 7;
  throat.type = 'peaking'; throat.frequency.value = 200; throat.Q.value = 0.9; throat.gain.value = 3; floor.type = 'highpass'; floor.frequency.value = 40; floor.Q.value = 0.7; g.gain.value = 0;
  banks.forEach(b => b.out.connect(drive)); drive.connect(shaper).connect(muffler).connect(body).connect(throat).connect(floor).connect(g).connect(dest);
  // exhaust roar: noise shaped around the firing note, louder at high revs on the gas
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); ns.buffer = nb; ns.loop = true; nf.type = 'bandpass'; nf.Q.value = 0.8; ng.gain.value = 0;
  ns.connect(nf).connect(ng).connect(floor);
  banks.forEach(b => b.o.start()); ns.start();
  return {
    set(rpm, redline, gas, level, nitro, t) {
      // lumpy cam: near idle the revs hunt a little (the classic muscle-car lope), gone by ~2,000 rpm
      // V0.17.1, tuned toward the owner's reference (a 5.3 L LS V8, long-tube headers, straight pipe, cold start): no fast
      // warble or bank detune (that was the "squabble"), little clipping, high notes filtered out — but the firing pulses stay
      // distinct ("bub-bub-bub") and near idle the revs lope gently and slowly (one ~1.1 Hz swing), like a mild cam
      const idle = Math.max(0, 1 - (rpm - 700) / 900), lope = 1 + 0.018 * idle * Math.sin(t * 2 * Math.PI * 1.1);
      const frac = Math.min(1.05, rpm / redline), cyc = Math.max(4, rpm / 120) * lope;
      banks.forEach(b => b.o.frequency.setTargetAtTime(cyc, t, 0.03));
      drive.gain.setTargetAtTime(1.0 + 0.9 * gas, t, 0.05);                       // a touch of growl on the gas, no fizz
      muffler.frequency.setTargetAtTime(210 + 520 * frac * (0.4 + 0.6 * gas) + (nitro ? 200 : 0), t, 0.06);   // straight pipe: the pulses come through
      nf.frequency.setTargetAtTime(Math.min(400, cyc * 8), t, 0.05); ng.gain.setTargetAtTime(0.05 * gas * frac, t, 0.08);
      g.gain.setTargetAtTime(level * 1.3 * (0.55 + 0.45 * gas), t, 0.05);
    },
    quiet(t) { g.gain.setTargetAtTime(0, t, 0.08); },
  };
}
const makeVoice = (ctx: BaseAudioContext, dest: AudioNode, body: Body) => body === 'muscle' ? v8Voice(ctx, dest) : oscVoice(ctx, dest, body);

// live engines: one per car slot, rebuilt when that slot's body type changes
const engines: { body: Body; v: EngineVoice }[] = [];
function engine(i: number): EngineVoice | null {
  if (!ready()) return null;
  if (engines[i]?.body !== voices[i]) { engines[i]?.v.quiet(ac!.currentTime); engines[i] = { body: voices[i], v: makeVoice(ac!, engBus!, voices[i]) }; }
  return engines[i].v;
}
export function engineStop() { for (const e of engines) if (e && ac) e.v.quiet(ac.currentTime); }

/** Test hook (dev): render an engine voice offline over a scripted drive — idle, two blips, a full-throttle pull through two
 *  gears, lift — and return the samples, so voices can be measured and listened to without a race. */
export async function renderEngine(body: Body, seconds = 9, sampleRate = 44100, oscOnly = false): Promise<Float32Array[]> {
  const ctx = new OfflineAudioContext(2, Math.round(seconds * sampleRate), sampleRate), out = ctx.createGain(), hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 40; hp.Q.value = 0.7; out.connect(hp).connect(ctx.destination); out.gain.value = 0.75;
  const v = oscOnly ? oscVoice(ctx, out, body) : makeVoice(ctx, out, body), red = body === 'muscle' ? 6800 : 7600;
  const drive = (t: number): [number, number] => t < 1.5 ? [800, 0.25] : t < 2.0 ? [800 + (t - 1.5) / 0.5 * 3200, 1] : t < 2.6 ? [4000 - (t - 2.0) / 0.6 * 3200, 0.2]
    : t < 3.2 ? [800, 0.25] : t < 6.2 ? [2200 + (t - 3.2) / 3 * 4500, 1] : t < 6.45 ? [4500, 0.35] : t < 8.2 ? [4500 + (t - 6.45) / 1.75 * 2200, 1] : [Math.max(900, 6700 - (t - 8.2) * 5000), 0.15];
  for (let t = 0; t < seconds; t += 0.01) { const [rpm, gas] = drive(t); v.set(rpm, red, gas, 0.11, false, t); }
  const buf = await ctx.startRendering();
  return [buf.getChannelData(0), buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0)];
}

// ---- race: called every frame; events come from the racers' state ----
const seen = { ev: -1, oppEv: -1, lights: -1, nitro: false, spin: 0 };
export function raceReset(me: Body = 'hatch', opp: Body = 'hatch') { voices[0] = me; voices[1] = opp; seen.ev = -1; seen.oppEv = -1; seen.lights = -1; seen.nitro = false; seen.spin = 0; }
export function raceSound(me: Racer, opp: Racer, race: Race, held: boolean) {
  if (!ready()) return;
  const t = ac!.currentTime;
  [me, opp].forEach((r, i) => {
    const e = engine(i); if (!e) return;
    const gas = r.finish !== undefined ? 0.25 : r.launched ? (r.shifting > 0 ? 0.35 : 1) : held || i === 1 ? 0.8 : 0.3;
    e.set(r.rpm, r.stats.redline, gas, i === 0 ? 0.11 : 0.035, r.nitro > 0, t);
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

/** Drift cue beep (V0.18.1): a short tick per light, a higher one on green */
export const driftCue = (level: number) => level === 4 ? tone(988, 0.12, 'square', 0.06) : tone(587, 0.07, 'square', 0.05);
// ---- Drift (owner, V0.18.0): your engine, a tyre squeal while sliding (louder with the angle), chimes for clean drifts ----
const dseen = { ev: -1, lights: -1, squeal: 0 };
export function driftReset(me: Body = 'hatch') { voices[0] = me; dseen.ev = -1; dseen.lights = -1; dseen.squeal = 0; }
export function driftSound(rpm: number, redline: number, gas: boolean, sliding: number, green: boolean, t0: number, ev?: { text: string; t: number }) {
  if (!ready()) return;
  const t = ac!.currentTime, e = engine(0);
  e?.set(rpm, redline, gas ? 1 : 0.3, 0.11, false, t);
  const lit = green ? 3 : Math.min(3, Math.floor(t0));
  if (lit !== dseen.lights) { if (lit > 0 && lit < 3) tone(440, 0.14, 'square', 0.07); if (lit === 3 && green) tone(880, 0.35, 'square', 0.08); dseen.lights = lit; }
  if (sliding > 0.05 && t > dseen.squeal) { dseen.squeal = t + 0.22; noise(0.3, 1500 + sliding * 900, 6, 0.03 + sliding * 0.05); }
  if (ev && ev.t !== dseen.ev) {
    dseen.ev = ev.t;
    if (/Perfect entry/.test(ev.text)) { tone(1046, 0.12, 'triangle', 0.09); tone(1568, 0.22, 'triangle', 0.08, undefined, 0.07); }
    else if (/entry/.test(ev.text)) tone(784, 0.12, 'triangle', 0.07);
    else if (/Clean|Linked/.test(ev.text)) [659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, undefined, i * 0.06));
    else if (/Spin/.test(ev.text)) { noise(1.0, 900, 1, 0.12); tone(140, 0.4, 'sawtooth', 0.05, 70); }
    else if (/Straightened|Chain lost/.test(ev.text)) tone(220, 0.2, 'triangle', 0.06, 160);
  }
}
