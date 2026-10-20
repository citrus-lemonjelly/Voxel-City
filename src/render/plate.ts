// License plates (Body Shop, owner 2026-10-19): pre-made designs and the player's own text, drawn as a crisp pixel-font
// texture on the rear plate face (front plates are too small for text — they take the design colour only).
import * as THREE from 'three';

import { PLATE_DESIGNS, FONT, cleanPlate } from '../data/plates';
export { PLATE_DESIGNS, DEFAULT_PLATE, cleanPlate } from '../data/plates';

const CACHE = new Map<string, THREE.CanvasTexture>();
/** A texture for a plate `wBlocks` × `hBlocks` (16 px per block). */
export function plateTexture(design: string, text: string, wBlocks: number, hBlocks: number): THREE.CanvasTexture {
  const key = `${design}|${text}|${wBlocks}|${hBlocks}`;
  let t = CACHE.get(key); if (t) return t;
  const d = PLATE_DESIGNS[design] ?? PLATE_DESIGNS.stock, W = wBlocks * 16, H = hBlocks * 16;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = d.bg; g.fillRect(0, 0, W, H);
  let x0 = 0, y0 = 0;
  if (d.band) { g.fillStyle = d.band; g.fillRect(0, 0, W, 4); y0 = 3; }
  if (d.strip) { g.fillStyle = d.strip; g.fillRect(0, 0, 10, H); x0 = 10; }
  if (d.edge) { g.fillStyle = d.edge; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H); }
  const s = cleanPlate(text) || ' ', cols = s.length * 4 - 1, px = Math.max(1, Math.min(Math.floor((W - x0 - 6) / cols), Math.floor((H - y0 - 6) / 5)));
  const ox = x0 + Math.floor((W - x0 - cols * px) / 2), oy = y0 + Math.floor((H - y0 - 5 * px) / 2);
  g.fillStyle = d.fg;
  [...s].forEach((ch, i) => { const f = FONT[ch] ?? FONT[' ']; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (f[r * 3 + c] === '1') g.fillRect(ox + (i * 4 + c) * px, oy + r * px, px, px); });
  t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
  CACHE.set(key, t); return t;
}
/** A plate as a flat panel just outside its blocks (rear faces +x, front faces −x). */
export function plateMesh(design: string, text: string, p: { x: number; y0: number; y1: number; z0: number; z1: number; front?: boolean }): THREE.Mesh {
  const w = p.z1 - p.z0, h = p.y1 - p.y0;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: plateTexture(design, text, w, h), roughness: 0.55, metalness: 0, envMapIntensity: 0.3 }));
  m.rotation.y = p.front ? -Math.PI / 2 : Math.PI / 2; m.position.set(p.front ? p.x - 0.02 : p.x + 1.02, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2);
  return m;
}
