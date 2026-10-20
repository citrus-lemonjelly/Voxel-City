// Typing Race view (owner 2026-10-19): Nitro Type-style, straight down from above. A voxel road with 5 lanes, race curbs,
// sidewalks, grass verges with trees and rooftops beyond; real garage cars (paint, decals, parts) seen from the top. The
// camera follows your car (Q122). Same block size as the cars. Cars drive towards −x (front at local x = 0, like the
// drag race), so the camera's "up" is +z and screen-right is −x.
import * as THREE from 'three';
import { CarModel, CarLook } from './carBuilder';
import { Materials } from './voxel';

export const TYPE_TRACK = {
  /** start line → finish line (blocks); about 150 m. Car noses start 8 blocks behind the start line and finish past the
   *  far edge of the finish line: distance = progress × (length + 26). */
  length: 2200, lanes: 5, laneW: 36,
  /** how much of the world the camera shows top to bottom (blocks); the road fills the upper ~55% of the screen */
  viewH: 400, viewTop: 208,
  /** your car sits this far left of the screen centre (share of the screen width), so you see the road ahead */
  lead: 0.12,
};
const T = TYPE_TRACK;
/** Lane centre z (lane 0 = top of the screen). */
export const laneZ = (i: number) => (T.lanes - 1 - i) * T.laneW + T.laneW / 2;
const ROAD_W = T.lanes * T.laneW;

function blockTexture(size: number, paint: (x: number, y: number) => string, repeat: [number, number]): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { g.fillStyle = paint(x, y); g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  return t;
}
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export class TypingView {
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 2000);
  cars: CarModel[] = [];
  private sun = new THREE.DirectionalLight('#fff2dc', 1.9);
  private camX = 0;
  private aspect = 16 / 9;

  constructor(private mats: Materials) {
    const s = this.scene;
    s.background = new THREE.Color('#4f5f47');
    s.add(new THREE.HemisphereLight('#e8f0ff', '#5a5448', 0.85));
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -520, right: 520, top: 320, bottom: -320, near: 1, far: 1600 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.5;
    s.add(this.sun, this.sun.target);
    this.cam.up.set(0, 0, 1);
    this.buildTrack();
  }

  private buildTrack() {
    const s = this.scene, x0 = 600, x1 = -T.length - 900, len = x0 - x1, cx = (x0 + x1) / 2;
    const plane = (w: number, d: number, z: number, y: number, tex: THREE.Texture, rough = 0.95) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: rough }));
      m.rotation.x = -Math.PI / 2; m.position.set(cx, y, z); m.receiveShadow = true; s.add(m); return m;
    };
    // asphalt, 1 texel = 1 block
    plane(len, ROAD_W, ROAD_W / 2, 0, blockTexture(32, (x, y) => ['#34373e', '#383b42', '#31343a', '#3a3d44'][Math.floor(hash(x, y) * 4)], [len / 32, ROAD_W / 32]));
    // sidewalks (slabs) and grass verges, both sides
    const slab = blockTexture(16, (x, y) => ((x >> 3) + (y >> 3)) % 2 ? '#9a9ea6' : '#a4a8b0', [len / 16, 1]);
    plane(len, 16, ROAD_W + 4 + 8, 0.5, slab); plane(len, 16, -4 - 8, 0.5, slab.clone());
    const grass = blockTexture(32, (x, y) => ['#5b6b52', '#62735a', '#55654c', '#5f7056'][Math.floor(hash(x + 7, y) * 4)], [len / 32, 3]);
    plane(len, 96, ROAD_W + 20 + 48, 0.4, grass); plane(len, 96, -20 - 48, 0.4, grass.clone());
    // race curbs: red / white blocks, 1 high
    const curb = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 1, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), Math.ceil(len / 6) * 2);
    let n = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let x = x1; x < x0; x += 6) for (const z of [ROAD_W + 2, -2]) {
      m4.makeTranslation(x + 3, 0.5, z); curb.setMatrixAt(n, m4); curb.setColorAt(n, col.set(Math.floor((x - x1) / 6) % 2 ? '#d23a2a' : '#eeeae0')); n++;
    }
    curb.count = n; curb.receiveShadow = true; s.add(curb);
    // dashed lane lines, 2 blocks wide
    const dashes: THREE.Matrix4[] = [];
    for (let l = 1; l < T.lanes; l++) for (let x = x1; x < x0; x += 24) dashes.push(new THREE.Matrix4().makeTranslation(x + 6, 0.08, l * T.laneW));
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 0.1, 2), new THREE.MeshStandardMaterial({ color: '#d9d6cc', roughness: 0.7 }), dashes.length);
    dashes.forEach((d, i) => dash.setMatrixAt(i, d)); dash.receiveShadow = true; s.add(dash);
    // start and finish lines: chequered bands across the road
    const chequer = blockTexture(2, (x, y) => (x + y) % 2 ? '#1a1a1e' : '#eeeae0', [3, ROAD_W / 6]);
    for (const x of [0, -T.length]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(18, ROAD_W), new THREE.MeshStandardMaterial({ map: chequer, roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x - 9, 0.12, ROAD_W / 2); m.receiveShadow = true; s.add(m); }
    // trees on both verges and rooftops beyond: voxel boxes that cast shadows onto the grass
    const trees: [number, number, number][] = [];
    for (let x = x1; x < x0; x += 52) for (const side of [1, -1]) { const k = hash(x, side); if (k < 0.15) continue; trees.push([x + k * 20, side > 0 ? ROAD_W + 34 + k * 10 : -34 - k * 10, 9 + Math.round(k * 5)]); }
    const leaf = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), trees.length * 2);
    let t = 0;
    for (const [x, z, r] of trees) for (const [sz, h, c] of [[r * 2, 10, '#2f7a3a'], [r * 1.2, 15, '#3f8a46']] as [number, number, string][]) {
      m4.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion(), new THREE.Vector3(Math.round(sz), 6, Math.round(sz))); leaf.setMatrixAt(t, m4); leaf.setColorAt(t, col.set(c).multiplyScalar(0.9 + hash(x, z) * 0.2)); t++;
    }
    leaf.castShadow = true; leaf.receiveShadow = true; s.add(leaf);
    const roofs: [number, number, number, number, string][] = [];
    const ROOF = ['#7a6f66', '#8b5e4a', '#5f6672', '#9a8f80', '#6d5a63', '#4f5a52'];
    for (let x = x1; x < x0;) { const w = 50 + Math.round(hash(x, 3) * 60); for (const side of [1, -1]) roofs.push([x + w / 2, side > 0 ? ROAD_W + 20 + 96 + 40 : -20 - 96 - 40, w - 6, 18 + Math.round(hash(x, side) * 40), ROOF[Math.floor(hash(x, side * 5) * ROOF.length)]]); x += w; }
    const bld = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 }), roofs.length);
    roofs.forEach(([x, z, w, h, c], i) => { m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, 80)); bld.setMatrixAt(i, m4); bld.setColorAt(i, col.set(c)); });
    bld.castShadow = true; bld.receiveShadow = true; s.add(bld);
  }

  /** Put the five cars on the grid (index = lane). */
  setCars(looks: CarLook[]) {
    this.flames.clear();
    for (const c of this.cars) { this.scene.remove(c.group); c.group.traverse((o: any) => o.isMesh && o.geometry?.dispose()); }
    this.cars = looks.map((look, i) => {
      const car = new CarModel(look, this.mats);
      car.group.position.set(8, 0, laneZ(i) - car.W / 2);
      car.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.scene.add(car.group); return car;
    });
  }

  resize(w: number, h: number) { this.aspect = w / h; this.frame(); }

  /** Nitro flame: a steady blue-and-orange plume from each tail pipe area while the boost lasts (no flicker). */
  private flames = new Map<number, THREE.Group>();
  setBoost(i: number, on: boolean) {
    const car = this.cars[i]; if (!car) return;
    let f = this.flames.get(i);
    if (!f) {
      if (!on) return;
      f = new THREE.Group(); f.name = 'nitro';
      for (const z of [car.W * 0.3, car.W * 0.7]) for (const [len, w, c, x] of [[30, 6, '#f2742a', car.L + 16], [18, 3, '#9fd8ff', car.L + 10], [8, 1.5, '#ffffff', car.L + 5]] as [number, number, string, number][]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 2, w), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
        m.position.set(x, 3, z); f.add(m);
      }
      car.group.add(f); this.flames.set(i, f);
    }
    f.visible = on;
  }

  /** Car noses at these distances along the track (blocks from the start line); `follow` = your car's index. */
  update(dist: number[], follow: number) {
    dist.forEach((d, i) => { const c = this.cars[i]; if (c) c.group.position.x = 8 - d; });
    const me = this.cars[follow];
    if (me) this.camX = me.group.position.x - TYPE_TRACK.viewH * this.aspect * T.lead + me.L / 2;
    this.frame();
  }

  private frame() {
    const h = T.viewH, w = h * this.aspect, zc = T.viewTop - h / 2;
    Object.assign(this.cam, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
    this.cam.position.set(this.camX, 600, zc); this.cam.lookAt(this.camX, 0, zc); this.cam.updateProjectionMatrix();
    // sun from the upper left of the screen (+x, +z), so shadows fall down and to the right; snapped to texels
    const sc = this.sun.shadow.camera, texel = (sc.right - sc.left) / this.sun.shadow.mapSize.x, tx = Math.round(this.camX / texel) * texel;
    this.sun.position.set(tx + 260, 700, zc + 320); this.sun.target.position.set(tx, 0, zc);
  }

  /** Screen position (px) of a world point, for the name tags. */
  toScreen(x: number, z: number, w: number, h: number) {
    const v = new THREE.Vector3(x, 2, z).project(this.cam);
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
  }
}
