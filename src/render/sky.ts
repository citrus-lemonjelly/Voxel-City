// Voxel sky: banded gradient dome, drifting block clouds, blocky sun/moon and (static, never twinkling) stars.
// The whole group follows the race camera so it reads as infinitely far away.
import * as THREE from 'three';
import { makeRng } from '../game/ai';
import type { TimeOfDay } from './stage';

export interface SkyPreset {
  top: string; mid: string; horizon: string;
  cloud: string; cloudShade: string; clouds: number;
  disc: { colour: string; size: number; dir: [number, number, number] } | null;
  stars: boolean;
}
export const SKY: Record<TimeOfDay, SkyPreset> = {
  day: { top: '#4f8fdc', mid: '#8cbdea', horizon: '#d4e8f4', cloud: '#ffffff', cloudShade: '#d6e2ee', clouds: 26, disc: null, stars: false },
  dusk: { top: '#2c3570', mid: '#b8607a', horizon: '#f5a85e', cloud: '#f7b48a', cloudShade: '#8a5a7a', clouds: 20, disc: { colour: '#ffcf7a', size: 150, dir: [0.35, 0.07, 1] }, stars: false },
  night: { top: '#060a1c', mid: '#121c3c', horizon: '#2a3a5e', cloud: '#2c3656', cloudShade: '#1c2440', clouds: 14, disc: { colour: '#e8eeff', size: 90, dir: [-0.45, 0.42, 1] }, stars: true },
};

export class Sky {
  group = new THREE.Group();
  private clouds = new THREE.Group();
  private drift = 0;
  constructor(public preset: SkyPreset) {
    const p = preset;
    // dome: gradient quantised into 18 bands so it steps like the blocks
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5200, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(p.top) }, mid: { value: new THREE.Color(p.mid) }, hor: { value: new THREE.Color(p.horizon) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP;
        void main(){ float t = clamp(normalize(vP).y, 0.0, 1.0); t = floor(t * 18.0) / 18.0;
          vec3 c = t < 0.22 ? mix(hor, mid, t / 0.22) : mix(mid, top, (t - 0.22) / 0.78);
          gl_FragColor = vec4(c, 1.0); }`,
    }));
    dome.renderOrder = -10;
    this.group.add(dome);
    const box = new THREE.BoxGeometry(1, 1, 1), o = new THREE.Object3D();
    const basic = (c: string) => new THREE.MeshBasicMaterial({ color: c, fog: false, toneMapped: false });
    // sun / moon: stacked squares (a blocky disc) with a soft square halo
    if (p.disc) {
      const d = new THREE.Vector3(...p.disc.dir).normalize().multiplyScalar(4600);
      const disc = new THREE.Group();
      const s = p.disc.size;
      for (const [w, h] of [[1, 0.6], [0.8, 0.8], [0.6, 1]]) { const m = new THREE.Mesh(box, basic(p.disc.colour)); m.scale.set(s * w, s * h, 1); disc.add(m); }
      const halo = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: p.disc.colour, transparent: true, opacity: 0.18, fog: false, depthWrite: false }));
      halo.scale.set(s * 1.8, s * 1.8, 1); halo.position.z = 1; disc.add(halo);
      disc.position.copy(d); disc.lookAt(0, 0, 0);
      this.group.add(disc);
    }
    // stars: tiny static blocks on the upper dome
    if (p.stars) {
      const rng = makeRng(77);
      const n = 260, im = new THREE.InstancedMesh(box, basic('#ffffff'), n);
      for (let i = 0; i < n; i++) {
        const az = rng() * Math.PI, el = 0.12 + rng() * 1.2;
        const v = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(5000);
        o.position.copy(v); o.lookAt(0, 0, 0); o.scale.setScalar(6 + rng() * 10); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, new THREE.Color(rng() > 0.8 ? '#ffe6b0' : '#dfe8ff').multiplyScalar(0.6 + rng() * 0.6));
      }
      this.group.add(im);
    }
    // clouds: clusters of flat blocks, lit tops / shaded bottoms
    const rng = makeRng(31);
    const parts: { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: string }[] = [];
    for (let k = 0; k < p.clouds; k++) {
      const cx = (rng() - 0.5) * 7000, cy = 520 + rng() * 900, cz = 2600 + rng() * 1600, w = 160 + rng() * 300;
      const n = 3 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const bw = w * (0.35 + rng() * 0.5), bx = cx + (rng() - 0.5) * w, by = cy + rng() * 40;
        parts.push({ x: bx, y: by, z: cz, sx: bw, sy: 30 + rng() * 40, sz: 60, c: p.cloud });
        parts.push({ x: bx, y: by - 18, z: cz - 4, sx: bw * 0.9, sy: 14, sz: 60, c: p.cloudShade });
      }
    }
    const cm = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false, transparent: true, opacity: 0.92 }), parts.length);
    parts.forEach((b, i) => { o.position.set(b.x, b.y, b.z); o.rotation.set(0, 0, 0); o.scale.set(b.sx, b.sy, b.sz); o.updateMatrix(); cm.setMatrixAt(i, o.matrix); cm.setColorAt(i, new THREE.Color(b.c)); });
    this.clouds.add(cm);
    this.group.add(this.clouds);
  }

  /** Follow the camera; clouds drift slowly (no flashing, no fast motion). */
  update(cam: THREE.Camera, dt: number, freeze = false) {
    this.group.position.copy(cam.position);
    if (!freeze) this.drift += dt * 6;
    // gentle parallax: clouds move at 4 % of the camera's speed so the sky feels deep but steady
    this.clouds.position.x = cam.position.x * -0.96 + this.drift;
  }
}
