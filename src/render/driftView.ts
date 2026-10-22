// Drift scenes (owner, V0.18.0, E3/E5): the winding night road of a district, built once at the start of a run from the course's
// road line (data/driftCourses.ts) and the district's props (driftProps.ts). Always night; rain 40 % of runs.
// Road: rasterised onto a voxel grid (0.55 m tiles), so its edges step like everything else; kerbs go red/white through the
// turns, chevron boards and armco mark the outside of every turn. Props are placed along both sides wherever they don't touch
// the road (a coarse 1 m occupancy grid), front row dense, a taller back row behind it, so the scene reads full from the road.
// Camera: a chase cam behind your car that follows the road's heading, so your car's drift angle shows.
import * as THREE from 'three';
import { CarModel, CarLook, STOCK_LOOK, staticCar } from './carBuilder';
import { Materials } from './voxel';
import { blockify } from './blockShade';
import { poolTexture } from './stage';
import { Sky, SKY } from './sky';
import { VoxelFx, Rain } from './fx';
import { carLightPools } from './scene';
import { makeRng } from '../game/ai';
import { DriftPath, driftPath, pathAt, PATH_STEP, DriftTheme } from '../data/driftCourses';
import { Kit, WB, M, lamp, chevron, armco, tyres, cone, krail, gantry, building, bladeSign, streetBits, fence, containerStack, crane, shed, bollard, boat, pine, rocks, cabin, powerPole, hill, woodFence, roadSign, shade } from './driftProps';

const TILE = 8;                                       // road tiles: 8 blocks ≈ 0.55 m
const CH = 60;                                        // chunk length along the road (m)
const BOX = new THREE.BoxGeometry(1, 1, 1);
export interface DriftPose { x: number; z: number; yaw: number; h: number }
/** Pose of a car on the road from (s, signed angle in degrees, signed outward slide in metres) — used for the ghost. */
export function poseAt(p: DriftPath, s: number, angle: number, lat: number): DriftPose {
  const q = pathAt(p, s), out = -lat;
  return { x: q.x + Math.sin(q.h) * out, z: q.z - Math.cos(q.h) * out, h: q.h, yaw: q.h + angle * Math.PI / 180 };
}

const THEME: Record<DriftTheme, { ground: string; verge: [string, string]; lamp: 'city' | 'mast' | 'wood' | 'neon'; lampEvery: number; fogK: number; tint: string }> = {
  city: { ground: '#34363c', verge: ['#8e8b84', '#86837c'], lamp: 'city', lampEvery: 26, fogK: 1, tint: '#2a3a5e' },
  harbour: { ground: '#0e1a26', verge: ['#7a7a74', '#73736d'], lamp: 'mast', lampEvery: 40, fogK: 0.9, tint: '#26364e' },
  ridge: { ground: '#25321f', verge: ['#5a5446', '#524c40'], lamp: 'wood', lampEvery: 55, fogK: 0.85, tint: '#1e2a40' },
  neon: { ground: '#2a2630', verge: ['#6c6870', '#64606a'], lamp: 'neon', lampEvery: 24, fogK: 1, tint: '#2e2448' },
};
const SHOPS = ['DINER', 'TYRES', 'PARTS', 'CAFE', 'PIZZA', 'RECORDS', 'GYM', 'DONUTS', 'NOODLES', 'LAUNDRY', 'BAKERY', 'TACOS', 'BARBER', 'VINYL', 'BURGERS', 'HOTEL', 'BANK', 'BOOKS'];
const NEON_SHOPS = ['ARCADE', 'KARAOKE', 'NOODLES', 'VOX', '24/7', 'CLUB', 'RAMEN', 'GAMES', 'TATTOO', 'NEON', 'BAR', 'SUSHI', 'LIVE', 'DRIFT', 'PACHINKO', 'OPEN'];
const PARKED = ['#d23a2a', '#2f6fd6', '#eeeae0', '#1a1a1e', '#2f9a5a', '#f2c230', '#8e9bb3', '#6a3ad2', '#5a5e66', '#1f8a8a'].map(p => ({ ...STOCK_LOOK, paint: p }) as CarLook);

export class DriftView {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(55, 16 / 9, 1, 9000);
  path!: DriftPath;
  private mat = blockify(new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.92, envMapIntensity: 0.2 }));
  private matWet = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.22, metalness: 0.35, envMapIntensity: 0.9 });
  private matGlass = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.25, metalness: 0.1, envMapIntensity: 0.9, transparent: true, opacity: 0.85 });
  private matLit = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  private matPool = new THREE.MeshBasicMaterial({ map: poolTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  private chunks: { g: THREE.Group; x: number; z: number; r: number }[] = [];
  private world = new THREE.Group();
  player?: { pivot: THREE.Group; car: CarModel };
  ghost?: { pivot: THREE.Group; car: CarModel };
  private moon = new THREE.DirectionalLight('#a8b8ff', 0.55);
  private hemi = new THREE.HemisphereLight('#6a7ab8', '#1c1c26', 0.5);
  private sky?: Sky;
  readonly fx = new VoxelFx();
  private rain?: Rain;
  private camH = 0; private camP = new THREE.Vector3(); private camInit = false; private roll = 0;
  wet = false; lite = false;
  /** occupancy (1 m cells): the road and its verge, and every prop footprint placed so far */
  private taken = new Set<number>();

  constructor(private mats: Materials) { this.cam.up.set(0, 1, 0); }

  /** Build the course's scene and put the cars on the grid. */
  build(path: DriftPath, me: CarLook, ghost: CarLook | null, opts: { wet: boolean; lite: boolean }) {
    const s = this.scene; s.clear(); this.world = new THREE.Group(); this.chunks = []; this.taken.clear(); this.camInit = false; this.camP.set(0, 0, 0); this.roll = 0;
    this.wet = opts.wet; this.lite = opts.lite;
    this.path = path; const th = THEME[path.def.theme];
    // night sky, moonlight, fog (rain greys it and pulls it in)
    this.sky = new Sky(SKY.night); s.add(this.sky.group);
    const fogC = new THREE.Color(th.tint).lerp(new THREE.Color('#5d6573'), opts.wet ? 0.45 : 0);
    s.background = fogC; s.fog = new THREE.Fog(fogC, 900 * th.fogK * (opts.wet ? 0.6 : 1), 6200 * th.fogK * (opts.wet ? 0.6 : 1));
    s.add(this.hemi); this.hemi.intensity = opts.wet ? 0.42 : 0.5;
    this.moon.intensity = opts.wet ? 0.3 : 0.55; this.moon.castShadow = !opts.lite;
    this.moon.shadow.mapSize.set(opts.lite ? 1024 : 2048, opts.lite ? 1024 : 2048);
    Object.assign(this.moon.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 1, far: 3000 });
    this.moon.shadow.bias = -0.0004; this.moon.shadow.normalBias = 0.6;
    s.add(this.moon, this.moon.target);
    this.fx.clear(); s.add(this.fx.mesh);
    this.rain = undefined;
    if (opts.wet) { this.rain = new Rain(opts.lite ? 450 : 900); s.add(this.rain.mesh); }
    s.add(this.world);
    // ground under everything (harbour: dark water, the road and the lots stand on quays)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < path.x.length; i++) { x0 = Math.min(x0, path.x[i]); x1 = Math.max(x1, path.x[i]); z0 = Math.min(z0, path.z[i]); z1 = Math.max(z1, path.z[i]); }
    const pad = 500, water = path.def.theme === 'harbour';
    const ground = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0 + pad * 2) * M, (z1 - z0 + pad * 2) * M), water
      ? new THREE.MeshStandardMaterial({ color: '#0b1622', roughness: 0.12, metalness: 0.7, envMapIntensity: 0.6 })
      : new THREE.MeshStandardMaterial({ color: th.ground, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set((x0 + x1) / 2 * M, water ? -2.4 * M : -0.4, (z0 + z1) / 2 * M); ground.receiveShadow = true; s.add(ground);
    // road first (it claims its ground), then the district's props, chunk by chunk
    const per: Kit[] = Array.from({ length: Math.ceil(path.length / CH) + 1 }, (_, i) => new Kit(makeRng(path.def.seed * 31 + i * 977), opts.lite));
    this.claimRoad();
    this.road(per);
    this.furniture(per);
    this.district(per);
    per.forEach((k, i) => this.chunkMesh(k, i));
    // cars: each car sits in a pivot at its centre, so it can turn about its middle
    const mk = (look: CarLook, see = false) => {
      const car = new CarModel(look, this.mats), pivot = new THREE.Group();
      car.group.position.set(-car.L / 2, 0, -car.W / 2); pivot.add(car.group);
      car.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = !see; o.receiveShadow = !see; if (see) { o.material = (o.material as THREE.Material).clone(); Object.assign(o.material, { transparent: true, opacity: 0.38, depthWrite: false }); } } });
      if (!see) car.group.add(carLightPools(1.1, car.L, car.W, opts.wet));
      s.add(pivot); return { pivot, car };
    };
    this.player = mk(me);
    this.ghost = ghost ? mk(ghost, true) : undefined;
  }

  // ---------------------------------------------------------------- occupancy
  private key = (x: number, z: number) => (Math.floor(x) + 20000) * 40000 + (Math.floor(z) + 20000);
  /** true when a local rectangle (metres, in the kit's frame) is clear of the road and other props */
  private free(k: Kit, lx0: number, lz0: number, lx1: number, lz1: number) {
    for (let x = lx0; x <= lx1 + 0.01; x += Math.min(1.5, Math.max(0.5, (lx1 - lx0) / 2))) for (let z = lz0; z <= lz1 + 0.01; z += Math.min(1.5, Math.max(0.5, (lz1 - lz0) / 2))) {
      const [wx, wz] = k.w(x * M, z * M); if (this.taken.has(this.key(wx / M, wz / M))) return false;
    }
    return true;
  }
  private claim(k: Kit, lx0: number, lz0: number, lx1: number, lz1: number) {
    for (let x = lx0 - 0.5; x <= lx1 + 0.5; x += 0.7) for (let z = lz0 - 0.5; z <= lz1 + 0.5; z += 0.7) { const [wx, wz] = k.w(x * M, z * M); this.taken.add(this.key(wx / M, wz / M)); }
  }
  private claimRoad() {
    const p = this.path, R = p.def.width / 2 + 3.6;
    for (let i = 0; i < p.x.length; i += 2) for (let dx = -R; dx <= R; dx += 0.8) for (let dz = -R; dz <= R; dz += 0.8)
      if (dx * dx + dz * dz <= R * R) this.taken.add(this.key(p.x[i] + dx, p.z[i] + dz));
  }
  /** Put the kit at road distance s, on side σ (+1 right, −1 left), d metres out from the centre line, facing the road. */
  private side(k: Kit, s: number, sg: number, d: number) {
    const q = pathAt(this.path, s), ex = sg * Math.sin(q.h), ez = -sg * Math.cos(q.h);
    return k.at((q.x + ex * d) * M, (q.z + ez * d) * M, Math.atan2(ex, ez));
  }
  private kitAt(per: Kit[], s: number) { return per[Math.max(0, Math.min(per.length - 1, Math.floor(s / CH)))]; }

  // ---------------------------------------------------------------- the road surface (voxel tiles)
  private road(per: Kit[]) {
    const p = this.path, W = p.def.width, half = W / 2, R = (half + 3.6) * M, th = THEME[p.def.theme];
    const best = new Map<number, { d: number; i: number }>();
    for (let i = 0; i < p.x.length; i++) {
      const cx = p.x[i] * M, cz = p.z[i] * M, i0 = Math.floor((cx - R) / TILE), i1 = Math.ceil((cx + R) / TILE), j0 = Math.floor((cz - R) / TILE), j1 = Math.ceil((cz + R) / TILE);
      for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) {
        const tx = a * TILE + TILE / 2, tz = b * TILE + TILE / 2, d = Math.hypot(tx - cx, tz - cz); if (d > R) continue;
        const key = (a + 50000) * 100000 + (b + 50000), cur = best.get(key);
        if (!cur || d < cur.d) best.set(key, { d, i });
      }
    }
    // turn zones (for kerbs) and start/finish lines
    const inTurn = (s: number) => p.turns.some(t => s > t.s0 - 6 && s < t.s1 + 6);
    const rows = new Map<string, { a: number; b: number; c: string; y0: number; y1: number; flat: boolean; chunk: number }[]>();
    const harbour = p.def.theme === 'harbour', base = harbour ? -2.4 * M : -2;
    for (const [key, { i }] of best) {
      const a = Math.floor(key / 100000) - 50000, b = key % 100000 - 50000, tx = a * TILE + TILE / 2, tz = b * TILE + TILE / 2;
      const h = p.h[i], s = i * PATH_STEP, lat = ((tx / M - p.x[i]) * Math.sin(h) - (tz / M - p.z[i]) * Math.cos(h)), al = Math.abs(lat);
      let c: string, y1 = 0;
      if (al < half - 0.55) {
        const patch = ((Math.floor(a / 6) * 73856093) ^ (Math.floor(b / 6) * 19349663)) >>> 0;
        c = ['#3d4046', '#404349', '#43464c', '#3a3d43'][patch % 4];
        if (al > half - 1.0) c = '#d8d8d2';                                                      // edge line
        else if (al < 0.28 && (s % 7) < 3.5) c = '#e8c23a';                                     // centre dashes
        if ((s > 4 && s < 5.2) || (s > p.length - 0.6 && s < p.length + 0.6)) c = (a + b) & 1 ? '#eeeae0' : '#14161c';   // start + finish lines
      } else if (al < half + 0.5) {
        y1 = 1.5; c = inTurn(s) ? (Math.floor(s / 1.2) & 1 ? '#c8322a' : '#e8e8e2') : '#a8a59c';             // kerb
      } else {
        y1 = p.def.theme === 'ridge' ? 0.6 : 2.2; c = th.verge[(a + b) & 1];                              // pavement / quay / gravel
        if (p.def.theme === 'ridge' && al > half + 2.2) c = (a * 7 + b * 3) % 5 === 0 ? '#3a4a2e' : '#2f3e27';
      }
      const chunk = Math.floor(s / CH), rk = `${chunk}|${b}|${c}|${y1}`;
      let row = rows.get(rk); if (!row) rows.set(rk, row = []);
      row.push({ a, b: a, c, y0: base, y1, flat: true, chunk });
    }
    // merge each row's tiles into runs
    for (const [rk, list] of rows) {
      const [chunk, b] = rk.split('|').map(Number); list.sort((u, v) => u.a - v.a);
      let run = list[0];
      const flush = (r: typeof run) => { const k = per[Math.min(per.length - 1, chunk)]; k.out.push({ x: (r.a + (r.b - r.a + 1) / 2) * TILE, y: (r.y0 + r.y1) / 2, z: b * TILE + TILE / 2, sx: (r.b - r.a + 1) * TILE, sy: r.y1 - r.y0, sz: TILE, r: 0, c: r.c, m: 'flat' }); };
      for (let i = 1; i < list.length; i++) { if (list[i].a === run.b + 1) run = { ...run, b: list[i].a }; else { flush(run); run = list[i]; } }
      flush(run);
    }
  }

  // ---------------------------------------------------------------- what every road has: lamps, chevrons, armco, tyres, gates
  private furniture(per: Kit[]) {
    const p = this.path, W = p.def.width, half = W / 2, th = THEME[p.def.theme];
    // start + finish gantries
    // gantries span the road: local z runs along the road, so the banner faces the car coming up to it
    for (const [sg, label] of [[3, 'START'], [p.length - 0.5, 'FINISH']] as [number, string][]) { const k = this.kitAt(per, sg), q = pathAt(p, sg); k.at(q.x * M, q.z * M, Math.atan2(-Math.cos(q.h), -Math.sin(q.h))); gantry(k, W, label); }
    // lamps, alternating sides
    let sgn = 1;
    for (let s = 12; s < p.length; s += th.lampEvery) { const k = this.kitAt(per, s); this.side(k, s, sgn, half + 0.9); lamp(k, th.lamp); if (th.lamp === 'mast' || p.def.theme === 'city' || p.def.theme === 'neon') sgn = -sgn; }
    // every turn: chevrons on the outside, armco along it, tyre stacks at the apex of the tight ones, cones at the turn-in
    for (const t of p.turns) {
      const out = -t.dir;                                                                   // outside of the turn (σ)
      for (let s = t.s0 - 6; s <= t.s1 + 2; s += 7) { const k = this.kitAt(per, s); this.side(k, s, out, half + 1.25); chevron(k, out); }
      let prev: [number, number] | null = null;
      for (let s = t.s0 - 10; s <= t.s1 + 10; s += 2.2) {
        const q = pathAt(p, s), d = half + 0.75, pt: [number, number] = [(q.x + out * Math.sin(q.h) * d) * M, (q.z - out * Math.cos(q.h) * d) * M];
        if (prev) armco(this.kitAt(per, s), prev, pt);
        prev = pt;
      }
      if (t.r < 36) { const sm = (t.s0 + t.s1) / 2, k = this.kitAt(per, sm); this.side(k, sm, out, half + 2.4); tyres(k, 6); }
      { const k = this.kitAt(per, t.s0); this.side(k, t.s0 - 1, -out, half + 0.6); cone(k, 0, 0); cone(k, 1.2, 0.2); }
    }
  }

  // ---------------------------------------------------------------- the district: front row, back row, extras
  private district(per: Kit[]) {
    const p = this.path, half = p.def.width / 2, theme = p.def.theme;
    for (const sg of [1, -1]) {
      let s = 6;
      while (s < p.length - 4) {
        const k = this.kitAt(per, s), r = k.rng();
        const used = theme === 'city' ? this.cityFront(k, s, sg, half, r) : theme === 'neon' ? this.neonFront(k, s, sg, half, r) : theme === 'harbour' ? this.harbourFront(k, s, sg, half, r) : this.ridgeFront(k, s, sg, half, r);
        s += used;
      }
      // back rows (two bands, 24–55 m and 60–110 m out): taller things further away, so the skyline is full from the road
      for (const [d0, d1, step] of [[24, 55, theme === "ridge" ? 20 : 15], [60, 110, theme === "ridge" ? 26 : 20]] as [number, number, number][])
        for (let s2 = 0; s2 < p.length; s2 += step) {
          const k = this.kitAt(per, s2), d = half + k.rand(d0, d1), far = d0 > 50;
          this.side(k, s2, sg, d);
          if (theme === "city" || theme === "neon") { const w = k.rand(14, 28), dd = k.rand(14, 26), h = theme === "city" ? k.rand(far ? 50 : 30, far ? 140 : 95) : k.rand(far ? 20 : 14, far ? 60 : 40); if (this.free(k, 0, 0, w, dd)) { this.claim(k, 0, 0, w, dd); building(k, w, dd, h, { glass: k.rng() < 0.4, neon: theme === "neon" && k.rng() < 0.6 }); } }
          else if (theme === "harbour") {
            if (k.rng() < (far ? 0.3 : 0.15) && this.free(k, -2, -14, 16, 14)) { this.claim(k, -2, -14, 16, 14); k.mbox(-3, -2.4, -3, 22, 2.4, 20, "#6f6f6a"); crane(k); }
            else if (this.free(k, 0, 0, 13, 22)) { this.claim(k, 0, 0, 13, 22); k.mbox(-0.5, -2.4, -0.5, 26.5, 2.4, 23, "#6f6f6a"); containerStack(k, 8, far ? 5 : 4); }
            else if (k.rng() < 0.5) boat(k, k.rand(10, 20));
          }
          else { const w = k.rand(40, 90), dd = k.rand(30, 60); if (this.free(k, 0, 6, w, dd)) { this.claim(k, 0, 6, w, dd); hill(k, w, dd, k.rand(far ? 25 : 12, far ? 60 : 40)); for (let i = 0; i < 8; i++) pine(k, k.rand(0, w), k.rand(-2, 4), k.rand(8, 16)); } }
        }
    }
  }
  /** Downtown: shops and offices shoulder to shoulder, pavement clutter, parked cars, the odd alley. */
  private cityFront(k: Kit, s: number, sg: number, half: number, r: number) {
    const d = half + 4.2; this.side(k, s, sg, d);
    if (r < 0.12) { this.alley(k, s, sg, half); return 7; }
    const w = k.rand(11, 22), dd = k.rand(12, 20), h = k.rand(9, 38);
    if (!this.free(k, 0, 0, w, dd)) return 4;
    this.claim(k, 0, 0, w, dd);
    building(k, w, dd, h, { shop: k.rng() < 0.75 ? k.pick(SHOPS) : '', glass: k.rng() < 0.25 });
    // pavement in front: bits + a parked car now and then
    this.side(k, s, sg, half + 1.7); streetBits(k, k.rand(0.5, w - 2));
    if (k.rng() < 0.35 && !this.path.turns.some(t => s > t.s0 - 15 && s < t.s1 + 15)) { this.side(k, s + 1, sg, half + 2.6); k.car(0, 0, sg > 0 ? -Math.PI / 2 : Math.PI / 2, Math.floor(k.rng() * PARKED.length)); }
    return w + k.rand(0.3, 1.5);
  }
  private alley(k: Kit, s: number, sg: number, half: number) {
    this.side(k, s, sg, half + 5);
    if (!this.free(k, 0, 0, 5, 8)) return;
    for (let i = 0; i < 3; i++) k.mbox(k.rand(0.5, 4), 0, k.rand(1, 7), 1.1, 1.2, 0.9, k.pick(['#2f5a3e', '#3d4046', '#5a5f6b']));
    k.mbox(0.5, 3, 2, 0.12, 0.12, 6, '#ffcf8a', 'lit'); k.pool(2.5 * M, 4 * M, 3 * M, '#ffcf8a');
  }
  /** Neon Row: low buildings with neon outlines and signs, blade signs, vending machines, fences between lots. */
  private neonFront(k: Kit, s: number, sg: number, half: number, r: number) {
    const d = half + 4; this.side(k, s, sg, d);
    if (r < 0.15) { if (this.free(k, 0, 0, 10, 2)) { this.claim(k, 0, 0, 10, 2); fence(k, 10); for (let i = 0; i < 3; i++) k.mbox(k.rand(1, 9), 0, k.rand(0.8, 1.6), 0.6, 0.9, 0.6, '#f26a1c'); } return 11; }
    const w = k.rand(9, 18), dd = k.rand(10, 16), h = k.rand(6, 16);
    if (!this.free(k, 0, 0, w, dd)) return 4;
    this.claim(k, 0, 0, w, dd);
    building(k, w, dd, h, { shop: k.pick(NEON_SHOPS), neon: true, colour: k.pick(['#3a3640', '#2e3440', '#463a3a', '#30303a', '#4a3a4a']) });
    if (k.rng() < 0.6) bladeSign(k, k.pick(['BAR', 'OPEN', 'VOX', 'HOT', 'GO']), k.rand(1, w - 1), 3.5);
    this.side(k, s, sg, half + 1.7); streetBits(k, k.rand(0.5, w - 2)); if (k.rng() < 0.5) streetBits(k, k.rand(0.5, w - 2));
    if (k.rng() < 0.3 && !this.path.turns.some(t => s > t.s0 - 15 && s < t.s1 + 15)) { this.side(k, s + 1, sg, half + 2.6); k.car(0, 0, sg > 0 ? -Math.PI / 2 : Math.PI / 2, Math.floor(k.rng() * PARKED.length)); }
    return w + k.rand(0.5, 2);
  }
  /** Harbour: container stacks and sheds on their own quays, mooring bollards, K-rails. */
  private harbourFront(k: Kit, s: number, sg: number, half: number, r: number) {
    const d = half + 4.5; this.side(k, s, sg, d);
    if (r < 0.5) {
      const w = 13, dd = k.rand(6, 14);
      if (!this.free(k, 0, 0, w, dd)) return 4;
      this.claim(k, 0, 0, w, dd); k.mbox(-0.5, -2.4, -0.5, w + 1, 2.4, dd + 1, '#6f6f6a');
      containerStack(k, Math.max(2, Math.floor(dd / 2.7)), 3); return w + 1.5;
    }
    if (r < 0.7) {
      const w = k.rand(22, 34), dd = k.rand(14, 20);
      if (!this.free(k, 0, 0, w, dd)) return 4;
      this.claim(k, 0, 0, w, dd); k.mbox(-1, -2.4, -1, w + 2, 2.4, dd + 2, '#6f6f6a'); shed(k, w, dd, `PIER ${1 + Math.floor(k.rng() * 9)}`); return w + 2;
    }
    if (r < 0.82) { this.side(k, s, sg, half + 1.6); for (let i = 0; i < 3; i++) krail(k, i * 3.1); return 10; }
    this.side(k, s, sg, half + 2.6); bollard(k, 0.5, 0); bollard(k, 4.5, 0);
    this.side(k, s, sg, half + 9); if (k.rng() < 0.6) boat(k, k.rand(8, 14));
    return 9;
  }
  /** The Ridge: rock cuttings, dense pines, cabins, fences, power poles. */
  private ridgeFront(k: Kit, s: number, sg: number, half: number, r: number) {
    const inside = this.path.turns.find(t => s > t.s0 - 5 && s < t.s1 + 5);
    if (inside && inside.dir === sg) {                                                        // inside of a turn: a rock cutting
      this.side(k, s, sg, half + 3.6);
      if (this.free(k, 0, 0, 8, 4)) { this.claim(k, 0, 0, 8, 4); rocks(k, 8, k.rand(3, 9)); }
      return 6;
    }
    this.side(k, s, sg, half + 4);
    if (r < 0.1) { if (this.free(k, 0, 0, 7, 6)) { this.claim(k, 0, 0, 7, 6); cabin(k); return 10; } return 4; }
    if (r < 0.2) { woodFence(k, 10); return 11; }
    if (r < 0.28) { powerPole(k); return 9; }
    if (r < 0.32 && !inside) { this.side(k, s, sg, half + 2.5); roadSign(k, k.pick(['RIDGE', 'PASS', 'SLOW', 'VIEW'])); return 8; }
    let n = 0; for (let i = 0; i < 4; i++) { const x = k.rand(0, 6), z = k.rand(0, 10); if (this.free(k, x - 1, z - 1, x + 1, z + 1)) { this.claim(k, x - 1, z - 1, x + 1, z + 1); pine(k, x, z, k.rand(7, 15)); n++; } }
    if (k.rng() < 0.3) { this.side(k, s, sg, half + 3); if (this.free(k, 0, 0, 3, 2)) rocks(k, 3, k.rand(1, 2.5)); }
    return n ? 6 : 3;
  }

  // ---------------------------------------------------------------- chunk → meshes
  private chunkMesh(k: Kit, idx: number) {
    if (!k.out.length && !k.pools.length) return;
    const g = new THREE.Group(), by: Record<string, WB[]> = { solid: [], flat: [], glass: [], lit: [] };
    let cx = 0, cz = 0;
    for (const b of k.out) { by[b.m].push(b); cx += b.x; cz += b.z; }
    cx /= Math.max(1, k.out.length); cz /= Math.max(1, k.out.length);
    let r = 0; for (const b of k.out) r = Math.max(r, Math.hypot(b.x - cx, b.z - cz) + Math.max(b.sx, b.sz));
    const q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    const inst = (list: WB[], mat: THREE.Material, cast: boolean) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(BOX, mat, list.length);
      list.forEach((b, i) => { q.setFromAxisAngle(up, b.r); v.set(b.x, b.y, b.z); sc.set(b.sx, b.sy, b.sz); m4.compose(v, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(b.c)); });
      im.castShadow = cast && !this.lite; im.receiveShadow = true; g.add(im);
    };
    inst(by.solid, this.mat, true); inst(by.flat, this.wet ? this.matWet : this.mat, false); inst(by.glass, this.matGlass, false); inst(by.lit, this.matLit, false);
    if (k.pools.length) g.add(this.poolMesh(k.pools));
    for (const t of k.things) { const c = staticCar(PARKED[t.i % PARKED.length], this.mats); const pv = new THREE.Group(); c.position.set(-29, 0, -12); pv.add(c); pv.position.set(t.x, 0, t.z); pv.rotation.y = t.r; g.add(pv); }
    this.world.add(g); this.chunks[idx] = { g, x: cx, z: cz, r };
  }
  private poolMesh(pools: Kit['pools']) {
    const pos: number[] = [], uv: number[] = [], colr: number[] = [], idx: number[] = [], cc = new THREE.Color(), k = this.wet ? 0.75 : 0.6;
    for (const p of pools) {
      const b = pos.length / 3; cc.set(p.c).multiplyScalar(k);
      const rr = p.r * (this.wet ? 1.3 : 1);
      for (const [u, w] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pos.push(p.x + (u - 0.5) * 2 * rr, 2.6, p.z + (w - 0.5) * 2 * rr); uv.push(u, w); colr.push(cc.r, cc.g, cc.b); }
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geo.setIndex(idx); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, this.matPool); m.renderOrder = 2; return m;
  }

  resize(w: number, h: number) { this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }

  /** Each frame: place the cars, smoke, chase camera, show nearby chunks, rain. me/ghost poses in metres; v in m/s. */
  update(me: DriftPose, v: number, sliding: number, ghost: DriftPose | null, dt: number, distM: number) {
    if (!this.player) return;
    const P = this.player;
    P.pivot.position.set(me.x * M, 0, me.z * M); P.pivot.rotation.y = -me.yaw;
    P.car.setWheels(distM / 0.29, v / 0.29 * (1 + sliding * 0.6), dt);
    if (this.ghost) { this.ghost.pivot.visible = !!ghost; if (ghost) { this.ghost.pivot.position.set(ghost.x * M, 0, ghost.z * M); this.ghost.pivot.rotation.y = -ghost.yaw; } }
    // tyre smoke from the rear wheels while sliding (more with more angle)
    this.fx.update(dt);
    const fwdX = -Math.cos(me.yaw), fwdZ = -Math.sin(me.yaw), rx = Math.sin(me.yaw), rz = -Math.cos(me.yaw), L = P.car.L, Wd = P.car.W;
    if (sliding > 0.05) for (const sd of [-1, 1]) {
      const x = me.x * M - fwdX * L * 0.32 + rx * sd * Wd * 0.45, z = me.z * M - fwdZ * L * 0.32 + rz * sd * Wd * 0.45;
      this.fx.emit('tyre', x, 2, z, this.lite ? 1 : 2);
    }
    if (this.wet && v > 4) for (const sd of [-1, 1]) this.fx.emit('mist', me.x * M - fwdX * L * 0.45 + rx * sd * Wd * 0.4, 1, me.z * M - fwdZ * L * 0.45 + rz * sd * Wd * 0.4, 1);
    this.fx.update(0);
    // chase camera: follows the ROAD heading (eased), so the car's angle shows; pulls back a little with speed
    const ease = (r: number) => 1 - Math.exp(-r * Math.min(dt, 1 / 20));
    if (!this.camInit) { this.camH = me.h; this.camInit = true; }
    let dh = me.h - this.camH; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    this.camH += dh * ease(3.2);
    const back = 118 + Math.min(50, v * 1.8), up = 48 + Math.min(16, v * 0.5), fx = -Math.cos(this.camH), fz = -Math.sin(this.camH);
    const want = new THREE.Vector3(me.x * M - fx * back, up, me.z * M - fz * back);
    if (this.camP.lengthSq() === 0) this.camP.copy(want); else this.camP.lerp(want, ease(6));
    this.cam.position.copy(this.camP);
    this.roll += ((-dh * 0.35) - this.roll) * ease(4);
    this.cam.up.set(Math.sin(this.roll) * -fz * 0.2, 1, Math.sin(this.roll) * fx * 0.2).normalize();
    // aim below the road ahead, so your car sits a little under the middle of the screen — clear of the gauge at the bottom
    this.cam.lookAt(me.x * M + fx * 80, -5, me.z * M + fz * 80);
    // light + shadows follow the camera; only chunks near the camera are drawn
    const tx = me.x * M, tz = me.z * M;
    this.moon.position.set(tx - 660, 1200, tz - 900); this.moon.target.position.set(tx, 0, tz);
    const far = 6600;
    for (const c of this.chunks) if (c) c.g.visible = Math.hypot(c.x - this.cam.position.x, c.z - this.cam.position.z) < far + c.r;
    this.sky?.update(this.cam, dt);
    this.rain?.update(dt, tx, 30, tz);
  }
}
