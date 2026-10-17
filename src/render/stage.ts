// Downtown Grid — voxel street built from recycled chunks so an 800 m drag strip stays cheap to render.
// World units = voxel blocks. Cars drive toward −x. Player lane z 0–28, opponent lane z 44–72.
import * as THREE from 'three';
import { StageDef } from '../data/stages';
import { makeRng } from '../game/ai';

export const METERS_PER_BLOCK = 4.0 / 58;          // the Civix is ~4 m long and 58 blocks long
export const LANE_Z = [0, 44];
const CHUNK = 300, N_CHUNKS = 11;
const BOX = new THREE.BoxGeometry(1, 1, 1);

interface Block { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: string; glow?: boolean }

function instanced(blocks: Block[], mat: THREE.Material, shadows = true) {
  const im = new THREE.InstancedMesh(BOX, mat, blocks.length);
  const o = new THREE.Object3D();
  blocks.forEach((b, i) => { o.position.set(b.x + b.sx / 2, b.y + b.sy / 2, b.z + b.sz / 2); o.scale.set(b.sx, b.sy, b.sz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color(b.c)); });
  im.castShadow = shadows; im.receiveShadow = true;
  return im;
}

export class Stage {
  group = new THREE.Group();
  private chunks: { idx: number; g: THREE.Group }[] = [];
  private mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.92, envMapIntensity: 0.2 });
  private matBasic = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  constructor(private def: StageDef, public finishBlocks: number) {
    for (let i = -2; i < N_CHUNKS - 2; i++) { const g = this.buildChunk(i); this.group.add(g); this.chunks.push({ idx: i, g }); }
  }
  /** Keep chunks around the camera: anything far behind is rebuilt further ahead. */
  update(cameraX: number) {
    for (const c of this.chunks) {
      const chunkFront = -(c.idx + 1) * CHUNK;          // most negative x of this chunk
      if (chunkFront > cameraX + 2 * CHUNK) {           // fully behind the camera
        const maxIdx = Math.max(...this.chunks.map(k => k.idx));
        this.group.remove(c.g); c.g.traverse((o: any) => o.isInstancedMesh && o.dispose());
        c.idx = maxIdx + 1; c.g = this.buildChunk(c.idx); this.group.add(c.g);
      }
    }
  }
  private buildChunk(idx: number): THREE.Group {
    const g = new THREE.Group();
    const rng = makeRng(1000 + idx * 7919);
    const x0 = -(idx + 1) * CHUNK, x1 = -idx * CHUNK;   // x0 < x1
    const B: Block[] = [], G: Block[] = [];
    // road surface: 4×4 block tiles in two greys
    for (let x = x0; x < x1; x += 20) B.push({ x, y: -1, z: -14, sx: 20, sy: 1, sz: 100, c: ((x / 20) & 1) ? '#45484e' : '#41444a' });
    // lane lines: yellow centre dashes, white edges
    for (let x = x0; x < x1; x += 30) B.push({ x, y: 0, z: 35, sx: 14, sy: 0.15, sz: 2, c: '#f2c230' });
    for (const z of [-10, 82]) B.push({ x: x0, y: 0, z, sx: CHUNK, sy: 0.15, sz: 1.5, c: '#e8e8e2' });
    // curbs + sidewalks
    for (const [z, sz] of [[-16, 2], [86, 2]] as const) B.push({ x: x0, y: -1, z, sx: CHUNK, sy: 2.2, sz, c: '#b9b19a' });
    for (const [z, sz] of [[-36, 20], [88, 20]] as const) for (let x = x0; x < x1; x += 10) B.push({ x, y: -1, z, sx: 10, sy: 2, sz, c: ((x / 10) & 1) ? '#b7b4ab' : '#aaa79e' });
    // buildings on both sides
    for (const side of [0, 1]) {
      let x = x0 + rng() * 20;
      while (x < x1 - 30) {
        const w = 50 + Math.floor(rng() * 70), d = 50 + Math.floor(rng() * 40), h = 60 + Math.floor(rng() * 180);
        const z = side === 0 ? -40 - d : 112;
        const col = this.def.buildingColours[Math.floor(rng() * this.def.buildingColours.length)];
        B.push({ x, y: 0, z, sx: Math.min(w, x1 - x - 4), sy: h, sz: d, c: col });
        // window rows on the street-facing side
        const face = side === 0 ? -40 : 112, wz = side === 0 ? face - 0.6 : face - 0.4;
        // window bands (one block per floor keeps instance counts low), plus a few lit panes
        const bw = Math.min(w, x1 - x - 4);
        for (let y = 14; y < h - 10; y += 18) {
          B.push({ x: x + 5, y, z: wz, sx: bw - 10, sy: 9, sz: 1, c: '#2c3a4e' });
          if (rng() > 0.55) B.push({ x: x + 6 + Math.floor(rng() * Math.max(1, bw - 22)), y: y + 1, z: wz - 0.2, sx: 10, sy: 7, sz: 1, c: '#cfd8e6' });
        }
        B.push({ x: x - 1, y: h, z: z - 1, sx: Math.min(w, x1 - x - 4) + 2, sy: 3, sz: d + 2, c: '#5a5e66' });   // roof trim
        x += w + 6 + rng() * 20;
      }
    }
    // lamp posts every 120 blocks
    for (let x = Math.ceil(x0 / 120) * 120; x < x1; x += 120) for (const side of [0, 1]) {
      const z = side === 0 ? -26 : 96, dir = side === 0 ? 1 : -1;
      B.push({ x, y: 0, z, sx: 2, sy: 46, sz: 2, c: '#3d4046' });
      B.push({ x, y: 44, z: side === 0 ? z : z - 12, sx: 2, sy: 2, sz: 14, c: '#3d4046' });
      G.push({ x: x - 1, y: 42, z: z + dir * 10 - 2, sx: 4, sy: 2, sz: 4, c: '#e8e4d8' });
    }
    // start line, finish line + gantry
    const checker = (lineX: number) => { for (let z = -10; z < 84; z += 4) for (let r = 0; r < 2; r++) B.push({ x: lineX - r * 4, y: 0, z, sx: 4, sy: 0.2, sz: 4, c: ((z / 4 + r) & 1) ? '#f4f4f0' : '#1a1a1e' }); };
    if (x0 <= -4 && -4 < x1) checker(-4);
    const fx = -this.finishBlocks;
    if (x0 <= fx && fx < x1) {
      checker(fx);
      for (const z of [-20, 90]) B.push({ x: fx - 2, y: 0, z, sx: 4, sy: 70, sz: 4, c: '#2e3036' });
      for (let z = -20; z < 94; z += 6) for (let r = 0; r < 3; r++) B.push({ x: fx - 2, y: 58 + r * 4, z, sx: 4, sy: 4, sz: 6, c: ((z / 6 + r) & 1) ? '#f4f4f0' : '#1a1a1e' });
    }
    g.add(instanced(B, this.mat));
    if (G.length) g.add(instanced(G, this.matBasic, false));
    return g;
  }
}
