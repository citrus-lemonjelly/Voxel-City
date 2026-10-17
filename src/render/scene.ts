// Renderer, lighting and the two Step 1 views: garage showroom (static garage screen, G1) and the race (CSR-style side view).
import * as THREE from 'three';
import { RoomEnvironment } from '../../vendor/addons/RoomEnvironment.js';
import { makeMaterials, Materials } from './voxel';
import { CarModel, CarLook, CAR_L, CAR_W } from './carBuilder';
import { Stage, LANE_Z, METERS_PER_BLOCK, TimeOfDay, NearStyle, poolTexture } from './stage';
import { Sky, SKY } from './sky';
import { SpeedBlur, BLUR_LEVELS, BlurLevel, CAR_LAYER } from './speedBlur';
import { StageDef } from '../data/stages';

export class World {
  renderer: THREE.WebGLRenderer;
  mats: Materials;
  private garageScene = new THREE.Scene();
  private raceScene = new THREE.Scene();
  private garageCam = new THREE.PerspectiveCamera(30, 1, 1, 4000);
  private raceCam = new THREE.PerspectiveCamera(46, 1, 1, 6000);
  private sun = new THREE.DirectionalLight('#fff2dc', 2.4);
  private garageCar?: CarModel;
  private turntable = new THREE.Group();
  stage?: Stage;
  player?: CarModel;
  opponent?: CarModel;
  mode: 'garage' | 'race' = 'garage';
  /** Race camera: 'side' = CSR-style side-on, 'angle' = fixed slight angle (reference), 'dynamic' = angle swings with who's leading, 'chase' = old rear-chase. */
  camMode: 'side' | 'angle' | 'dynamic' | 'chase' = 'dynamic';
  private camX = 0;
  private cam = { tx: 0, d: 260, yaw: 12, lean: 0 };
  /** Framing knobs (tunable): min/max camera distance and elevation slope (height per unit distance). */
  camFrame = { dMin: 300, dMax: 480, elev: 0.17, levelYaw: 10 };
  private sky?: Sky;
  private blur!: SpeedBlur;
  /** Speed blur setting (Settings → Speed blur). */
  setBlur(level: BlurLevel) { this.blur.strength = BLUR_LEVELS[level] ?? 0; }
  private hemi = new THREE.HemisphereLight('#e4f0ff', '#6b6250', 1.0);
  private sunOffset = new THREE.Vector3(480, 1020, -600);

  /** Race-camera presets offered in Settings. C = 'dynamic' (wider), C2 = 'close' (nearer and a little higher). */
  static CAMERA_PRESETS = {
    dynamic: { label: 'Dynamic', dMin: 300, dMax: 480, elev: 0.32 },     // 'Raised' angle (owner Q15)
    close: { label: 'Dynamic close', dMin: 240, dMax: 480, elev: 0.34 },
  };
  setCameraPreset(id: keyof typeof World.CAMERA_PRESETS) {
    const p = World.CAMERA_PRESETS[id] || World.CAMERA_PRESETS.dynamic;
    this.camMode = 'dynamic'; this.camFrame = { dMin: p.dMin, dMax: p.dMax, elev: p.elev, levelYaw: 10 };
  }

  constructor(private canvasHost: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    canvasHost.appendChild(this.renderer.domElement);
    const env = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    this.garageScene.environment = env; this.raceScene.environment = env;
    this.mats = makeMaterials();
    this.blur = new SpeedBlur(this.renderer);
    this.buildGarage();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = this.canvasHost.clientWidth || window.innerWidth, h = this.canvasHost.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.blur?.setSize(w, h);
    for (const c of [this.garageCam, this.raceCam]) { c.aspect = w / h; c.updateProjectionMatrix(); }
  }

  // ---------- garage (static showroom; the Terminal UI sits on the right) ----------
  private buildGarage() {
    const s = this.garageScene;
    s.background = new THREE.Color('#2a2d36');
    const tiles: THREE.Mesh[] = [];
    const tileMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.9, envMapIntensity: 0.2 });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const floor = new THREE.InstancedMesh(box, tileMat, 26 * 26);
    const o = new THREE.Object3D(); let i = 0;
    for (let x = -13; x < 13; x++) for (let z = -13; z < 13; z++) {
      o.position.set(x * 10 + 5, -1, z * 10 + 5); o.scale.set(10, 2, 10); o.updateMatrix(); floor.setMatrixAt(i, o.matrix);
      floor.setColorAt(i++, new THREE.Color(((x + z) & 1) ? '#5d6069' : '#555861'));
    }
    floor.receiveShadow = true; s.add(floor); tiles.push(floor as any);
    // back wall of stacked blocks with a light strip, and a raised turntable
    const wall: { p: number[]; sc: number[]; c: string }[] = [];
    for (let x = -130; x < 130; x += 20) for (let y = 0; y < 90; y += 15) wall.push({ p: [x + 10, y + 7.5, -95], sc: [20, 15, 6], c: ((x / 20 + y / 15) & 1) ? '#3a3e48' : '#363a44' });
    wall.push({ p: [0, 60, -91.5], sc: [180, 3, 1], c: '#e8e4d8' });
    const wm = new THREE.InstancedMesh(box, tileMat, wall.length);
    wall.forEach((b, k) => { o.position.set(b.p[0], b.p[1], b.p[2]); o.scale.set(b.sc[0], b.sc[1], b.sc[2]); o.updateMatrix(); wm.setMatrixAt(k, o.matrix); wm.setColorAt(k, new THREE.Color(b.c)); });
    wm.receiveShadow = true; s.add(wm);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 2, 24), new THREE.MeshStandardMaterial({ color: '#6b6f78', flatShading: true, roughness: 0.6 }));
    table.position.y = 0.6; table.receiveShadow = true; s.add(table);
    this.turntable.position.y = 1.6; s.add(this.turntable);
    s.add(new THREE.HemisphereLight('#e4ecff', '#3a3a44', 1.2));
    const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(-60, 140, 120); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 400 }); key.shadow.bias = -0.0005;
    s.add(key);
    this.garageCam.position.set(-118, 46, 92); this.garageCam.lookAt(18, 8, 0);
  }

  setGarageCar(look: CarLook) {
    if (this.garageCar) this.turntable.remove(this.garageCar.group);
    this.garageCar = new CarModel(look, this.mats);
    this.garageCar.group.position.set(-CAR_L / 2, 0, -CAR_W / 2);
    this.turntable.add(this.garageCar.group);
  }

  // ---------- race ----------
  setupRace(stageDef: StageDef, distanceM: number, playerLook: CarLook, oppLook: CarLook, opts: { time?: TimeOfDay; near?: NearStyle } = {}) {
    const s = this.raceScene;
    const time: TimeOfDay = opts.time || (stageDef.timeOfDay as TimeOfDay) || 'day';
    const L = LIGHTING[time];
    s.clear();
    this.sky = new Sky(SKY[time]);
    s.add(this.sky.group);
    s.background = new THREE.Color(SKY[time].horizon);
    s.fog = new THREE.Fog(SKY[time].horizon, L.fog[0], L.fog[1]);
    s.environmentIntensity = L.env;
    this.hemi.color.set(L.hemi[0]); this.hemi.groundColor.set(L.hemi[1]); this.hemi.intensity = L.hemi[2];
    s.add(this.hemi);
    this.sun.color.set(L.sun[0]); this.sun.intensity = L.sun[1]; this.sunOffset.set(...L.sunPos);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, { left: -600, right: 600, top: 600, bottom: -600, near: 1, far: 3600 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    s.add(this.sun, this.sun.target);
    this.renderer.toneMappingExposure = L.exposure;
    this.stage = new Stage(stageDef, distanceM / METERS_PER_BLOCK, this.mats, time, opts.near || 'mixed');
    s.add(this.stage.group);
    this.player = new CarModel(playerLook, this.mats); this.player.group.position.z = LANE_Z[0]; s.add(this.player.group);
    this.opponent = new CarModel(oppLook, this.mats); this.opponent.group.position.z = LANE_Z[1]; s.add(this.opponent.group);
    if (time !== 'day') for (const car of [this.player, this.opponent]) car.group.add(carLightPools(time === 'night' ? 1 : 0.6));
    // the two race cars also live on the "car" layer so speed blur can keep them sharp
    for (const car of [this.player, this.opponent]) car.group.traverse((o: any) => o.isMesh && !o.material?.map && o.layers.enable(CAR_LAYER));
    this.blur.reset();
    this.camX = 0; this.cam = { tx: CAR_L / 2, d: 320, yaw: 28, lean: 0 };
    this.mode = 'race';
  }

  /** Positions in metres from the start line (already interpolated between physics steps); speeds in m/s. */
  updateRace(playerM: number, oppM: number, playerV: number, oppV: number, dt: number, raceClock = 99) {
    if (!this.player || !this.opponent || !this.stage) return;
    const px = -playerM / METERS_PER_BLOCK, ox = -oppM / METERS_PER_BLOCK;
    this.player.group.position.x = px; this.opponent.group.position.x = ox;
    this.player.setWheels(playerM / 0.29, playerV / 0.29, dt); this.opponent.setWheels(oppM / 0.29, oppV / 0.29, dt);
    // Frame-rate-independent easing, and never more than a 1/20 s step: a slow frame can't make the camera lurch.
    const ease = (rate: number) => 1 - Math.exp(-rate * Math.min(dt, 1 / 20));
    if (this.camMode === 'chase') {
      const lag = Math.max(0, ox - px);
      this.cam.lean += (Math.min(260, lag * 1.05) - this.cam.lean) * ease(4);
      this.camX = px + 150 + this.cam.lean;
      this.raceCam.position.set(this.camX, 30 + this.cam.lean * 0.12, CAR_W / 2 + 26);
      this.raceCam.lookAt(px - 110, 10, CAR_W / 2 + 18);
      this.raceCam.fov = 46; this.raceCam.updateProjectionMatrix();
    } else {
      // Side-on framing (CSR / reference). The camera is LOCKED to the player's car in x — it never trails it —
      // so the car holds its place on screen at any speed. Only the lean toward the rival, the distance and the
      // yaw are eased, and those change slowly.
      const pc = px + CAR_L / 2, oc = ox + CAR_L / 2;
      const vfov = 30, aspect = this.raceCam.aspect || 16 / 9;
      const htan = Math.tan((vfov / 2) * Math.PI / 180) * aspect;
      const need = CAR_L + 150 + Math.min(Math.abs(px - ox), 120) * 0.8;
      const d = Math.min(this.camFrame.dMax, Math.max(this.camFrame.dMin, need / 2 / htan));
      const lead = ox - px;                                          // >0: player ahead (blocks)
      const level = Math.max(0, 1 - Math.abs(lead) / 120);         // 1 when side by side
      // Start glide: the countdown opens on a lower, swung-round angle and rises to the race angle by the green light.
      // (When the cars roll up to the line later, this same glide plays over the roll-up.)
      const g = smooth01((raceClock - 0.2) / (START_GLIDE - 0.2));
      const elev = this.camFrame.elev - 0.15 * (1 - g);
      const yaw = this.camMode === 'side' ? 4 : this.camMode === 'angle' ? 18 : Math.max(-22, Math.min(30, 10 - lead * 0.06 + (this.camFrame.levelYaw - 10) * level + 18 * (1 - g)));
      this.cam.lean += (Math.max(-70, Math.min(70, oc - pc)) * 0.5 - this.cam.lean) * ease(3);
      this.cam.d += (d - this.cam.d) * ease(2.5);
      this.cam.yaw += (yaw - this.cam.yaw) * ease(2.5);
      this.cam.tx = pc + this.cam.lean;
      const a = this.cam.yaw * Math.PI / 180, fz = 40;   // aim between the two (real-width) lanes
      this.raceCam.position.set(this.cam.tx + Math.sin(a) * this.cam.d, 30 + this.cam.d * elev, fz - Math.cos(a) * this.cam.d);
      this.raceCam.lookAt(this.cam.tx, 10, fz);
      if (this.raceCam.fov !== vfov) { this.raceCam.fov = vfov; this.raceCam.updateProjectionMatrix(); }
      this.camX = this.cam.tx;
    }
    this.placeSun();
    this.stage.update(this.camX);
    this.sky?.update(this.raceCam, dt);
  }

  /** Sun follows the camera, snapped to whole shadow-map texels so shadow edges don't crawl or shimmer while moving. */
  private placeSun() {
    const sc = this.sun.shadow.camera, texel = (sc.right - sc.left) / this.sun.shadow.mapSize.x;
    const target = new THREE.Vector3(this.camX, 0, 60);
    this.sun.position.set(target.x + this.sunOffset.x, this.sunOffset.y, this.sunOffset.z);
    this.sun.target.position.copy(target);
    this.sun.updateMatrixWorld(); this.sun.target.updateMatrixWorld();
    sc.position.copy(this.sun.position); sc.lookAt(target); sc.updateMatrixWorld();
    // move target into light space, round to texels, move back
    const inv = new THREE.Matrix4().copy(sc.matrixWorld).invert();
    const ls = target.clone().applyMatrix4(inv);
    const snapped = new THREE.Vector3(Math.round(ls.x / texel) * texel, Math.round(ls.y / texel) * texel, ls.z).applyMatrix4(sc.matrixWorld);
    const delta = snapped.sub(target);
    this.sun.position.add(delta); this.sun.target.position.add(delta);
  }

  setTree(lit: number, green: boolean) { this.stage?.setTree(lit, green); }

  render(dt: number) {
    if (this.mode === 'garage') {
      this.turntable.rotation.y += dt * 0.25;
      this.renderer.render(this.garageScene, this.garageCam);
    } else if (this.blur.strength > 0) this.blur.render(this.raceScene, this.raceCam, dt);
    else this.renderer.render(this.raceScene, this.raceCam);
  }
}

const START_GLIDE = 3.0;   // seconds: countdown length
const smooth01 = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (x * 6 - 15) + 10); };

// Day / dusk / night lighting. Night stays readable (owner: "night not pitch dark").
const LIGHTING: Record<TimeOfDay, { hemi: [string, string, number]; sun: [string, number]; sunPos: [number, number, number]; fog: [number, number]; env: number; exposure: number }> = {
  day: { hemi: ['#e4f0ff', '#6b6250', 1.0], sun: ['#fff2dc', 2.4], sunPos: [480, 1020, -600], fog: [1500, 4800], env: 1.0, exposure: 1.0 },
  dusk: { hemi: ['#ffc9a8', '#4a3a48', 0.7], sun: ['#ffae6a', 1.9], sunPos: [1560, 480, -720], fog: [1200, 4200], env: 0.55, exposure: 1.0 },
  night: { hemi: ['#6a7ab8', '#1c1c26', 0.42], sun: ['#a8b8ff', 0.5], sunPos: [-660, 1200, -900], fog: [1000, 3800], env: 0.25, exposure: 1.0 },
};

/** Additive voxel-stepped headlight / tail-light pools on the road, parented to a car (front at x = 0, facing −x). */
function carLightPools(k: number) {
  const g = new THREE.Group();
  const pool = (w: number, d: number, x: number, colour: string, a: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(colour).multiplyScalar(a * k) }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.35, CAR_W / 2); m.renderOrder = 2; g.add(m);
  };
  pool(90, 40, -34, '#fff1c8', 0.9);
  pool(26, 30, CAR_L + 8, '#ff3a2a', 0.5);
  return g;
}
