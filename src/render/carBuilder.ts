// Panda Civix v2.1 voxel builder — ported from prototypes/step0b/civix2.html.
// Car-local frame (docs/PART_SLOTS.md): x = length (front at 0, car faces −x), y = up (ground 0), z = width.
// Body at car density; wheels at 2× (half-size blocks, decision A15). Every part slot takes a variant id.
import * as THREE from 'three';
import { Vox, Role, Materials, mergedVoxMeshes } from './voxel';

export const PAL = {
  glass: '#10232b', streak: '#2c4a55', frame: '#1a1a1e', trimLight: '#bcd5c2', dark: '#1a1a1e', darkGrey: '#2e3036', midGrey: '#5a5e66',
  lightGrey: '#9ca1a8', chrome: '#d0d4d9', tire: '#1d1d20', tire2: '#26262a', steel: '#8c9096', hub: '#2e3036',
  head: '#fff3c4', amber: '#f2a43a', tail: '#e0261c', tailSmoke: '#5a1512', reverse: '#f4f4f4', plate: '#f2f2ea', caliper: '#d23a2a', white: '#eeeae0',
};

export interface CarLook { paint: string; head: string; tail: string; grille: string; wing: string | null; exhaust: string; rim: string }
export const STOCK_LOOK: CarLook = { paint: '#d23a2a', head: 'stock', tail: 'stock', grille: 'slats', wing: null, exhaust: 'x1', rim: 'steel' };

const L = 58, W = 28, ROOF = 21, BODY_DY = 1;
export const WHEEL_CENTRES = [12, 46];
export const WHEEL_R = 5.2, WHEEL_Y = 5.2;
export const CAR_L = L, CAR_W = W;
const yBot = 2;

export interface WheelVox { cx: number; side: 0 | 1; items: Vox[] }

export function buildCarVoxels(look: CarLook): { body: Vox[]; wheels: WheelVox[] } {
  const body: Vox[] = [];
  const put = (x: number, y: number, z: number, c: string | null, role: Role = 'trim', shade = 'mid') => body.push({ x, y: y + BODY_DY, z, c, role, s: 1, shade });
  const put2 = (x: number, y: number, z: number, c: string | null, role: Role = 'trim') => body.push({ x, y: y + 2 * BODY_DY, z, c, role, s: 0.5 });

  const lowerTop = (x: number) => { if (x <= 0) return 8; if (x === 1) return 9; if (x < 16) return 9 + Math.round((x - 2) / 14 * 2); if (x >= L - 1) return 10; return 11; };
  const gTop = (x: number) => {
    if (x < 16 || x > 56) return 0;
    if (x <= 25) return 11 + Math.max(1, Math.round((x - 16) / 9 * (ROOF - 11)));
    if (x <= 45) return ROOF;
    return ROOF - Math.round((x - 45) / 11 * (ROOF - 12));
  };
  const k3 = (x: number, y: number, z: number) => x + ',' + y + ',' + z;
  const shell = new Map<string, 'lower' | 'green'>();
  for (let x = 0; x < L; x++) {
    const t = lowerTop(x), bot = (x < 2 || x > L - 3) ? 3 : yBot;
    for (let y = bot; y < t; y++) for (let z = 0; z < W; z++) {
      if ((x === 0 || x === L - 1) && (z < 2 || z > W - 3)) continue;
      if ((x === 1 || x === L - 2) && (z < 1 || z > W - 2)) continue;
      if (y === t - 1 && (z === 0 || z === W - 1)) continue;
      let arch = false;
      for (const wc of WHEEL_CENTRES) { const dx = x + .5 - wc, dy = y + .5 - WHEEL_Y; if ((z < 6 || z > W - 7) && dx * dx + dy * dy < 6.5 * 6.5) arch = true; }
      if (!arch) shell.set(k3(x, y, z), 'lower');
    }
    const gt = gTop(x);
    for (let y = t; y < gt; y++) { const inset = y >= ROOF - 2 ? 3 : 2; for (let z = inset; z < W - inset; z++) shell.set(k3(x, y, z), 'green'); }
  }
  const has = (x: number, y: number, z: number) => shell.has(k3(x, y, z));
  for (const [key, part] of shell) {
    const [x, y, z] = key.split(',').map(Number);
    const exposed = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !has(x + a, y + b, z + c));
    if (!exposed) continue;
    const up = !has(x, y + 1, z), front = !has(x - 1, y, z);
    const side = !has(x, y, z + 1) || !has(x, y, z - 1);
    let role: Role = 'paint', shade = 'mid', c: string | null = null;
    if (part === 'green') {
      const gt = gTop(x), region = x <= 25 ? 'ws' : x <= 45 ? 'roof' : 'hatch';
      const edgeZ = z <= 3 || z >= W - 4;
      if (region === 'roof' && up) shade = 'light';
      else if (y === lowerTop(x) && (front || region !== 'ws')) { role = 'trim'; c = PAL.frame; }
      else if (side) {
        if (region === 'hatch' && x > 50) shade = 'mid';
        else if (region === 'ws' && (front || up)) shade = 'mid';
        else if (x === 35 || x === 36) { role = 'trim'; c = PAL.frame; }
        else if (up || y === gt - 1) shade = 'mid';
        else { role = 'glass'; c = ((x + y) % 10 < 2) ? PAL.streak : PAL.glass; }
      } else if (region === 'ws' || region === 'hatch') {
        if (edgeZ) { role = 'trim'; c = PAL.frame; } else { role = 'glass'; c = ((z + y) % 11) < 2 ? PAL.streak : PAL.glass; }
      }
    } else {
      if (up) shade = 'light'; else if (y <= 3) shade = 'dark';
      if (y === yBot && side) { role = 'trim'; c = PAL.trimLight; }
      if ((x === 0 || x === L - 1) && y <= 4) { role = 'trim'; c = PAL.darkGrey; }
    }
    if (role === 'paint' && side && part === 'lower' && (x === 24 || x === 37) && y > yBot && y < 11) { role = 'trim'; c = '#0d0d10'; }
    if (role === 'paint' && side && x === 34 && y === 9) { role = 'trim'; c = PAL.darkGrey; }
    put(x, y, z, c, role, shade);
  }
  for (const wc of WHEEL_CENTRES) for (let a = 0; a < 360; a += 4) {
    const x = Math.floor(wc + Math.cos(a * Math.PI / 180) * 6.4), y = Math.floor(WHEEL_Y + Math.sin(a * Math.PI / 180) * 6.4);
    if (y < yBot || y > lowerTop(x) - 2) continue;
    for (const z of [6, W - 7]) if (!has(x, y, z)) put(x, y, z, '#121214');
  }
  for (const z of [1, W - 2]) { put(17, 12, z, null, 'paint', 'mid'); put(17, 13, z, null, 'paint', 'light'); }
  put(-1, 7, 13, PAL.white); put(-1, 7, 14, PAL.white); put(-1, 6, 13, PAL.dark); put(-1, 6, 14, PAL.dark);
  for (let z = 11; z < 17; z++) { put(-1, 3, z, PAL.plate); put(L, 5, z, PAL.plate); put(L, 4, z, PAL.plate); }

  // ---- slot: headlights ----
  for (const [z0, z1] of [[2, 9], [W - 9, W - 2]]) {
    const outer = z0 < 10 ? z0 : z1 - 1;
    if (look.head === 'stock') for (let z = z0; z < z1; z++) for (let y = 5; y < 8; y++) put(-1, y, z, z === outer ? PAL.amber : PAL.head, 'light');
    if (look.head === 'slim') { for (let z = z0 - 1; z < z1 + 1; z++) put(-1, 7, z, PAL.head, 'light'); for (let z = z0; z < z1; z++) for (let y = 5; y < 7; y++) put(-1, y, z, PAL.darkGrey); }
    if (look.head === 'round') { const zc = (z0 + z1) / 2; for (let z = z0; z < z1; z++) for (let y = 4; y < 9; y++) { const d = Math.hypot(z + .5 - zc, y + .5 - 6.5); if (d < 2.6) put(-1, y, z, d < 1.4 ? PAL.head : PAL.chrome, d < 1.4 ? 'light' : 'trim'); } }
    if (look.head === 'proj2x') {
      for (let z = z0 * 2; z < z1 * 2; z++) for (let y = 10; y < 16; y++) put2(-2, y, z, PAL.darkGrey);
      for (const zc of [z0 * 2 + 3.5, z0 * 2 + 9.5]) for (let z = Math.floor(zc - 3); z < zc + 3; z++) for (let y = 10; y < 16; y++) { const d = Math.hypot(z + .5 - zc, y + .5 - 12.5); if (d < 2.6) put2(-3, y, z, d < 1.6 ? PAL.head : PAL.chrome, d < 1.6 ? 'light' : 'trim'); }
      for (let z = z0 * 2; z < z1 * 2; z++) put2(-3, 16, z, PAL.head, 'light');
    }
  }
  // ---- slot: taillights ----
  for (const [z0, z1] of [[1, 8], [W - 8, W - 1]]) {
    if (look.tail === 'stock') for (let z = z0; z < z1; z++) for (let y = 6; y < 9; y++) put(L, y, z, (y === 6 && (z === z0 + 3 || z === z1 - 4)) ? PAL.reverse : PAL.tail, 'light');
    if (look.tail === 'smoked') for (let z = z0; z < z1; z++) for (let y = 6; y < 9; y++) put(L, y, z, PAL.tailSmoke, 'light');
    if (look.tail === 'round') for (const zc of [z0 + 2, z0 + 5.5]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = 5; y < 10; y++) { const d = Math.hypot(z + .5 - zc, y + .5 - 7.5); if (d < 1.9) put(L, y, z, d < 1.0 ? '#ff6a5a' : PAL.tail, 'light'); }
    if (look.tail === 'bar') for (let z = z0; z < z1; z++) for (let y = 6; y < 8; y++) put(L, y, z, PAL.tail, 'light');
  }
  if (look.tail === 'bar') for (let z = 1; z < W - 1; z++) put(L, 8, z, PAL.tail, 'light');
  // ---- slot: grille ----
  for (let z = 10; z < W - 10; z++) for (let y = 4; y < 8; y++) {
    if ((z === 13 || z === 14) && y >= 6) continue;
    let c = PAL.dark;
    if (look.grille === 'slats') c = y % 2 === 0 ? PAL.midGrey : PAL.dark;
    if (look.grille === 'mesh') c = (y + z) % 2 ? PAL.midGrey : PAL.dark;
    if (look.grille === 'open') c = (y >= 5 && y <= 6) ? (z % 2 ? PAL.chrome : PAL.lightGrey) : PAL.dark;
    put(-1, y, z, c);
  }
  for (let z = 6; z < W - 6; z++) put(-1, 2, z, look.grille === 'open' ? PAL.lightGrey : PAL.dark);
  // ---- slot: wing ----
  const tz = 12;
  if (look.wing === 'roof') { for (let x = 44; x <= 48; x++) for (let z = 3; z < W - 3; z++) put(x, ROOF, z, null, 'paint', 'light'); for (let z = 3; z < W - 3; z++) { put(49, ROOF, z, PAL.dark); put(49, ROOF - 1, z, PAL.dark); } }
  if (look.wing === 'ducktail') for (let z = 2; z < W - 2; z++) { put(L - 1, 11, z, null, 'paint', 'light'); put(L, 11, z, null, 'paint', 'light'); put(L, 12, z, null, 'paint', 'light'); }
  if (look.wing === 'gt1x') {
    for (const zp of [6, W - 7]) for (let y = tz; y < tz + 4; y++) put(L - 3, y, zp, PAL.dark);
    for (let x = L - 5; x <= L; x++) for (let z = 1; z < W - 1; z++) put(x, tz + 4, z, PAL.dark);
    for (const ze of [0, W - 1]) for (let x = L - 5; x <= L; x++) for (let y = tz + 3; y <= tz + 5; y++) put(x, y, ze, PAL.dark);
  }
  if (look.wing === 'gt2x') {
    const X0 = (L - 6) * 2, Y0 = (tz + 4) * 2, prof = [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1];
    for (let i = 0; i < prof.length; i++) for (let t = 0; t < prof[i]; t++) for (let z = 1; z < W * 2 - 1; z++) put2(X0 + i, Y0 + t + (i >= 9 ? 1 : 0), z, '#202024');
    for (const ze of [0, W * 2 - 1]) for (let i = 0; i < prof.length; i++) for (let y = Y0 - 1; y <= Y0 + 3 + (i >= 9 ? 1 : 0); y++) if (!(i < 2 && y > Y0 + 2)) put2(X0 + i, y, ze, '#2a2a30');
    for (const zp of [12, W * 2 - 13]) for (let w = 0; w < 2; w++) for (let y = tz * 2; y < Y0; y++) put2(X0 + 6, y, zp + w, '#2a2a2e');
  }
  // ---- slot: exhaust ----
  if (look.exhaust === 'x1') for (const z of [W - 7, W - 6]) { put(L, 3, z, PAL.chrome); put(L + 1, 3, z, PAL.midGrey); }
  if (look.exhaust === 'x2') { const zc = (W - 6) * 2; for (let z = zc - 3; z < zc + 3; z++) for (let y = 4; y < 9; y++) { const d = Math.hypot((z + .5 - zc) / 1.3, y + .5 - 6.5); if (d < 2.3) put2(L * 2 + 1, y, z, d < 1.3 ? '#0d0d10' : PAL.chrome); } }

  return { body, wheels: buildWheels(look.rim) };
}

// ---- slot: wheels (2×), each wheel built around its own centre so it can spin ----
const spoke = (t: number, n: number, w: number) => { const s = 2 * Math.PI / n; const a = ((t % s) + s) % s; return Math.min(a, s - a) < w; };
const RIMS: Record<string, { tireT: number; lip: string | null; face: (dx: number, dy: number, r: number) => string | null; recess: number; caliper: boolean }> = {
  steel: { tireT: 2.6, lip: null, face: (dx, dy, r) => r < 2.2 ? PAL.hub : (r > 4 && r < 5.2 && spoke(Math.atan2(dy, dx), 6, 0.16)) ? PAL.midGrey : PAL.steel, recess: 0, caliper: false },
  gold5: { tireT: 1.8, lip: '#b8901c', face: (dx, dy, r) => r < 1.8 ? '#8a6c1c' : spoke(Math.atan2(dy, dx), 5, 0.27) ? '#d4a62a' : null, recess: 1, caliper: true },   // rally-style gold five-spoke
  fivespoke: { tireT: 1.8, lip: PAL.chrome, face: (dx, dy, r) => r < 1.8 ? '#9ca1a8' : spoke(Math.atan2(dy, dx), 5, 0.27) ? PAL.chrome : null, recess: 1, caliper: true },
  sixblack: { tireT: 1.7, lip: '#3d4046', face: (dx, dy, r) => r < 1.8 ? PAL.caliper : spoke(Math.atan2(dy, dx), 6, 0.2) ? '#1a1a1e' : null, recess: 1, caliper: true },
  turbofan: { tireT: 2.0, lip: null, face: (dx, dy, r) => r < 2.0 ? PAL.hub : (r > 4.2 && spoke(Math.atan2(dy, dx), 12, 0.13)) ? PAL.hub : PAL.white, recess: 0, caliper: false },
};
/** Wheels for a body: rim style, wheel centres (x, body blocks), wheel radius (body blocks), body width. */
export function buildWheels(kind: string, centres: number[] = WHEEL_CENTRES, radius = WHEEL_R, W = CAR_W): WheelVox[] {
  const d = RIMS[kind] || RIMS.steel, R = radius * 2, TW = 8, out: WheelVox[] = [];
  for (const wc of centres) for (const side of [0, 1] as const) {
    const items: Vox[] = [];
    for (let i = 0; i < TW; i++) {
      const z = side === 1 ? (W * 2 - 1) - i + 1 : i - 1;
      for (let x = -Math.ceil(R); x <= Math.ceil(R); x++) for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) {
        const dx = x + .5, dy = y + .5, r = Math.hypot(dx, dy); if (r >= R) continue;
        const inner = R - d.tireT * 2;
        if (r >= inner) { items.push({ x, y, z, c: i === 0 || i === TW - 1 ? PAL.tire2 : PAL.tire, role: 'tire', s: 0.5 }); continue; }
        if (i > 4) continue;
        if (d.lip && r >= inner - 1.2) { if (i <= 1) items.push({ x, y, z, c: d.lip, role: 'rim', s: 0.5 }); continue; }
        const fz = d.recess * 2;
        if (i < fz) continue;
        if (i < fz + 2) { const c = d.face(dx, dy, r); if (c) { items.push({ x, y, z, c, role: 'rim', s: 0.5 }); continue; } }
        if (i === fz + 2) { const t = Math.atan2(dy, dx); items.push({ x, y, z, c: d.caliper && t > 1.75 && t < 2.8 && r > inner - 4 ? PAL.caliper : '#4a4d53', role: 'rim', s: 0.5 }); }
      }
    }
    out.push({ cx: wc, side, items });
  }
  return out;
}

export const SHADE: Record<string, number> = { light: 1.12, mid: 0.92, dark: 0.68 };

/** Whole car as one static voxel list (wheels folded in at their centres) — used for parked/background cars. */
export function carVoxelsStatic(look: CarLook): Vox[] {
  const { body, wheels } = buildCarVoxels(look);
  const paint = new THREE.Color(look.paint);
  const out: Vox[] = body.map(v => v.role === 'paint' ? { ...v, c: '#' + paint.clone().multiplyScalar(SHADE[v.shade || 'mid'] || 1).getHexString() } : v);
  for (const w of wheels) for (const v of w.items) out.push({ ...v, x: v.x + 2 * w.cx, y: v.y + 2 * WHEEL_Y });
  return out;
}

/** VOX OIL company livery: black body, yellow belt line, "VOX" on the camera-facing door, amber roof bar. */
export function applyVoxLivery(vox: Vox[]): Vox[] {
  const cells = new Set<string>();
  const letters: Record<string, string[]> = { V: ['101', '101', '101', '101', '010'], O: ['010', '101', '101', '101', '010'], X: ['101', '101', '010', '101', '101'] };
  // reads correctly from the camera side (z = 0), where screen-right is world −x
  'VOX'.split('').forEach((ch, i) => letters[ch].forEach((row, r) => [...row].forEach((b, c) => { if (b === '1') cells.add(`${35 - (i * 4 + c)},${4 + (4 - r) + BODY_DY}`); })));
  const out = vox.map(v => {
    if (v.s !== 1 || v.role !== 'paint') return v;
    if (v.z === 0 && cells.has(`${v.x},${v.y}`)) return { ...v, c: '#f2c230' };
    if ((v.z === 0 || v.z === W - 1) && v.y === 10 + BODY_DY) return { ...v, c: '#f2c230' };
    return { ...v, c: v.shade === 'light' ? '#2a2a30' : '#1a1a1e' };
  });
  for (let x = 30; x < 34; x++) for (let z = 8; z < W - 8; z++) out.push({ x, y: ROOF + BODY_DY, z, c: (z & 1) ? '#f2a43a' : '#2e3036', role: 'light', s: 1 });
  return out;
}

/** A ready-to-place car: `group` in car-local units (1 = one voxel block).
 *  Body and wheels are face-culled merged meshes (~5× fewer triangles than one box per voxel).
 *  Wheels spin via `setWheels`; above strobe speed the spin is capped and a voxel "motion disc"
 *  (each ring = the average colour of that ring of the rim) fades in, so wheels never appear to roll backwards. */
export class CarModel {
  group = new THREE.Group();
  private wheelGroups: THREE.Group[] = [];
  private discs: THREE.Group[] = [];
  private discMat: THREE.MeshStandardMaterial;
  private spin = 0;
  constructor(look: CarLook, mats: Materials) {
    const { body, wheels } = buildCarVoxels(look);
    const paint = new THREE.Color(look.paint);
    this.group.add(mergedVoxMeshes(body, mats, v => paint.clone().multiplyScalar(SHADE[v.shade || 'mid'] || 1)));
    this.discMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, flatShading: true, roughness: 0.6, transparent: true, opacity: 0, depthWrite: false, envMapIntensity: 0.25 });
    for (const w of wheels) {
      const pivot = new THREE.Group();
      pivot.position.set(w.cx, WHEEL_Y, 0);
      pivot.add(mergedVoxMeshes(w.items, mats, () => paint));
      this.group.add(pivot);
      this.wheelGroups.push(pivot);
      const disc = motionDisc(w.items, w.side, this.discMat);
      disc.position.copy(pivot.position); disc.visible = false;
      this.group.add(disc); this.discs.push(disc);
    }
  }
  /** a = rolled angle (rad, from distance); w = wheel angular speed (rad/s); dt = frame time. */
  setWheels(a: number, w: number, dt: number) {
    // Above ~3 rev/s the 5–12-fold rims alias at 60 fps. Cap the visible spin rate and blend in the motion disc.
    const CAP = 16;                                  // rad/s shown at most
    const k = Math.max(0, Math.min(1, (w - 12) / 22));
    if (w <= 12) this.spin = a; else this.spin += Math.min(w, CAP) * dt;
    for (const g of this.wheelGroups) g.rotation.z = this.spin;
    this.discMat.opacity = k * 0.92;
    for (const d of this.discs) d.visible = k > 0.01;
  }
  /** Back-compat: angle only (garage/static). */
  setWheelAngle(a: number) { this.setWheels(a, 0, 0); }
}

/** Voxel motion disc for one wheel: covers the rim face with ring-averaged colours, just outside the outer face. */
function motionDisc(items: Vox[], side: 0 | 1, mat: THREE.Material): THREE.Group {
  const first = new Map<string, Vox>();
  for (const v of [...items].sort((a, b) => side === 0 ? a.z - b.z : b.z - a.z)) { const k = `${v.x},${v.y}`; if (!first.has(k)) first.set(k, v); }
  const rings = new Map<number, { r: number; g: number; b: number; n: number }>();
  const tmp = new THREE.Color();
  for (const v of first.values()) {
    const r = Math.round(Math.hypot(v.x + 0.5, v.y + 0.5));
    tmp.set(v.c || '#4a4d53');
    const a = rings.get(r) || { r: 0, g: 0, b: 0, n: 0 }; a.r += tmp.r; a.g += tmp.g; a.b += tmp.b; a.n++; rings.set(r, a);
  }
  const R = WHEEL_R * 2, outer = side === 0 ? Math.min(...items.map(v => v.z)) - 1 : Math.max(...items.map(v => v.z)) + 1;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let x = -Math.ceil(R); x <= Math.ceil(R); x++) for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) {
    const rr = Math.hypot(x + 0.5, y + 0.5); if (rr >= R - 0.2) continue;
    const a = rings.get(Math.round(rr)); if (!a) continue;
    const base = pos.length / 3, s = 0.5, z = (outer + (side === 0 ? 0.6 : 0.4)) * s;
    for (const [cx, cy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pos.push((x + cx) * s, (y + cy) * s, z); col.push(a.r / a.n, a.g / a.n, a.b / a.n); }
    if (side === 0) idx.push(base, base + 2, base + 1, base, base + 3, base + 2); else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat));
  return g;
}

// ---- static (non-animated) car templates, cached per look: parked cars and company cars ----
const STATIC_CACHE = new Map<string, THREE.Group>();
export function staticCar(look: CarLook, mats: Materials, voxLivery = false): THREE.Group {
  const key = JSON.stringify(look) + (voxLivery ? '|vox' : '');
  let t = STATIC_CACHE.get(key);
  if (!t) {
    let v = carVoxelsStatic(look);
    if (voxLivery) v = applyVoxLivery(v);
    t = mergedVoxMeshes(v.map(p => p.role === 'light' ? { ...p, role: 'trim' as Role } : p), mats, p => new THREE.Color(p.c || '#ff00ff'));
    STATIC_CACHE.set(key, t);
  }
  return t.clone();
}
