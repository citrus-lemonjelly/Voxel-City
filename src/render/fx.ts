// Voxel effects (owner C2 / C5, V0.16.0): little cubes that fly, grow and shrink — tyre smoke on the launch and in wheelspin,
// a backfire flame on a Perfect shift, a blue nitrous flame while it burns, road spray in the rain, dust at the finish —
// and rain itself (falling voxel streaks around the camera). One instanced mesh each, so hundreds of cubes cost one draw.
import * as THREE from 'three';

export type FxKind = 'smoke' | 'flame' | 'nitro' | 'spray' | 'dust';
const KIND: Record<FxKind, { colors: string[]; life: [number, number]; size: [number, number]; vel: [number, number, number]; spread: number; grav: number }> = {
  smoke: { colors: ['#e8e8ea', '#d4d6da', '#c2c5cb'], life: [1.0, 1.8], size: [4, 13], vel: [18, 7, 0], spread: 9, grav: -2 },
  flame: { colors: ['#ffd23f', '#ff8a1c', '#ff4a1c'], life: [0.25, 0.45], size: [4.5, 1], vel: [45, 3, 0], spread: 10, grav: 0 },
  nitro: { colors: ['#e6f3ff', '#5aa9ff', '#2f6dff'], life: [0.18, 0.32], size: [4, 1], vel: [50, 0, 0], spread: 6, grav: 0 },
  spray: { colors: ['#c9d4e2', '#aab6c6'], life: [0.3, 0.6], size: [1.6, 3.5], vel: [30, 10, 0], spread: 10, grav: 40 },
  dust: { colors: ['#d8c49a', '#c4ad80'], life: [0.6, 1.1], size: [2, 6], vel: [10, 8, 0], spread: 14, grav: 4 },
};
const MAX = 900;

export class VoxelFx {
  readonly mesh: THREE.InstancedMesh;
  private p: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; s0: number; s1: number; grav: number }[] = [];
  private m = new THREE.Matrix4(); private c = new THREE.Color(); private next = 0;
  constructor() {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX);
    this.mesh.frustumCulled = false; this.mesh.count = MAX;
    for (let i = 0; i < MAX; i++) { this.p.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 0, s1: 0, grav: 0 }); this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0)); this.mesh.setColorAt(i, this.c.set('#fff')); }
  }
  /** n cubes of a kind at (x, y, z); carV = the car's speed in blocks/s (the effect keeps some of it) */
  emit(kind: FxKind, x: number, y: number, z: number, n = 1, carV = 0) {
    const k = KIND[kind], r = Math.random;
    for (let j = 0; j < n; j++) {
      const i = this.next, q = this.p[i]; this.next = (this.next + 1) % MAX;
      Object.assign(q, { x: x + (r() - 0.5) * 2, y: y + r() * 2, z: z + (r() - 0.5) * 3, vx: k.vel[0] * (0.6 + r() * 0.8) - carV * (kind === 'smoke' || kind === 'dust' ? 0.7 : 1),   // flames ride with the car and stream back from the pipe
        vy: k.vel[1] + (r() - 0.3) * k.spread, vz: (r() - 0.5) * k.spread, max: k.life[0] + r() * (k.life[1] - k.life[0]), s0: k.size[0], s1: k.size[1], grav: k.grav });
      q.life = q.max;
      this.mesh.setColorAt(i, this.c.set(k.colors[Math.floor(r() * k.colors.length)]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      const q = this.p[i];
      if (q.life <= 0) continue;
      q.life -= dt; q.vy -= q.grav * dt; q.x += q.vx * dt; q.y = Math.max(0.5, q.y + q.vy * dt); q.z += q.vz * dt;
      const a = 1 - Math.max(0, q.life) / q.max, s = q.life <= 0 ? 0 : q.s0 + (q.s1 - q.s0) * a;
      this.mesh.setMatrixAt(i, this.m.makeScale(s, s, s).setPosition(q.x, q.y, q.z));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { for (const q of this.p) q.life = 0; this.update(0); }
}

/** Rain (C5): thin falling streaks in a box that follows the camera target; wraps round so it never runs out. */
export class Rain {
  readonly mesh: THREE.InstancedMesh;
  private drops: { x: number; y: number; z: number; v: number }[] = [];
  private m = new THREE.Matrix4();
  constructor(n = 700) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 12, 0.9), new THREE.MeshBasicMaterial({ color: '#dfe8f5', transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }), n);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) this.drops.push({ x: (Math.random() - 0.5) * 700, y: Math.random() * 260, z: -220 + Math.random() * 300, v: 220 + Math.random() * 80 });
  }
  update(dt: number, cx: number, wind = 40) {
    this.drops.forEach((d, i) => {
      d.y -= d.v * dt; d.x += wind * dt;
      if (d.y < 0) { d.y += 260; d.x = (Math.random() - 0.5) * 700; }
      this.mesh.setMatrixAt(i, this.m.makeRotationZ(-0.15).setPosition(cx + d.x, d.y, d.z));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
