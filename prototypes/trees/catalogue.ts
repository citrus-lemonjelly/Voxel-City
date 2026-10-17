// Tree catalogue: every remix variant from src/render/trees.ts, lined up next to a Civix for scale.
import * as THREE from 'three';
import { makeMaterials } from '../../src/render/voxel';
import { CarModel, STOCK_LOOK, CAR_L } from '../../src/render/carBuilder';
import { treeMesh, treeGeometry, TREE_VARIANTS } from '../../src/render/trees';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1600, 900); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NeutralToneMapping;
document.body.style.margin = '0'; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#bcd6ec');
scene.add(new THREE.HemisphereLight('#e4f0ff', '#6b6250', 1.1));
const sun = new THREE.DirectionalLight('#fff2dc', 2.4); sun.position.set(-400, 700, 500); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -600, right: 600, top: 600, bottom: -600, near: 1, far: 3000 }); sun.shadow.bias = -0.0005; scene.add(sun);
const ground = new THREE.Mesh(new THREE.BoxGeometry(2000, 2, 600), new THREE.MeshStandardMaterial({ color: '#a7a39a', roughness: 0.95 })); ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
const mats = makeMaterials();
const stats: Record<string, { tris: number; ms: number }> = {};
const order = ['sapling1', 'sapling2', 'young1', 'young2', 'street1', 'street1b', 'street2', 'street2b', 'park1', 'park2'];
let x = -560;
const car = new CarModel(STOCK_LOOK, mats); car.group.position.set(x - CAR_L / 2 - 40, 0, -14); scene.add(car.group);
for (const n of order) {
  const t0 = performance.now(); const g = treeGeometry(n); stats[n] = { tris: g.index.count / 3, ms: Math.round(performance.now() - t0) };
  const m = treeMesh(n, mats); const w = TREE_VARIANTS[n].k * 24;
  x += w / 2 + 14; m.position.set(x, 0, 0); scene.add(m); x += w / 2 + 14;
}
const cam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 6000); cam.position.set(-120, 210, 1180); cam.lookAt(-120, 70, 0);
renderer.render(scene, cam);
(window as any).__stats = stats; (window as any).__done = true;
