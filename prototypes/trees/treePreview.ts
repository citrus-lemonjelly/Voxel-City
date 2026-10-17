// Tree study: the owner's VOX Trees (as-is) vs the same shapes rebuilt at real street-tree height in car-sized blocks.
import * as THREE from 'three';
import { makeMaterials, mergedVoxMeshes, Vox } from '../../src/render/voxel';
import { CarModel, STOCK_LOOK, CAR_L } from '../../src/render/carBuilder';
import T1 from './tree1.json';
import T2 from './tree2.json';

type Src = { size: number[]; voxels: [number, number, number, string][] };
const OUR_GREENS: Record<string, string> = { '#005500': '#3a6a2c', '#008800': '#477d34', '#00aa00': '#4f8a3a', '#00bb00': '#5f9a3a', '#00cc00': '#6aa444', '#33cc00': '#76b04a', '#663300': '#6b4a2e' };

function asIs(t: Src, recolour = false): Vox[] {
  const xs = t.voxels.map(v => v[0]), zs = t.voxels.map(v => v[2]), y0 = Math.min(...t.voxels.map(v => v[1]));
  const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2), cz = Math.round((Math.min(...zs) + Math.max(...zs)) / 2);
  return t.voxels.map(([x, y, z, c]) => ({ x: x - cx, y: y - y0, z: z - cz, c: recolour ? (OUR_GREENS[c] || c) : c, role: 'trim', s: 1 }));
}

/** Rebuild the shape k× bigger in 1-block voxels: blur the occupancy, sample it smoothly, keep the nearest source colour. */
function upscale(t: Src, k: number, seed = 1): Vox[] {
  const src = asIs(t, true);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const occ = new Map<string, string>(); for (const v of src) occ.set(key(v.x, v.y, v.z), v.c!);
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, mnz = 1e9, mxz = -1e9;
  for (const v of src) { mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
  const blur = new Map<string, number>();
  const B = (x: number, y: number, z: number) => {
    const kk = key(x, y, z); let b = blur.get(kk);
    if (b === undefined) { b = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) if (occ.has(key(x + i, y + j, z + l))) b++; b /= 27; blur.set(kk, b); }
    return b;
  };
  const dens = (px: number, py: number, pz: number) => {
    const x0 = Math.floor(px), y0 = Math.floor(py), z0 = Math.floor(pz), fx = px - x0, fy = py - y0, fz = pz - z0;
    let d = 0;
    for (const [i, wx] of [[0, 1 - fx], [1, fx]]) for (const [j, wy] of [[0, 1 - fy], [1, fy]]) for (const [l, wz] of [[0, 1 - fz], [1, fz]]) d += B(x0 + i, y0 + j, z0 + l) * wx * wy * wz;
    return d;
  };
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const inside = new Set<string>(); const col = new Map<string, string>();
  for (let x = Math.floor((mnx - 1) * k); x <= Math.ceil((mxx + 2) * k); x++) for (let y = 0; y <= Math.ceil((mxy + 2) * k); y++) for (let z = Math.floor((mnz - 1) * k); z <= Math.ceil((mxz + 2) * k); z++) {
    const px = (x + 0.5) / k - 0.5, py = (y + 0.5) / k - 0.5, pz = (z + 0.5) / k - 0.5;
    if (dens(px, py, pz) < 0.3) continue;
    // nearest occupied source voxel → colour
    let best = '', bd = 1e9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) {
      const sx = Math.round(px) + i, sy = Math.round(py) + j, sz = Math.round(pz) + l, c = occ.get(key(sx, sy, sz));
      if (c) { const d = (sx - px) ** 2 + (sy - py) ** 2 + (sz - pz) ** 2; if (d < bd) { bd = d; best = c; } }
    }
    if (!best) continue;
    inside.add(key(x, y, z)); col.set(key(x, y, z), best);
  }
  const out: Vox[] = [];
  for (const kk of inside) {
    const [x, y, z] = kk.split(',').map(Number);
    if (inside.has(key(x + 1, y, z)) && inside.has(key(x - 1, y, z)) && inside.has(key(x, y + 1, z)) && inside.has(key(x, y - 1, z)) && inside.has(key(x, y, z + 1)) && inside.has(key(x, y, z - 1))) continue;
    const c = new THREE.Color(col.get(kk)).multiplyScalar(0.94 + rnd() * 0.12);
    out.push({ x, y, z, c: '#' + c.getHexString(), role: 'trim', s: 1 });
  }
  return out;
}

/** Keep the clustered look: each source voxel becomes a k×k×k cube of blocks, then the outer corners are nibbled
 *  away at random so cluster edges step in single blocks, with per-block colour variation. */
function chunky(t: Src, k: number, seed = 3): Vox[] {
  const src = asIs(t, true), key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const occ = new Set(src.map(v => key(v.x, v.y, v.z)));
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const out: Vox[] = [];
  for (const v of src) {
    const open = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([a, b, c]) => !occ.has(key(v.x + a, v.y + b, v.z + c)));
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let l = 0; l < k; l++) {
      const edgeX = (i === 0 && open[1]) || (i === k - 1 && open[0]), edgeY = (j === 0 && open[3]) || (j === k - 1 && open[2]), edgeZ = (l === 0 && open[5]) || (l === k - 1 && open[4]);
      const edges = +edgeX + +edgeY + +edgeZ;
      if (edges >= 2 && rnd() < 0.75) continue;          // round off cluster corners
      if (edges === 1 && rnd() < 0.18) continue;         // break up flat faces
      const c = new THREE.Color(v.c!).multiplyScalar(0.92 + rnd() * 0.16);
      out.push({ x: v.x * k + i, y: v.y * k + j, z: v.z * k + l, c: '#' + c.getHexString(), role: 'trim', s: 1 });
    }
  }
  return out;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1600, 900); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NeutralToneMapping;
document.body.style.margin = '0'; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#bcd6ec');
scene.add(new THREE.HemisphereLight('#e4f0ff', '#6b6250', 1.1));
const sun = new THREE.DirectionalLight('#fff2dc', 2.4); sun.position.set(-300, 600, 400); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 1, far: 2000 }); sun.shadow.bias = -0.0005; scene.add(sun);
const ground = new THREE.Mesh(new THREE.BoxGeometry(1400, 2, 500), new THREE.MeshStandardMaterial({ color: '#a7a39a', roughness: 0.95 })); ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
const mats = makeMaterials();
const place = (g: THREE.Object3D, x: number, z = 0) => { g.position.x += x; g.position.z += z; scene.add(g); };
const V = new URLSearchParams(location.search).get('view') || 'a';
const tree = (vox: Vox[], x: number, z = 0) => place(mergedVoxMeshes(vox, mats, v => new THREE.Color(v.c!)), x, z);
const civix = (x: number, z: number, paint = STOCK_LOOK.paint) => { const c = new CarModel({ ...STOCK_LOOK, paint }, mats); c.group.position.set(x - CAR_L / 2, 0, z - 14); scene.add(c.group); };
const cam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 5000);
if (V === 'a') {          // as supplied, next to the Civix
  civix(-70, 20); tree(asIs(T1 as any), 10); tree(asIs(T2 as any), 55); civix(130, 20, '#2f6fd6');
  cam.position.set(30, 95, 300); cam.lookAt(30, 18, 0);
} else {                  // real street-tree height: smooth rebuild vs cluster rebuild
  tree(upscale(T1 as any, 3.0), -250); tree(upscale(T2 as any, 2.8, 7), -110);
  tree(chunky(T1 as any, 3), 60); tree(chunky(T2 as any, 3, 9), 200);
  civix(-180, 70); civix(130, 70, '#2f6fd6');
  cam.position.set(-20, 210, 640); cam.lookAt(-20, 60, 0);
}
renderer.render(scene, cam);
(window as any).__done = true;
