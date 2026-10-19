// Visual parts v2 (owner Q117) that work the same on every body: body kit voxels (front bumper, side skirts, rear
// diffuser), decals painted onto the body's own paint blocks, and steady underglow. Looks only (A24).
// Coordinates are the built car's final voxel frame: x = length (nose 0, tail L), y = up, z = width (0 = camera side).
import * as THREE from 'three';
import { Vox } from './voxel';
import { DECAL_TIER } from '../data/visualParts';

/** What the kit/decals need to know about a built body (final coordinates, body lift included). */
export interface BodyDims {
  L: number; W: number;
  /** lowest body row (the sill / rocker row) */
  yb: number;
  wheels: number[]; archR: number;
  /** top row of the lower body (belt line) at x */
  belt: (x: number) => number;
  /** where the hood ends (windscreen foot), x */
  hoodEnd: number;
}
type Parts = Partial<Record<string, string>>;
const DARK = '#1a1a1e', DARKER = '#121214', GREY = '#5a5e66';
const carbon = (a: number, b: number) => ((a + b) % 2 ? '#1c1d21' : '#2c2e34');
const v = (x: number, y: number, z: number, c: string | null, role: Vox['role'] = 'trim', shade = 'mid'): Vox => ({ x, y, z, c, role, s: 1, shade });

/** Body kit blocks for the fitted bumper / skirts / diffuser. */
export function kitVoxels(d: BodyDims, parts: Parts): Vox[] {
  const out: Vox[] = [], { L, W, yb } = d;
  const bump = parts.bumper, skirt = parts.skirts, diff = parts.diffuser;
  if (bump === 'lip' || bump === 'aero') for (let z = 1; z < W - 1; z++) out.push(v(-2, yb, z, DARK));
  if (bump === 'track') {
    for (let x = -3; x <= -2; x++) for (let z = 0; z < W; z++) out.push(v(x, yb, z, carbon(x, z)));
    for (const z of [0, W - 1]) for (let x = -3; x <= -1; x++) out.push(v(x, yb + 1, z, DARK));            // end plates
  }
  if (bump === 'aero' || bump === 'track') {                                                                  // canards on the bumper corners
    const rows = bump === 'track' ? [yb + 2, yb + 4] : [yb + 3];
    for (const y of rows) for (const z of [-1, W]) for (let x = 2; x <= 4; x++) out.push(v(x, y, z, bump === 'track' ? carbon(x, y) : DARK));
  }
  if (skirt && skirt !== 'stock') {
    const x0 = Math.ceil(d.wheels[0] + d.archR + 0.5), x1 = Math.floor(d.wheels[1] - d.archR - 0.5);
    for (let x = x0; x <= x1; x++) for (const z of [-1, W]) for (const y of [yb, yb + 1]) {
      if (y === yb + 1 && (x === x0 || x === x1)) continue;                                                   // tapered ends
      out.push(skirt === 'painted' ? v(x, y, z, null, 'paint', y === yb ? 'dark' : 'mid') : v(x, y, z, skirt === 'carbon' ? carbon(x, y) : '#1d1e22'));
    }
  }
  // diffusers sit on the bottom row (the tail pipes are one row up)
  if (diff === 'fins') for (let z = 3; z < W - 3; z++) out.push(v(L, yb, z, z % 3 === 0 ? GREY : DARKER));
  if (diff === 'race') {
    for (let x = L; x <= L + 2; x++) for (let z = 2; z < W - 2; z++) out.push(v(x, yb, z, x === L ? DARKER : carbon(x, z)));
    for (let z = 3; z < W - 3; z += 4) for (let y = yb; y <= yb + 1; y++) out.push(v(L + 3, y, z, GREY));
  }
  return out;
}

// ---------------- decals ----------------
const lum = (hex: string) => { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
/** White on dark paint, near-black on light paint. */
const contrast = (paint: string) => (lum(paint) > 0.42 ? '#1c1c20' : '#eeeae0');
const DIGIT7 = ['111', '001', '010', '010', '010'];
const EMBLEMS: Record<string, string[]> = {
  D: ['1010101', '1111111', '0111110', '0011100', '0011100', '0111110', '1111111'],   // Rook: chess rook
  C: ['0010100', '0111110', '1110111', '0100010', '1110111', '0111110', '0010100'],   // Brass: gear
  B: ['0111110', '1100011', '1100000', '0111110', '0000011', '1100011', '0111110'],   // Viper: S-snake
  A: ['0001000', '0001000', '0011100', '1111111', '0011100', '0001000', '0001000'],   // Nova: star
  S: ['0001000', '0011100', '0110110', '1100011', '0001000', '0011100', '0110110'],   // Apex: double chevron
};

/** Recolour the body's paint blocks for a decal. Paint blocks keep role 'paint' (so the paint finish still applies); a set
 *  colour `c` on a paint block = decal colour. Only s = 1 body blocks are touched (wheels are separate). */
export function applyDecal(body: Vox[], d: BodyDims, decal: string | undefined, paint: string) {
  if (!decal || decal === 'stock') return;
  const { L, W, yb } = d, ink = contrast(paint);
  // camera-side / far-side surface block of each (x, y) column, and the top block of each (x, z) column
  const near = new Map<string, Vox>(), far = new Map<string, Vox>(), top = new Map<string, Vox>();
  for (const b of body) {
    if (b.s !== 1) continue;
    const kxy = b.x + ',' + b.y, kxz = b.x + ',' + b.z;
    if (!near.has(kxy) || b.z < near.get(kxy)!.z) near.set(kxy, b);
    if (!far.has(kxy) || b.z > far.get(kxy)!.z) far.set(kxy, b);
    if (!top.has(kxz) || b.y > top.get(kxz)!.y) top.set(kxz, b);
  }
  const sidePaint = (x: number, y: number, c: string, which: 'both' | 'near' | 'far' = 'both') => {
    for (const m of which === 'both' ? [near, far] : which === 'near' ? [near] : [far]) { const b = m.get(x + ',' + y); if (b && b.role === 'paint' && y <= d.belt(x)) b.c = c; }
  };
  const topPaint = (x: number, z: number, c: string) => { const b = top.get(x + ',' + z); if (b && b.role === 'paint') b.c = c; };
  const between = [Math.ceil(d.wheels[0] + d.archR), Math.floor(d.wheels[1] - d.archR)];

  if (decal === 'side') for (let x = 2; x < L - 2; x++) { const t = d.belt(x); sidePaint(x, t - 2, ink); sidePaint(x, t - 3, ink); }
  if (decal === 'checker') for (let x = between[0]; x <= between[1]; x++) for (const y of [yb + 1, yb + 2]) sidePaint(x, y, (x + y) % 2 ? '#eeeae0' : '#1c1c20');
  if (decal === 'stripes') {
    const mid = Math.floor(W / 2);
    for (let x = -2; x <= L + 2; x++) for (let z = mid - 4; z < mid + 4; z++) if (z !== mid - 1 && z !== mid) topPaint(x, z, ink);
  }
  if (decal === 'number') {
    const cx = Math.round((d.wheels[0] + d.wheels[1]) / 2) - 2, top0 = d.belt(cx), cy = (yb + 1 + top0) / 2, r = Math.min(4.6, (top0 - yb) / 2 + 0.2);
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      if (Math.hypot(x + .5 - (cx + .5), y + .5 - (cy + .5)) < r) sidePaint(x, y, '#eeeae0');
    // the 7, readable from each side (screen-right is −x on the camera side, +x on the far side)
    const y0 = Math.round(cy) + 2;
    DIGIT7.forEach((row, ry) => [...row].forEach((b, c) => { if (b === '1') { sidePaint(cx + 1 - c, y0 - ry, '#1c1c20', 'near'); sidePaint(cx - 1 + c, y0 - ry, '#1c1c20', 'far'); } }));
  }
  if (decal === 'flames') {
    // hot-rod flames: tapered tongues from the nose, curling up slightly as they lick back (sides), and over the hood (top)
    const col = (e: number, th: number) => (e > th * 0.62 ? '#f8c63a' : e > th * 0.28 ? '#f2742a' : '#c4231a');
    const tongues = [[0.18, 0.40], [0.42, 0.62], [0.66, 0.52], [0.88, 0.34]];   // [height 0–1 up the side, length × L]
    for (const [hy, ln] of tongues) {
      const len = ln * L;
      for (let x = 0; x < len; x++) {
        const t0 = d.belt(x), H = t0 - yb, th = H * 0.2 * (1 - x / len) + 0.6, yc = yb + 1 + hy * (H - 1) + x * 0.06;
        for (let y = yb + 1; y <= t0; y++) { const e = th - Math.abs(y + .5 - yc); if (e > 0) sidePaint(x, y, col(e, th)); }
      }
    }
    const mid = W / 2, hoodTongues = [[-7, 0.55], [-2.5, 0.85], [2.5, 0.85], [7, 0.55]];   // [z offset, length × hood]
    for (const [dz, ln] of hoodTongues) {
      const len = ln * d.hoodEnd;
      for (let x = -1; x < len; x++) { const th = 2.4 * (1 - Math.max(0, x) / len) + 0.5; for (let z = 0; z < W; z++) { const e = th - Math.abs(z + .5 - (mid + dz * (1 + x / len * 0.25))); if (e > 0) topPaint(x, z, col(e, th)); } }
    }
  }
  if (decal.startsWith('boss_')) {
    const [, lg, n] = decal.split('_'), art = EMBLEMS[lg] ?? EMBLEMS.D, col = DECAL_TIER[(+n - 1) % DECAL_TIER.length], H = art.length, Wd = art[0].length;
    const on = (r: number, c: number) => r >= 0 && r < H && c >= 0 && c < Wd && art[r][c] === '1';
    const ring = (r: number, c: number) => !on(r, c) && [-1, 0, 1].some(a => [-1, 0, 1].some(b => on(r + a, c + b)));
    // doors: centred behind the front wheel, mid-height of the side
    const cx = Math.round(d.wheels[0] + d.archR + 5 + Wd / 2), cy = Math.round((yb + 1 + d.belt(cx)) / 2) + Math.floor(H / 2);
    for (let r = -1; r <= H; r++) for (let c = -1; c <= Wd; c++) {
      const k = on(r, c) ? col : ring(r, c) ? '#141417' : null; if (!k) continue;
      sidePaint(cx + Math.floor(Wd / 2) - c, cy - r, k, 'near'); sidePaint(cx - Math.floor(Wd / 2) + c, cy - r, k, 'far');
    }
    // hood: the emblem's top towards the windscreen, read from the front of the car
    const hx = Math.round(d.hoodEnd / 2) - Math.floor(H / 2), hz = Math.floor(W / 2) - Math.floor(Wd / 2);
    for (let r = -1; r <= H; r++) for (let c = -1; c <= Wd; c++) { const k = on(r, c) ? col : ring(r, c) ? '#141417' : null; if (k) topPaint(hx + H - 1 - r, hz + c, k); }
  }
}

// ---------------- underglow (steady, never blinks or pulses) ----------------
export const UNDERGLOW: Record<string, [string, string]> = {
  ice: ['#5ad2ff', '#5ad2ff'], green: ['#4dff8a', '#4dff8a'], violet: ['#9a5cff', '#9a5cff'], red: ['#ff3a3a', '#ff3a3a'],
  pink: ['#ff4fc8', '#ff4fc8'], white: ['#e8f2ff', '#e8f2ff'], split: ['#5ad2ff', '#ff4fc8'],
};
let glowTex: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d')!;
  // soft rounded-rectangle falloff (the footprint of a car)
  const img = g.createImageData(128, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    const dx = Math.max(0, Math.abs(x + .5 - 64) - 34) / 30, dy = Math.max(0, Math.abs(y + .5 - 32) - 10) / 22;
    const a = Math.max(0, 1 - Math.hypot(dx, dy)); const i = (y * 128 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(255 * a * a);
  }
  g.putImageData(img, 0, 0);
  glowTex = new THREE.CanvasTexture(c);   // white with an alpha falloff — tinted by the material colour
  return glowTex;
}
/** Glow tubes under the sills plus a soft pool of light on the ground. Car-local units; add to the car group. */
export function underglowGroup(kind: string, d: { L: number; W: number; yb: number }): THREE.Group | null {
  const cols = UNDERGLOW[kind]; if (!cols) return null;
  const g = new THREE.Group(); g.name = 'underglow';
  const half = d.L / 2;
  for (const [i, col] of cols.entries()) {
    // ground pool: front half and rear half (same colour unless two-tone)
    const geo = new THREE.PlaneGeometry(half + 14, d.W + 18), tex = glowTexture().clone(); tex.needsUpdate = true;
    tex.repeat.set(0.5, 1); tex.offset.set(i * 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ color: col, map: tex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(i ? half + (half + 14) / 2 - 7 : (half + 14) / 2 - 7, 0.08, d.W / 2); m.renderOrder = 2;
    g.add(m);
    // tubes along the sills
    // tubes under the floor, inboard of the tyres (wheels end ~3.5 blocks in from each side)
    const tube = new THREE.Mesh(new THREE.BoxGeometry(half - 3, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    for (const z of [5.5, d.W - 5.5]) { const t = tube.clone(); t.position.set(i ? half + (half - 3) / 2 : 3 + (half - 3) / 2, d.yb - 0.25, z); g.add(t); }
  }
  return g;
}
