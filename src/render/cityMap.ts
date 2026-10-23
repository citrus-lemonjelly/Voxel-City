// City map (V0.20.0 concept, owner Q199–Q205, 2026-10-22): the city as a voxel island at dusk that fills the whole screen —
// the sea runs off every edge into haze. Owner: "more natural, flowing, and connecting" and "as dense as possible with detail".
// No grid: an uneven coastline with a bay, hills and a mountain, a river to the sea under bridges, curving roads and a railway
// linking the districts; woods, meadows, farms, villages, beaches and boats in between, street lamps and lit windows. Neon
// Highrise lights its neighbours pink and cyan; the Oil Fields sit out past the farms; the Harbor wraps the bay.
// One dense voxel grid (greedy-meshed, the shared block shading) + a glow grid for lights. Locked districts are greyed.
// Positions are written in "design units" and scaled by K, so the island can get finer blocks (more detail) in one place.
import * as THREE from 'three';
import { Materials, VoxGrid, Vox, greedyGeometry, buildVoxMeshes } from './voxel';
import type { DistrictId } from '../data/districts';
import { makeRng } from '../game/ai';

// blocks per design unit (owner: "render down the voxel scale if necessary"); phones get slightly bigger blocks so the map
// builds quicker (owner Q227)
const K = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 1.25 : 1.6;
const S = (v: number) => Math.round(v * K);
const N = S(232), NY = 104, SEA = 3, GROUND = 6;  // water up to y 2; flat land top at y 5 (ground cells y < 6)
const IDX = (x: number, z: number) => x + N * z;

/** The districts in unlock order (car league that opens each; Harbor = after League S) and where they sit (blocks). */
export const DISTRICTS: { id: DistrictId; name: string; league: string; x: number; z: number; r: number }[] = ([
  ['downtown', 'Downtown', 'D', 64, 156, 21], ['forest', 'Daluda Forest', 'C', 50, 92, 24], ['neon', 'Neon Highrise', 'B', 108, 64, 16],
  ['oil', 'Oil Fields', 'A', 196, 46, 20], ['skyway', 'Rooftop Skyway', 'S', 172, 108, 17], ['harbor', 'The Harbor', 'S+', 170, 176, 20],
] as const).map(([id, name, league, x, z, r]) => ({ id, name, league, x: S(x), z: S(z), r: S(r) }));
const GARAGE = { x: S(122), z: S(132) };
const P = (pts: number[][]) => pts.map(p => p.map(S));

// Roads (design x, z) curve round hills and the river and link every district to the garage.
const ROADS = [
  [[122, 142], [104, 150], [86, 156], [64, 156]], [[64, 156], [44, 172], [36, 192]],
  [[64, 156], [56, 126], [46, 104], [44, 84], [56, 74], [84, 78], [96, 68]], [[122, 122], [118, 100], [110, 80], [108, 64]],
  [[108, 64], [132, 54], [156, 64], [172, 86], [172, 108]], [[172, 108], [192, 92], [204, 74], [200, 54], [196, 46]],
  [[132, 132], [144, 146], [158, 162], [170, 176]], [[170, 176], [190, 150], [190, 124], [172, 108]],
  [[64, 156], [80, 182], [110, 190], [140, 186], [170, 176]],                                        // south coast road
].map(P);
const RAIL = P([[30, 140], [40, 176], [70, 196], [110, 204], [146, 198], [166, 190], [186, 168], [206, 140], [212, 104], [206, 70]]);
const RIVER = P([[70, 58], [78, 72], [82, 88], [86, 104], [90, 132], [88, 166], [96, 200], [100, 236]]);
const SKYROAD = P([[146, 128, 0], [156, 120, 10], [164, 104, 20], [176, 98, 22], [186, 108, 22], [182, 122, 20], [196, 132, 8], [204, 140, 0]]);

export class CityMapView {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 6000);
  anchors: { id: DistrictId; pos: THREE.Vector3 }[] = [];
  /** which lock state the island was built for (it is only rebuilt when that changes — building takes a moment) */
  builtFor = -1;
  private group = new THREE.Group();
  private life = new THREE.Group();
  private sun = new THREE.DirectionalLight('#ffb27a', 2.1);
  // camera: the whole island, or gliding in on a district (V0.20.0, owner Q225)
  private ov = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private want = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private cur = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private focusId: DistrictId | null = null;
  // slow life (owner Q226): a train running the railway, sailboats circling the island
  private rail: THREE.Vector3[] = [];
  private trainCars: THREE.Group[] = [];
  private trainS = 0; private trainDir = 1;
  private boats: { g: THREE.Group; a: number; r: number; w: number }[] = [];
  private t = 0;

  constructor(private mats: Materials) {
    const s = this.scene, haze = '#3a4d6e';
    s.background = new THREE.Color(haze); s.fog = new THREE.Fog(haze, S(330), S(900));     // the sea fades into dusk haze
    s.add(new THREE.HemisphereLight('#ffd8b8', '#3a3650', 0.95));
    this.sun.position.set(-S(240), S(170), -S(150)); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);   // low dusk sun
    Object.assign(this.sun.shadow.camera, { left: -S(170), right: S(170), top: S(170), bottom: -S(170), near: 10, far: S(900) });
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.6;
    s.add(this.sun, this.sun.target, this.group, this.life, seaPlane());
    this.buildLife();
  }

  /** Build the island; districts after `openUpTo` (index into DISTRICTS; 0 = Downtown only) are greyed. */
  build(openUpTo = 5) {
    this.group.clear(); this.anchors = []; this.builtFor = openUpTo;
    const m = new MapBuilder(openUpTo);
    m.build();
    this.rail = m.railPath.map(p => new THREE.Vector3(p.x - N / 2, p.y, p.z - N / 2)); this.trainS = Math.floor(this.rail.length * 0.3);
    for (const [g, mat] of [[m.g, this.mats.trimV], [m.glow, this.mats.lightV]] as const) {
      const geo = greedyGeometry(g.grid()); geo.translate(-N / 2, 0, -N / 2);
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mat !== this.mats.lightV; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    // Neon Highrise throws coloured light on everything round it (owner)
    const nd = DISTRICTS[2], neonOpen = openUpTo >= 2;
    for (const [dx, dz, y, c] of [[-10, -6, 40, '#ff3fb4'], [11, 5, 34, '#3fe6ff'], [0, 14, 22, '#b45cff'], [-14, 12, 18, '#3fe6ff'], [16, -10, 24, '#ff3fb4']] as const) {
      const l = new THREE.PointLight(c, neonOpen ? 2200 : 500, S(70), 2); l.position.set(nd.x + dx - N / 2, y, nd.z + dz - N / 2); this.group.add(l);   // Q223: a bit softer
    }
    for (const d of DISTRICTS) this.anchors.push({ id: d.id, pos: new THREE.Vector3(d.x - N / 2, m.peak(d.x, d.z, Math.round(d.r * 0.5)) + 6, d.z - N / 2) });
  }

  resize(w: number, h: number) {
    this.cam.aspect = w / h;
    // fill the screen: frame the whole island; the sea plane covers anything beyond the coast
    const fit = Math.max(1, 1.6 / this.cam.aspect);
    this.ov.pos.set(S(16) * fit, S(232) * fit, S(214) * fit); this.ov.look.set(S(4), 0, S(-4));
    this.cam.updateProjectionMatrix();
    this.focus(this.focusId, true);
  }
  /** Glide to a district (it sits left of centre, leaving room for its panel on the right), or back to the whole island. */
  focus(id: DistrictId | null, snap = false) {
    this.focusId = id;
    const d = id ? DISTRICTS.find(x => x.id === id) : null;
    if (!d) { this.want.pos.copy(this.ov.pos); this.want.look.copy(this.ov.look); }
    else {
      const look = new THREE.Vector3(d.x - N / 2 + S(24), 0, d.z - N / 2 - S(6)), k = Math.max(1, 1.3 / this.cam.aspect);
      this.want.look.copy(look); this.want.pos.copy(look).add(new THREE.Vector3(S(8) * k, S(118) * k, S(112) * k));
    }
    if (snap) { this.cur.pos.copy(this.want.pos); this.cur.look.copy(this.want.look); this.place(); }
  }
  /** Each frame on the map screen: the camera eases to where it's going; the train and boats move on. */
  update(dt: number) {
    const k = 1 - Math.exp(-dt * 3.2);
    this.cur.pos.lerp(this.want.pos, k); this.cur.look.lerp(this.want.look, k); this.place();
    this.t += dt;
    if (this.rail.length > 200) {                                                   // the train runs end to end and back
      this.trainS += this.trainDir * dt * 22;
      const span = 30 * this.trainCars.length;
      if (this.trainS > this.rail.length - 2) { this.trainS = this.rail.length - 2; this.trainDir = -1; }
      if (this.trainS < span) { this.trainS = span; this.trainDir = 1; }
      this.trainCars.forEach((g, i) => {
        const s = this.trainDir > 0 ? this.trainS - i * 30 : this.trainS - (this.trainCars.length - 1 - i) * 30;
        const a = this.rail[Math.max(0, Math.floor(s) - 6)], b = this.rail[Math.min(this.rail.length - 1, Math.floor(s) + 6)], p = this.rail[Math.max(0, Math.min(this.rail.length - 1, Math.round(s)))];
        g.position.set(p.x, p.y, p.z); g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        g.visible = true;
      });
    }
    for (const b of this.boats) {                                                   // sailboats circling slowly, bobbing a little
      const a = b.a + this.t * b.w;
      b.g.position.set(Math.cos(a) * b.r + S(116) - N / 2, SEA - 0.5 + Math.sin(this.t * 1.3 + b.a * 5) * 0.25, Math.sin(a) * b.r + S(108) - N / 2);
      const sg = Math.sign(b.w); b.g.rotation.y = -Math.atan2(Math.cos(a) * sg, -Math.sin(a) * sg);   // bow along the way it sails
    }
  }
  private place() { this.cam.position.copy(this.cur.pos); this.cam.lookAt(this.cur.look); this.cam.updateMatrixWorld(); }
  /** Screen position (px) of a world point; `on` = in front of the camera and on screen (with a margin). */
  toScreen(p: THREE.Vector3, w: number, h: number) { this.cam.updateMatrixWorld(); const v = p.clone().project(this.cam); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, on: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.15 }; }

  /** The train (engine + five carriages) and seven sailboats, each a small voxel model. */
  private buildLife() {
    const model = (cells: [number, number, number, string, boolean?][], ox: number, oz: number) => {
      const items: Vox[] = cells.map(([x, y, z, c, lit]) => ({ x, y, z, c, role: lit ? 'light' : 'trim', s: 1 }));
      return buildVoxMeshes(items, this.mats, v => new THREE.Color(v.c ?? '#ffffff'), { x: -ox, y: 0, z: -oz });
    };
    const rng = makeRng(31);
    for (let car = 0; car < 6; car++) {
      const c = car === 0 ? '#c23a2a' : ['#2f6fb0', '#2f9a5a', '#8a8e96', '#e08a2a', '#2f6fb0'][car - 1], cells: [number, number, number, string, boolean?][] = [];
      for (let x = 0; x < 14; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
        const win = y === 1 && (z === 0 || z === 2) && x % 3 === 1 && car > 0;
        cells.push([x, y, z, y === 2 ? shade(c, 0.8) : y === 0 ? '#3a3e46' : c, win]);
        if (win) cells[cells.length - 1][3] = '#ffd890';
      }
      if (car === 0) cells.push([0, 1, 1, '#fff1a0', true]);
      const g = model(cells, 7, 1.5); g.visible = false; this.trainCars.push(g); this.life.add(g);
    }
    for (let i = 0; i < 7; i++) {
      const hull = ['#2f3a6e', '#a8322a', '#e8e4dc', '#2f6b4a', '#e0b020'][i % 5], cells: [number, number, number, string, boolean?][] = [];
      for (let x = 0; x < 12; x++) for (let z = 0; z < 4; z++) { cells.push([x, 0, z, hull]); cells.push([x, 1, z, hull]); if (z > 0 && z < 3 && x > 0 && x < 11) cells.push([x, 2, z, '#e8e4dc']); }
      for (let y = 3; y < 13; y++) cells.push([5, y, 2, '#8a6a48']);
      for (let y = 0; y < 9; y++) for (let x = 6; x < 6 + Math.max(1, 6 - Math.floor(y * 0.7)); x++) cells.push([x, 4 + y, 2, '#f6f4ee']);
      const g = model(cells, 6, 2);
      this.boats.push({ g, a: rng() * Math.PI * 2, r: S(132) + rng() * S(22), w: (rng() < 0.5 ? -1 : 1) * (0.012 + rng() * 0.01) }); this.life.add(g);
    }
  }
}

/** The open sea beyond the coast: a huge blocky water plane at sea level (1 texel = 1 block), fading into the haze. */
function seaPlane() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, cols = ['#3f7cb4', '#3b76ae', '#4482ba', '#3f7cb4', '#5590c4'];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const h = Math.sin(x * 12.9 + y * 78.2) * 43758.5; g.fillStyle = cols[Math.floor((h - Math.floor(h)) * (h - Math.floor(h)) * cols.length)]; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20000 / 64, 20000 / 64); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.position.y = SEA - 0.06; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------------
/** A dense voxel grid with a palette; cells set while `locked` are greyed (locked districts). */
class Grid {
  cells = new Uint16Array(N * NY * N);
  palette: THREE.Color[] = [];
  private idx = new Map<string, number>();
  locked = false;
  private col(hex: string) {
    const key = (this.locked ? 'L' : '') + hex;
    let i = this.idx.get(key);
    if (i === undefined) {
      const c = new THREE.Color(hex);
      if (this.locked) { const l = c.r * 0.3 + c.g * 0.55 + c.b * 0.15; c.lerp(new THREE.Color(l, l, l * 1.04), 0.8).multiplyScalar(0.78); }
      i = this.palette.length; this.palette.push(c); this.idx.set(key, i);
    }
    return i + 1;
  }
  set(x: number, y: number, z: number, hex: string) { if (x >= 0 && y >= 0 && z >= 0 && x < N && y < NY && z < N) this.cells[x + N * (y + NY * z)] = this.col(hex); }
  clear(x: number, y: number, z: number) { if (x >= 0 && y >= 0 && z >= 0 && x < N && y < NY && z < N) this.cells[x + N * (y + NY * z)] = 0; }
  get(x: number, y: number, z: number) { return x < 0 || y < 0 || z < 0 || x >= N || y >= NY || z >= N ? 0 : this.cells[x + N * (y + NY * z)]; }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, hex: string | ((x: number, y: number, z: number) => string | null)) {
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const c = typeof hex === 'string' ? hex : hex(x, y, z); if (c) this.set(x, y, z, c); }
  }
  grid(): VoxGrid { return { nx: N, ny: NY, nz: N, cells: this.cells, palette: this.palette }; }
}

const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k))).getHexString();
const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Value noise (seeded), 0–1, three octaves; feature size in design units × `scale`. */
function noise2(seed: number) {
  const h = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const base = (x: number, z: number) => {
    const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return (h(x0, z0) * (1 - u) + h(x0 + 1, z0) * u) * (1 - v) + (h(x0, z0 + 1) * (1 - u) + h(x0 + 1, z0 + 1) * u) * v;
  };
  return (x: number, z: number, scale = 1) => { const s = K * scale; return base(x / (28 * s), z / (28 * s)) * 0.6 + base(x / (12 * s), z / (12 * s)) * 0.3 + base(x / (5 * s), z / (5 * s)) * 0.1; };
}

/** A sampled curve through control points [x, z, height?] (blocks). */
function curve(pts: number[][], step = 0.45) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[2] ?? 0, p[1])), false, 'centripetal');
  return c.getSpacedPoints(Math.max(8, Math.round(c.getLength() / step)));
}

class MapBuilder {
  g = new Grid(); glow = new Grid();
  private H = new Int16Array(N * N);            // land height (filled cells; 0 = sea)
  private kind = new Uint8Array(N * N);         // 0 sea · 1 land · 2 beach · 3 road · 4 road line · 5 river · 6 bridge
  private rail = new Uint8Array(N * N);         // 1 ballast · 2 steel rail
  private reg = new Int8Array(N * N).fill(-1);  // district index or -1
  private taken = new Uint8Array(N * N);        // something already stands here
  private rng = makeRng(77);
  private n = noise2(3); private n2 = noise2(9);
  constructor(private openUpTo: number) {}

  private use(k: number) { this.g.locked = this.glow.locked = k >= 0 && k > this.openUpTo; }
  private R(n: number) { return Math.floor(this.rng() * n); }
  private pick<T>(a: readonly T[]) { return a[this.R(a.length) % a.length]; }
  peak(x: number, z: number, r: number) { let t = GROUND; for (let zz = z - r; zz <= z + r; zz += 2) for (let xx = x - r; xx <= x + r; xx += 2) for (let y = NY - 1; y > t; y--) if (this.g.get(xx, y, zz)) { t = y; break; } return t + 1; }
  private land(x: number, z: number) { return x >= 0 && z >= 0 && x < N && z < N && this.kind[IDX(x, z)] === 1; }

  build() {
    this.terrain(); this.paintGround();
    this.downtown(); this.forest(); this.neon(); this.oil(); this.skyway(); this.harbor();
    this.use(-1);
    this.garage(); this.farms(); this.villages(); this.beaches(); this.woods(); this.lamps(); this.sea(); this.traffic(); this.train(); this.clutter();
  }

  // ---- island shape, hills, river, roads, railway ----
  private terrain() {
    const cx = S(116), cz = S(108);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const r = dist(x, z, cx, cz) / S(100) - (this.n(x, z, 1.6) - 0.5) * 0.42;
      const bay = 1 - dist(x, z, S(194), S(198)) / S(30);                          // the Harbor's bay
      if (r >= 1 || bay >= 0.15) continue;
      const i = IDX(x, z);
      this.kind[i] = r > 0.94 || bay > 0 ? 2 : 1;
      let h = GROUND + Math.round((this.n2(x, z) - 0.45) * 10);                      // rolling ground
      h += Math.round(16 * smooth(1 - dist(x, z, S(46), S(84)) / S(40)));            // forest hills
      h += Math.round(44 * smooth(1 - dist(x, z, S(62), S(52)) / S(28)) * (0.8 + this.n(x, z, 0.4) * 0.4));   // the mountain
      this.H[i] = this.kind[i] === 2 ? GROUND - 1 : Math.max(GROUND - 1, h);
      DISTRICTS.forEach((d, k) => { if (dist(x, z, d.x, d.z) < d.r * (0.85 + this.n(x + k * 500, z, 0.5) * 0.4)) this.reg[i] = k; });
    }
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {                        // flatten towns and the garage yard
      const i = IDX(x, z); if (!this.kind[i]) continue;
      for (const [px, pz, r] of [[GARAGE.x, GARAGE.z, S(24)], ...DISTRICTS.filter(d => d.id !== 'forest').map(d => [d.x, d.z, d.r + S(d.id === 'neon' ? 34 : 12)])]) {
        this.H[i] = Math.round(GROUND + (this.H[i] - GROUND) * smooth((dist(x, z, px, pz) - r * 0.6) / (r * 0.5)));
      }
    }
    const RW = 3.6;                                                                    // river half-width
    for (const p of curve(RIVER)) for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      const x = Math.round(p.x + dx), z = Math.round(p.z + dz); if (x < 0 || z < 0 || x >= N || z >= N) continue;
      const i = IDX(x, z), d = Math.hypot(x - p.x, z - p.z); if (!this.kind[i]) continue;
      if (d < RW) { this.kind[i] = 5; this.H[i] = SEA - 1; } else if (d < RW + 2 && this.kind[i] !== 5) this.H[i] = Math.min(this.H[i], GROUND);
    }
    const strip = (pts: number[][], half: number, mark: (i: number, dd: number, k: number) => void) => {
      const ps = curve(pts), hs = ps.map(p => { const i = IDX(Math.round(p.x), Math.round(p.z)); return this.kind[i] === 5 || !this.kind[i] ? GROUND : Math.max(GROUND, this.H[i]); });
      const sm = hs.map((_, k) => { let s = 0, c = 0; for (let j = k - 20; j <= k + 20; j++) if (hs[j] !== undefined) { s += hs[j]; c++; } return Math.round(s / c); });
      ps.forEach((p, k) => {
        for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
          const x = Math.round(p.x + dx), z = Math.round(p.z + dz); if (x < 0 || z < 0 || x >= N || z >= N) continue;
          const i = IDX(x, z), dd = Math.hypot(x - p.x, z - p.z), kd = this.kind[i];
          if (!kd) continue;
          if (dd < half) { if (kd === 5 || kd === 6) { this.kind[i] = 6; mark(i, dd, k); continue; } this.H[i] = sm[k]; mark(i, dd, k); }
          else if (dd < half + 2 && kd !== 3 && kd !== 4 && kd !== 5 && kd !== 6 && !this.rail[i]) this.H[i] = Math.round((this.H[i] + sm[k]) / 2);
        }
      });
    };
    for (const pts of ROADS) strip(pts, 2.8, (i, dd, k) => { if (this.kind[i] === 6) return; if (this.kind[i] !== 4) this.kind[i] = dd < 0.55 && Math.floor(k / 7) % 2 === 0 ? 4 : 3; });
    strip(RAIL, 2.2, (i, dd) => { if (this.kind[i] === 3 || this.kind[i] === 4) return; this.rail[i] = Math.abs(dd - 1) < 0.5 ? 2 : 1; if (this.kind[i] !== 6) this.kind[i] = 1; this.taken[i] = 1; });
  }

  private surface(x: number, z: number, i: number): string {
    const k = this.kind[i], h = this.H[i], r = this.reg[i], v = this.n(x * 3, z * 3, 0.2);
    if (this.rail[i]) return this.rail[i] === 2 ? '#9aa0a8' : (x + z) % 3 === 0 ? '#6a4a30' : '#6e655c';
    if (k === 3) return (x * 7 + z * 3) % 13 === 0 ? '#41454e' : '#3a3e46';
    if (k === 4) return '#e2c23a';
    if (k === 2) return v > 0.55 ? '#e0d2aa' : '#d4c7a0';
    const id = r >= 0 ? DISTRICTS[r].id : '';
    if (id === 'oil') return v > 0.6 ? '#9c7a4e' : v > 0.4 ? '#b38f64' : '#a8865a';
    if (id === 'downtown' || id === 'neon' || id === 'skyway' || id === 'harbor' || dist(x, z, GARAGE.x, GARAGE.z) < S(15)) return (x + z) % 7 === 0 ? '#9c9a94' : (x * 3 + z) % 11 === 0 ? '#b6b4ac' : '#adaba3';
    if (h > GROUND + 34) return '#f2f4f6';                                             // snow
    if (h > GROUND + 24) return v > 0.5 ? '#8a8a88' : (x + z) % 4 ? '#7a7a78' : '#9a9a96';   // rock
    if (h > GROUND + 17) return v > 0.5 ? '#6f8a4a' : '#7a7a68';
    if (this.n2(x + 3000, z, 0.7) > 0.64) return (x * 3 + z) % 17 === 0 ? '#e8d24a' : (x + z * 5) % 23 === 0 ? '#e86a8a' : '#7cb04e';   // flower meadows
    return v > 0.62 ? '#5f9e46' : v > 0.32 ? '#6aaa4c' : '#73b252';
  }

  private paintGround() {
    const g = this.g, near = this.nearLand();
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = IDX(x, z), k = this.kind[i];
      this.use(this.reg[i]);
      if (!k) {                                                                            // shallows near the coast (the open sea is the plane)
        const d = near[i]; if (d > 14) continue;
        const c = d < 2 ? '#7cc0d8' : d < 5 ? '#5aa8cc' : d < 9 ? '#4a94c4' : '#4286bc';
        for (let y = 0; y < SEA; y++) g.set(x, y, z, d < 2 && (x * 5 + z * 3) % 7 === 0 ? '#e8f4f8' : c);   // a little surf on the shore
        continue;
      }
      const h = this.H[i];
      for (let y = 0; y < h; y++) g.set(x, y, z, y < 2 ? '#5d5c58' : y < h - 1 ? (y % 3 === 0 ? '#6e5a44' : '#7a6248') : this.surface(x, z, i));
      if (k === 5) g.set(x, SEA - 1, z, (x + z) % 9 === 0 ? '#6ab0d8' : '#4f9ac8');
      if (k === 6) { for (let y = 0; y < SEA; y++) g.set(x, y, z, '#4f9ac8'); g.set(x, GROUND - 1, z, this.rail[i] ? (this.rail[i] === 2 ? '#9aa0a8' : '#5a4a3a') : '#4a4e56'); }
    }
    this.use(-1);
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) if (this.kind[IDX(x, z)] === 6 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => this.kind[IDX(x + a, z + b)] === 5)) g.set(x, GROUND, z, '#c8ccd2');
  }
  private nearLand() {                                                                     // distance to land, up to 20
    const c = new Uint8Array(N * N).fill(20);
    for (let i = 0; i < N * N; i++) if (this.kind[i]) c[i] = 0;
    for (let pass = 0; pass < 20; pass++) for (let zz = 1; zz < N - 1; zz++) for (let xx = 1; xx < N - 1; xx++) {
      const i = IDX(xx, zz); c[i] = Math.min(c[i], c[i - 1] + 1, c[i + 1] + 1, c[i - N] + 1, c[i + N] + 1);
    }
    return c;
  }

  /** Free flat ground for a footprint (land at ground height, nothing built), with `pad` blocks round it. */
  private free(x0: number, z0: number, w: number, d: number, pad = 1, flat = true) {
    for (let z = z0 - pad; z < z0 + d + pad; z++) for (let x = x0 - pad; x < x0 + w + pad; x++) {
      if (x < 0 || z < 0 || x >= N || z >= N) return false;
      const i = IDX(x, z);
      if (this.kind[i] !== 1 || (flat && this.H[i] !== GROUND) || this.taken[i]) return false;
    }
    return true;
  }
  private take(x0: number, z0: number, w: number, d: number) { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && z >= 0 && x < N && z < N) this.taken[IDX(x, z)] = 1; }

  /** A building with window rows (some lit), roof clutter, and `tint` washing it toward a colour (neon spill). Returns roof y. */
  private tower(x0: number, z0: number, w: number, d: number, h: number, wall: string, win: string, lit = 0.25, tint?: [string, number], litCol = '#ffd890') {
    const g = this.g, gl = this.glow, y0 = GROUND, rng = this.rng;
    const W = tint ? mix(wall, tint[0], tint[1] * 0.45) : wall, Wn = tint ? mix(win, tint[0], tint[1] * 0.7) : win;
    for (let z = z0; z < z0 + d; z++) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const face = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
      if (!face) { if (y === y0 + h - 1 || x === x0 + 1 || z === z0 + 1) g.set(x, y, z, W); continue; }   // hollow inside (lighter grid)
      const along = x === x0 || x === x0 + w - 1 ? z - z0 : x - x0, corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
      const isWin = !corner && y > y0 + 1 && (y - y0) % 3 !== 0 && along % 2 === 1;
      if (isWin && rng() < lit) gl.set(x, y, z, tint && rng() < tint[1] ? tint[0] : litCol); else g.set(x, y, z, isWin ? Wn : y === y0 ? shade(W, 0.82) : W);
    }
    const top = y0 + h;
    g.box(x0, top, z0, x0 + w, top + 1, z0 + d, (x, _y, z) => (x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + d - 1 ? shade(W, 0.7) : shade(W, 0.86)));   // roof with a parapet edge
    // roof clutter: AC units, a water tank on legs, an antenna, a garden or helipad on big roofs
    const r = rng();
    if (w >= 6 && d >= 6) {
      if (r < 0.3) { g.box(x0 + 1, top + 1, z0 + 1, x0 + 3, top + 2, z0 + 3, '#9a9a96'); g.box(x0 + w - 3, top + 1, z0 + d - 3, x0 + w - 1, top + 2, z0 + d - 2, '#8e8e8a'); }
      else if (r < 0.5) { g.box(x0 + 2, top + 1, z0 + 2, x0 + 3, top + 3, z0 + 3, '#5a4a3a'); g.box(x0 + 4, top + 1, z0 + 2, x0 + 5, top + 3, z0 + 3, '#5a4a3a'); g.box(x0 + 1, top + 3, z0 + 1, x0 + 6, top + 6, z0 + 4, '#8a5a3a'); g.box(x0 + 2, top + 6, z0 + 2, x0 + 5, top + 7, z0 + 3, '#6a4a2a'); }
      else if (r < 0.62) { g.box(x0 + Math.floor(w / 2), top + 1, z0 + Math.floor(d / 2), x0 + Math.floor(w / 2) + 1, top + 6, z0 + Math.floor(d / 2) + 1, '#8a8e96'); gl.set(x0 + Math.floor(w / 2), top + 6, z0 + Math.floor(d / 2), '#ff4040'); }
      else if (r < 0.74 && w >= 8 && d >= 8) g.box(x0 + 1, top + 1, z0 + 1, x0 + w - 1, top + 2, z0 + d - 1, (x, _y, z) => ((x + z) % 3 === 0 ? '#4f8a3a' : '#5c9a42'));
    }
    this.take(x0, z0, w, d);
    return top + 1;
  }
  /** Scatter up to `count` buildings round (cx, cz) within r (denser in the middle); `make` builds each. */
  private town(k: number, cx: number, cz: number, r: number, count: number, make: (x: number, z: number, w: number, d: number, dd: number) => void, size: [number, number] = [6, 10], pad = 1) {
    for (let tries = 0, made = 0; tries < count * 40 && made < count; tries++) {
      const a = this.rng() * Math.PI * 2, rr = Math.sqrt(this.rng()) * r, w = size[0] + this.R(size[1] - size[0] + 1), d = size[0] + this.R(size[1] - size[0] + 1);
      const x = Math.round(cx + Math.cos(a) * rr - w / 2), z = Math.round(cz + Math.sin(a) * rr - d / 2);
      if (!this.free(x, z, w, d, pad)) continue;
      this.use(k); make(x, z, w, d, rr); made++;
    }
  }

  // ---- districts ----
  private downtown() {
    const d = DISTRICTS[0];
    this.town(0, d.x, d.z, d.r + 6, 70, (x, z, w, dd, rr) => {
      const [wall, win] = this.pick([['#c8b89a', '#5a7a9a'], ['#a8503c', '#3c4a5c'], ['#8e98a8', '#7fb2d8'], ['#d8d2c4', '#4a6888'], ['#6f7a88', '#9cc8e8'], ['#b86a48', '#3c4a5c'], ['#9a8f84', '#6a8aa8']] as const);
      this.tower(x, z, w, dd, Math.max(6, Math.round(34 - rr * 0.75 + this.rng() * 8)), wall, win, 0.32);
      if (this.rng() < 0.5) this.g.box(x + 1, GROUND + 1, z + dd, x + w - 1, GROUND + 2, z + dd + 1, this.pick(['#c23a2a', '#2f6fb0', '#2f9a5a', '#e0b020'] as const));   // shop awning
    });
  }
  private forest() {
    const d = DISTRICTS[1]; this.use(1);
    for (let i = 0; i < 1400; i++) {
      const a = this.rng() * Math.PI * 2, rr = Math.sqrt(this.rng()) * d.r * 1.25, x = Math.round(d.x + Math.cos(a) * rr), z = Math.round(d.z + Math.sin(a) * rr);
      const ii = IDX(x, z); if (!this.land(x, z) || this.taken[ii] || this.H[ii] > GROUND + 24) continue;
      if (this.rng() < 0.82) this.pine(x, z, this.H[ii], 6 + this.R(9), this.pick(['#2f6b3a', '#3d7d40', '#28603a'] as const)); else this.birch(x, z, this.H[ii]);
    }
    // timber lodges with a lit porch, and a campfire
    for (let i = 0; i < 4; i++) {
      const lx = d.x - 8 + this.R(24), lz = d.z - 8 + this.R(24);
      if (!this.free(lx, lz, 8, 6, 1, false)) continue;
      const y0 = this.H[IDX(lx, lz)];
      this.g.box(lx, y0, lz, lx + 8, y0 + 4, lz + 6, '#8a5a34'); for (let k = 0; k < 4; k++) this.g.box(lx - 1 + k, y0 + 4 + k, lz - 1, lx + 9 - k, y0 + 5 + k, lz + 7, '#a83a2a');
      this.glow.set(lx + 4, y0 + 1, lz + 6, '#ffd890'); this.glow.set(lx + 4, y0, lz + 9, '#ff8a2a'); this.take(lx - 1, lz - 1, 10, 11);
    }
  }
  private neon() {
    const d = DISTRICTS[2];
    this.town(2, d.x, d.z, d.r + 4, 26, (x, z, w, dd) => {                              // dark towers: glowing tubes, signs, aircraft lights
      const tube = this.pick(['#ff3fb4', '#3fe6ff', '#b45cff', '#ffd23f'] as const);
      const y1 = this.tower(x, z, w, dd, 30 + this.R(40), '#262836', this.pick(['#3a3458', '#2d3a56', '#40304a'] as const), 0.3, [tube, 0.45], tube);
      for (let y = GROUND + 2; y < y1 - 1; y++) for (const [a, b] of [[x - 1, z + dd], [x + w, z + dd]]) this.glow.set(a, y, b, tube);
      for (let n = 0; n < 2; n++) {
        const sy = y1 - 4 - this.R(Math.max(4, y1 - GROUND - 10)), sign = this.pick(['#ff3fb4', '#3fe6ff', '#7dff6a', '#ffd23f'] as const);
        this.glow.box(x + 1, sy, z + dd, x + w - 1, sy + 2, z + dd + 1, (px) => (px % 3 === 0 ? null : sign));
      }
      this.glow.box(x - 1, GROUND, z + dd, x + w + 1, GROUND + 1, z + dd + 1, tube);                  // street-level glow strip
    }, [7, 11]);
    this.town(-1, d.x, d.z, d.r + S(26), 70, (x, z, w, dd, rr) => {                   // its neighbours, washed in pink and cyan
      const k = 1 - Math.max(0, rr - d.r) / S(26), c = this.rng() < 0.5 ? '#ff3fb4' : '#3fe6ff';
      this.use(this.reg[IDX(x, z)]);
      this.tower(x, z, w, dd, 6 + this.R(10) + Math.round(10 * k), this.pick(['#8a8478', '#9a8a7a', '#7a8290', '#a88a7a'] as const), '#3c4a5c', 0.3 + 0.45 * k, [c, 0.65 * k]);
    }, [5, 8]);
  }
  private oil() {
    const d = DISTRICTS[3], g = this.g; this.use(3);
    const tank = (cx: number, cz: number, r: number, h: number) => {
      for (let pz = cz - r; pz <= cz + r; pz++) for (let px = cx - r; px <= cx + r; px++) if ((px - cx) ** 2 + (pz - cz) ** 2 <= r * r + 1 && this.land(px, pz))
        g.box(px, GROUND, pz, px + 1, GROUND + h, pz + 1, (_a, y) => (y === GROUND + h - 2 ? '#c23a2a' : y === GROUND + h - 1 ? '#bfc2c6' : (px + y) % 5 === 0 ? '#d4d2cc' : '#e4e2dc'));
      this.take(cx - r - 1, cz - r - 1, 2 * r + 3, 2 * r + 3);
    };
    for (const [ox, oz, r, h] of [[-14, -9, 6, 10], [-3, -16, 5, 9], [-18, 6, 5, 8], [-6, -4, 4, 7], [4, -12, 3, 6]]) tank(d.x + ox, d.z + oz, r, h);
    const jack = (px: number, pz: number) => {
      if (!this.free(px - 2, pz, 11, 3, 1)) return;
      g.box(px, GROUND, pz, px + 7, GROUND + 1, pz + 3, '#55585e'); g.box(px + 3, GROUND + 1, pz + 1, px + 4, GROUND + 6, pz + 2, '#3e4248');
      g.box(px - 1, GROUND + 6, pz + 1, px + 8, GROUND + 7, pz + 2, '#e0b020'); g.box(px - 2, GROUND + 3, pz + 1, px, GROUND + 7, pz + 2, '#3e4248');
      g.box(px + 6, GROUND + 1, pz, px + 8, GROUND + 4, pz + 3, '#c23a2a'); this.take(px - 2, pz, 11, 3);
    };
    for (let i = 0; i < 60; i++) jack(d.x - d.r + this.R(d.r * 2), d.z - d.r + this.R(d.r * 2));
    for (const [ox, oz] of [[10, 6], [-8, 14]]) for (let y = 0; y < 26; y++) {                       // derricks
      const r = Math.max(1, 4 - Math.floor(y / 6)); for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.set(d.x + ox + a, GROUND + y, d.z + oz + b, y % 4 === 0 ? '#9a3a2a' : '#7a7e86');
      if (y === 25) this.glow.set(d.x + ox, GROUND + 26, d.z + oz, '#ff4040');
    }
    g.box(d.x + 16, GROUND, d.z - 14, d.x + 17, GROUND + 18, d.z - 13, '#6d7076'); this.glow.box(d.x + 15, GROUND + 18, d.z - 15, d.x + 18, GROUND + 21, d.z - 12, '#ff8a2a');   // flare stack
    for (let x = d.x - d.r; x < d.x + d.r; x++) for (const z of [d.z + 2, d.z + 3]) if (this.land(x, z) && !this.taken[IDX(x, z)]) g.set(x, GROUND, z, '#6d7076');   // pipelines
    for (let i = 0; i < 6; i++) { const sx = d.x - d.r + this.R(d.r * 2), sz = d.z - d.r + this.R(d.r * 2); if (this.free(sx, sz, 6, 4, 1)) { g.box(sx, GROUND, sz, sx + 6, GROUND + 3, sz + 4, '#8a8e96'); g.box(sx, GROUND + 3, sz, sx + 6, GROUND + 4, sz + 4, '#5a5e66'); this.take(sx, sz, 6, 4); } }   // sheds
  }
  private skyway() {
    const d = DISTRICTS[4];
    this.town(4, d.x, d.z, d.r + 6, 36, (x, z, w, dd) => {
      const [wall, win] = this.pick([['#b8bcc4', '#6a8aa8'], ['#d2c8b4', '#4e6a86'], ['#7f8896', '#a8d0ee'], ['#c4c8d0', '#3c5a7a']] as const);
      const top = this.tower(x, z, w, dd, 22 + this.R(22), wall, win, 0.36);
      if (w >= 9 && dd >= 9 && this.rng() < 0.4) { this.g.box(x + 2, top, z + 2, x + w - 2, top + 1, z + dd - 2, '#3a3e46'); this.g.box(x + Math.floor(w / 2) - 1, top + 1, z + 3, x + Math.floor(w / 2), top + 2, z + dd - 3, '#f2f2f2'); }   // helipad
    }, [7, 11]);
    this.use(4);                                                                         // the raised road, weaving between the towers on pillars
    const ps = curve(SKYROAD, 0.4);
    ps.forEach((p, k) => {
      const y = GROUND + Math.round(p.y);
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const x = Math.round(p.x + dx), z = Math.round(p.z + dz), dd = Math.hypot(x - p.x, z - p.z); if (dd > 2.7) continue;
        for (let yy = y; yy < y + 5; yy++) this.g.clear(x, yy, z);
        this.g.set(x, y - 1, z, dd < 0.6 && Math.floor(k / 6) % 2 === 0 ? '#e2c23a' : '#3a3e46');
        if (dd > 2.1 && p.y > 2) this.g.set(x, y, z, '#c8ccd2');
      }
      if (k % 26 === 13 && p.y > 4) this.g.box(Math.round(p.x) - 1, GROUND, Math.round(p.z) - 1, Math.round(p.x) + 1, y - 1, Math.round(p.z) + 1, '#8e939c');
      if (k % 20 === 0 && p.y > 4) this.glow.set(Math.round(p.x), y + 1, Math.round(p.z) + 3, '#ffe2a0');
    });
    const top = ps[Math.floor(ps.length * 0.45)];
    for (let i = -3; i <= 3; i++) this.g.set(Math.round(top.x) + i, GROUND + Math.round(top.y) + 4, Math.round(top.z), i % 2 ? '#1a1a1e' : '#f2f2f2');
  }
  private harbor() {
    const d = DISTRICTS[5], g = this.g; this.use(5);
    for (let i = 0; i < 260; i++) {                                                        // the container yard
      const x = d.x - d.r + this.R(d.r * 2), z = d.z - d.r + this.R(d.r * 2), along = this.rng() < 0.6, w = along ? 7 : 3, dd = along ? 3 : 7;
      if (!this.free(x, z, w, dd, 0)) continue;
      const h = 1 + this.R(4);
      for (let k = 0; k < h; k++) { const c = this.pick(['#c23a2a', '#2f6fb0', '#2f9a5a', '#e08a2a', '#7a3ab0', '#d8d2c4', '#a8a8a8'] as const); g.box(x, GROUND + k * 3, z, x + w, GROUND + k * 3 + 3, z + dd, (px, _y, pz) => ((along ? px - x : pz - z) % 2 ? c : shade(c, 0.85))); }
      this.take(x, z, w, dd);
    }
    for (let i = 0; i < 5; i++) {                                                          // warehouses
      const x = d.x - d.r - 8 + this.R(d.r), z = d.z - d.r + this.R(d.r * 2);
      if (!this.free(x, z, 14, 9, 1)) continue;
      g.box(x, GROUND, z, x + 14, GROUND + 6, z + 9, (px, y) => (y < GROUND + 4 && px % 4 === 1 ? '#5a5e66' : '#9aa0a8'));
      for (let k = 0; k < 3; k++) g.box(x, GROUND + 6 + k, z + k, x + 14, GROUND + 7 + k, z + 9 - k, '#6a7078');
      this.take(x, z, 14, 9);
    }
    for (const [ox, oz] of [[14, 2], [6, 14], [-2, 22]]) {                                 // cranes on the bay's edge, booms over the water
      const cx = d.x + ox, cz = d.z + oz;
      for (const [a, b] of [[0, 0], [6, 0], [0, 6], [6, 6]]) g.box(cx + a, GROUND, cz + b, cx + a + 1, GROUND + 26, cz + b + 1, '#e0b020');
      g.box(cx - 2, GROUND + 26, cz + 2, cx + 32, GROUND + 28, cz + 5, '#e0b020');
      g.box(cx + 1, GROUND + 22, cz + 1, cx + 6, GROUND + 26, cz + 6, '#c23a2a');
      g.box(cx + 20, GROUND + 9, cz + 3, cx + 21, GROUND + 26, cz + 4, '#3e4248'); g.box(cx + 17, GROUND + 6, cz + 1, cx + 24, GROUND + 9, cz + 6, '#2f6fb0');
      this.glow.set(cx + 31, GROUND + 28, cz + 3, '#ff4040');
    }
    // a lighthouse on the far point
    let best = -1, bx = 0, bz = 0;
    for (let z = S(140); z < S(200); z++) for (let x = S(190); x < N; x++) if (this.kind[IDX(x, z)] && x + z > best) { best = x + z; bx = x; bz = z; }
    if (best > 0) { const y0 = this.H[IDX(bx, bz)]; for (let y = 0; y < 22; y++) g.box(bx - 1, y0 + y, bz - 1, bx + 2, y0 + y + 1, bz + 2, y % 5 < 3 ? '#e8e4dc' : '#c23a2a'); this.glow.box(bx - 1, y0 + 22, bz - 1, bx + 2, y0 + 24, bz + 2, '#fff1a0'); g.box(bx - 2, y0 + 24, bz - 2, bx + 3, y0 + 25, bz + 3, '#3a3e46'); }
  }

  /** Your garage near the middle (no tag — owner): roll-up door facing the camera, yellow sign band, your car outside. */
  private garage() {
    const g = this.g, bx = GARAGE.x - 13, bz = GARAGE.z - 9, w = 26, d = 18, h = 10;
    g.box(bx, GROUND, bz, bx + w, GROUND + h, bz + d, (px, y, pz) => (pz === bz + d - 1 && px > bx + 5 && px < bx + w - 6 && y < GROUND + 7 ? (y % 2 ? '#8a8e96' : '#7a7e86') : (y === GROUND + h - 2 ? '#e2c23a' : '#d4d6da')));
    g.box(bx - 1, GROUND + h, bz - 1, bx + w + 1, GROUND + h + 1, bz + d + 1, '#4a4e58');
    this.glow.box(bx + 6, GROUND + 7, bz + d, bx + w - 6, GROUND + 8, bz + d + 1, '#ffe7a0');
    g.box(bx + 10, GROUND, bz + d + 4, bx + 16, GROUND + 2, bz + d + 7, '#d23a2a'); g.box(bx + 11, GROUND + 2, bz + d + 4, bx + 14, GROUND + 3, bz + d + 7, '#3c4a5c');
    this.take(bx - 2, bz - 2, w + 4, d + 12);
  }
  /** Farm fields with fences, haystacks, a barn and silo, wind turbines — on the plains out towards the Oil Fields. */
  private farms() {
    const g = this.g;
    for (const [fx, fz, w, d, c] of [[146, 24, 24, 16, '#d8b84a'], [176, 64, 16, 12, '#8fbf4a'], [132, 80, 14, 10, '#c9a83c'], [150, 42, 14, 10, '#b8c84a'], [212, 92, 10, 14, '#d8b84a']] as const) {
      const x0 = S(fx), z0 = S(fz), x1 = x0 + S(w), z1 = z0 + S(d);
      for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
        const ii = IDX(x, z); if (!this.land(x, z) || this.taken[ii] || this.reg[ii] >= 0) continue;
        const edge = x === x0 || z === z0 || x === x1 - 1 || z === z1 - 1;
        g.set(x, this.H[ii] - 1, z, (x + z) % 3 === 0 ? shade(c, 0.78) : c);
        if (edge && (x + z) % 2 === 0) g.set(x, this.H[ii], z, '#8a6a48');                        // fence posts
        else if (!edge && this.rng() < 0.012) g.box(x, this.H[ii], z, x + 2, this.H[ii] + 2, z + 2, '#e0c060');   // haystack
        this.taken[ii] = 1;
      }
      const bx = x1 + 3, bz = z0 + 2;                                                        // barn + silo by each field
      if (this.free(bx, bz, 8, 6, 1, false)) {
        const y0 = this.H[IDX(bx, bz)];
        g.box(bx, y0, bz, bx + 8, y0 + 4, bz + 6, '#a8322a'); for (let k = 0; k < 3; k++) g.box(bx - 1 + k, y0 + 4 + k, bz, bx + 9 - k, y0 + 5 + k, bz + 6, '#5a3a2a');
        g.box(bx + 1, y0, bz + 6, bx + 3, y0 + 3, bz + 7, '#e8e4dc');
        for (let y = 0; y < 9; y++) g.box(bx + 9, y0 + y, bz + 1, bx + 12, y0 + y + 1, bz + 4, y === 8 ? '#9aa0a8' : '#c8ccd2');
        this.take(bx - 1, bz - 1, 14, 9);
      }
    }
    for (const [tx, tz] of [[166, 18], [216, 78], [140, 30], [210, 22], [188, 16], [224, 50]]) {
      const x = S(tx), z = S(tz), ii = IDX(x, z); if (!this.land(x, z)) continue;
      const y0 = this.H[ii]; g.box(x, y0, z, x + 1, y0 + 26, z + 1, '#eef0f2'); g.box(x - 7, y0 + 26, z + 1, x + 8, y0 + 27, z + 2, '#eef0f2'); g.box(x, y0 + 19, z + 1, x + 1, y0 + 34, z + 2, '#eef0f2');
      g.box(x, y0 + 25, z - 1, x + 1, y0 + 28, z + 1, '#c8ccd2'); this.glow.set(x, y0 + 28, z, '#ff4040'); this.taken[ii] = 1;
    }
  }
  /** Little villages: houses with gardens along every road between the towns. */
  private villages() {
    for (const pts of [...ROADS, RAIL]) curve(pts, 2.4).forEach(p => {
      if (this.rng() > 0.55) return;
      const side = this.rng() < 0.5 ? -1 : 1, x = Math.round(p.x + side * (6 + this.rng() * 6)), z = Math.round(p.z + (this.rng() - 0.5) * 8);
      if (x < 2 || z < 2 || x >= N - 10 || z >= N - 10) return;
      const ii = IDX(x, z); if (this.reg[ii] >= 0 || dist(x, z, GARAGE.x, GARAGE.z) < S(18) || !this.free(x - 1, z - 1, 7, 7, 0, false)) return;
      this.house(x, z, this.H[ii]);
    });
  }
  private house(x: number, z: number, y0: number) {
    const g = this.g, wall = this.pick(['#e8e0cc', '#d8c8a8', '#c8d4dc', '#e4d0c0', '#f0e8d8'] as const), roof = this.pick(['#a83a2a', '#5a6a8a', '#6a4a3a', '#3f6a4a', '#8a3a3a'] as const);
    g.box(x, y0, z, x + 5, y0 + 3, z + 4, wall);
    g.box(x - 1, y0 + 3, z - 1, x + 6, y0 + 4, z + 5, roof); g.box(x, y0 + 4, z, x + 5, y0 + 5, z + 4, roof); g.box(x + 1, y0 + 5, z + 1, x + 4, y0 + 6, z + 3, roof);
    g.box(x + 4, y0 + 5, z + 1, x + 5, y0 + 7, z + 2, '#7a6a5a');                                     // chimney
    g.set(x + 2, y0, z + 4, '#5a3a2a');
    if (this.rng() < 0.65) this.glow.set(x + 1, y0 + 1, z + 4, '#ffd890');
    for (let k = -1; k <= 5; k++) { if (this.land(x + k, z + 6)) g.set(x + k, y0, z + 6, '#4f8a3a'); }   // hedge
    if (this.rng() < 0.6) this.round(x + 7, z + 2, y0, '#4f9a40', false);
    this.take(x - 1, z - 1, 9, 8);
  }
  /** Beaches: umbrellas and towels on the sand, a beach hut. */
  private beaches() {
    for (let i = 0; i < 900; i++) {
      const x = this.R(N), z = this.R(N), ii = IDX(x, z);
      if (this.kind[ii] !== 2 || this.taken[ii] || this.reg[ii] >= 0) continue;
      if (this.rng() < 0.5) continue;
      const c = this.pick(['#e83a3a', '#2f6fb0', '#e0b020', '#2f9a5a', '#e86aa8'] as const);
      this.g.box(x, GROUND - 1, z, x + 1, GROUND + 2, z + 1, '#e8e4dc');
      this.g.box(x - 1, GROUND + 2, z - 1, x + 2, GROUND + 3, z + 2, (px, _y, pz) => ((px + pz) % 2 ? c : '#f2f2f2'));
      this.g.box(x + 2, GROUND - 1, z, x + 4, GROUND, z + 1, this.pick(['#e86aa8', '#3fa8e8', '#f2d24a'] as const));
      this.take(x - 2, z - 2, 6, 5);
    }
  }
  /** Woods in patches, lone trees in the meadows, pines up the slopes; bushes and flowers everywhere. */
  private woods() {
    for (let i = 0; i < 26000; i++) {
      const x = 2 + this.R(N - 4), z = 2 + this.R(N - 4), ii = IDX(x, z);
      if (!this.land(x, z) || this.taken[ii] || this.reg[ii] >= 0 || dist(x, z, GARAGE.x, GARAGE.z) < S(18)) continue;
      const h = this.H[ii], wood = this.n(x + 900, z + 400, 0.9);
      if (h > GROUND + 26) { if (this.rng() < 0.04) this.rock(x, z, h); continue; }             // bare rock and snow up top
      if (h > GROUND + 12) { if (wood > 0.4 || this.rng() < 0.3) this.pine(x, z, h, 5 + this.R(6), this.pick(['#356f3c', '#2f6b3a'] as const)); continue; }
      if (wood > 0.55) { const r = this.rng(); if (r < 0.62) this.round(x, z, h, wood > 0.63 ? '#3f7a36' : this.pick(['#4f9a40', '#47903c'] as const), this.rng() < 0.45); else if (r < 0.82) this.birch(x, z, h); else this.pine(x, z, h, 6 + this.R(5), '#3d7d40'); continue; }
      const r = this.rng();
      if (r < 0.025) this.round(x, z, h, this.pick(['#5aa846', '#4f9a40', '#6aa84a'] as const), false);
      else if (r < 0.06) this.bush(x, z, h);
      else if (r < 0.075) this.rock(x, z, h);
    }
  }
  /** Street lamps along the roads (lit at dusk). */
  private lamps() {
    for (const pts of ROADS) curve(pts, 1).forEach((p, k, all) => {
      if (k % 9 || k === 0) return;
      const q = all[k - 1], nx = -(p.z - q.z), nz = p.x - q.x, l = Math.hypot(nx, nz) || 1, side = Math.floor(k / 9) % 2 ? 1 : -1;
      const x = Math.round(p.x + nx / l * 3.8 * side), z = Math.round(p.z + nz / l * 3.8 * side), ii = IDX(x, z);
      if (!this.land(x, z) || this.taken[ii]) return;
      const y0 = this.H[ii]; this.g.box(x, y0, z, x + 1, y0 + 3, z + 1, '#4a4e56'); this.glow.set(x, y0 + 3, z, '#ffe2a0'); this.taken[ii] = 1;
    });
  }
  /** The sea: sailboats with wakes, fishing boats, small islets with a tree. */
  private sea() {
    const g = this.g, boat = (bx: number, bz: number, hull: string, sail: boolean) => {
      if (bx < 4 || bz < 4 || bx > N - 18 || bz > N - 8 || this.kind[IDX(bx, bz)] || this.kind[IDX(bx + 12, bz + 4)]) return;
      g.box(bx, 1, bz, bx + 12, 3, bz + 4, hull); g.box(bx + 1, 3, bz + 1, bx + 11, 4, bz + 3, '#e8e4dc');
      if (sail) { g.box(bx + 5, 4, bz + 2, bx + 6, 14, bz + 3, '#8a6a48'); for (let y = 0; y < 9; y++) g.box(bx + 6, 5 + y, bz + 2, bx + 6 + Math.max(1, 6 - Math.floor(y * 0.7)), 6 + y, bz + 3, '#f6f4ee'); }
      else { g.box(bx + 7, 4, bz + 1, bx + 11, 7, bz + 3, '#f2f2f2'); this.glow.box(bx + 8, 5, bz + 1, bx + 10, 6, bz + 3, '#ffd890'); }
      for (let k = 1; k < 14; k++) for (const s of [-1, 1]) g.set(bx - k, SEA - 1, bz + 2 + s * Math.floor(k / 4), '#e8f4f8');   // wake
    };
    for (let i = 0; i < 12; i++) { const a = this.rng() * Math.PI * 2, rr = S(112) + this.rng() * S(30); boat(Math.round(S(116) + Math.cos(a) * rr), Math.round(S(108) + Math.sin(a) * rr), this.pick(['#2f3a6e', '#a8322a', '#2f6b4a', '#e8e4dc', '#e0b020'] as const), false); }   // fishing boats at anchor (the sailboats move — CityMapView)
    for (const [bx, bz] of [[186, 200], [198, 186], [176, 212]]) boat(S(bx), S(bz), '#2f3a6e', false);
    for (const [ix, iz, r] of [[14, 60, 7], [226, 200, 6], [30, 220, 5], [220, 14, 6], [6, 150, 4]]) {   // islets
      const cx = S(ix), cz = S(iz);
      for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.hypot(x - cx, z - cz); if (d > r || x < 0 || z < 0 || x >= N || z >= N || this.kind[IDX(x, z)]) continue;
        const h = SEA + Math.round((r - d) * 0.8); for (let y = 0; y < h; y++) g.set(x, y, z, y === h - 1 ? (d > r - 1.5 ? '#d4c7a0' : '#6aaa4c') : '#7a6248');
      }
      this.pine(cx, cz, SEA + Math.round(r * 0.8), 6, '#2f6b3a');
    }
  }
  private traffic() {
    for (const pts of ROADS) curve(pts, 2).forEach((p, k, all) => {
      if (this.rng() > 0.09 || k === 0) return;
      const q = all[k - 1], ii = IDX(Math.round(p.x), Math.round(p.z)); if (this.kind[ii] !== 3 && this.kind[ii] !== 4) return;
      const along = Math.abs(p.x - q.x) > Math.abs(p.z - q.z), side = this.rng() < 0.5 ? 1 : -1;
      const x = Math.round(p.x + (along ? 0 : side * 1.3)), z = Math.round(p.z + (along ? side * 1.3 : 0)), c = this.pick(['#d23a2a', '#2f6fb0', '#e8e4dc', '#e0b020', '#2f9a5a', '#1a1a1e'] as const);
      const y = this.H[ii];
      if (along) { this.g.box(x - 1, y, z, x + 2, y + 1, z + 1, c); this.glow.set(side > 0 ? x + 2 : x - 2, y, z, side > 0 ? '#ffe2a0' : '#ff4040'); }
      else { this.g.box(x, y, z - 1, x + 1, y + 1, z + 2, c); this.glow.set(x, y, side > 0 ? z - 2 : z + 2, side > 0 ? '#ffe2a0' : '#ff4040'); }
    });
  }
  /** The railway's centre line with the track height at each point, for the moving train (CityMapView). */
  railPath: THREE.Vector3[] = [];
  private train() {
    this.railPath = curve(RAIL, 0.5).map(p => { const ii = IDX(Math.round(p.x), Math.round(p.z)); return new THREE.Vector3(p.x, this.kind[ii] === 6 ? GROUND : this.H[ii], p.z); });
  }
  /** Last pass: flowers and pebbles in empty grass. */
  private clutter() {
    for (let i = 0; i < 2600; i++) {
      const x = this.R(N), z = this.R(N), ii = IDX(x, z);
      if (!this.land(x, z) || this.taken[ii] || this.H[ii] > GROUND + 16 || this.g.get(x, this.H[ii], z)) continue;
      this.g.set(x, this.H[ii], z, this.pick(['#e8d24a', '#e86a8a', '#6aaa4c', '#5f9e46', '#5f9e46', '#4f8a3a', '#6aaa4c'] as const));
    }
  }

  private pine(x: number, z: number, y0: number, h: number, green: string) {
    this.g.box(x, y0, z, x + 1, y0 + 2, z + 1, '#5b3d24');
    for (let k = 0; k < h; k++) { const r = Math.max(0, Math.round((h - k) * 0.42)); this.g.box(x - r, y0 + 2 + k, z - r, x + r + 1, y0 + 3 + k, z + r + 1, k % 2 ? green : shade(green, 0.86)); }
    if (h > 9 && y0 > GROUND + 20) this.g.set(x, y0 + 2 + h, z, '#f2f4f6');                       // snowy tips high up
    this.taken[IDX(x, z)] = 1;
  }
  private round(x: number, z: number, y0: number, green: string, big: boolean) {
    const r = big ? 3 : 2, g = this.g;
    g.box(x, y0, z, x + 1, y0 + 2, z + 1, '#5b3d24');
    for (let y = 0; y < r * 2; y++) { const rr = r - Math.abs(y - r + 0.5) * 0.6; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz <= rr * rr + 0.5) g.set(x + dx, y0 + 2 + y, z + dz, y === r * 2 - 1 ? shade(green, 1.12) : (dx + dz + y) % 4 === 0 ? shade(green, 0.9) : green); }
    this.taken[IDX(x, z)] = 1;
  }
  private birch(x: number, z: number, y0: number) {
    const g = this.g; g.box(x, y0, z, x + 1, y0 + 6, z + 1, (_a, y) => ((y - y0) % 3 === 1 ? '#3a3a3a' : '#e8e4dc'));
    g.box(x - 1, y0 + 4, z - 1, x + 2, y0 + 8, z + 2, (px, y, pz) => ((px + y + pz) % 3 === 0 ? '#a8c84a' : '#8fbf4a'));
    this.taken[IDX(x, z)] = 1;
  }
  private bush(x: number, z: number, y0: number) { this.g.box(x, y0, z, x + 2, y0 + 1, z + 2, this.pick(['#3f7a36', '#4f8a3a', '#5a9a40'] as const)); if (this.rng() < 0.4) this.g.set(x, y0 + 1, z, '#4f8a3a'); this.taken[IDX(x, z)] = 1; }
  private rock(x: number, z: number, y0: number) { this.g.box(x, y0, z, x + 2, y0 + 1 + this.R(2), z + 2, this.pick(['#8a8a88', '#7a7a78', '#9a9894'] as const)); this.taken[IDX(x, z)] = 1; }
}
