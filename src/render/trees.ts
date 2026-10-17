// Trees remixed from the owner's VOX Trees pack (assets/VOX Trees.zip → src/data/vox/tree*.json).
// The originals are 21×32×21 and 24×38×24 voxels — sapling size next to a real-size car — so street and park trees
// are rebuilt bigger while keeping their stacked leaf clusters: every source voxel becomes a k×k×k cube of car-sized
// blocks, then cluster corners are nibbled away so edges step in single blocks. Each variant mixes our palette greens
// with a share of the pack's original bright greens. Greedy-meshed + cached, so a full tree is one cheap mesh.
import * as THREE from 'three';
import { Materials, VoxGrid, greedyGeometry } from './voxel';
import T1 from '../data/vox/tree1.json';
import T2 from '../data/vox/tree2.json';
import { makeRng } from '../game/ai';

type Src = { size: number[]; voxels: [number, number, number, string][] };
/** Decode the compact .vox JSON written by tools/vox2json.py (base64 bytes: x, y, z, palette index). */
export function decodeVox(j: { size: number[]; palette: string[]; data: string }): Src {
  const bin = atob(j.data), voxels: Src['voxels'] = [];
  for (let i = 0; i < bin.length; i += 4) voxels.push([bin.charCodeAt(i), bin.charCodeAt(i + 1), bin.charCodeAt(i + 2), j.palette[bin.charCodeAt(i + 3)]]);
  return { size: j.size, voxels };
}
const SOURCES: Src[] = [decodeVox(T1 as any), decodeVox(T2 as any)];

// pack colour → our palette (bright originals are kept for a share of clusters, per variant)
const OURS: Record<string, string> = { '#005500': '#3a6a2c', '#008800': '#477d34', '#00aa00': '#4f8a3a', '#00bb00': '#5f9a3a', '#00cc00': '#6aa444', '#33cc00': '#76b04a', '#663300': '#6b4a2e' };
const TRUNK = '#663300';

export interface TreeVariant { src: 0 | 1; k: number; bright: number; seed: number; tint?: number }
/** The tree catalogue. k = blocks per source voxel (1 = sapling as supplied, 2 = young, 3 = street, 4 = big park tree). */
export const TREE_VARIANTS: Record<string, TreeVariant> = {
  sapling1: { src: 0, k: 1, bright: 0.28, seed: 1 },
  sapling2: { src: 1, k: 1, bright: 0.25, seed: 2 },
  young1: { src: 0, k: 2, bright: 0.12, seed: 3 },
  young2: { src: 1, k: 2, bright: 0.1, seed: 4 },
  street1: { src: 0, k: 3, bright: 0.08, seed: 5 },
  street2: { src: 1, k: 3, bright: 0.07, seed: 6 },
  street1b: { src: 0, k: 3, bright: 0.15, seed: 7, tint: 1.06 },
  street2b: { src: 1, k: 3, bright: 0.03, seed: 8, tint: 0.92 },
  park1: { src: 0, k: 4, bright: 0.05, seed: 9 },
  park2: { src: 1, k: 4, bright: 0.03, seed: 10, tint: 0.95 },
};
export const STREET_TREES = ['street1', 'street2', 'street1b', 'street2b', 'young1', 'young2'];
export const PARK_TREES = ['park1', 'park2', 'street1', 'street2', 'street1b', 'street2b', 'young1'];
export const SAPLINGS = ['sapling1', 'sapling2'];

const CACHE = new Map<string, THREE.BufferGeometry>();

function buildGrid(v: TreeVariant): VoxGrid {
  const src = SOURCES[v.src], rng = makeRng(1000 + v.seed * 97), k = v.k;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, y, z] of src.voxels) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const sx = x1 - x0 + 1, sy = y1 - y0 + 1, sz = z1 - z0 + 1;
  const occ = new Set(src.voxels.map(([x, y, z]) => `${x - x0},${y - y0},${z - z0}`));
  const nx = sx * k, ny = sy * k, nz = sz * k, cells = new Uint16Array(nx * ny * nz);
  const palette: THREE.Color[] = [], palIdx = new Map<string, number>();
  const pal = (hex: string) => { let i = palIdx.get(hex); if (i === undefined) { i = palette.length; palette.push(new THREE.Color(hex).multiplyScalar(hex === OURS[TRUNK] ? 1 : (v.tint ?? 1))); palIdx.set(hex, i); } return i + 1; };
  // bright greens come in sun-lit PATCHES (low-frequency hash over the canopy, favouring the top), not single speckles
  const hash = (a: number, b: number, c: number) => { const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + v.seed * 19.3) * 43758.5453; return h - Math.floor(h); };
  for (const [ox, oy, oz, c] of src.voxels) {
    const x = ox - x0, y = oy - y0, z = oz - z0;
    const sunlit = 0.6 + 0.6 * (y / sy);
    const patch = hash(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3));
    // owner Q18: brights kept to a few patches, and softened partway toward our greens so they read as sunlight, not neon
    const colour = c === TRUNK ? OURS[TRUNK] : (patch < v.bright * sunlit ? '#' + new THREE.Color(OURS[c] || c).lerp(new THREE.Color(c), 0.55).getHexString() : (OURS[c] || c));
    const ci = pal(colour);
    if (k === 1) { cells[x + nx * (y + ny * z)] = ci; continue; }
    const open = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([a, b, d]) => !occ.has(`${x + a},${y + b},${z + d}`));
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let l = 0; l < k; l++) {
      const ex = (i === 0 && open[1]) || (i === k - 1 && open[0]), ey = (j === 0 && open[3]) || (j === k - 1 && open[2]), ez = (l === 0 && open[5]) || (l === k - 1 && open[4]);
      if (c !== TRUNK && +ex + +ey + +ez >= 2) continue;          // round every exposed cluster edge by one block
      cells[(x * k + i) + nx * ((y * k + j) + ny * (z * k + l))] = ci;
    }
  }
  return { nx, ny, nz, cells, palette };
}

/** Geometry for a variant, centred on the trunk in x/z with its base at y = 0 (cached). */
export function treeGeometry(name: string): THREE.BufferGeometry {
  let g = CACHE.get(name);
  if (!g) {
    const v = TREE_VARIANTS[name], grid = buildGrid(v);
    g = greedyGeometry(grid);
    // centre on the trunk: find trunk cells in the bottom layer
    let tx = 0, tz = 0, n = 0;
    for (let z = 0; z < grid.nz; z++) for (let x = 0; x < grid.nx; x++) if (grid.cells[x + grid.nx * (0 + grid.ny * z)]) { tx += x; tz += z; n++; }
    g.translate(-(n ? tx / n + 0.5 : grid.nx / 2), 0, -(n ? tz / n + 0.5 : grid.nz / 2));
    g.computeBoundingSphere();
    CACHE.set(name, g);
  }
  return g;
}

export function treeMesh(name: string, mats: Materials): THREE.Mesh {
  const m = new THREE.Mesh(treeGeometry(name), mats.trimV);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
