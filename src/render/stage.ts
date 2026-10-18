// Downtown Grid — a lived-in voxel street seen from the side (CSR-style race camera).
// World units = voxel blocks, the same resolution as the cars. Cars drive toward −x (left → right on screen).
// REAL SCALE (owner decision S17): the car is real-car size (1 block ≈ 6.9 cm) and so is the city around it.
// Layout (z, real blocks): near side (camera) < −16 | road −14…92 (player lane 0–28, rival lane 52–80, 3.6 m lanes) |
// parking lane 92–127 | far curb 127 → sidewalk → building line ≈ 184 → back.
// The two sides of the street are written in a compact DESIGN space (the original street plan) and mapped to real
// scale by ×ARCH_K: big things (buildings, lamps, trees, signs) grow, but thin details (window frames, railings,
// mullions, brick lines) stay one block thin, and human-sized props (benches, hydrants, bollards, barriers) use their
// own real-world size. So everything stays at the cars' block resolution.
// The far side is assembled from varied SEGMENTS (shops, brick walk-ups, glass offices, warehouses, diners,
// side streets, parks, a VOX OIL station, parking lots, construction, alleys) chosen per chunk by a seeded RNG.
import * as THREE from 'three';
import { StageDef } from '../data/stages';
import { makeRng } from '../game/ai';
import { textCells } from './blockFont';
import { blockify } from './blockShade';
import { Materials, mergedVoxMeshes } from './voxel';
import { STOCK_LOOK, CAR_L, CAR_W, CarLook, staticCar } from './carBuilder';
import { tankerVoxels } from './vehicles';
import { treeMesh, treeGeometry, TREE_VARIANTS, STREET_TREES, PARK_TREES, SAPLINGS } from './trees';

export const METERS_PER_BLOCK = 4.0 / 58;
export const LANE_Z = [0, 52];
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type NearStyle = 'curb' | 'barrier' | 'mixed';
export const ARCH_K = 2.2;                        // design → real scale for the street's buildings and furniture
const CHUNK = 660, VIEW_BEHIND = 2, VIEW_AHEAD = 3;   // real blocks per chunk (= 300 design); chunks kept visible
const BOX = new THREE.BoxGeometry(1, 1, 1);
/** Back of the widened near pavement, where the low wall stands (design units, near side). */
const WALL_Z = 44;
export const ROAD_EDGE = 90, PARK_Z = 92, CURB_Z = 127, WALK_Z = CURB_Z + 2, FACADE_Z = CURB_Z + 28, NEAR_Z = -16;
const Ymap = (h: number) => h <= 1.5 ? h : 1.5 + (h - 1.5) * ARCH_K;   // ground stays put; height above the kerb scales

interface Block { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: string; it?: [number, number, number, number] }  // it = human-sized prop: [anchor x, y, z, own scale]
type R = () => number;
interface Placement { kind: 'car' | 'vox' | 'tanker' | 'tree'; look?: CarLook; name?: string; x: number; y: number; z: number; rotY: number }
interface Ctx { B: Block[]; GL: Block[]; LIT: Block[]; pools: { x: number; z: number; r: number; c: string }[]; vehicles: Placement[]; rng: R; night: boolean; reserved: [number, number][]; usedNames: Set<string>; walkGaps: [number, number][] }
const pick = <T,>(rng: R, a: T[]) => a[Math.floor(rng() * a.length)];
/** Mark the last n blocks as one human-sized prop that scales by its own factor around an anchor (design coords). */
const prop = (arr: Block[], n: number, ax: number, ay: number, az: number, k: number) => { for (let i = arr.length - n; i < arr.length; i++) arr[i].it = [ax, ay, az, k]; };
/** Contact shadow (breakdown: "make props feel grounded"): a thin darker slab on the pavement just around a footprint.
 *  Push it BEFORE a prop's blocks and count it in that prop's n, so it scales with the prop. Returns 1 (blocks added). */
const SHADOW = '#8a877f';
const contact = (arr: Block[], x: number, z: number, sx: number, sz: number, y = 1, pad = 0.6) => { arr.push({ x: x - pad, y, z: z - pad, sx: sx + 2 * pad, sy: 0.06, sz: sz + 2 * pad, c: SHADOW }); return 1; };

/** Map a design-space block to real scale. side: 'far' pivots on the far kerb, 'near' on the near kerb. */
function toReal(b: Block, side: 'far' | 'near'): Block {
  const K = ARCH_K, pz = side === 'far' ? CURB_Z : NEAR_Z, Z = (z: number) => pz + (z - pz) * K;
  if (b.it) {                                   // prop: anchor maps like the street, the prop itself scales by its own k
    const [ax, ay, az, k] = b.it;
    return { x: ax * K + (b.x - ax) * k, y: Ymap(ay) + (b.y - ay) * k, z: Z(az) + (b.z - az) * k, sx: b.sx * k, sy: b.sy * k, sz: b.sz * k, c: b.c };
  }
  let x = b.x * K, sx = b.sx * K;
  if (b.sx <= 1.2) { x = (b.x + b.sx / 2) * K - b.sx / 2; sx = b.sx; }                // thin detail keeps 1-block width
  let y = Ymap(b.y), sy = Ymap(b.y + b.sy) - y;
  if (b.sy <= 1.2 && b.y > 1.5) { y = Ymap(b.y + b.sy / 2) - b.sy / 2; sy = b.sy; }
  let z = b.z, sz = b.sz;
  const flatOnRoad = side === 'far' ? (b.z < CURB_Z && b.y < 1.5) : (b.z >= NEAR_Z && b.y < 1.5);
  if (!flatOnRoad) { z = Z(b.z); sz = b.sz * K; }
  return { x, y, z, sx, sy, sz, c: b.c };
}
const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

const SHOP_NAMES = ['DINER', 'TYRES', 'PARTS', 'GARAGE', 'CAFE', 'ARCADE', 'PIZZA', 'RECORDS', 'GYM', 'DONUTS', 'MOTEL', 'BODY SHOP', 'NOODLES', 'LAUNDRY', 'BAKERY', 'TACOS', 'BARBER', 'HARDWARE', 'VINYL', 'BURGERS'];
const AWNINGS = [['#d23a2a', '#eeeae0'], ['#2f6fd6', '#eeeae0'], ['#2f9a5a', '#eeeae0'], ['#f2a43a', '#5a3a1a'], ['#6a3ad2', '#eeeae0'], ['#1a1a1e', '#f2c230'], ['#d0567a', '#f4e6ea'], ['#1f8a8a', '#eeeae0']];
const FACADES = ['#c7c0b2', '#b8b2a6', '#d6cdb8', '#a7a39a', '#c9b79a', '#9fb0b8', '#d8c7a8', '#b9a48c', '#c4ccd2'];
const BRICKS = ['#9a4a3a', '#8a3e30', '#a85a42', '#7e4636', '#b06a4c'];
const CAR_PAINTS = ['#d23a2a', '#2f6fd6', '#eeeae0', '#1a1a1e', '#2f9a5a', '#f2c230', '#8e9bb3', '#6a3ad2', '#f2a43a', '#5a5e66', '#1f8a8a', '#b83a7a'];

// A fixed pool of parked-car looks: every parked car reuses one of these cached, face-culled templates.
const PARKED_LOOKS: CarLook[] = (() => {
  const rng = makeRng(4242), out: CarLook[] = [];
  for (let i = 0; i < 12; i++) out.push({ ...STOCK_LOOK, paint: CAR_PAINTS[i % CAR_PAINTS.length], rim: pick(rng, ['steel', 'steel', 'fivespoke', 'sixblack', 'turbofan']), wing: rng() < 0.2 ? 'gt1x' : null, head: pick(rng, ['stock', 'stock', 'slim', 'round']), tail: pick(rng, ['stock', 'stock', 'bar', 'round']) });
  return out;
})();
const VOX_LOOKS: CarLook[] = [{ ...STOCK_LOOK, paint: '#1a1a1e' }, { ...STOCK_LOOK, paint: '#1a1a1e', rim: 'sixblack' }];
let TANKER: THREE.Group | null = null;

/** Build the parked-car / tanker templates a little at a time while the player is in the garage,
 *  so the first race starts instantly. Safe to call more than once. */
export function prewarmVehicles(mats: Materials) {
  const jobs: (() => void)[] = [
    ...PARKED_LOOKS.map(l => () => staticCar(l, mats)),
    ...VOX_LOOKS.map(l => () => staticCar(l, mats, true)),
    ...Object.keys(TREE_VARIANTS).map(n => () => { treeGeometry(n); }),
    () => { if (!TANKER) TANKER = mergedVoxMeshes(tankerVoxels().map(v => v.role === 'light' ? { ...v, role: 'trim' as const } : v), mats, v => new THREE.Color(v.c || '#ff00ff')); },
  ];
  const idle: (cb: () => void) => void = (window as any).requestIdleCallback ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 500 }) : (cb) => setTimeout(cb, 30);
  const next = () => { const j = jobs.shift(); if (!j) return; j(); idle(next); };
  idle(next);
}

// ---- light pools (voxel-stepped radial gradient, additive) under lamps and signs at dusk/night ----
let POOL_TEX: THREE.CanvasTexture | null = null;
export function poolTexture() {
  if (POOL_TEX) return POOL_TEX;
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const g = cv.getContext('2d')!;
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
    const d = Math.hypot(i - 11.5, j - 11.5) / 12; const a = Math.max(0, 1 - d) ** 1.6;
    g.fillStyle = `rgba(255,255,255,${(Math.round(a * 6) / 6).toFixed(3)})`; g.fillRect(i, j, 1, 1);
  }
  POOL_TEX = new THREE.CanvasTexture(cv); POOL_TEX.magFilter = POOL_TEX.minFilter = THREE.NearestFilter;
  return POOL_TEX;
}

function instanced(blocks: Block[], mat: THREE.Material, shadows = true) {
  const im = new THREE.InstancedMesh(BOX, mat, Math.max(1, blocks.length));
  const o = new THREE.Object3D();
  blocks.forEach((b, i) => { o.position.set(b.x + b.sx / 2, b.y + b.sy / 2, b.z + b.sz / 2); o.scale.set(b.sx, b.sy, b.sz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color(b.c)); });
  im.count = blocks.length; im.castShadow = shadows; im.receiveShadow = true;
  return im;
}

export class Stage {
  group = new THREE.Group();
  private mat = blockify(new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.92, envMapIntensity: 0.2 }));
  private matGlass = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.25, metalness: 0.1, envMapIntensity: 0.9 });
  private matLit = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  private matPool = new THREE.MeshBasicMaterial({ map: poolTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  private tree = new THREE.Group();
  private treeLamps!: THREE.InstancedMesh;
  private night: boolean;
  private built = new Map<number, THREE.Group>();
  /** Real x of notable places (preview hook). */
  landmarks: { kind: string; x: number }[] = [];
  constructor(private def: StageDef, public finishBlocks: number, private mats: Materials, private time: TimeOfDay = 'day', private near: NearStyle = 'mixed') {
    this.night = time !== 'day';
    // Build the whole strip up front (start runway → finish → run-off) so nothing is generated mid-race.
    const last = Math.ceil((finishBlocks + 3600) / CHUNK);
    for (let i = -VIEW_BEHIND - 1; i <= last; i++) this.chunkAt(i).visible = false;
    this.buildTree();
    this.group.add(this.tree);
    this.update(0);
  }
  private chunkAt(i: number) {
    let g = this.built.get(i);
    if (!g) { g = this.buildChunk(i); this.built.set(i, g); this.group.add(g); }
    return g;
  }
  /** Show only the chunks around the camera (cheap visibility toggle — no rebuilding while racing). */
  private shown = new Set<number>();
  update(cameraX: number) {
    const centre = Math.floor(-cameraX / CHUNK);
    const want = new Set<number>();
    for (let i = centre - VIEW_BEHIND; i <= centre + VIEW_AHEAD; i++) want.add(i);
    for (const i of this.shown) if (!want.has(i)) { this.built.get(i)!.visible = false; this.shown.delete(i); }
    for (const i of want) if (!this.shown.has(i)) { this.chunkAt(i).visible = true; this.shown.add(i); }
  }
  get chunks() { return [...this.built.entries()].map(([idx, g]) => ({ idx, g })); }

  /** Drag-strip light tree between the lanes at the start line (faces the camera). */
  setTree(lit: number, green: boolean) {
    const off = new THREE.Color('#2b2e38'), amber = new THREE.Color('#f2a43a').multiplyScalar(1.6), grn = new THREE.Color('#4ade80').multiplyScalar(1.6);
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 2);
      this.treeLamps.setColorAt(i, row < 3 ? (!green && lit > row ? amber : off) : (green ? grn : off));
    }
    this.treeLamps.instanceColor!.needsUpdate = true;
  }
  private buildTree() {
    const x = -6, z = 38;
    this.tree.add(instanced([{ x, y: 0, z, sx: 3, sy: 34, sz: 3, c: '#3d4046' }, { x: x - 2, y: 30, z: z - 3, sx: 7, sy: 22, sz: 9, c: '#1d1f24' }], this.mat));
    const L: Block[] = [];
    for (let row = 0; row < 4; row++) for (const dx of [-1.5, 2.5]) L.push({ x: x + dx - 1, y: 47 - row * 5, z: z - 3.6, sx: 3, sy: 4, sz: 0.8, c: '#2b2e38' });
    this.treeLamps = instanced(L, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), false);
    this.tree.add(this.treeLamps);
  }

  // ===================================================================================
  private buildChunk(idx: number): THREE.Group {
    const g = new THREE.Group();
    const rng = makeRng(1000 + idx * 7919);
    const x0 = -(idx + 1) * CHUNK, x1 = -idx * CHUNK;          // real
    const d0 = x0 / ARCH_K, d1 = x1 / ARCH_K;                  // design (300 wide)
    const mk = (): Ctx => ({ B: [], GL: [], LIT: [], pools: [], vehicles: [], rng, night: this.night, reserved: [], usedNames: new Set(), walkGaps: [] });
    const c = mk(), far = mk(), near = mk();
    far.usedNames = c.usedNames;

    // real-scale pieces: the road itself, start/finish, distance boards
    this.road(c, x0, x1);
    this.startFinish(c, x0, x1);
    // design-space far side: kerb, sidewalk, frontage segments, street furniture, skyline
    const types: [string, number][] = [['shops', 5], ['brick', 3], ['glass', 2], ['warehouse', 1.2], ['diner', 1], ['side', 1.4], ['park', 1.3], ['gas', 0.6], ['lot', 1], ['build', 0.6], ['alley', 1.2]];
    const total = types.reduce((a, t) => a + t[1], 0);
    let x = d0, lastType = '';
    while (x < d1 - 20) {
      let roll = rng() * total, type = 'shops';
      for (const [t, w] of types) { if ((roll -= w) <= 0) { type = t; break; } }
      if (type === lastType && type !== 'shops') type = 'shops';
      const widths: Record<string, number> = { shops: 70 + rng() * 60, brick: 70 + rng() * 40, glass: 90 + rng() * 40, warehouse: 110 + rng() * 40, diner: 60, side: 70, park: 150 + rng() * 60, gas: 150, lot: 110 + rng() * 30, build: 110 + rng() * 30, alley: 16 };
      let w = Math.floor(Math.min(d1 - x, widths[type]));
      if (w < widths[type] * 0.7 && type !== 'shops') { type = 'shops'; }
      if (d1 - x < 30) { this.seg_alley(far, Math.floor(x), Math.floor(d1 - x)); break; }   // leftover sliver → alley
      (this as any)['seg_' + type](far, Math.floor(x), w);
      lastType = type;
      x += w + (type === 'alley' || type === 'side' ? 0 : 2);
    }
    // far kerb + pavement, cut open where a side street meets the main road (owner Q67: no pavement across the side road)
    const inGap = (a: number, b: number) => far.walkGaps.some(([g0, g1]) => b > g0 && a < g1);
    const spans: [number, number][] = []; let s0 = d0;
    for (const [g0, g1] of [...far.walkGaps].sort((p, q) => p[0] - q[0])) { if (g0 > s0) spans.push([s0, Math.min(g0, d1)]); s0 = Math.max(s0, g1); }
    if (s0 < d1) spans.push([s0, d1]);
    for (const [a, b] of spans) far.B.push({ x: a, y: -1, z: CURB_Z, sx: b - a, sy: 2.2, sz: 2, c: '#b9b19a' });
    for (let x = Math.floor(d0 / 10) * 10; x < d1; x += 10) {
      for (const [a, b] of spans) { const xa = Math.max(x, a), xb = Math.min(x + 10, b); if (xb - xa > 0.01) far.B.push({ x: xa, y: -1, z: WALK_Z, sx: xb - xa, sy: 2, sz: FACADE_Z - WALK_Z, c: ((x / 10) & 1) ? '#b7b4ab' : '#aaa79e' }); }
    }
    void inGap;
    this.streetFurniture(far, d0, d1);
    this.skyline(far, d0, d1);
    // design-space near side
    this.nearSide(near, d0, d1);

    // map both sides to real scale
    for (const [side, src] of [['far', far], ['near', near]] as ['far' | 'near', Ctx][]) {
      const pz = side === 'far' ? CURB_Z : NEAR_Z;
      c.B.push(...src.B.map(b => toReal(b, side))); c.GL.push(...src.GL.map(b => toReal(b, side))); c.LIT.push(...src.LIT.map(b => toReal(b, side)));
      for (const p of src.pools) c.pools.push({ ...p, x: p.x * ARCH_K, z: pz + (p.z - pz) * ARCH_K, r: p.r * ARCH_K });
      for (const v of src.vehicles) c.vehicles.push({ ...v, x: v.x * ARCH_K, y: Ymap(v.y), z: v.z >= CURB_Z ? pz + (v.z - pz) * ARCH_K : v.z });
      for (const [a, b] of src.reserved) c.reserved.push([a * ARCH_K, b * ARCH_K]);
    }
    for (let m = 100; m < 1000; m += 100) { const bx = -m / METERS_PER_BLOCK; if (bx >= x0 - 80 && bx < x1 + 80) c.reserved.push([bx - 40, bx + 40]); }
    this.parkedCars(c, x0, x1);

    // flat ground pieces (road, sidewalks, markings, lawns) receive shadows but don't cast — halves the shadow pass
    const flat = (b: Block) => (b.y <= 0.6 && b.y + b.sy <= 1.6) || (b.sy <= 0.2 && b.y <= 1.3);   // incl. contact shadows
    const cast = c.B.filter(b => !flat(b)), still = c.B.filter(flat);
    g.add(instanced(cast, this.mat));
    const ground = instanced(still, this.mat, false); g.add(ground);
    if (c.GL.length) g.add(instanced(c.GL, this.matGlass));
    if (c.LIT.length) g.add(instanced(c.LIT, this.matLit, false));
    for (const p of c.vehicles) {
      let m: THREE.Object3D;
      if (p.kind === 'tree') { m = treeMesh(p.name!, this.mats); m.position.set(p.x, p.y, p.z); m.rotation.y = p.rotY; g.add(m); continue; }
      if (p.kind === 'tanker') this.landmarks.push({ kind: 'tanker', x: p.x });
      if (p.kind === 'tanker') { if (!TANKER) TANKER = mergedVoxMeshes(tankerVoxels().map(v => v.role === 'light' ? { ...v, role: 'trim' as const } : v), this.mats, v => new THREE.Color(v.c || '#ff00ff')); m = TANKER.clone(); }
      else m = staticCar(p.look!, this.mats, p.kind === 'vox');
      m.position.set(p.x, p.y, p.z); m.rotation.y = p.rotY; g.add(m);
    }
    if (this.night && c.pools.length) g.add(this.poolMesh(c.pools));
    return g;
  }

  /** All of a chunk's light pools in one additive mesh (one draw call). */
  private poolMesh(pools: Ctx['pools']) {
    const k = this.time === 'night' ? 0.55 : 0.3, pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    const cc = new THREE.Color();
    for (const p of pools) {
      const b = pos.length / 3; cc.set(p.c).multiplyScalar(k);
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pos.push(p.x + (u - 0.5) * 2 * p.r, 1.2, p.z + (v - 0.5) * 2 * p.r); uv.push(u, v); col.push(cc.r, cc.g, cc.b); }
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, this.matPool); m.renderOrder = 2;
    return m;
  }

  // ---------------- road: lanes, parking lane, wear ----------------
  private road(c: Ctx, x0: number, x1: number) {
    const { B, rng } = c;
    for (let x = x0; x < x1; x += 20) B.push({ x, y: -1, z: -14, sx: 20, sy: 1, sz: CURB_Z + 14, c: ((x / 20) & 1) ? '#45484e' : '#42454b' });
    for (let x = x0; x < x1; x += 30) B.push({ x, y: 0, z: 39, sx: 14, sy: 0.15, sz: 2, c: '#f2c230' });
    B.push({ x: x0, y: 0, z: -10, sx: CHUNK, sy: 0.15, sz: 1.5, c: '#e8e8e2' });
    B.push({ x: x0, y: 0, z: ROAD_EDGE, sx: CHUNK, sy: 0.15, sz: 1.5, c: '#e8e8e2' });
    for (let x = Math.ceil(x0 / 76) * 76; x < x1; x += 76) B.push({ x, y: 0, z: PARK_Z + 6, sx: 1.5, sy: 0.15, sz: 14, c: '#e8e8e2' });   // parking bay ticks
    for (let k = 0; k < 15; k++) { const px = x0 + rng() * (CHUNK - 30); B.push({ x: px, y: -0.95, z: -12 + rng() * 98, sx: 8 + rng() * 22, sy: 1.0, sz: 6 + rng() * 10, c: rng() > 0.5 ? '#3c3f44' : '#4b4e54' }); }
    for (let k = 0; k < 11; k++) { const px = x0 + rng() * (CHUNK - 10); B.push({ x: px, y: 0, z: 2 + Math.floor(rng() * 2) * 52 + rng() * 20, sx: 4 + rng() * 6, sy: 0.12, sz: 3 + rng() * 4, c: '#36383d' }); }
    for (let x = x0 + rng() * 80; x < x1; x += 140 + rng() * 80) { B.push({ x, y: 0, z: 44, sx: 5, sy: 0.18, sz: 5, c: '#2e3036' }); B.push({ x: x + 1, y: 0.05, z: 45, sx: 3, sy: 0.18, sz: 3, c: '#3d4046' }); }
    // burnout marks just behind the start line
    if (x0 <= 0 && 0 < x1) for (const lz of LANE_Z) for (const wz of [lz + 3, lz + 22]) for (let k = 0; k < 7; k++) B.push({ x: -16 - k * 12, y: 0.02, z: wz + (k & 1) * 0.5, sx: 12, sy: 0.12, sz: 3 - k * 0.25, c: ['#222428', '#26282c', '#2a2c30', '#2e3034', '#323438', '#36383c', '#3a3c40'][k] });
  }

  // ---------------- near side (camera side): kept LOW so the HUD and the cars' wheels stay clear ----------------
  private nearSide(c: Ctx, x0: number, x1: number) {
    const { B, LIT, rng, pools, night } = c, W = x1 - x0;
    B.push({ x: x0, y: -1, z: -16, sx: W, sy: 2.2, sz: 2, c: '#b9b19a' });
    // owner Q44: wider pavement (two offset rows of slabs) up to a low wall; the grass behind it is muted so it stops pulling focus
    for (let x = Math.floor(x0 / 10) * 10; x < x1; x += 10) B.push({ x, y: -1, z: -40, sx: 10, sy: 2, sz: 24, c: ((x / 10) & 1) ? '#b7b4ab' : '#aaa79e' });
    for (let x = Math.floor(x0 / 10) * 10 - 5; x < x1; x += 10) B.push({ x: Math.max(x, x0), y: -1, z: -WALL_Z, sx: Math.min(10, x1 - Math.max(x, x0)), sy: 2, sz: WALL_Z - 40, c: ((Math.floor((x + 5) / 10)) & 1) ? '#adaaa1' : '#b4b1a8' });
    B.push({ x: x0, y: -1.5, z: -120, sx: W, sy: 2, sz: 120 - WALL_Z, c: '#53663f' });
    B.push({ x: x0, y: -2, z: -420, sx: W, sy: 2, sz: 300, c: '#646d4c' });
    this.lowWall(c, x0, x1);
    const rx0 = x0 * ARCH_K;
    const barrierHere = this.near === 'barrier' || (this.near === 'mixed' && (rx0 >= -1320 || rx0 <= -this.finishBlocks + 660));
    if (this.near !== 'barrier') for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) B.push({ x, y: 1.2, z: -16, sx: 3, sy: 0.3, sz: 2, c: ((x / 3) & 1) ? '#d23a2a' : '#eeeae0' });
    if (barrierHere) {
      // K-rail: real ~0.7 m tall, 3 m sections with small gaps; VOX OIL hazard bands on every fourth
      const KR = 3.5, step = (13 * KR + 3) / ARCH_K;
      for (let x = x0; x < x1; x += step) {
        contact(B, x, -31, 13, 4, 1, 0.5);
        B.push({ x, y: 1, z: -31, sx: 13, sy: 1.6, sz: 4, c: '#c9c6bd' });
        B.push({ x, y: 2.6, z: -30.5, sx: 13, sy: 1.4, sz: 3, c: '#d6d3ca' });
        let n = 3;
        if ((Math.round(x / step) & 3) === 0) for (let k = 0; k < 12; k += 2) { B.push({ x: x + k, y: 1.6, z: -31.4, sx: 2, sy: 2.2, sz: 0.4, c: (k / 2) & 1 ? '#1a1a1e' : '#f2c230' }); n++; }
        prop(B, n, x, 1, -29, KR);
      }
    } else {
      for (let x = x0 + 10; x < x1; x += 40) { const n = contact(B, x, -31, 2, 2); B.push({ x, y: 1, z: -31, sx: 2, sy: 4, sz: 2, c: '#3d4046' }); B.push({ x, y: 4.2, z: -31, sx: 2, sy: 0.8, sz: 2, c: '#f2c230' }); prop(B, 2 + n, x + 1, 1, -30, 2.4); }
    }
    for (let x = x0 + 25; x < x1; x += 100) B.push({ x, y: 1.05, z: -36, sx: 6, sy: 0.2, sz: 4, c: '#5a5e66' });
    // verge texture behind the wall: muted grass tufts, flower beds in low brick planters
    for (let k = 0; k < 40; k++) B.push({ x: x0 + rng() * W, y: 0.5, z: -118 + rng() * (118 - WALL_Z - 8), sx: 2 + rng() * 6, sy: 0.12, sz: 2 + rng() * 5, c: pick(rng, ['#5a6f45', '#506640', '#576c44', '#4d633c']) });
    for (let x = x0 + rng() * 50; x < x1 - 30; x += 70 + rng() * 60) {
      const bw = 18 + Math.floor(rng() * 14), bz = -WALL_Z - 26 - Math.floor(rng() * 10);
      B.push({ x, y: 0, z: bz, sx: bw, sy: 2.5, sz: 8, c: pick(rng, BRICKS) });
      B.push({ x: x + 1, y: 2.5, z: bz + 1, sx: bw - 2, sy: 0.6, sz: 6, c: '#5a3a24' });
      for (let f = 0; f < bw - 3; f += 2) for (const fz of [bz + 2, bz + 5]) if (rng() < 0.7) {
        B.push({ x: x + 1.5 + f, y: 3.1, z: fz, sx: 1, sy: 1 + Math.floor(rng() * 2), sz: 1, c: '#3f7a32' });
        B.push({ x: x + 1.5 + f, y: 4.6, z: fz, sx: 1, sy: 1, sz: 1, c: pick(rng, ['#e0261c', '#f2c230', '#eeeae0', '#d0567a', '#6a3ad2', '#f2a43a']) });
      }
    }
    // pavement clusters (breakdown: group props instead of scattering them): bike rack · news boxes · bin, with contact shadows
    for (let x = x0 + 30 + rng() * 60; x < x1 - 40; x += 160 + rng() * 110) {
      const kind = rng();
      if (barrierHere) continue;                                                     // the K-rail stands where these would go
      let cx = x;
      if (kind < 0.7) {                                                              // bike rack (4 hoops)
        let n = contact(B, cx - 0.4, -34, 13.6, 3.8);
        for (let k = 0; k < 4; k++) { B.push({ x: cx + k * 4, y: 1, z: -34, sx: 0.8, sy: 4, sz: 0.8, c: '#9ca1a8' }); B.push({ x: cx + k * 4, y: 1, z: -31, sx: 0.8, sy: 4, sz: 0.8, c: '#9ca1a8' }); B.push({ x: cx + k * 4, y: 4.2, z: -34, sx: 0.8, sy: 0.8, sz: 3.8, c: '#9ca1a8' }); n += 3; }
        prop(B, n, cx + 6, 1, -32.5, 2.8); cx += 22;
      }
      if (kind > 0.35) {                                                             // news boxes — smaller than before (k 3 → 2.2), on a dark plinth
        let n = contact(B, cx - 0.5, -36.5, 12, 4);
        for (const [k, col] of [[0, '#2f6fd6'], [4, '#d23a2a'], [8, '#f2c230']] as [number, string][]) {
          B.push({ x: cx + k - 0.2, y: 1, z: -36.2, sx: 3.4, sy: 0.6, sz: 3.4, c: '#2e3036' });
          B.push({ x: cx + k, y: 1.6, z: -36, sx: 3, sy: 4.4, sz: 3, c: col }); B.push({ x: cx + k + 0.5, y: 4, z: -36.2, sx: 2, sy: 1, sz: 0.3, c: '#cfe0ea' }); n += 3;
        }
        prop(B, n, cx + 5.5, 1, -34.5, 2.2); cx += 14;
      }
      { const n = contact(B, cx, -36, 3, 3); B.push({ x: cx, y: 1, z: -36, sx: 3, sy: 4, sz: 3, c: '#4f7a5a' }); B.push({ x: cx - 0.3, y: 5, z: -36.3, sx: 3.6, sy: 0.6, sz: 3.6, c: '#2e3036' }); B.push({ x: cx + 0.8, y: 5.6, z: -35.2, sx: 1.4, sy: 0.4, sz: 1.4, c: '#2e3036' }); prop(B, 3 + n, cx + 1.5, 1, -34.5, 2.2); }   // litter bin (green, dark lid + handle)
    }
  }

  /** Low wall along the back of the near pavement (owner Q44): brick panels between stone pillars with a stone coping.
   *  The tall bollard lights are gone — small lamps set into the coping light the pavement at night instead. */
  private lowWall(c: Ctx, x0: number, x1: number) {
    const { B, LIT, pools, night } = c, P = 64, z = -WALL_Z, d = 5;
    for (let x = Math.floor(x0 / P) * P; x < x1; x += P) {
      const a = Math.max(x, x0), b = Math.min(x + P, x1), brick = BRICKS[Math.abs(Math.floor(x / P)) % BRICKS.length];
      if (b - a > 4) {
        B.push({ x: a, y: 1, z, sx: b - a, sy: 3.6, sz: d, c: '#' + new THREE.Color(brick).lerp(new THREE.Color('#8a8478'), 0.5).getHexString() });   // dusty brick panel (muted)
        B.push({ x: a, y: 4.6, z: z - 0.5, sx: b - a, sy: 0.8, sz: d + 1, c: '#c9c3b5' });                 // coping
      }
      if (x >= x0 && x + 4 <= x1) {
        B.push({ x, y: 1, z: z - 0.5, sx: 4, sy: 4.8, sz: d + 1, c: '#b4ae9f' });                             // pillar
        B.push({ x: x - 0.5, y: 5.8, z: z - 1, sx: 5, sy: 0.8, sz: d + 2, c: '#d2ccbe' });                      // pillar cap
      }
      const lx = x + P / 2;
      if (lx >= x0 && lx + 3 <= x1 && (Math.floor(x / P) & 1)) {
        LIT.push({ x: lx, y: 4.2, z: z + d + 0.1, sx: 3, sy: 0.6, sz: 0.4, c: night ? '#ffd28a' : '#d8d2c2' });  // lamp facing the pavement
        pools.push({ x: lx + 1.5, z: -36, r: 24, c: '#ffd28a' });
      }
    }
  }

  // ---------------- far-side street furniture + parked cars ----------------
  private streetFurniture(c: Ctx, x0: number, x1: number) {
    const { B, LIT, rng, pools, vehicles, night } = c;
    const clear = (a: number, b: number) => !c.walkGaps.some(([g0, g1]) => b > g0 - 4 && a < g1 + 4);
    for (let x = Math.ceil(x0 / 110) * 110; x < x1; x += 110) {
      if (!clear(x - 6, x + 6)) continue;
      contact(B, x - 1, WALK_Z + 1, 4, 4, 1, 0.8);
      B.push({ x: x - 1, y: 1, z: WALK_Z + 1, sx: 4, sy: 3, sz: 4, c: '#2e3036' });
      if (Math.round(x / 110) % 2 === 0) {                                             // one-way sign on every other lamp post (arrow = race direction)
        // owner Q67: real size (≈ 1.0 × 0.35 m, 2.3 m up) — built in real blocks around the pole as a k = 1 prop
        const ax = x + 1, ay = 16, az = WALK_Z + 2, n0 = B.length;
        B.push({ x: ax - 7, y: ay, z: az - 1.6, sx: 14, sy: 5, sz: 0.6, c: '#2f6fd6' });
        B.push({ x: ax - 6.5, y: ay + 0.5, z: az - 1.9, sx: 13, sy: 4, sz: 0.3, c: '#eeeae0' });            // white border
        B.push({ x: ax - 6, y: ay + 1, z: az - 2.1, sx: 12, sy: 3, sz: 0.3, c: '#2f6fd6' });
        B.push({ x: ax - 3, y: ay + 2, z: az - 2.4, sx: 8, sy: 1, sz: 0.3, c: '#eeeae0' });                  // shaft
        B.push({ x: ax - 4, y: ay + 1, z: az - 2.4, sx: 1, sy: 3, sz: 0.3, c: '#eeeae0' });                  // arrowhead (points −x = race direction)
        B.push({ x: ax - 5, y: ay + 2, z: az - 2.4, sx: 1, sy: 1, sz: 0.3, c: '#eeeae0' });
        prop(B, B.length - n0, ax, ay, az, 1);
      }
      B.push({ x, y: 1, z: WALK_Z + 2, sx: 2, sy: 54, sz: 2, c: '#3d4046' });
      B.push({ x, y: 53, z: WALK_Z - 16, sx: 2, sy: 2, sz: 19, c: '#3d4046' });
      B.push({ x: x - 1, y: 50, z: WALK_Z - 18, sx: 4, sy: 3, sz: 5, c: '#2e3036' });
      LIT.push({ x: x - 0.5, y: 49.5, z: WALK_Z - 17.5, sx: 3, sy: 0.6, sz: 4, c: night ? '#ffd28a' : '#efe9d8' });
      pools.push({ x, z: WALK_Z - 22, r: 40, c: '#ffd28a' });
    }
    for (let x = Math.ceil(x0 / 110) * 110 + 55; x < x1 - 10; x += 110) {
      const k = rng();
      if (!clear(x - 18, x + 18)) continue;
      if (k < 0.42) { B.push({ x: x - 4, y: 1, z: WALK_Z + 8, sx: 9, sy: 0.3, sz: 9, c: '#6a5a46' }); this.plant(c, STREET_TREES, x, 1.3, WALK_Z + 12.5); }
      else if (k < 0.52) { contact(B, x - 3, WALK_Z + 15, 6, 6, 1, 0.8); this.planter(c, x, WALK_Z + 18); }
      else if (k < 0.66) {                                                             // bench + bin: a little seating corner
        let n = contact(B, x - 8, WALK_Z + 15, 16, 6);
        for (const lx of [x - 7, x + 5]) B.push({ x: lx, y: 1, z: WALK_Z + 16, sx: 2, sy: 4, sz: 5, c: '#2e3036' }); B.push({ x: x - 8, y: 5, z: WALK_Z + 15, sx: 16, sy: 1.5, sz: 6, c: '#8a5a32' }); B.push({ x: x - 8, y: 6.5, z: WALK_Z + 20, sx: 16, sy: 5, sz: 1.5, c: '#8a5a32' }); n += 4;
        prop(B, n, x, 1, WALK_Z + 18, 1.5);
        const m = contact(B, x + 10, WALK_Z + 17, 4, 4); B.push({ x: x + 10, y: 1, z: WALK_Z + 17, sx: 4, sy: 6, sz: 4, c: '#2f5a3e' }); B.push({ x: x + 9.6, y: 7, z: WALK_Z + 16.6, sx: 4.8, sy: 0.8, sz: 4.8, c: '#244630' }); prop(B, 2 + m, x + 12, 1, WALK_Z + 19, 1.4);
      }
      else if (k < 0.8) { const n = contact(B, x, WALK_Z + 3, 3, 3); B.push({ x, y: 1, z: WALK_Z + 3, sx: 3, sy: 6, sz: 3, c: '#d23a2a' }); B.push({ x: x + 0.5, y: 7, z: WALK_Z + 3.5, sx: 2, sy: 1.5, sz: 2, c: '#d23a2a' }); prop(B, 2 + n, x + 1.5, 1, WALK_Z + 4.5, 1.4); }
      else if (k < 0.9) { const n = contact(B, x - 3, WALK_Z + 14, 6, 6); B.push({ x: x - 3, y: 1, z: WALK_Z + 14, sx: 6, sy: 8, sz: 6, c: '#2f5a3e' }); B.push({ x: x - 3.5, y: 9, z: WALK_Z + 13.5, sx: 7, sy: 1, sz: 7, c: '#244630' }); prop(B, 2 + n, x, 1, WALK_Z + 17, 1.4); }
      else if (k > 0.965) this.busStop(c, x);                                         // rare, so it reads as a landmark
      else { const n = contact(B, x, WALK_Z + 3, 3, 3); B.push({ x, y: 1, z: WALK_Z + 3, sx: 3, sy: 6, sz: 3, c: '#d23a2a' }); B.push({ x: x + 0.5, y: 7, z: WALK_Z + 3.5, sx: 2, sy: 1.5, sz: 2, c: '#d23a2a' }); prop(B, 2 + n, x + 1.5, 1, WALK_Z + 4.5, 1.4); }
    }
  }

  /** Bus stop (breakdown: a few distinctive landmarks): glass shelter with a roof, bench inside, BUS sign, bin. */
  private busStop(c: Ctx, x: number) {
    const { B, GL, LIT, night } = c, z0 = WALK_Z + 9, x0 = x - 15, w = 30;
    this.landmarks.push({ kind: 'busstop', x: x * ARCH_K });
    c.reserved.push([x - 24, x + 18]);                                                  // no parked cars across the bus stop
    contact(B, x0, z0, w, 12, 1, 1);
    for (const px of [x0, x0 + w - 1.2]) for (const pz of [z0, z0 + 11]) B.push({ x: px, y: 1, z: pz, sx: 1.2, sy: 14, sz: 1.2, c: '#3d4046' });
    B.push({ x: x0 - 1, y: 15, z: z0 - 1, sx: w + 2, sy: 1, sz: 14, c: '#2e3036' });                   // roof
    B.push({ x: x0 - 1, y: 14.2, z: z0 - 1.2, sx: w + 2, sy: 0.8, sz: 0.4, c: '#f2c230' });           // roof edge stripe
    GL.push({ x: x0 + 1.2, y: 2, z: z0 + 11.4, sx: w - 2.4, sy: 12, sz: 0.4, c: '#9fb3c4' });         // back glass
    GL.push({ x: x0 + w - 1, y: 2, z: z0 + 1.5, sx: 0.4, sy: 12, sz: 9.5, c: '#9fb3c4' });            // side glass
    B.push({ x: x0 + 4, y: 5, z: z0 + 7.5, sx: w - 8, sy: 1, sz: 3.5, c: '#8a5a32' });                 // bench
    for (const bx of [x0 + 5, x0 + w - 6]) B.push({ x: bx, y: 1, z: z0 + 8.5, sx: 1, sy: 4, sz: 2, c: '#2e3036' });
    if (night) LIT.push({ x: x0 + 2, y: 14, z: z0 + 2, sx: w - 4, sy: 0.4, sz: 8, c: '#ffe2a8' });
    c.pools.push({ x: x, z: z0 + 4, r: 26, c: '#ffd28a' });
    const sx = x0 - 6;                                                                                     // BUS sign on its own pole (owner Q67: real size)
    contact(B, sx - 0.5, WALK_Z + 2.5, 2, 2);
    B.push({ x: sx, y: 1, z: WALK_Z + 3, sx: 1.2, sy: 15, sz: 1.2, c: '#3d4046' });
    { const ax = sx + 0.6, ay = 13.5, az = WALK_Z + 3, n0 = B.length, tw = textCells('BUS').width;
      B.push({ x: ax - tw / 2 - 1.5, y: ay, z: az - 1.2, sx: tw + 3, sy: 8, sz: 0.6, c: '#2f7a4a' });
      this.sign(B, 'BUS', ax - tw / 2, ay + 1.5, az - 1.6, 1, '#eeeae0');
      prop(B, B.length - n0, ax, ay, az, 1); }
  }

  /** Parked cars in the kerb lane (real scale; ~1 in 5 is a VOX OIL company car). */
  private parkedCars(c: Ctx, x0: number, x1: number) {
    const { rng, vehicles } = c;
    // parked cars in the parking lane (some VOX OIL company cars)
    for (let x = x0 + 4; x < x1 - CAR_L - 4; x += CAR_L + 14 + Math.floor(rng() * 40)) {
      if (rng() < 0.4) continue;
      if (x > -60 && x < 40) continue;                      // keep the start line clear
      if (c.reserved.some(([a, b]) => x + CAR_L > a && x < b)) continue;
      const vox = rng() < 0.2;
      const look = vox ? pick(rng, VOX_LOOKS) : pick(rng, PARKED_LOOKS);
      const flip = !vox && rng() < 0.4;              // turned around: the camera sees the car's other side
      vehicles.push(flip ? { kind: 'car', look, x: x + CAR_L, y: 0, z: PARK_Z + 4 + CAR_W, rotY: Math.PI } : { kind: vox ? 'vox' : 'car', look, x, y: 0, z: PARK_Z + 4, rotY: 0 });
    }
  }

  /** A remixed tree (see trees.ts) at a design-space spot; quarter-turn rotations add variety for free. */
  private plant(c: Ctx, names: string[], x: number, y: number, z: number) {
    c.vehicles.push({ kind: 'tree', name: pick(c.rng, names), x, y, z, rotY: Math.floor(c.rng() * 4) * Math.PI / 2 });
  }
  /** Brick planter box with a sapling (the owner's trees as supplied). */
  private planter(c: Ctx, x: number, z: number) {
    c.B.push({ x: x - 3, y: 1, z: z - 3, sx: 6, sy: 2, sz: 6, c: pick(c.rng, BRICKS) });
    c.B.push({ x: x - 2.5, y: 2.8, z: z - 2.5, sx: 5, sy: 0.3, sz: 5, c: '#5a3a24' });
    c.vehicles.push({ kind: 'tree', name: pick(c.rng, SAPLINGS), x, y: 3.1, z, rotY: Math.floor(c.rng() * 4) * Math.PI / 2 });
  }
  /** Block-letter text on a plane facing −z (reads correctly from the camera side). */
  private sign(B: Block[], text: string, x: number, y: number, z: number, cell: number, colour: string) {
    const { cells, width } = textCells(text);
    for (const [col, r] of cells) B.push({ x: x + (width - 1 - col) * cell, y: y + (4 - r) * cell, z, sx: cell, sy: cell, sz: 0.6, c: colour });
  }
  private window(c: Ctx, x: number, y: number, w: number, h: number, z: number, frame: string) {
    c.B.push({ x: x - 1, y: y - 1, z: z - 0.6, sx: w + 2, sy: h + 2, sz: 0.6, c: frame });
    const lit = c.night && c.rng() < 0.45;
    (lit ? c.LIT : c.GL).push({ x, y, z: z - 0.9, sx: w, sy: h, sz: 0.4, c: lit ? pick(c.rng, ['#ffd28a', '#ffe2a8', '#cfe6ff']) : (c.rng() > 0.88 ? '#9fb3c4' : '#1a2d3a') });
    c.B.push({ x: x - 2, y: y - 2, z: z - 2, sx: w + 4, sy: 1, sz: 2, c: frame });
  }
  private storefront(c: Ctx, x: number, w: number, base: string, name?: string) {
    const { B, GL, LIT, rng } = c, fz = FACADE_Z;
    B.push({ x, y: 0, z: fz - 0.6, sx: w, sy: 3, sz: 0.6, c: shade(base, 0.7) });
    const doorX = x + 6 + Math.floor(rng() * Math.max(1, w - 24));
    for (let gx = x + 4; gx < x + w - 4; gx += 12) {
      const pw = Math.min(10, x + w - 4 - gx);
      if (gx <= doorX + 8 && gx + pw >= doorX) continue;
      (c.night ? LIT : GL).push({ x: gx, y: 4, z: fz - 0.5, sx: pw, sy: 14, sz: 0.5, c: c.night ? '#ffcf8a' : '#10232b' });
      if (!c.night) B.push({ x: gx + 1, y: 13, z: fz - 0.8, sx: 2, sy: 4, sz: 0.3, c: '#2c4a55' });
    }
    B.push({ x: doorX, y: 0, z: fz - 0.5, sx: 8, sy: 18, sz: 0.5, c: '#3a2a1c' });
    const [a1, a2] = pick(rng, AWNINGS);
    for (let ax = x + 2; ax < x + w - 2; ax += 4) {
      const col = (((ax - x) / 4) & 1) ? a1 : a2, aw = Math.min(4, x + w - 2 - ax);
      B.push({ x: ax, y: 21, z: fz - 8, sx: aw, sy: 1.5, sz: 8, c: col });
      B.push({ x: ax, y: 19, z: fz - 9, sx: aw, sy: 3, sz: 1.2, c: col });
    }
    let nm = name ?? pick(rng, SHOP_NAMES);
    for (let k = 0; k < 8 && !name && c.usedNames.has(nm); k++) nm = pick(rng, SHOP_NAMES);   // no repeated shop names on one block
    c.usedNames.add(nm);
    const tw = textCells(nm).width * 1.6;
    if (tw + 8 < w) {
      const sx = x + (w - tw - 8) / 2;
      B.push({ x: sx, y: 24, z: fz - 1.2, sx: tw + 8, sy: 12, sz: 1.2, c: '#1d1f24' });
      this.sign(c.night ? LIT : B, nm, sx + 4, 26, fz - 1.8, 1.6, rng() > 0.5 ? '#f2c230' : '#eeeae0');
    }
    c.pools.push({ x: x + w / 2, z: WALK_Z + 6, r: 34, c: '#ffcf8a' });
  }
  private roof(c: Ctx, x: number, w: number, h: number, d: number, trim: string) {
    const { B, rng } = c, fz = FACADE_Z;
    B.push({ x: x - 1, y: h - 4, z: fz - 3, sx: w + 2, sy: 4, sz: d + 3, c: trim });
    B.push({ x: x - 1, y: h, z: fz - 1, sx: w + 2, sy: 2, sz: d + 1, c: shade(trim, 0.6) });
    for (let k = 0; k < 2; k++) if (rng() > 0.3) B.push({ x: x + 6 + rng() * Math.max(1, w - 20), y: h + 2, z: fz + 10 + rng() * 30, sx: 10, sy: 6, sz: 8, c: '#9ca1a8' });
    if (rng() > 0.65) {
      const tx = x + w * 0.6;
      for (let k = 0; k < 4; k++) B.push({ x: tx + k * 0.5, y: h + 8 + k * 3, z: fz + 30, sx: 12 - k, sy: 3, sz: 12 - k, c: '#7a5a3a' });
      for (const [lx, lz] of [[0, 0], [10, 0], [0, 10], [10, 10]]) B.push({ x: tx + lx, y: h + 2, z: fz + 30 + lz, sx: 1.5, sy: 6, sz: 1.5, c: '#3d4046' });
    }
    if (rng() > 0.72 && h < 180) {
      const bw = Math.min(w - 4, 60), bx = x + (w - bw) / 2;
      for (const px of [bx + 6, bx + bw - 8]) B.push({ x: px, y: h + 2, z: fz + 6, sx: 2, sy: 12, sz: 2, c: '#3d4046' });
      B.push({ x: bx, y: h + 14, z: fz + 5, sx: bw, sy: 26, sz: 2, c: '#1a1a1e' });
      const ad = pick(rng, ['VOX OIL', 'VOX OIL', 'PANDA', 'GRID FM']), aw = textCells(ad).width * 2.6;
      if (aw < bw - 4) this.sign(c.night ? c.LIT : B, ad, bx + (bw - aw) / 2, h + 20, fz + 4.4, 2.6, ad === 'VOX OIL' ? '#f2c230' : '#eeeae0');
    }
  }

  // ---------------- segment types ----------------
  private seg_shops(c: Ctx, x: number, w: number) {
    const h = 70 + Math.floor(c.rng() * 150), d = 70, col = pick(c.rng, FACADES), trim = shade(col, 1.18);
    c.B.push({ x, y: 0, z: FACADE_Z, sx: w, sy: h, sz: d, c: col });
    this.storefront(c, x, w, col);
    const balcony = c.rng() > 0.7;
    for (let y = 40; y < h - 16; y += 18) {
      for (let wx = x + 5; wx + 10 <= x + w - 4; wx += 14) this.window(c, wx, y, 9, 10, FACADE_Z, trim);
      if (balcony && Math.floor(y / 18) % 2 === 0) {
        c.B.push({ x: x + 3, y: y - 3, z: FACADE_Z - 8, sx: w - 6, sy: 1.5, sz: 8, c: '#8f8a7e' });
        for (let px = x + 3; px < x + w - 3; px += 4) c.B.push({ x: px, y: y - 1.5, z: FACADE_Z - 8, sx: 1, sy: 6, sz: 1, c: '#3d4046' });
      }
    }
    this.roof(c, x, w, h, d, trim);
  }
  private seg_brick(c: Ctx, x: number, w: number) {
    const { B, rng } = c, h = 90 + Math.floor(rng() * 80), col = pick(rng, BRICKS), fz = FACADE_Z;
    B.push({ x, y: 0, z: fz, sx: w, sy: h, sz: 70, c: col });
    for (let y = 26; y < h; y += 4) B.push({ x, y, z: fz - 0.2, sx: w, sy: 0.5, sz: 0.2, c: shade(col, 0.8) });
    this.storefront(c, x, w, col);
    for (let y = 40; y < h - 14; y += 16) for (let wx = x + 6; wx + 8 <= x + w - 6; wx += 13) this.window(c, wx, y, 7, 10, fz, '#e8e4d8');
    // fire escape: platforms, rails, stairs
    const fx = x + 4, fw = Math.min(30, w - 10);
    for (let y = 36; y < h - 14; y += 16) {
      B.push({ x: fx, y, z: fz - 9, sx: fw, sy: 1, sz: 9, c: '#2e3036' });
      for (let px = fx; px <= fx + fw; px += 3) B.push({ x: px, y: y + 1, z: fz - 9, sx: 0.6, sy: 5, sz: 0.6, c: '#2e3036' });
      B.push({ x: fx, y: y + 6, z: fz - 9, sx: fw, sy: 0.6, sz: 0.6, c: '#2e3036' });
      if (y + 16 < h - 14) for (let k = 0; k < 8; k++) B.push({ x: fx + 4 + k * 2, y: y + 1 + k * 2, z: fz - 6, sx: 2, sy: 0.6, sz: 3, c: '#3d4046' });
    }
    this.roof(c, x, w, h, 70, shade(col, 1.25));
  }
  private seg_glass(c: Ctx, x: number, w: number) {
    const { B, GL, LIT, rng } = c, h = 220 + Math.floor(rng() * 180), fz = FACADE_Z;
    const tint = pick(rng, ['#2a5a6a', '#33627a', '#2f4f6a', '#3a6a72']);
    B.push({ x, y: 0, z: fz, sx: w, sy: h, sz: 80, c: '#5a5e66' });
    B.push({ x, y: 0, z: fz - 1, sx: w, sy: 22, sz: 1, c: '#2e3036' });
    (c.night ? LIT : GL).push({ x: x + 6, y: 2, z: fz - 1.6, sx: w - 12, sy: 16, sz: 0.6, c: c.night ? '#e6efff' : '#10232b' });
    for (let y = 24; y < h - 6; y += 14) for (let gx = x + 2; gx < x + w - 2; gx += 10) {
      const lit = c.night && rng() < 0.25;
      (lit ? LIT : GL).push({ x: gx, y, z: fz - 0.8, sx: Math.min(9, x + w - 2 - gx), sy: 13, sz: 0.8, c: lit ? pick(rng, ['#b8c8e4', '#d8c89a', '#a8bcd8']) : (rng() > 0.85 ? shade(tint, 1.4) : tint) });
    }
    for (let y = 24; y < h - 6; y += 14) B.push({ x, y: y - 1, z: fz - 1.2, sx: w, sy: 1, sz: 1.2, c: '#c4ccd2' });
    for (let gx = x + 1; gx < x + w; gx += 10) B.push({ x: gx, y: 24, z: fz - 1.2, sx: 1, sy: h - 30, sz: 1.2, c: '#c4ccd2' });
    B.push({ x: x - 1, y: h - 6, z: fz - 2, sx: w + 2, sy: 6, sz: 82, c: '#9ca1a8' });
    if (rng() > 0.5) { B.push({ x: x + w / 2 - 1, y: h, z: fz + 30, sx: 2, sy: 40, sz: 2, c: '#9ca1a8' }); LIT.push({ x: x + w / 2 - 1.5, y: h + 40, z: fz + 29.5, sx: 3, sy: 3, sz: 3, c: '#e0261c' }); }
    const nm = pick(rng, ['GRID TOWER', 'VOX OIL', 'CITY BANK', 'PANDA HQ']);
    const tw = textCells(nm).width * 3;
    if (tw < w - 8) { B.push({ x: x + (w - tw) / 2 - 3, y: h - 33, z: fz - 1.6, sx: tw + 6, sy: 21, sz: 0.4, c: '#1a1a1e' }); this.sign(c.night ? LIT : B, nm, x + (w - tw) / 2, h - 30, fz - 2.2, 3, nm === 'VOX OIL' ? '#f2c230' : '#eeeae0'); }
  }
  private seg_warehouse(c: Ctx, x: number, w: number) {
    const { B, rng } = c, h = 54 + Math.floor(rng() * 20), col = pick(rng, ['#8e9bb3', '#9aa08c', '#a39a8a', '#7d8794']), fz = FACADE_Z + 10;
    B.push({ x, y: -1, z: FACADE_Z, sx: w, sy: 1.6, sz: 12, c: '#8f8a7e' });
    B.push({ x, y: 0, z: fz, sx: w, sy: h, sz: 90, c: col });
    for (let gx = x; gx < x + w; gx += 2) B.push({ x: gx, y: 30, z: fz - 0.4, sx: 1, sy: h - 34, sz: 0.4, c: shade(col, 0.86) });
    const bays = Math.max(1, Math.min(3, Math.floor((w - 20) / 32)));
    for (let k = 0; k < bays; k++) {
      const dx = x + 10 + k * Math.floor((w - 20) / bays), dw = 24;
      B.push({ x: dx, y: 4, z: fz - 1, sx: dw, sy: 24, sz: 1, c: '#c9c6bd' });
      for (let y = 6; y < 28; y += 3) B.push({ x: dx + 1, y, z: fz - 1.4, sx: dw - 2, sy: 1, sz: 0.4, c: '#a8a49a' });
      B.push({ x: dx - 2, y: 0, z: fz - 10, sx: dw + 4, sy: 4, sz: 10, c: '#8f8a7e' });
      B.push({ x: dx - 2, y: 4, z: fz - 10, sx: 2, sy: 2, sz: 0.6, c: '#1a1a1e' }); B.push({ x: dx + dw, y: 4, z: fz - 10, sx: 2, sy: 2, sz: 0.6, c: '#1a1a1e' });
    }
    B.push({ x: x - 1, y: h, z: fz - 1, sx: w + 2, sy: 3, sz: 92, c: shade(col, 0.7) });
    const nm = rng() > 0.4 ? 'VOX OIL DEPOT' : 'PANDA PARTS', tw = textCells(nm).width * 2.4;
    if (tw < w - 8) { B.push({ x: x + (w - tw) / 2 - 3, y: h - 20, z: fz - 1.5, sx: tw + 6, sy: 17, sz: 1.5, c: '#1a1a1e' }); this.sign(c.night ? c.LIT : B, nm, x + (w - tw) / 2, h - 17, fz - 2.1, 2.4, '#f2c230'); }
    for (let k = 0; k < 3; k++) { const px = x + rng() * (w - 10); B.push({ x: px, y: 1, z: WALK_Z + 18, sx: 8, sy: 6, sz: 6, c: pick(rng, ['#2f5a8a', '#8a3a2a', '#2f6a4a']) }); }
  }
  private seg_diner(c: Ctx, x: number, w: number) {
    const { B, LIT } = c, fz = FACADE_Z, h = 36;
    B.push({ x, y: 0, z: fz, sx: w, sy: h, sz: 50, c: '#e4e7ec' });
    B.push({ x, y: 22, z: fz - 1, sx: w, sy: 4, sz: 1, c: '#d23a2a' });
    B.push({ x, y: 2, z: fz - 1, sx: w, sy: 2, sz: 1, c: '#d23a2a' });
    for (let gx = x + 4; gx < x + w - 6; gx += 10) (c.night ? LIT : c.GL).push({ x: gx, y: 6, z: fz - 0.8, sx: 8, sy: 14, sz: 0.6, c: c.night ? '#ffe2a8' : '#10232b' });
    B.push({ x: x - 2, y: h, z: fz - 4, sx: w + 4, sy: 3, sz: 56, c: '#9ca1a8' });
    B.push({ x: x + w / 2 - 1, y: h + 3, z: fz + 4, sx: 2, sy: 10, sz: 2, c: '#3d4046' });
    const tw = textCells('DINER').width * 3;
    B.push({ x: x + (w - tw) / 2 - 3, y: h + 12, z: fz + 2.6, sx: tw + 6, sy: 21, sz: 1.4, c: '#d23a2a' });
    this.sign(c.night ? LIT : B, 'DINER', x + (w - tw) / 2, h + 15, fz + 2, 3, c.night ? '#fff0c0' : '#eeeae0');
    c.pools.push({ x: x + w / 2, z: WALK_Z + 10, r: 40, c: '#ff9a8a' });
  }
  private seg_side(c: Ctx, x: number, w: number) {
    const { B, LIT, rng } = c;
    c.reserved.push([x - 6, x + w + 6]);
    c.walkGaps.push([x + 12, x + w - 12]);                                                     // main pavement + kerb open here
    // a side street running away from the camera, sidewalks either side, buildings lining it
    B.push({ x: x + 12, y: -1, z: CURB_Z, sx: w - 24, sy: 1.02, sz: 900, c: '#45484e' });
    for (let z = CURB_Z + 30; z < 1000; z += 30) B.push({ x: x + w / 2 - 1, y: 0.05, z, sx: 2, sy: 0.12, sz: 14, c: '#f2c230' });
    for (const sx of [x, x + w - 12]) B.push({ x: sx, y: -1, z: WALK_Z, sx: 12, sy: 2, sz: 900, c: '#b7b4ab' });
    for (const kx of [x + 10.5, x + w - 12]) B.push({ x: kx, y: -1, z: CURB_Z, sx: 1.5, sy: 2.2, sz: 900, c: '#b9b19a' });   // side-street kerbs turn the corner
    for (let sxp = x + 14; sxp < x + w - 15; sxp += 4) B.push({ x: sxp, y: 0.04, z: WALK_Z + 1, sx: 2, sy: 0.14, sz: FACADE_Z - WALK_Z - 2, c: '#eeeae0' });   // crosswalk across the side-street mouth
    for (let z = FACADE_Z + 20; z < 900; z += 90 + rng() * 40) for (const side of [0, 1]) {
      const bh = 80 + rng() * 200, bw = 60, col = pick(rng, FACADES);
      const bx = side ? x + w : x - bw;
      B.push({ x: bx, y: 0, z, sx: bw, sy: bh, sz: 70, c: col });
      for (let y = 30; y < bh - 10; y += 18) B.push({ x: side ? bx - 0.4 : bx + bw, y, z: z + 6, sx: 0.4, sy: 10, sz: 58, c: c.night && rng() < 0.5 ? '#ffd28a' : '#1a2d3a' });
    }
    // crosswalk on the main road at the junction, traffic lights, street sign
    for (let z = -12; z < ROAD_EDGE; z += 6) B.push({ x: x + 14, y: 0, z, sx: w - 28, sy: 0.16, sz: 3, c: '#eeeae0' });
    B.push({ x: x + 12, y: 0, z: PARK_Z, sx: w - 24, sy: 0.16, sz: CURB_Z - PARK_Z, c: '#45484e' });
    for (const tx of [x + 6, x + w - 8]) {
      contact(B, tx, WALK_Z + 2, 2, 2);
      B.push({ x: tx, y: 1, z: WALK_Z + 2, sx: 2, sy: 34, sz: 2, c: '#2e3036' });
      B.push({ x: tx - 1, y: 26, z: WALK_Z - 1, sx: 4, sy: 12, sz: 3, c: '#1d1f24' });
      const state = Math.floor(rng() * 3);
      ['#e0261c', '#f2a43a', '#4ade80'].forEach((col, i) => (state === i ? LIT : B).push({ x: tx - 0.5, y: 34 - i * 4, z: WALK_Z - 1.6, sx: 3, sy: 3, sz: 0.6, c: state === i ? col : '#2b2e38' }));
    }
    // street-name sign on top of the traffic-light pole — owner Q67: real size (text 1 block per cell)
    const nm = pick(rng, ['GRID ST', 'PISTON AV', 'GEAR ST', 'CLUTCH LN', 'OAK ST', 'MAIN ST']), tw = textCells(nm).width;
    const sxp = x + w - 8;
    B.push({ x: sxp, y: 35, z: WALK_Z + 2, sx: 2, sy: 3, sz: 2, c: '#2e3036' });
    { const ax = sxp + 1, ay = 38, az = WALK_Z + 3, n0 = B.length;
      B.push({ x: ax - tw / 2 - 1.5, y: ay, z: az - 1, sx: tw + 3, sy: 8, sz: 0.6, c: '#2f7a4a' });
      this.sign(B, nm, ax - tw / 2, ay + 1.5, az - 1.4, 1, '#eeeae0');
      prop(B, B.length - n0, ax, ay, az, 1); }
  }
  private seg_park(c: Ctx, x: number, w: number) {
    const { B, rng } = c;
    B.push({ x, y: -1, z: FACADE_Z - 4, sx: w, sy: 1.6, sz: 260, c: '#5f9a3a' });
    for (let k = 0; k < 18; k++) B.push({ x: x + rng() * (w - 10), y: 0.55, z: FACADE_Z + rng() * 240, sx: 6 + rng() * 10, sy: 0.1, sz: 6 + rng() * 10, c: rng() > 0.5 ? '#6aa444' : '#558f36' });
    for (let px = x; px < x + w; px += 6) if (Math.abs(px - (x + w / 2)) > 8) B.push({ x: px, y: 1, z: FACADE_Z - 4, sx: 1, sy: 6, sz: 1, c: '#2e3036' });
    B.push({ x, y: 5, z: FACADE_Z - 4, sx: w / 2 - 8, sy: 0.8, sz: 0.8, c: '#2e3036' });
    B.push({ x: x + w / 2 + 8, y: 5, z: FACADE_Z - 4, sx: w / 2 - 8, sy: 0.8, sz: 0.8, c: '#2e3036' });
    B.push({ x: x + w / 2 - 6, y: 0.6, z: FACADE_Z - 4, sx: 12, sy: 0.12, sz: 200, c: '#c9b79a' });
    const fx = x + w / 2, fz = FACADE_Z + 60;
    for (let a = 0; a < 360; a += 12) { const r = 18; B.push({ x: fx + Math.cos(a * Math.PI / 180) * r - 2, y: 0.5, z: fz + Math.sin(a * Math.PI / 180) * r - 2, sx: 4, sy: 4, sz: 4, c: '#b9b19a' }); }
    B.push({ x: fx - 15, y: 0.6, z: fz - 15, sx: 30, sy: 2.5, sz: 30, c: '#4a86c8' });
    B.push({ x: fx - 3, y: 0.6, z: fz - 3, sx: 6, sy: 10, sz: 6, c: '#b9b19a' }); B.push({ x: fx - 2, y: 10, z: fz - 2, sx: 4, sy: 4, sz: 4, c: '#9fd0ff' });
    this.landmarks.push({ kind: 'park', x: (x + w / 2) * ARCH_K });
    for (let k = 0; k < Math.floor(w / 30); k++) this.plant(c, PARK_TREES, x + 10 + k * 30 + rng() * 10, 0.6, FACADE_Z + 18 + rng() * 140);
    for (const px of [x + w / 2 - 12, x + w / 2 + 12]) this.planter(c, px, FACADE_Z + 2);   // saplings flank the park path
    for (const bx of [fx - 40, fx + 28]) { B.push({ x: bx, y: 1, z: fz + 26, sx: 14, sy: 1.5, sz: 5, c: '#8a5a32' }); B.push({ x: bx, y: 2.5, z: fz + 30, sx: 14, sy: 4, sz: 1.2, c: '#8a5a32' }); }
    B.push({ x: x + 4, y: 0, z: FACADE_Z + 200, sx: w - 8, sy: 40, sz: 30, c: pick(rng, FACADES) });
  }
  private seg_gas(c: Ctx, x: number, w: number) {
    const { B, LIT, rng, vehicles, night, pools } = c, fz = FACADE_Z;
    B.push({ x, y: -1, z: WALK_Z, sx: w, sy: 2.02, sz: 200, c: '#b4b1a8' });
    const cx = x + 14, cw = w - 40, cz = fz + 6, cd = 54;
    for (const [px, pz] of [[cx + 6, cz + 10], [cx + cw - 10, cz + 10], [cx + 6, cz + cd - 14], [cx + cw - 10, cz + cd - 14]]) B.push({ x: px, y: 0, z: pz, sx: 4, sy: 36, sz: 4, c: '#e8e4d8' });
    B.push({ x: cx, y: 36, z: cz, sx: cw, sy: 3, sz: cd, c: '#1a1a1e' });
    B.push({ x: cx - 1, y: 39, z: cz - 1, sx: cw + 2, sy: 7, sz: cd + 2, c: '#f2c230' });
    B.push({ x: cx - 1, y: 39, z: cz - 1.4, sx: cw + 2, sy: 1, sz: 0.4, c: '#1a1a1e' });
    const vw = textCells('VOX OIL').width * 1.2;
    this.sign(night ? LIT : B, 'VOX OIL', cx + cw / 2 - vw / 2, 40.2, cz - 1.8, 1.2, '#1a1a1e');
    for (let lx = cx + 8; lx < cx + cw - 8; lx += 16) LIT.push({ x: lx, y: 35.4, z: cz + 20, sx: 8, sy: 0.6, sz: 4, c: '#eef4ff' });
    pools.push({ x: cx + cw / 2, z: cz + cd / 2, r: 60, c: '#eef4ff' });
    for (const px of [cx + 18, cx + cw - 30]) {
      B.push({ x: px, y: 1, z: cz + 22, sx: 12, sy: 1.5, sz: 10, c: '#c9c6bd' });
      for (const dz of [0, 6]) { B.push({ x: px + 3, y: 2.5, z: cz + 24 + dz, sx: 6, sy: 14, sz: 3, c: '#e4e7ec' }); B.push({ x: px + 3, y: 13, z: cz + 23.6 + dz, sx: 6, sy: 2, sz: 0.4, c: '#f2c230' }); LIT.push({ x: px + 4, y: 9, z: cz + 23.6 + dz, sx: 4, sy: 3, sz: 0.4, c: '#4ade80' }); }
    }
    for (const px of [x + w - 66, x + w - 6]) this.planter(c, px, fz + 64);   // saplings by VOX MART
    const sx = x + w - 60;
    B.push({ x: sx, y: 0, z: fz + 70, sx: 56, sy: 30, sz: 50, c: '#e4e7ec' });
    B.push({ x: sx, y: 22, z: fz + 69, sx: 56, sy: 7, sz: 1, c: '#f2c230' });
    (night ? LIT : c.GL).push({ x: sx + 6, y: 3, z: fz + 69.2, sx: 44, sy: 15, sz: 0.6, c: night ? '#eef4ff' : '#10232b' });
    const mw = textCells('VOX MART').width * 1.2;
    this.sign(night ? LIT : B, 'VOX MART', sx + 28 - mw / 2, 23, fz + 68.4, 1.2, '#1a1a1e');
    const px = x + 8;
    B.push({ x: px, y: 0, z: WALK_Z + 6, sx: 3, sy: 50, sz: 3, c: '#3d4046' });
    B.push({ x: px - 9, y: 50, z: WALK_Z + 5, sx: 21, sy: 28, sz: 4, c: '#1a1a1e' });
    this.sign(night ? LIT : B, 'VOX', px - 4.5, 66, WALK_Z + 4.4, 1.8, '#f2c230');
    this.sign(night ? LIT : B, '199', px - 4.5, 53, WALK_Z + 4.4, 1.8, '#eeeae0');
    // VOX OIL tanker parked in the kerb lane outside its station (text faces the camera)
    c.reserved.push([x, x + 150]);
    vehicles.push({ kind: 'tanker', x: x + 12, y: 0, z: PARK_Z, rotY: 0 });
    if (rng() > 0.3) vehicles.push({ kind: 'vox', look: VOX_LOOKS[0], x: cx + 34, y: 1, z: cz + 34, rotY: 0 });
  }
  private seg_lot(c: Ctx, x: number, w: number) {
    const { B, rng, vehicles, night } = c, fz = FACADE_Z;
    B.push({ x, y: -1, z: WALK_Z, sx: w, sy: 2.02, sz: 150, c: '#4b4e54' });
    const bay = 38 / ARCH_K;   // real 2.6 m bays
    for (let sx = x + 4; sx < x + w - 4; sx += bay) B.push({ x: sx, y: 1.02, z: fz - 4, sx: 1.2, sy: 0.12, sz: 30, c: '#e8e4d8' });
    B.push({ x, y: 0, z: fz + 110, sx: w, sy: 10, sz: 4, c: '#a39a8a' });
    for (let sx = x + 4; sx + bay < x + w - 4; sx += bay) {
      if (rng() < 0.35) continue;
      const vox = rng() < 0.15;
      // nose-in parking: the car's length runs away from the camera
      vehicles.push({ kind: vox ? 'vox' : 'car', look: vox ? VOX_LOOKS[1] : pick(rng, PARKED_LOOKS), x: sx + (bay - CAR_W / ARCH_K) / 2 + CAR_W / ARCH_K, y: 1, z: fz + 2, rotY: -Math.PI / 2 });
    }
    this.planter(c, x + 6, fz + 2);
    B.push({ x: x + w - 8, y: 1, z: fz + 4, sx: 2, sy: 46, sz: 2, c: '#3d4046' });
    c.LIT.push({ x: x + w - 10, y: 46, z: fz + 2, sx: 6, sy: 1, sz: 6, c: night ? '#ffd28a' : '#efe9d8' });
    c.pools.push({ x: x + w - 8, z: fz + 20, r: 50, c: '#ffd28a' });
    const tw = textCells('PARKING').width * 1.4;
    B.push({ x: x + 6, y: 1, z: WALK_Z + 4, sx: 1.5, sy: 22, sz: 1.5, c: '#5a5e66' });
    B.push({ x: x + 2, y: 22, z: WALK_Z + 3, sx: tw + 6, sy: 10, sz: 1, c: '#2f6fd6' });
    this.sign(B, 'PARKING', x + 5, 23.5, WALK_Z + 2.4, 1.4, '#eeeae0');
  }
  private seg_build(c: Ctx, x: number, w: number) {
    const { B, rng } = c, fz = FACADE_Z;
    B.push({ x, y: -1, z: WALK_Z + 6, sx: w, sy: 2.02, sz: 160, c: '#8a6a4a' });
    for (let px = x; px < x + w; px += 3) B.push({ x: px, y: 1, z: WALK_Z + 6, sx: 0.4, sy: 16, sz: 0.4, c: '#8c9096' });
    B.push({ x, y: 1, z: WALK_Z + 6.2, sx: w, sy: 16, sz: 0.2, c: '#9ca1a8' });
    B.push({ x, y: 8, z: WALK_Z + 6, sx: w, sy: 0.6, sz: 0.4, c: '#5a5e66' });
    const bw = Math.min(70, w - 36), bh = 70 + rng() * 60, bx = x + 10;
    B.push({ x: bx, y: 0, z: fz + 14, sx: bw, sy: bh * 0.6, sz: 50, c: '#9ca1a8' });
    for (let y = 0; y <= bh; y += 14) B.push({ x: bx, y, z: fz + 10, sx: bw, sy: 1.5, sz: 1.5, c: '#d0d4d9' });
    for (let px = bx; px <= bx + bw; px += 14) B.push({ x: px, y: 0, z: fz + 10, sx: 1.5, sy: bh, sz: 1.5, c: '#d0d4d9' });
    const tx = x + w - 20;
    for (let y = 0; y < 200; y += 8) B.push({ x: tx, y, z: fz + 40, sx: 6, sy: 7.5, sz: 6, c: (y / 8) & 1 ? '#f2c230' : '#e0b020' });
    B.push({ x: tx - 90, y: 200, z: fz + 41, sx: 120, sy: 5, sz: 4, c: '#f2c230' });
    B.push({ x: tx + 20, y: 192, z: fz + 39, sx: 14, sy: 10, sz: 8, c: '#5a5e66' });
    B.push({ x: tx - 70, y: 150, z: fz + 42.5, sx: 0.6, sy: 50, sz: 0.6, c: '#2e3036' });
    B.push({ x: tx - 73, y: 144, z: fz + 40, sx: 7, sy: 6, sz: 5, c: '#8a6a4a' });
    for (let k = 0; k < 4; k++) B.push({ x: x + 6 + rng() * (w - 20), y: 0, z: WALK_Z + 10 + rng() * 20, sx: 3, sy: 4, sz: 3, c: '#f2a43a' });
    const nm = 'VOX OIL DEV', tw = textCells(nm).width * 1.4;
    if (tw + 10 < w) { B.push({ x: x + 6, y: 3, z: WALK_Z + 5.6, sx: tw + 6, sy: 10, sz: 0.4, c: '#1a1a1e' }); this.sign(B, nm, x + 9, 4.5, WALK_Z + 5.2, 1.4, '#f2c230'); }
  }
  private seg_alley(c: Ctx, x: number, w: number) {
    const { B } = c;
    B.push({ x, y: -1, z: FACADE_Z - 2, sx: w, sy: 2.02, sz: 200, c: '#3d4046' });
    if (w >= 14) { B.push({ x: x + 2, y: 1, z: FACADE_Z + 20, sx: 10, sy: 8, sz: 6, c: '#2f5a3e' }); B.push({ x: x + 1.5, y: 9, z: FACADE_Z + 19.5, sx: 11, sy: 1, sz: 7, c: '#244630' }); }
    B.push({ x, y: 0, z: FACADE_Z + 160, sx: w, sy: 60, sz: 20, c: '#8a3e30' });
  }

  private skyline(c: Ctx, x0: number, x1: number) {
    const { B, LIT, rng, night } = c;
    const tones = this.time === 'night' ? ['#2a3248', '#323a52'] : this.time === 'dusk' ? ['#8a7a96', '#7e7090', '#968aa2'] : ['#a9b6cb', '#b4bfd0', '#9fadc4'];
    const litChance = this.time === 'night' ? 10 : 4;
    for (let sx = x0; sx < x1; sx += 60 + rng() * 50) {
      const sh = 220 + rng() * 300, sw = 50 + rng() * 40, z = 420 + rng() * 160;
      B.push({ x: sx, y: 0, z, sx: sw, sy: sh, sz: 60, c: pick(rng, tones) });
      if (night) for (let k = 0; k < litChance; k++) LIT.push({ x: sx + 3 + rng() * (sw - 8), y: 10 + rng() * (sh - 20), z: z - 0.6, sx: 4, sy: 4, sz: 0.5, c: rng() > 0.5 ? '#ffd28a' : '#9fc7ff' });
    }
  }

  private startFinish(c: Ctx, x0: number, x1: number) {
    const { B } = c;
    const checker = (lineX: number) => { for (let z = -12; z < ROAD_EDGE + 2; z += 4) for (let r = 0; r < 2; r++) B.push({ x: lineX - r * 4, y: 0, z, sx: 4, sy: 0.2, sz: 4, c: ((z / 4 + r) & 1) ? '#f4f4f0' : '#1a1a1e' }); };
    if (x0 <= -4 && -4 < x1) checker(-4);
    const fx = -this.finishBlocks;
    if (x0 <= fx && fx < x1) {
      checker(fx);
      for (const z of [-30, PARK_Z + 2]) B.push({ x: fx - 3, y: 0, z, sx: 6, sy: 100, sz: 6, c: '#2e3036' });
      for (let z = -30; z < PARK_Z + 8; z += 8) for (let r = 0; r < 3; r++) B.push({ x: fx - 3, y: 82 + r * 6, z, sx: 6, sy: 6, sz: 8, c: ((Math.round(z / 8) + r) & 1) ? '#f4f4f0' : '#1a1a1e' });
    }
    for (let m = 100; m < 1000; m += 100) {
      const bx = -m / METERS_PER_BLOCK;
      if (bx >= x0 && bx < x1 && bx > fx) {
        B.push({ x: bx, y: 0, z: PARK_Z - 1, sx: 3, sy: 34, sz: 3, c: '#3d4046' });
        const lbl = String(m), lw = textCells(lbl).width * 2.6;
        B.push({ x: bx - lw / 2 - 3, y: 30, z: PARK_Z - 2.5, sx: lw + 6, sy: 19, sz: 1.5, c: '#eeeae0' });
        this.sign(B, lbl, bx - lw / 2, 32.5, PARK_Z - 3.1, 2.6, '#1a1a1e');
      }
    }
  }
}
