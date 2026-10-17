// Renderer, lighting and the two Step 1 views: garage showroom (static garage screen, G1) and the race (R11 rear-chase).
import * as THREE from 'three';
import { RoomEnvironment } from '../../vendor/addons/RoomEnvironment.js';
import { makeMaterials, Materials } from './voxel';
import { CarModel, CarLook, CAR_L, CAR_W } from './carBuilder';
import { Stage, LANE_Z, METERS_PER_BLOCK } from './stage';
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
  private camX = 0;

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
    this.buildGarage();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = this.canvasHost.clientWidth || window.innerWidth, h = this.canvasHost.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
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
  setupRace(stageDef: StageDef, distanceM: number, playerLook: CarLook, oppLook: CarLook) {
    const s = this.raceScene;
    s.clear();
    s.background = new THREE.Color(stageDef.sky);
    s.fog = new THREE.Fog(stageDef.sky, 1500, 4800);
    s.add(new THREE.HemisphereLight('#e4f0ff', '#6b6250', 1.0));
    this.sun.position.set(200, 320, 240); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); Object.assign(this.sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 900 });
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.5;
    s.add(this.sun, this.sun.target);
    this.stage = new Stage(stageDef, distanceM / METERS_PER_BLOCK);
    s.add(this.stage.group);
    this.player = new CarModel(playerLook, this.mats); this.player.group.position.z = LANE_Z[0]; s.add(this.player.group);
    this.opponent = new CarModel(oppLook, this.mats); this.opponent.group.position.z = LANE_Z[1]; s.add(this.opponent.group);
    this.camX = 0;
    this.mode = 'race';
  }

  /** Positions in metres from the start line; wheel angle from distance. */
  updateRace(playerM: number, oppM: number, speedMs: number, dt: number) {
    if (!this.player || !this.opponent || !this.stage) return;
    const px = -playerM / METERS_PER_BLOCK, ox = -oppM / METERS_PER_BLOCK;
    this.player.group.position.x = px; this.opponent.group.position.x = ox;
    this.player.setWheelAngle(playerM / 0.29); this.opponent.setWheelAngle(oppM / 0.29);
    // rear-chase camera: behind and slightly outside the player, eased so speed reads as motion
    // pull back to keep a trailing rival in frame (up to a limit), so both cars stay readable
    const lag = Math.max(0, ox - px);
    const targetX = px + 150 + Math.min(40, speedMs * 0.8) + Math.min(260, lag * 1.05);
    this.camX += (targetX - this.camX) * Math.min(1, dt * 6);
    const back = this.camX - px;                                  // how far behind the player the camera sits
    this.raceCam.position.set(this.camX, 30 + Math.min(6, speedMs * 0.08) + (back - 150) * 0.12, CAR_W / 2 + 26);
    this.raceCam.lookAt(px - 110, 10, CAR_W / 2 + 18);
    this.raceCam.fov = 46 + Math.min(10, speedMs * 0.18); this.raceCam.updateProjectionMatrix();
    this.sun.position.set(px + 200, 320, 240); this.sun.target.position.set(px - 60, 0, 30);
    this.stage.update(this.camX);
  }

  render(dt: number) {
    if (this.mode === 'garage') {
      this.turntable.rotation.y += dt * 0.25;
      this.renderer.render(this.garageScene, this.garageCam);
    } else this.renderer.render(this.raceScene, this.raceCam);
  }
}
