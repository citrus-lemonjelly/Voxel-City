// Voxel → Three.js meshes. One InstancedMesh per material group, per-instance colours.
import * as THREE from 'three';
import { blockify } from './blockShade';

export type Role = 'paint' | 'trim' | 'glass' | 'light' | 'tire' | 'rim';
export interface Vox { x: number; y: number; z: number; c: string | null; role: Role; s: number; shade?: string }

const BOX = new THREE.BoxGeometry(1, 1, 1);

// Cars already carry their own edge shading, so they get a lighter dose of the shared block surface.
const CAR_SHADE = { noise: 0.035, top: 1.0, ground: 0.92 };
export function makeMaterials() {
  return {
    paint: blockify(new THREE.MeshPhysicalMaterial({ color: '#ffffff', flatShading: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.25 }), CAR_SHADE),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', flatShading: true, roughness: 0.15, clearcoat: 1, envMapIntensity: 0.6 }),
    trim: blockify(new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85, envMapIntensity: 0.25 }), CAR_SHADE),
    light: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    // vertex-coloured twins used by face-culled merged meshes (cars, parked cars, tanker)
    paintV: blockify(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, flatShading: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.25 }), CAR_SHADE),
    glassV: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, flatShading: true, roughness: 0.15, clearcoat: 1, envMapIntensity: 0.6 }),
    trimV: blockify(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, flatShading: true, roughness: 0.85, envMapIntensity: 0.25 }), CAR_SHADE),
    lightV: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: false }),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;

/** Build instanced meshes for a list of voxels. Fully enclosed same-size voxels are culled. */
export function buildVoxMeshes(items: Vox[], mats: Materials, paintColour: (v: Vox) => THREE.Color, offset = { x: 0, y: 0, z: 0 }): THREE.Group {
  const g = new THREE.Group();
  const occ = new Set(items.filter(v => v.role !== 'glass').map(v => `${v.s}|${v.x}|${v.y}|${v.z}`));
  const visible = items.filter(v => {
    const k = (dx: number, dy: number, dz: number) => occ.has(`${v.s}|${v.x + dx}|${v.y + dy}|${v.z + dz}`);
    return !(k(1, 0, 0) && k(-1, 0, 0) && k(0, 1, 0) && k(0, -1, 0) && k(0, 0, 1) && k(0, 0, -1));
  });
  const groups: Record<string, Vox[]> = {};
  for (const v of visible) {
    const key = v.role === 'paint' ? 'paint' : v.role === 'glass' ? 'glass' : v.role === 'light' ? 'light' : 'trim';
    (groups[key] ||= []).push(v);
  }
  const o = new THREE.Object3D();
  for (const [key, list] of Object.entries(groups)) {
    const im = new THREE.InstancedMesh(BOX, (mats as any)[key], list.length);
    list.forEach((v, i) => {
      o.position.set((v.x + 0.5) * v.s + offset.x, (v.y + 0.5) * v.s + offset.y, (v.z + 0.5) * v.s + offset.z);
      o.scale.setScalar(v.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, key === 'paint' ? paintColour(v) : new THREE.Color(v.c || '#ff00ff'));
    });
    im.castShadow = key !== 'light'; im.receiveShadow = true;
    g.add(im);
  }
  return g;
}

// ---- face-culled merged meshes ----
// Only faces that touch air are emitted, so a solid voxel shell costs ~1–2 faces per block instead of 6.
// Used for everything that doesn't need per-block animation: car bodies, wheels, parked cars, the tanker.
const FACES: { n: [number, number, number]; c: [number, number, number][] }[] = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const roleKey = (r: Role) => r === 'paint' ? 'paint' : r === 'glass' ? 'glass' : r === 'light' ? 'light' : 'trim';

export function mergedVoxMeshes(items: Vox[], mats: Materials, paintColour: (v: Vox) => THREE.Color, offset = { x: 0, y: 0, z: 0 }): THREE.Group {
  const occ = new Set<string>();
  for (const v of items) occ.add(`${v.s}|${v.x}|${v.y}|${v.z}`);
  const buf: Record<string, { p: number[]; n: number[]; c: number[]; i: number[] }> = {};
  const col = new THREE.Color();
  for (const v of items) {
    const key = roleKey(v.role);
    const b = (buf[key] ||= { p: [], n: [], c: [], i: [] });
    col.copy(key === 'paint' ? paintColour(v) : new THREE.Color(v.c || '#ff00ff'));
    for (const f of FACES) {
      if (occ.has(`${v.s}|${v.x + f.n[0]}|${v.y + f.n[1]}|${v.z + f.n[2]}`)) continue;
      const base = b.p.length / 3;
      for (const [cx, cy, cz] of f.c) {
        b.p.push((v.x + cx) * v.s + offset.x, (v.y + cy) * v.s + offset.y, (v.z + cz) * v.s + offset.z);
        b.n.push(f.n[0], f.n[1], f.n[2]); b.c.push(col.r, col.g, col.b);
      }
      b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.Group();
  const matFor: Record<string, THREE.Material> = { paint: mats.paintV, glass: mats.glassV, light: mats.lightV, trim: mats.trimV };
  for (const [key, b] of Object.entries(buf)) {
    if (!b.i.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    geo.setIndex(b.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.i, 1) : new THREE.Uint16BufferAttribute(b.i, 1));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, matFor[key]);
    m.castShadow = key !== 'light'; m.receiveShadow = true; m.name = key;
    g.add(m);
  }
  return g;
}

// ---- greedy-meshed dense grids (large static models: trees, future .vox props) ----
/** A dense voxel grid: cells hold 0 (empty) or 1 + palette index. x-fastest, then y, then z. */
export interface VoxGrid { nx: number; ny: number; nz: number; cells: Uint16Array; palette: THREE.Color[] }

/** Greedy mesher: exposed faces of the same colour on the same plane are merged into large quads.
 *  (Per-block shading noise comes from the shared block shader, so merging doesn't lose the 1-block look.) */
export function greedyGeometry(g: VoxGrid): THREE.BufferGeometry {
  const { nx, ny, nz, cells, palette } = g, dims = [nx, ny, nz];
  const at = (x: number, y: number, z: number) => (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) ? 0 : cells[x + nx * (y + ny * z)];
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, q = [0, 0, 0]; q[d] = 1;
    const mask = new Int32Array(dims[u] * dims[v]);
    for (let side = -1; side <= 1; side += 2) {
      for (let s = 0; s < dims[d]; s++) {
        // build the mask: faces of cells in slice s that face `side` and touch air
        let n = 0;
        const x = [0, 0, 0];
        for (x[v] = 0; x[v] < dims[v]; x[v]++) for (x[u] = 0; x[u] < dims[u]; x[u]++) {
          x[d] = s;
          const a = at(x[0], x[1], x[2]);
          const b = at(x[0] + q[0] * side, x[1] + q[1] * side, x[2] + q[2] * side);
          mask[n++] = a && !b ? a : 0;
        }
        // greedy merge
        n = 0;
        for (let j = 0; j < dims[v]; j++) for (let i = 0; i < dims[u];) {
          const c = mask[n];
          if (!c) { i++; n++; continue; }
          let w = 1; while (i + w < dims[u] && mask[n + w] === c) w++;
          let h = 1, done = false;
          while (j + h < dims[v] && !done) { for (let k = 0; k < w; k++) if (mask[n + k + h * dims[u]] !== c) { done = true; break; } if (!done) h++; }
          const base = [0, 0, 0]; base[d] = s + (side > 0 ? 1 : 0); base[u] = i; base[v] = j;
          const du = [0, 0, 0]; du[u] = w; const dv = [0, 0, 0]; dv[v] = h;
          const p0 = base, p1 = [base[0] + du[0], base[1] + du[1], base[2] + du[2]], p2 = [p1[0] + dv[0], p1[1] + dv[1], p1[2] + dv[2]], p3 = [base[0] + dv[0], base[1] + dv[1], base[2] + dv[2]];
          const vi = pos.length / 3, colr = palette[c - 1];
          for (const p of [p0, p1, p2, p3]) { pos.push(p[0], p[1], p[2]); nor.push(q[0] * side, q[1] * side, q[2] * side); col.push(colr.r, colr.g, colr.b); }
          if (side > 0) idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); else idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
          for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) mask[n + k + l * dims[u]] = 0;
          i += w; n += w;
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
