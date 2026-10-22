// Renderer, lighting and the two Step 1 views: garage showroom (static garage screen, G1) and the race (CSR-style side view).
import * as THREE from 'three';
import { VoxelFx, Rain } from './fx';
import { RoomEnvironment } from '../../vendor/addons/RoomEnvironment.js';
import { makeMaterials, Materials } from './voxel';
import { CarModel, CarLook, CAR_L, CAR_W } from './carBuilder';
import { Stage, LANE_Z, METERS_PER_BLOCK, TimeOfDay, NearStyle, poolTexture } from './stage';
import { Sky, SKY } from './sky';
import { SpeedBlur, BLUR_LEVELS, BlurLevel, CAR_LAYER } from './speedBlur';
import { StageDef } from '../data/stages';
import { TypingView } from './typingView';
import { buildGarageRoom, GarageRoom } from './garage';

/** Garage camera framings at angle A (the original angles): [camera position, look-at point].
 *  home = car centred above the bottom bar · catalog = car on the right of the list · strip = car high, above the scroller ·
 *  panel = car left of a right-hand panel · mycars = whole car between the list and the stats box ·
 *  upgrades = turned toward the mechanic bay, profile = turned toward the loft (owner E2 test, 2026-10-20). */
export type GarageView = 'home' | 'catalog' | 'panel' | 'strip' | 'mycars' | 'upgrades' | 'profile';
const GARAGE_VIEWS: Record<GarageView, [number[], number[], number?]> = {   // 3rd = share of the angle's aim used (catalog: 0, keeps the car above its info box)
  home: [[-122, 50, 96], [0, 4, 0]],
  catalog: [[-178, 62, 138], [-44, -10, -14], 0],
  strip: [[-196, 64, 154], [0, -34, 0]],
  panel: [[-132, 54, 104], [34, 4, 0]],
  mycars: [[-184, 92, 131], [-6, -8, -9]],
  upgrades: [[-140, 58, 125], [79, 4, 17]],
  profile: [[131, 50, 132], [-40, 0, -100]],
};
/** Camera angles (owner Q163). Each pulls the camera back from the look-at point (k), lowers it (m = share of its height
 *  kept) and aims higher (aim, blocks), so more of the room — the loft — comes into view. */
export type GarageCam = 'a' | 'b' | 'c' | 'd';
export const GARAGE_CAMS: Record<GarageCam, { label: string; k: number; m: number; aim: number }> = {
  a: { label: 'High', k: 1, m: 1, aim: 0 },
  b: { label: 'Low', k: 1, m: 0.48, aim: 10 },
  c: { label: 'Hero', k: 1.07, m: 0.22, aim: 16 },
  d: { label: 'Wide', k: 1.23, m: 0.48, aim: 18 },
};

/** Where a thumbnail camera points: the whole car, or close-ups for the Parts screen. */
/** Background for see-through car pictures: a near-black no car paint uses, cut out after rendering. */
const KEY = '#010203';
export type Weather = 'clear' | 'rain';
/** What the race effects need to know about a car each frame (main.ts builds it from the racer). */
export interface FxCar { launched: boolean; launchTimer: number; spin: boolean; nitro: boolean; v: number; finished: boolean; ev?: { text: string; t: number } }
export type ThumbView = 'front' | 'rear' | 'tail' | 'hood' | 'wheel' | 'side' | 'nose' | 'low' | 'sill' | 'top' | 'strip';

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
  /** garage: slow turntable spin (Settings toggle); the player can also drag the car round (owner 2026-10-19) */
  autoSpin = true;
  private drag = { on: false, x: 0, v: 0, id: -1 };
  /** Body Shop: the car side to show the camera (car x, z); set per tab, cleared by a drag */
  private face: [number, number] | null = null; private faceKey = '';
  stage?: Stage;
  player?: CarModel;
  opponent?: CarModel;
  mode: 'garage' | 'race' | 'typing' = 'garage';
  /** Typing Race view (top-down), built on first use */
  typing?: TypingView;
  /** Race camera: 'side' = CSR-style side-on, 'angle' = fixed slight angle (reference), 'dynamic' = angle swings with who's leading, 'chase' = old rear-chase. */
  camMode: 'side' | 'angle' | 'dynamic' | 'chase' = 'dynamic';
  private camX = 0;
  private cam = { tx: 0, d: 260, yaw: 12, lean: 0 };
  /** Framing knobs (tunable): min/max camera distance and elevation slope (height per unit distance). */
  camFrame = { dMin: 300, dMax: 480, elev: 0.17, levelYaw: 10 };
  private sky?: Sky;
  private blur!: SpeedBlur;
  /** Speed blur setting (Settings → Speed blur). */
  private blurLevel: BlurLevel = 'low';
  setBlur(level: BlurLevel) { this.blurLevel = level; this.blur.strength = this.lite ? 0 : BLUR_LEVELS[level] ?? 0; }   // light graphics: no speed blur (an extra full-screen pass)
  /** Light graphics (owner E4, V0.15.0; phones by default, Settings ▸ Graphics): at most 1.5× pixel density instead of 2×,
   *  and every shadow map at half size. Voxels stay just as sharp; shadows get a little softer-edged. */
  lite = false;
  setLite(on: boolean) {
    this.lite = on;
    this.renderer.setPixelRatio(Math.min(on ? 1.5 : 2, window.devicePixelRatio || 1));
    this.setBlur(this.blurLevel);
    for (const sc of [this.garageScene, this.raceScene, this.thumbScene]) sc?.traverse((o: any) => { if (o.isDirectionalLight && o.castShadow) this.shadowSize(o, o.userData.shadowFull ?? o.shadow.mapSize.x); });
  }
  /** Set a light's shadow map to its full-quality size n (half of it in light mode); a changed size makes a fresh map. */
  private shadowSize(light: THREE.DirectionalLight, n: number) {
    light.userData.shadowFull = n;
    const px = this.lite ? n / 2 : n;
    if (light.shadow.mapSize.x === px) return;
    light.shadow.mapSize.set(px, px); light.shadow.map?.dispose(); (light.shadow as any).map = null;
  }
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
    // drag the car round on the turntable; it keeps a little momentum, then the slow spin (if on) takes over again
    const cv = this.renderer.domElement as HTMLCanvasElement, D = this.drag;
    cv.addEventListener('pointerdown', (e: PointerEvent) => { if (this.mode !== 'garage') return; D.on = true; D.x = e.clientX; D.v = 0; this.face = null; D.id = e.pointerId; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); });
    cv.addEventListener('pointermove', (e: PointerEvent) => {
      cv.classList.toggle('grab', this.mode === 'garage');
      if (!D.on || e.pointerId !== D.id) return;
      const dx = (e.clientX - D.x) * 0.012; D.x = e.clientX; this.turntable.rotation.y += dx; D.v = dx;
    });
    const end = (e: PointerEvent) => { if (e.pointerId !== D.id) return; D.on = false; cv.classList.remove('grabbing'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
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
    this.typing?.resize(w, h);
  }

  // ---------- garage (the 3D room behind the menus, render/garage.ts; the Terminal UI sits on top) ----------
  private garageRoom?: GarageRoom;
  private buildGarage() {
    const s = this.garageScene;
    s.background = new THREE.Color('#22252d');
    this.garageRoom = buildGarageRoom(this.mats); s.add(this.garageRoom.group);
    // showcase turntable: dark base, a lit ring, the deck the car stands on (top at y 1.6)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(49, 49, 1, 32), new THREE.MeshStandardMaterial({ color: '#2c2f36', flatShading: true, roughness: 0.7 }));
    base.position.y = 0.5; base.receiveShadow = true; s.add(base);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(47, 47, 0.5, 48), new THREE.MeshBasicMaterial({ color: '#dfe8ff', toneMapped: false }));
    ring.position.y = 1.1; s.add(ring);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(45.5, 45.5, 1.4, 32), new THREE.MeshStandardMaterial({ color: '#6b6f78', flatShading: true, roughness: 0.6 }));
    table.position.y = 0.9; table.receiveShadow = true; s.add(table);
    this.turntable.position.y = 1.6; s.add(this.turntable);
    s.add(new THREE.HemisphereLight('#e4ecff', '#3a3a44', 1.2));
    const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(-60, 140, 120); key.castShadow = true;
    this.shadowSize(key, 2048); Object.assign(key.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 400 }); key.shadow.bias = -0.0005;
    s.add(key);
    this.setGarageView('home');
  }

  /** Garage camera framing (owner: Garage HUD) at the current camera angle — see GARAGE_VIEWS / GARAGE_CAMS. */
  setGarageView(v: GarageView) {
    this.gView = v;
    const [P, T, ak = 1] = GARAGE_VIEWS[v] || GARAGE_VIEWS.home, c = GARAGE_CAMS[this.gCam], ty = T[1] + c.aim * ak;
    this.garageCam.position.set(T[0] + (P[0] - T[0]) * c.k, ty + (P[1] - T[1]) * c.m, T[2] + (P[2] - T[2]) * c.k);
    this.garageCam.lookAt(T[0], ty, T[2]);
  }
  private gView: GarageView = 'home';
  private gCam: GarageCam = 'd';
  /** Garage camera angle (owner Q163: camera button beside the patch notes; default D). */
  setGarageCam(id: GarageCam) { this.gCam = GARAGE_CAMS[id] ? id : 'd'; this.setGarageView(this.gView); }

  /** Turn the car so this side (car x = nose→tail, z = near→far) faces the camera; null = back to free spin. Same value again = no change (keeps a drag). */
  /** Roll-up door open (street outside) or closed (owner Q157; mini button beside Profile). */
  setGarageDoor(open: boolean) { this.garageRoom?.setDoor(open); }

  faceGarage(d: [number, number] | null) { const k = d ? d.join(',') : ''; if (k === this.faceKey) return; this.faceKey = k; this.face = d; this.drag.v = 0; }

  setGarageCar(look: CarLook) {
    if (this.garageCar) this.turntable.remove(this.garageCar.group);
    this.garageCar = new CarModel(look, this.mats);
    this.garageCar.group.position.set(-this.garageCar.L / 2, 0, -this.garageCar.W / 2);
    this.garageCar.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.turntable.add(this.garageCar.group);
  }

  // ---------- catalog thumbnails (owner Q78: a 3D still of each car) ----------
  private thumbs = new Map<string, string>();
  private thumbScene?: THREE.Scene; private thumbFloor?: THREE.Mesh;
  private thumbCam = new THREE.PerspectiveCamera(24, 2, 1, 1000);
  /** A still picture of a car (PNG data URL), rendered once with the game renderer and cached by look + size. */
  /** bg: draw on this colour with no floor disc; 'clear' = a see-through background (race progress bar icons, V0.15.0). */
  thumbnail(look: CarLook, w = 296, h = 124, view: ThumbView = 'front', bg?: string): string {
    const key = JSON.stringify(look) + `@${w}x${h}:${view}:${bg ?? ''}`;
    const hit = this.thumbs.get(key); if (hit) return hit;
    if (!this.thumbScene) {
      const s = this.thumbScene = new THREE.Scene();
      s.background = new THREE.Color('#252935');
      s.environment = this.garageScene.environment;
      s.add(new THREE.HemisphereLight('#e4ecff', '#3a3a44', 1.2));
      const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(-60, 140, 120); key.castShadow = true;
      this.shadowSize(key, 1024); Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 }); key.shadow.bias = -0.0005;
      s.add(key);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(52, 52, 1, 32), new THREE.MeshStandardMaterial({ color: '#30343f', roughness: 0.9 }));
      floor.position.y = -0.5; floor.receiveShadow = true; s.add(floor); this.thumbFloor = floor;
    }
    const car = new CarModel(look, this.mats);
    car.group.position.set(-car.L / 2, 0, -car.W / 2);
    car.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.thumbScene.add(car.group);
    // same three-quarter front view as the garage, one fixed distance so sizes compare honestly between cars
    this.thumbCam.aspect = w / h; this.thumbCam.updateProjectionMatrix();
    // views aimed at a part (owner Q113: part cards show a close-up of your car wearing it)
    const hl = car.L / 2, V: Record<ThumbView, [number[], number[]]> = {
      front: [[-74, 36, 57], [6, 4, 0]], rear: [[hl + 44, 36, 40], [hl - 4, 15, 2]], tail: [[hl + 30, 10, 26], [hl, 4, 1]], hood: [[-hl - 30, 46, 34], [-hl + 14, 9, 0]], wheel: [[-hl + 6, 9, 56], [-hl + 12, 5, 8]],
      side: [[-6, 18, 96], [0, 8, 0]], nose: [[-hl - 40, 14, 44], [-hl + 9, 4, 4]], sill: [[-2, 9, 58], [-1, 3, 0]], top: [[0, 175, 0.01], [0, 0, 0]], strip: [[0, 96, 0.01], [0, 0, 0]], low: [[-hl - 40, 14, 52], [-2, 0, 0]],
    };
    const [cp, ct] = V[view];
    if (view === 'front') this.thumbCam.position.set(cp[0], cp[1], cp[2]).normalize().multiplyScalar(100); else this.thumbCam.position.set(cp[0], cp[1], cp[2]);
    this.thumbCam.lookAt(ct[0], ct[1], ct[2]);
    const r = this.renderer, pr = r.getPixelRatio(), full = r.getSize(new THREE.Vector2());
    r.setScissorTest(true); r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h);
    const bg0 = this.thumbScene.background;
    if (bg) { this.thumbScene.background = new THREE.Color(bg === 'clear' ? KEY : bg); this.thumbFloor!.visible = false; }
    r.render(this.thumbScene, this.thumbCam);
    this.thumbScene.background = bg0; this.thumbFloor!.visible = true;
    const c = document.createElement('canvas'); c.width = Math.round(w * pr); c.height = Math.round(h * pr);
    const src = r.domElement;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, src.height - c.height, c.width, c.height, 0, 0, c.width, c.height);
    if (bg === 'clear') {                                              // cut the near-black key colour out; edge pixels stay as a dark outline
      const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) if (d[i] <= 6 && d[i + 1] <= 7 && d[i + 2] <= 8) d[i + 3] = 0;
      g.putImageData(im, 0, 0);
    }
    r.setScissorTest(false); r.setViewport(0, 0, full.x, full.y);
    this.thumbScene.remove(car.group);
    car.group.traverse((o: any) => { if (o.isMesh) o.geometry.dispose(); });
    const url = c.toDataURL('image/png');
    this.thumbs.set(key, url);
    return url;
  }

  // ---------- race ----------
  // ---------- race effects (owner C2 / C3 / C5, V0.16.0) ----------
  private fx = new VoxelFx();
  private rain?: Rain;
  private weather: Weather = 'clear';
  private kick = 0; private kicked = false; private fxT = 0; private nosFov = 0;
  private fxSeen: { ev: number; done: boolean }[] = [{ ev: -1, done: false }, { ev: -1, done: false }];
  /** Every frame after updateRace: tyre smoke, backfire, nitrous flame, rain spray, finish dust, the launch camera kick. */
  raceEffects(cars: FxCar[], dt: number) {
    if (this.mode !== 'race' || !this.player || !this.opponent) return;
    this.fxT += dt;
    this.fx.update(dt);                                              // move the old cubes first, so new ones start right at the car
    const every = this.lite ? 2 : 1, tick = Math.round(this.fxT * 60) % every === 0;
    [this.player, this.opponent].forEach((model, i) => {
      const c = cars[i]; if (!c) return;
      const seen = this.fxSeen[i], gx = model.group.position.x, gz = model.group.position.z, rear = gx + model.L * 0.82, back = gx + model.L;
      const v = c.v / METERS_PER_BLOCK, wheels = [gz + 3, gz + model.W - 3], pipe = gz + model.W * 0.3;
      if (tick && c.launched && (c.launchTimer < 0.9 || c.spin)) for (const z of wheels) this.fx.emit('smoke', rear, 2, z, c.spin ? 4 : 2, v);
      if (tick && c.nitro) this.fx.emit('nitro', back + 1, 4, pipe, 4, v);
      if (tick && this.weather === 'rain' && c.v > 4) for (const z of wheels) this.fx.emit('spray', rear + 2, 1, z, 1, v);
      if (c.ev && c.ev.t !== seen.ev) { seen.ev = c.ev.t; if (c.ev.text === 'Perfect') this.fx.emit('flame', back + 1, 4, pipe, 24, v); }
      if (c.finished && !seen.done) { seen.done = true; this.fx.emit('dust', rear, 2, gz + model.W / 2, 26, v); }
    });
    // launch kick: a quick shake and a small pull back, fading in half a second
    const me = cars[0];
    if (me?.launched && !this.kicked) { this.kicked = true; this.kick = 1; }
    if (this.kick > 0.01) { this.raceCam.position.y += Math.sin(this.fxT * 55) * this.kick * 1.4; this.raceCam.position.x += this.kick * 8; this.kick *= Math.exp(-5 * dt); }
    // nitrous: the view widens a little while it burns
    this.nosFov += ((me?.nitro ? 5 : 0) - this.nosFov) * (1 - Math.exp(-6 * dt));
    if (this.nosFov > 0.05 && this.camMode !== 'chase') { this.raceCam.fov = 30 + this.nosFov; this.raceCam.updateProjectionMatrix(); }
    this.fx.update(0);
    this.rain?.update(dt, this.camX);
  }

  setupRace(stageDef: StageDef, distanceM: number, playerLook: CarLook, oppLook: CarLook, opts: { time?: TimeOfDay; near?: NearStyle; weather?: Weather } = {}) {
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
    this.shadowSize(this.sun, 4096);
    Object.assign(this.sun.shadow.camera, { left: -600, right: 600, top: 600, bottom: -600, near: 1, far: 3600 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    s.add(this.sun, this.sun.target);
    this.renderer.toneMappingExposure = L.exposure;
    // effects + weather (C2 / C5): rain greys the sky, dims the sun, pulls the fog in and lays a wet sheen on the road
    this.weather = opts.weather ?? 'clear'; this.kick = 0; this.kicked = false; this.nosFov = 0; this.fxT = 0;
    this.fxSeen = [{ ev: -1, done: false }, { ev: -1, done: false }];
    this.fx.clear(); s.add(this.fx.mesh);
    this.rain = undefined;
    if (this.weather === 'rain') {
      const grey = new THREE.Color(SKY[time].horizon).lerp(new THREE.Color('#5d6573'), 0.65);
      s.background = grey; s.fog = new THREE.Fog(grey, L.fog[0] * 0.45, L.fog[1] * 0.5);
      this.hemi.intensity *= 0.8; this.sun.intensity *= 0.45;
      this.rain = new Rain(this.lite ? 350 : 700); s.add(this.rain.mesh);
      const len = distanceM / METERS_PER_BLOCK + 1400, wet = new THREE.Mesh(new THREE.PlaneGeometry(len, 130),
        new THREE.MeshStandardMaterial({ color: '#1c2028', roughness: 0.08, metalness: 0.75, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      wet.rotation.x = -Math.PI / 2; wet.position.set(400 - len / 2, 0.3, 40); wet.renderOrder = 1; s.add(wet);
    }
    this.stage = new Stage(stageDef, distanceM / METERS_PER_BLOCK, this.mats, time, opts.near || 'mixed');
    s.add(this.stage.group);
    this.player = new CarModel(playerLook, this.mats); this.player.group.position.z = LANE_Z[0]; s.add(this.player.group);
    this.opponent = new CarModel(oppLook, this.mats); this.opponent.group.position.z = LANE_Z[1]; s.add(this.opponent.group);
    if (time !== 'day') for (const car of [this.player, this.opponent]) car.group.add(carLightPools(time === 'night' ? 1 : 0.6, car.L, car.W));
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

  /** Typing Race (owner 2026-10-19): the top-down road with these five cars (index = lane). */
  setupTyping(looks: CarLook[]) {
    if (!this.typing) { this.typing = new TypingView(this.mats); this.typing.scene.environment = this.garageScene.environment; this.typing.scene.environmentIntensity = 0.12; }
    this.typing.setCars(looks);
    const sz = this.renderer.getSize(new THREE.Vector2()); this.typing.resize(sz.x, sz.y);
    this.renderer.toneMappingExposure = 1;
    this.mode = 'typing';
  }

  render(dt: number) {
    if (this.mode === 'garage') {
      const D = this.drag;
      if (!D.on) { this.turntable.rotation.y += D.v; D.v *= Math.pow(0.02, dt); if (Math.abs(D.v) < 0.0005) D.v = 0; }
      if (this.face && !D.on) {                                                     // ease round to the part (shortest way)
        const c = this.garageCam.position, want = Math.atan2(-c.z, c.x) - Math.atan2(-this.face[1], this.face[0]);
        let diff = (want - this.turntable.rotation.y) % (2 * Math.PI); if (diff > Math.PI) diff -= 2 * Math.PI; if (diff < -Math.PI) diff += 2 * Math.PI;
        this.turntable.rotation.y += diff * (1 - Math.exp(-5 * dt));
      } else if (this.autoSpin && !D.on && D.v === 0) this.turntable.rotation.y += dt * 0.25;
      this.renderer.render(this.garageScene, this.garageCam);
    } else if (this.mode === 'typing' && this.typing) this.renderer.render(this.typing.scene, this.typing.cam); else if (this.blur.strength > 0) this.blur.render(this.raceScene, this.raceCam, dt);
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
function carLightPools(k: number, L = CAR_L, W = CAR_W) {
  const g = new THREE.Group();
  const pool = (w: number, d: number, x: number, colour: string, a: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(colour).multiplyScalar(a * k) }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.35, W / 2); m.renderOrder = 2; g.add(m);
  };
  pool(90, 40, -34, '#fff1c8', 0.9);
  pool(26, 30, L + 8, '#ff3a2a', 0.5);
  return g;
}
