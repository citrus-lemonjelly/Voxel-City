// Engine sound check (V0.17.1): renders engine voices offline over the same scripted drive — idle, two blips, a full-throttle
// pull through two gears, lift — saves each as a WAV you can play, and measures it: how much sound sits in each band, the
// "brightness" (spectral centroid; lower = deeper), and the idle burble (how much the loudness lopes). Builds build-test/ first.
//   node tools/engine-sound.mjs [OUT_DIR]        voices: V8 muscle (new), old muscle oscillator voice, hatch, hyper
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || resolve(root, 'build-test/sounds')); mkdirSync(out, { recursive: true });
execFileSync(process.execPath, [resolve(root, 'tools/build.mjs'), '--out', 'build-test'], { stdio: 'ignore' });

const VOICES = [['muscle-v8', 'muscle', false], ['hatch', 'hatch', true], ['sedan', 'sedan', true], ['tuner', 'tuner', true], ['hyper', 'hyper', true]];
const SR = 44100, SECONDS = 9;
const b = await chromium.launch(), pg = await b.newPage();
await pg.goto(pathToFileURL(resolve(root, 'build-test/index.html')).href + '?dev'); await pg.waitForFunction(() => window.__vc && window.__vc.renderEngine);

function wav(L, R) {                                            // 16-bit stereo PCM
  const n = L.length, buf = Buffer.alloc(44 + n * 4), w = (s, o) => buf.write(s, o);
  w('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); w('WAVE', 8); w('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); w('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  return buf;
}
function spectrum(x, from, len) {                               // magnitude spectrum of a Hann-windowed slice (radix-2 FFT)
  const N = 1 << Math.floor(Math.log2(len)), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[from + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let size = 2; size <= N; size <<= 1) { const a = -2 * Math.PI / size; for (let s = 0; s < N; s += size) for (let k = 0; k < size / 2; k++) {
    const c = Math.cos(a * k), sn = Math.sin(a * k), tr = re[s + k + size / 2] * c - im[s + k + size / 2] * sn, ti = re[s + k + size / 2] * sn + im[s + k + size / 2] * c;
    re[s + k + size / 2] = re[s + k] - tr; im[s + k + size / 2] = im[s + k] - ti; re[s + k] += tr; im[s + k] += ti; } }
  return { mag: Array.from({ length: N / 2 }, (_, i) => Math.hypot(re[i], im[i])), hz: SR / N };
}
function measure(x, t0, t1) {
  const { mag, hz } = spectrum(x, Math.round(t0 * SR), Math.round((t1 - t0) * SR)), pow = mag.map(m => m * m), tot = pow.reduce((a, b) => a + b, 0) || 1;
  const band = (lo, hi) => Math.round(100 * pow.reduce((a, p, i) => a + (i * hz >= lo && i * hz < hi ? p : 0), 0) / tot);
  const centroid = Math.round(pow.reduce((a, p, i) => a + p * i * hz, 0) / tot), peak = Math.round(mag.reduce((bi, m, i) => i && m > mag[bi] ? i : bi, 1) * hz);
  return { centroid, peak, sub40: band(0, 40), low: band(40, 150), mid: band(150, 500), high: band(500, 20000) };
}
function lope(x, t0, t1) {                                       // idle burble: how much the 10 ms loudness swings (std/mean)
  const w = Math.round(0.01 * SR), e = []; for (let i = Math.round(t0 * SR); i + w < t1 * SR; i += w) { let s = 0; for (let k = 0; k < w; k++) s += x[i + k] * x[i + k]; e.push(Math.sqrt(s / w)); }
  const m = e.reduce((a, b) => a + b, 0) / e.length, sd = Math.sqrt(e.reduce((a, b) => a + (b - m) ** 2, 0) / e.length); return +(sd / (m || 1)).toFixed(2);
}

const rows = [];
for (const [name, body, osc] of VOICES) {
  const [L, R] = await pg.evaluate(async ([b, o, s]) => (await window.__vc.renderEngine(b, s, 44100, o)).map(a => Array.from(a)), [body, osc, SECONDS]);
  writeFileSync(resolve(out, `engine-${name}.wav`), wav(L, R));
  const peakAmp = L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), idle = measure(L, 0.3, 1.4), pull = measure(L, 5.3, 6.1);
  rows.push([name, `${idle.centroid} Hz`, `${idle.peak} Hz`, `${pull.centroid} Hz`, `${pull.peak} Hz`, `${idle.sub40}% / ${idle.low}% / ${idle.mid}% / ${idle.high}%`, `${pull.sub40}% / ${pull.low}% / ${pull.mid}% / ${pull.high}%`, lope(L, 0.3, 1.4), peakAmp.toFixed(2)]);
}
await b.close();
const head = ['voice', 'idle bright', 'idle peak', 'pull bright', 'pull peak', 'idle <40/40–150/150–500/500+', 'pull <40/40–150/150–500/500+', 'idle lope', 'max'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
console.log([head, ...rows].map(r => r.map((c, i) => String(c).padEnd(w[i])).join('  ')).join('\n'));
console.log(`\nWAV files: ${out}`);
