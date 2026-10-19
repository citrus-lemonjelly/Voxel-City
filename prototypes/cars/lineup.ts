// Car body lineup (owner: new car designs). The current Civix next to the concept bodies from src/render/bodies.ts,
// all at the same block size. Open the built HTML to look around: drag to orbit, wheel to zoom, 1–5 to focus a car.
import * as THREE from 'three';
import { makeMaterials, mergedVoxMeshes } from '../../src/render/voxel';
import { CarModel, STOCK_LOOK, CAR_L, SHADE } from '../../src/render/carBuilder';
import { BODY_PROFILES, buildBodyVoxels } from '../../src/render/bodies';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NeutralToneMapping;
document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#c9d6e2');
scene.add(new THREE.HemisphereLight('#e4f0ff', '#6b6250', 1.15));
const sun = new THREE.DirectionalLight('#fff2dc', 2.3); sun.position.set(-300, 600, -420); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 500, bottom: -500, near: 1, far: 2500 }); sun.shadow.bias = -0.0005; scene.add(sun);
const ground = new THREE.Mesh(new THREE.BoxGeometry(4000, 2, 900), new THREE.MeshStandardMaterial({ color: '#a7a39a', roughness: 0.95 })); ground.position.set(300, -1, 0); ground.receiveShadow = true; scene.add(ground);
const mats = makeMaterials();

type Entry = { name: string; g: THREE.Group; L: number; W: number; x: number };
const cars: Entry[] = [];
const gap = 70; let x = -340;
const civix = new CarModel(STOCK_LOOK, mats); civix.group.position.set(x, 0, 0); scene.add(civix.group);
cars.push({ name: 'Civix (current)', g: civix.group, L: CAR_L, W: 28, x }); x += CAR_L + gap;
// ?set=d → the League D hatch lineup only; default = every body
const SET = new URLSearchParams(location.search).get('set') === 'd' ? ['classic', 'premium', 'city', 'supermini', 'sporthatch']
  : ['classic', 'premium', 'city', 'supermini', 'sporthatch', 'sedan', 'muscle', 'tuner', 'tuner_up', 'hyper', 'pony', 'compact', 'rally'];
for (const id of SET) {
  const P = BODY_PROFILES[id], { body, wheels, wheelY } = buildBodyVoxels(P), paint = new THREE.Color(P.paint);
  const g = new THREE.Group();
  g.add(mergedVoxMeshes(body, mats, v => paint.clone().multiplyScalar(SHADE[v.shade || 'mid'] || 1)));
  for (const w of wheels) { const pv = new THREE.Group(); pv.position.set(w.cx, wheelY, 0); pv.add(mergedVoxMeshes(w.items, mats, () => paint)); g.add(pv); }
  g.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, 0); scene.add(g);
  cars.push({ name: P.name, g, L: P.L, W: P.W, x }); x += P.L + gap;
}
civix.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 6000);
// views: side = the race camera's side (z < 0), car front pointing screen-right; 3/4 front; 3/4 rear; top
function view(i: number | 'all', kind: 'side' | 'front34' | 'rear34' | 'top' | 'all') {
  if (i === 'all') { const cx = (cars[0].x + cars[cars.length - 1].x + cars[cars.length - 1].L) / 2; cam.fov = 12.5; cam.position.set(cx, 120, -1350); cam.lookAt(cx, 12, 14); }
  else {
    const c = cars[i], cx = c.x + c.L / 2, cz = c.W / 2;
    cam.fov = 26;
    if (kind === 'side') { cam.position.set(cx, 22, -230); cam.lookAt(cx, 10, cz); }
    if (kind === 'front34') { cam.position.set(c.x - 140, 70, -150); cam.lookAt(cx - 4, 8, cz); }
    if (kind === 'rear34') { cam.position.set(c.x + c.L + 140, 70, -150); cam.lookAt(cx + 4, 8, cz); }
    if (kind === 'top') { cam.position.set(cx, 260, cz - 30); cam.lookAt(cx, 0, cz); }
  }
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); renderer.render(scene, cam);
}
(window as any).__view = view; (window as any).__cars = cars.map(c => c.name);
// simple orbit for the owner
let yaw = -1.2, pitch = 0.25, dist = 260, focus = 2, drag = false, lx = 0, ly = 0;
const orbit = () => { const c = cars[focus], cx = c.x + c.L / 2; cam.fov = 28; cam.position.set(cx + Math.sin(yaw) * dist * Math.cos(pitch), 10 + Math.sin(pitch) * dist, c.W / 2 - Math.cos(yaw) * dist * Math.cos(pitch)); cam.lookAt(cx, 10, c.W / 2); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); renderer.render(scene, cam); };
addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => (drag = false));
addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - lx) * 0.008; pitch = Math.max(0.02, Math.min(1.3, pitch + (e.clientY - ly) * 0.006)); lx = e.clientX; ly = e.clientY; orbit(); });
addEventListener('wheel', e => { dist = Math.max(90, Math.min(700, dist * (e.deltaY > 0 ? 1.1 : 0.9))); orbit(); });
addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= cars.length) { focus = n - 1; orbit(); } if (e.key === '0') view('all', 'all'); });
addEventListener('resize', orbit);
view('all', 'all');
(window as any).__done = true;
