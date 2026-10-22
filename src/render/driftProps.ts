// Drift scene assets (owner, V0.18.0): the voxel props that fill the four winding night roads. Every prop is built from boxes in
// its own local space — x along the road, y up, z away from the road (its front faces the road at z = 0) — at the cars' block
// size (1 block ≈ 6.9 cm). A Kit places it: anchor + turn, so props can face a curving road. Lit parts (windows, neon, lamps)
// go to the "lit" list and glow at night; glass to "glass"; flat ground pieces to "flat" (they take shadows but don't cast).
import { textCells } from './blockFont';

export type Layer = 'solid' | 'flat' | 'glass' | 'lit';
/** A world-space box: centre, size, turn about y (radians), colour, layer. */
export interface WB { x: number; y: number; z: number; sx: number; sy: number; sz: number; r: number; c: string; m: Layer }
export interface Pool { x: number; z: number; r: number; c: string }
export type Rng = () => number;
/** metres → blocks */
export const M = 1 / (4.0 / 58);

export class Kit {
  out: WB[] = []; pools: Pool[] = [];
  /** extra placements (trees, parked cars) handled by the scene */
  things: { kind: 'car'; x: number; z: number; r: number; i: number }[] = [];
  private ox = 0; private oz = 0; private rot = 0; private c = 1; private s = 0;
  constructor(public rng: Rng, public lite = false) {}
  /** move the kit's origin (world blocks) and turn (radians) */
  at(x: number, z: number, rot: number) { this.ox = x; this.oz = z; this.rot = rot; this.c = Math.cos(rot); this.s = Math.sin(rot); return this; }
  /** local point → world */
  w(lx: number, lz: number): [number, number] { return [this.ox + lx * this.c + lz * this.s, this.oz - lx * this.s + lz * this.c]; }
  /** a box by its local min corner and size (blocks) */
  box(lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: string, m: Layer = 'solid') {
    const [x, z] = this.w(lx + sx / 2, lz + sz / 2);
    this.out.push({ x, y: ly + sy / 2, z, sx, sy, sz, r: this.rot, c, m });
  }
  /** a box in metres (local min corner + size) */
  mbox(lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: string, m: Layer = 'solid') { this.box(lx * M, ly * M, lz * M, sx * M, sy * M, sz * M, c, m); }
  pool(lx: number, lz: number, r: number, c: string) { const [x, z] = this.w(lx, lz); this.pools.push({ x, z, r, c }); }
  car(lx: number, lz: number, turn: number, i: number) { const [x, z] = this.w(lx, lz); this.things.push({ kind: 'car', x, z, r: this.rot + turn, i }); }
  pick<T>(a: T[]): T { return a[Math.floor(this.rng() * a.length) % a.length]; }
  rand(a: number, b: number) { return a + this.rng() * (b - a); }
}

const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
export { shade };
const WARM = ['#ffd28a', '#ffe2a8', '#ffcf8a', '#ffc070'], COOL = ['#cfe6ff', '#bfe0ff', '#e6f0ff'];
export const NEON = ['#ff3ea5', '#3ef0ff', '#ffe23e', '#7dff5a', '#b06aff', '#ff7a3e'];

/** Block-letter sign text (lit), on the local z = z0 plane facing the road; cell in blocks. Returns its width. */
export function signText(k: Kit, text: string, cx: number, y: number, z0: number, cell: number, c: string, m: Layer = 'lit') {
  const { cells, width } = textCells(text), x0 = cx - width * cell / 2;
  // the road side looks along +z, so its left is local +x: draw mirrored so it reads the right way round
  for (const [col, r] of cells) k.box(x0 + (width - 1 - col) * cell, y + (4 - r) * cell, z0, cell, cell, cell * 0.6, c, m);
  return width * cell;
}

// ---------------------------------------------------------------- road furniture (all themes)
/** Street lamp on the verge, its arm out over the road, a light pool on the tarmac. style: city | mast | wood | neon */
export function lamp(k: Kit, style: 'city' | 'mast' | 'wood' | 'neon', night = true) {
  const P = style === 'wood' ? '#5a4030' : style === 'neon' ? '#24262e' : '#3d4046', H = style === 'mast' ? 15 : 8;
  const glow = style === 'mast' ? '#ffb45a' : style === 'neon' ? k.pick(['#ff9ee0', '#9ef6ff']) : style === 'wood' ? '#ffcf8a' : '#ffe2b0';
  k.mbox(-0.25, 0, -0.25, 0.5, 0.25, 0.5, '#2e3036');                                  // base
  k.mbox(-0.12, 0, -0.12, 0.24, H, 0.24, P);
  if (style === 'mast') {                                                              // harbour mast: a frame of floodlights
    k.mbox(-1.4, H, -0.6, 2.8, 0.3, 0.9, P);
    for (const x of [-1.2, -0.4, 0.4]) { k.mbox(x, H - 0.55, -0.7, 0.7, 0.55, 0.25, '#2b2e36'); k.mbox(x + 0.1, H - 0.45, -0.75, 0.5, 0.35, 0.06, glow, 'lit'); }
    k.pool(0, -9 * M, 15 * M, glow);
    return;
  }
  k.mbox(-0.08, H - 0.2, -3.2, 0.16, 0.16, 3.3, P);                                  // arm over the road
  k.mbox(-0.3, H - 0.45, -3.4, 0.6, 0.3, 0.8, '#2b2e36');
  k.mbox(-0.22, H - 0.5, -3.3, 0.44, 0.06, 0.6, glow, 'lit');
  if (style === 'neon') k.mbox(-0.04, 1.2, -0.16, 0.08, H - 2, 0.04, glow, 'lit');      // neon tube up the post
  if (night) k.pool(0, -3.6 * M, (style === 'wood' ? 6.5 : 8) * M, glow);
}
/** Black-and-yellow chevron board on two posts; arrow points along local `dir` (±1). */
export function chevron(k: Kit, dir: number) {
  k.mbox(-0.55, 0, 0.05, 0.08, 1.1, 0.08, '#3d4046'); k.mbox(0.47, 0, 0.05, 0.08, 1.1, 0.08, '#3d4046');
  k.mbox(-0.65, 1.0, 0, 1.3, 0.75, 0.08, '#14161c');
  const c = 0.11;                                                                       // arrow in 3 bands of blocks
  for (let i = 0; i < 4; i++) for (const [dy, dx] of [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] as [number, number][]) {
    const x = (-0.42 + i * 0.26 + dx * c * 0.9 * dir) * M, y = (1.07 + dy * c) * M;
    k.box(dir > 0 ? x : -x - c * M, y, -0.06 * M, c * M, c * M, 0.06 * M, '#f2c230', 'lit');
  }
}
/** Armco guardrail between two world points (blocks) — posts + a double rail, turned to follow the curve. */
export function armco(k: Kit, a: [number, number], b: [number, number], post = true) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx);
  k.at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, rot);
  k.box(-len / 2 - 0.5, 0.55 * M, -1, len + 1, 0.22 * M, 2, '#a8afb8');
  k.box(-len / 2 - 0.5, 0.33 * M, -0.5, len + 1, 0.12 * M, 1, '#7d848e');
  if (post) k.box(-len / 2 - 1.5, 0, 0.4, 3, 0.8 * M, 3, '#5a5f6b');
}
/** Tyre stack (race-track barrier): columns of black tyres, a white band on every other one. */
export function tyres(k: Kit, n: number) {
  for (let i = 0; i < n; i++) { const h = 2 + Math.floor(k.rng() * 3);
    for (let j = 0; j < h; j++) { const x = -n * 0.33 + i * 0.66, c = (i + j) & 1 ? '#1a1b1f' : '#26282d';
      k.mbox(x, j * 0.24, 0, 0.62, 0.24, 0.62, c); if (j === h - 1) k.mbox(x + 0.18, j * 0.24 + 0.2, 0.18, 0.26, 0.05, 0.26, '#0e0f12'); if ((i + j) % 3 === 0) k.mbox(x - 0.01, j * 0.24 + 0.08, -0.01, 0.64, 0.06, 0.64, '#e8e8e2'); } }
}
export function cone(k: Kit, x: number, z: number) {
  k.mbox(x - 0.2, 0, z - 0.2, 0.4, 0.06, 0.4, '#1a1b1f'); k.mbox(x - 0.13, 0.06, z - 0.13, 0.26, 0.2, 0.26, '#f26a1c'); k.mbox(x - 0.1, 0.26, z - 0.1, 0.2, 0.1, 0.2, '#eeeae0'); k.mbox(x - 0.07, 0.36, z - 0.07, 0.14, 0.16, 0.14, '#f26a1c');
}
/** Concrete K-rail (barrier block) with a hazard band. */
export function krail(k: Kit, x: number) {
  k.mbox(x, 0, 0, 3, 0.45, 0.6, '#c9c6bd'); k.mbox(x, 0.45, 0.1, 3, 0.35, 0.4, '#d6d3ca');
  for (let i = 0; i < 6; i++) k.mbox(x + 0.1 + i * 0.5, 0.3, -0.02, 0.25, 0.3, 0.02, i & 1 ? '#1a1a1e' : '#f2c230');
}
/** Start / finish gantry spanning the road (local x across the road, centred), checker banner, light bar. */
export function gantry(k: Kit, width: number, label: string) {
  const W = width + 2, H = 6;
  for (const x of [-W / 2 - 0.5, W / 2]) k.mbox(x, 0, -0.25, 0.5, H, 0.5, '#3d4046');
  k.mbox(-W / 2 - 0.5, H, -0.4, W + 1, 0.9, 0.8, '#24262e');
  for (let i = 0; i < Math.floor(W / 0.45); i++) for (let j = 0; j < 2; j++) k.mbox(-W / 2 + i * 0.45, H + 0.05 + j * 0.4, -0.45, 0.45, 0.4, 0.06, (i + j) & 1 ? '#eeeae0' : '#14161c');
  signText(k, label, 0, (H + 1.05) * M, -0.5 * M, 0.2 * M, '#f2c230');
  for (let i = 0; i < 8; i++) k.mbox(-W / 2 + 0.6 + i * (W - 1.2) / 7, H - 0.25, -0.45, 0.3, 0.2, 0.1, '#ffe2b0', 'lit');
  k.pool(0, 0, 10 * M, '#ffe2b0');
}

// ---------------------------------------------------------------- city (Downtown) + neon
const FACADES = ['#8e9bb3', '#a7a39a', '#7d8794', '#b8b2a6', '#6f7a8c', '#9a4a3a', '#8a3e30', '#5a5f6b', '#c4ccd2', '#7e4636'];
/** A city block: a tower/building whose front faces the road. Lit windows by night, a shop floor, a rooftop. w/d/h metres. */
export function building(k: Kit, w: number, d: number, h: number, opts: { shop?: string; neon?: boolean; glass?: boolean; colour?: string } = {}) {
  const col = opts.colour ?? k.pick(FACADES), floor = 3.3, win = opts.glass ? 1.6 : 1.1, gap = opts.glass ? 2 : 2.6;
  k.mbox(0, 0, 0, w, h, d, col);
  const lit = opts.glass ? 0.5 : 0.38, rows = Math.floor((h - 4.5) / floor), cols = Math.max(1, Math.floor((w - 1) / gap));
  const winFace = (len: number, put: (x: number, y: number, ww: number, hh: number, kind: Layer, c: string) => void, n: number) => {
    const step = (len - 1) / n;
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
      if (k.lite && (r + i) & 1) continue;
      const on = k.rng() < lit, y = 4.5 + r * floor + 0.8;
      if (on) put(0.5 + i * step + (step - win) / 2, y, win, 1.5, 'lit', k.pick(k.rng() < 0.8 ? WARM : COOL));
      else if (opts.glass || k.rng() < 0.5) put(0.5 + i * step + (step - win) / 2, y, win, 1.5, 'glass', '#1a2d3a');
    }
  };
  winFace(w, (x, y, ww, hh, m, c) => k.mbox(x, y, -0.08, ww, hh, 0.1, c, m), cols);                                    // front
  const sc = Math.max(1, Math.floor((d - 1) / gap));
  winFace(d, (x, y, ww, hh, m, c) => k.mbox(-0.08, y, x, 0.1, hh, ww, c, m), sc);                                      // left side
  winFace(d, (x, y, ww, hh, m, c) => k.mbox(w - 0.02, y, x, 0.1, hh, ww, c, m), sc);                                    // right side
  // ledges every few floors and a parapet
  for (let r = 3; r < rows; r += 4) k.mbox(-0.15, 4.2 + r * floor, -0.15, w + 0.3, 0.2, d + 0.3, shade(col, 0.8));
  k.mbox(-0.15, h, -0.15, w + 0.3, 0.5, d + 0.3, shade(col, 0.75));
  // shop floor: lit glass, a door, an awning, a sign
  if (opts.shop !== undefined) {
    // shop windows: lit panes between dark mullions, with a sill — not one bright band
    for (let x = 0.5; x < w - 1.2; x += 2.2) { if (x > w * 0.3 - 1.6 && x < w * 0.3 + 1.2) continue; k.mbox(x, 0.6, -0.1, 1.8, 2.2, 0.12, k.pick(['#e8b878', '#d8a868', '#f0c890']), 'lit'); k.mbox(x - 0.2, 0.4, -0.2, 2.2, 0.2, 0.2, '#2e3036'); }
    k.mbox(w * 0.3, 0, -0.14, 1.2, 2.4, 0.1, '#3a2a1c');
    const aw = k.pick([['#d23a2a', '#eeeae0'], ['#2f6fd6', '#eeeae0'], ['#2f9a5a', '#eeeae0'], ['#1a1a1e', '#f2c230'], ['#6a3ad2', '#eeeae0']]);
    for (let x = 0; x < w - 0.1; x += 0.6) k.mbox(x, 3.6, -1.6, Math.min(0.6, w - x), 0.2, 1.6, ((x / 0.6) | 0) & 1 ? aw[0] : aw[1]);
    if (opts.shop) signText(k, opts.shop, w / 2 * M, 4.1 * M, -0.3 * M, 0.16 * M, opts.neon ? k.pick(NEON) : '#ffe2a8');
    k.pool(w / 2 * M, -2.5 * M, 4.5 * M, '#ffcf8a');
  }
  // rooftop clutter
  const roof = h + 0.5;
  for (let i = 0; i < 2 + Math.floor(k.rng() * 3); i++) { const x = k.rand(1, Math.max(1.5, w - 3)), z = k.rand(1, Math.max(1.5, d - 3)); k.mbox(x, roof, z, 1.6, 1, 1.2, '#7d848e'); k.mbox(x + 0.2, roof + 1, z + 0.2, 1.2, 0.15, 0.8, '#5a5f6b'); }
  if (h > 25 && k.rng() < 0.6) { const x = w * 0.6, z = d * 0.5; k.mbox(x, roof, z, 0.25, 6, 0.25, '#3d4046'); k.mbox(x - 0.05, roof + 6, z - 0.05, 0.35, 0.3, 0.35, '#ff2a2a', 'lit'); }
  if (h < 25 && k.rng() < 0.4) { const x = k.rand(1, w - 4), z = k.rand(1, d - 4); for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) k.mbox(x + a, roof, z + b, 0.2, 2, 0.2, '#5a4030'); k.mbox(x - 0.2, roof + 2, z - 0.2, 2.6, 2.6, 2.6, '#8a6a4a'); k.mbox(x - 0.3, roof + 4.6, z - 0.3, 2.8, 0.3, 2.8, '#5a4030'); }
  if (opts.neon || k.rng() < 0.3) {                                                    // rooftop billboard
    const bw = Math.min(w - 1, 9), x = (w - bw) / 2;
    for (const px of [x + 0.5, x + bw - 0.8]) k.mbox(px, roof, 1, 0.3, 2, 0.3, '#3d4046');
    k.mbox(x, roof + 2, 0.9, bw, 3, 0.25, '#14161c');
    const c1 = k.pick(NEON), c2 = k.pick(NEON);
    for (let i = 0; i < 5; i++) k.mbox(x + 0.3 + i * (bw - 0.6) / 5, roof + 2.3, 0.85, (bw - 0.6) / 5 - 0.1, 2.4, 0.06, i & 1 ? c1 : shade(c2, 0.7), 'lit');
  }
  if (opts.neon) {                                                                    // neon outline along the roof edge
    const nc = k.pick(NEON);
    k.mbox(-0.2, h - 0.2, -0.2, w + 0.4, 0.12, 0.12, nc, 'lit'); k.mbox(-0.2, h - 0.2, -0.2, 0.12, 0.12, d + 0.4, nc, 'lit'); k.mbox(w + 0.08, h - 0.2, -0.2, 0.12, 0.12, d + 0.4, nc, 'lit');
    k.mbox(-0.2, 0.5, -0.2, 0.12, h - 0.7, 0.12, nc, 'lit'); k.mbox(w + 0.08, 0.5, -0.2, 0.12, h - 0.7, 0.12, nc, 'lit');
  }
}
/** Big vertical neon sign on brackets (blade sign), reading top to bottom. */
export function bladeSign(k: Kit, text: string, x: number, y: number) {
  const c = k.pick(NEON), cell = 0.22;
  k.mbox(x - 0.1, y, -1.6, 0.2, text.length * 1.3 + 0.6, 1.4, '#14161c');
  for (let i = 0; i < text.length; i++) { const { cells, width } = textCells(text[i]);
    for (const [col, r] of cells) k.mbox(x - 0.16, y + (text.length - i) * 1.3 - 0.9 + (4 - r) * cell, -1.45 + (width - 1 - col) * cell, 0.06, cell, cell, c, 'lit'); }
}
/** Pavement clutter: hydrant, bins, news boxes, bench, phone booth, vending machine. */
export function streetBits(k: Kit, x: number) {
  const r = k.rng();
  if (r < 0.2) { k.mbox(x, 0, 0.3, 0.3, 0.6, 0.3, '#d23a2a'); k.mbox(x + 0.05, 0.6, 0.35, 0.2, 0.15, 0.2, '#d23a2a'); }
  else if (r < 0.4) for (let i = 0; i < 3; i++) k.mbox(x + i * 0.5, 0, 0.3, 0.42, 1.0, 0.42, ['#2f6fd6', '#d23a2a', '#f2c230'][i]);
  else if (r < 0.6) { k.mbox(x, 0.4, 0.3, 1.8, 0.1, 0.5, '#8a5a32'); k.mbox(x, 0.5, 0.75, 1.8, 0.5, 0.08, '#8a5a32'); for (const a of [0.1, 1.6]) k.mbox(x + a, 0, 0.35, 0.1, 0.4, 0.4, '#2e3036'); }
  else if (r < 0.8) { k.mbox(x, 0, 0.3, 0.9, 1.8, 0.8, '#c8322a'); k.mbox(x + 0.1, 0.9, 0.25, 0.7, 0.7, 0.06, '#ffe8c0', 'lit'); k.mbox(x + 0.1, 0.2, 0.25, 0.7, 0.5, 0.06, '#3ef0ff', 'lit'); }   // vending machine
  else { k.mbox(x, 0, 0.3, 0.6, 0.9, 0.6, '#2f5a3e'); k.mbox(x - 0.05, 0.9, 0.25, 0.7, 0.1, 0.7, '#244630'); }
}
/** Chain-link fence run (posts, top rail, see-through mesh). */
export function fence(k: Kit, len: number, h = 2) {
  for (let x = 0; x <= len; x += 2.5) k.mbox(x, 0, 0, 0.08, h, 0.08, '#7d848e');
  k.mbox(0, h - 0.06, 0, len, 0.06, 0.06, '#7d848e');
  k.mbox(0, 0.05, 0.02, len, h - 0.15, 0.03, '#9aa3ad', 'glass');
}

// ---------------------------------------------------------------- harbour
const BOX_COLS = ['#c8322a', '#2f6fd6', '#1f8a8a', '#f2a43a', '#eeeae0', '#2f9a5a', '#6a3ad2', '#8a3e30', '#5a5f6b', '#d0567a'];
/** Shipping container (12.2 × 2.6 × 2.6 m) with ribbed sides and door bars; x0/y0/z0 metres; long = along local x. */
export function container(k: Kit, x0: number, y0: number, z0: number, col: string, long = true) {
  const L = long ? 12.2 : 2.6, D = long ? 2.6 : 12.2;
  k.mbox(x0, y0, z0, L, 2.55, D, col);
  const dark = shade(col, 0.72);
  if (long) { for (let x = 0.4; x < L - 0.3; x += k.lite ? 1.2 : 0.6) k.mbox(x0 + x, y0 + 0.15, z0 - 0.05, 0.12, 2.25, 0.06, dark); }
  else { for (let z = 0.4; z < D - 0.3; z += k.lite ? 1.2 : 0.6) k.mbox(x0 - 0.05, y0 + 0.15, z0 + z, 0.06, 2.25, 0.12, dark); }
  k.mbox(x0, y0 + 2.5, z0, L, 0.08, D, shade(col, 0.85));
}
export function containerStack(k: Kit, cols: number, maxH: number) {
  for (let i = 0; i < cols; i++) { const h = 1 + Math.floor(k.rng() * maxH);
    for (let j = 0; j < h; j++) container(k, 0, j * 2.6, i * 2.7, k.pick(BOX_COLS)); }
}
/** Gantry crane: four legs, a cross beam, a long boom over the water side, warning lights. */
export function crane(k: Kit) {
  const Y = '#f2b830', H = 34;
  for (const [x, z] of [[0, 0], [14, 0], [0, 12], [14, 12]]) { k.mbox(x, 0, z, 1.2, H, 1.2, Y); k.mbox(x - 0.3, 0, z - 0.3, 1.8, 0.8, 1.8, '#3d4046'); }
  for (const z of [0, 12]) k.mbox(0, H, z, 15.2, 2, 1.2, Y);
  k.mbox(0, H + 2, -14, 15.2, 2.2, 40, Y);                                              // boom
  k.mbox(5, H + 4.2, 2, 5, 3, 5, '#d8d3c8'); k.mbox(5.3, H + 5.2, 1.9, 4.4, 1.2, 0.1, '#ffe2a8', 'lit');   // cab
  for (const z of [-13, 0, 12, 25]) k.mbox(7, H + 4.2, z, 0.5, 0.4, 0.5, '#ff2a2a', 'lit');
  for (let y = 4; y < H; y += 5) { k.mbox(0.2, y, 0.4, 14.6, 0.3, 0.4, shade(Y, 0.8)); k.mbox(0.2, y, 12.4, 14.6, 0.3, 0.4, shade(Y, 0.8)); }
  k.mbox(6.5, H - 6, -12, 2, 1, 2, '#3d4046'); k.mbox(7.4, H - 5, -11.1, 0.1, 6, 0.1, '#14161c');   // spreader hanging off the boom
  k.pool(7 * M, 6 * M, 18 * M, '#ffb45a');
}
/** Harbour shed: a long warehouse, roll-up doors, a lit pier sign. */
export function shed(k: Kit, w: number, d: number, label: string) {
  const col = k.pick(['#5f6f7a', '#7a6a5a', '#4f5a66', '#8a8478']);
  k.mbox(0, 0, 0, w, 9, d, col); k.mbox(-0.3, 9, -0.3, w + 0.6, 0.6, d + 0.6, shade(col, 0.7));
  for (let x = 0.5; x < w; x += 0.8) k.mbox(x, 0.2, -0.05, 0.1, 8.6, 0.06, shade(col, 0.8));
  for (let x = 2; x < w - 5; x += 7) { k.mbox(x, 0, -0.12, 4.5, 5, 0.1, '#9aa3ad'); for (let y = 0.4; y < 5; y += 0.5) k.mbox(x, y, -0.16, 4.5, 0.06, 0.04, '#6b7380'); k.mbox(x + 1.8, 5.4, -0.3, 0.9, 0.3, 0.3, '#ffe2b0', 'lit'); k.pool((x + 2.2) * M, -2 * M, 4.5 * M, '#ffe2b0'); }
  k.mbox(w / 2 - 4, 6, -0.25, 8, 2.2, 0.15, '#14161c');
  signText(k, label, w / 2 * M, 6.4 * M, -0.4 * M, 0.27 * M, '#f2c230');
}
/** Mooring bollard + coiled rope. */
export function bollard(k: Kit, x: number, z: number) { k.mbox(x - 0.25, 0, z - 0.25, 0.5, 0.6, 0.5, '#2b2e36'); k.mbox(x - 0.35, 0.6, z - 0.35, 0.7, 0.15, 0.7, '#2b2e36'); k.mbox(x - 0.4, 0, z + 0.4, 0.8, 0.12, 0.6, '#c9b07a'); }
/** A moored boat (dark hull, white cabin, two lit portholes). */
export function boat(k: Kit, len: number) {
  k.mbox(0, -2.7, 0, len, 2.5, len * 0.32, '#22303c'); k.mbox(0.4, -0.2, 0.3, len - 0.8, 0.3, len * 0.32 - 0.6, '#c9b07a');
  k.mbox(len * 0.3, 0.3, len * 0.06, len * 0.35, 1.8, len * 0.2, '#e8e8e2');
  for (let i = 0; i < 3; i++) k.mbox(len * 0.33 + i * len * 0.1, 1.1, len * 0.06 - 0.05, 0.4, 0.4, 0.06, '#ffe2a8', 'lit');
  k.mbox(len * 0.48, 2.1, len * 0.14, 0.12, 4, 0.12, '#d8d3c8'); k.mbox(len * 0.48, 6, len * 0.14, 0.2, 0.2, 0.2, '#3eff7a', 'lit');
}

// ---------------------------------------------------------------- ridge
/** Voxel pine: a trunk and stacked, shrinking tiers of needles; h metres. */
export function pine(k: Kit, x: number, z: number, h: number) {
  const g = k.pick(['#1f3a28', '#24402c', '#1b3324', '#2a4a30']);
  k.mbox(x - 0.25, 0, z - 0.25, 0.5, h * 0.3, 0.5, '#4a3424');
  const tiers = k.lite ? 3 : 5;
  for (let i = 0; i < tiers; i++) { const t = i / tiers, r = (1 - t) * h * 0.24 + 0.3, y = h * 0.22 + t * h * 0.68;
    k.mbox(x - r, y, z - r, r * 2, h * 0.68 / tiers + 0.3, r * 2, i & 1 ? g : shade(g, 1.15)); }
  k.mbox(x - 0.15, h * 0.9, z - 0.15, 0.3, h * 0.12, 0.3, shade(g, 1.2));
}
/** Rock wall: stacked uneven stone blocks, len along local x, up to h metres. */
export function rocks(k: Kit, len: number, h: number) {
  const C = ['#5a5c60', '#66686c', '#4d4f54', '#727478', '#5e5a52'];
  for (let x = 0; x < len; x += k.rand(1.5, 3)) { const hh = k.rand(h * 0.4, h), w = k.rand(1.8, 3.6), d = k.rand(2, 5);
    k.mbox(x, 0, k.rand(0, 1), w, hh, d, k.pick(C)); if (k.rng() < 0.5) k.mbox(x + 0.3, hh, 0.5, w * 0.6, k.rand(0.5, 1.5), d * 0.6, k.pick(C));
    if (k.rng() < 0.3) k.mbox(x, hh - 0.2, 0, w, 0.25, 1, '#3a4a30'); }
}
/** Log cabin with lit windows, a chimney and a porch light. */
export function cabin(k: Kit) {
  const W = 7, D = 6, wood = k.pick(['#6a4a32', '#5a3e2a', '#7a5638']);
  k.mbox(0, 0, 0, W, 3.2, D, wood);
  for (let y = 0.3; y < 3.2; y += 0.45) k.mbox(-0.1, y, -0.1, W + 0.2, 0.12, 0.12, shade(wood, 0.75));
  for (let i = 0; i < 4; i++) k.mbox(-0.4 + i * 0.25, 3.2 + i * 0.6, -0.5, W + 0.8 - i * 0.5, 0.6, D + 1 - i * 0.5, '#3a3236');
  for (const x of [1, W - 2.2]) { k.mbox(x, 1.1, -0.12, 1.2, 1.1, 0.1, '#ffcf8a', 'lit'); k.mbox(x - 0.1, 1.0, -0.16, 1.4, 0.1, 0.06, '#3a2a1c'); }
  k.mbox(W / 2 - 0.5, 0, -0.12, 1, 2.2, 0.1, '#3a2a1c'); k.mbox(W / 2 + 0.6, 2.3, -0.3, 0.25, 0.25, 0.25, '#ffe2a8', 'lit');
  k.mbox(W - 1.5, 3.5, D * 0.6, 0.8, 2.6, 0.8, '#6b6f78');
  k.pool(W / 2 * M, -2 * M, 4 * M, '#ffcf8a');
}
/** Wooden power pole with a crossbar and insulators; returns the wire hang point (local, blocks). */
export function powerPole(k: Kit) {
  k.mbox(-0.15, 0, -0.15, 0.3, 9, 0.3, '#5a4030'); k.mbox(-1.2, 8.2, -0.1, 2.4, 0.2, 0.2, '#5a4030');
  for (const x of [-1, 0, 0.9]) k.mbox(x, 8.4, -0.06, 0.12, 0.25, 0.12, '#9ad0d8');
}
/** Hill silhouette: stepped grass-topped earth, w × d metres, h tall. */
export function hill(k: Kit, w: number, d: number, h: number) {
  const steps = 4;
  for (let i = 0; i < steps; i++) { const f = i / steps, ww = w * (1 - f * 0.55), dd = d * (1 - f * 0.55);
    k.mbox((w - ww) / 2, i * h / steps, (d - dd) / 2, ww, h / steps, dd, i === steps - 1 ? '#2a3a26' : shade('#3a3a30', 1 - f * 0.15));
    k.mbox((w - ww) / 2, (i + 1) * h / steps - 0.2, (d - dd) / 2, ww, 0.3, dd, '#2f4429'); }
}
/** Wooden fence run. */
export function woodFence(k: Kit, len: number) {
  for (let x = 0; x <= len; x += 2) k.mbox(x, 0, 0, 0.15, 1.2, 0.15, '#6a4a32');
  for (const y of [0.4, 0.9]) k.mbox(0, y, 0.02, len, 0.12, 0.08, '#7a5638');
}
/** Road sign on a post (white board, block text). */
export function roadSign(k: Kit, text: string, colour = '#2f7a4a') {
  const { width } = textCells(text), cell = 0.12, w = width * cell + 0.5;
  k.mbox(-0.06, 0, 0.1, 0.12, 2.2, 0.12, '#9aa1ab');
  k.mbox(-w / 2, 2.0, 0, w, 0.9, 0.08, colour);
  signText(k, text, 0, 2.15 * M, -0.05 * M, cell * M, '#eeeae0', 'solid');
}
