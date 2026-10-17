// Background vehicles at car resolution: VOX OIL tanker truck (static voxel list, car-local frame like the Civix).
import { Vox } from './voxel';
import { textCells } from './blockFont';

const W = 30;
/** Tanker: cab at the front (x 0–26), tank behind. ~112 blocks long. Text faces the camera side (z = 0). */
function tankerDesign(): Vox[] {
  const out: Vox[] = [];
  const put = (x: number, y: number, z: number, c: string, role: Vox['role'] = 'trim') => out.push({ x, y, z, c, role, s: 1 });
  const L = 112;
  // chassis rails + bumper
  for (let x = 0; x < L; x++) for (const z of [4, 5, W - 6, W - 5]) for (let y = 6; y < 8; y++) put(x, y, z, '#2e3036');
  for (let z = 1; z < W - 1; z++) for (let y = 4; y < 8; y++) put(0, y, z, '#9ca1a8');
  // cab (black/yellow VOX colours)
  for (let x = 1; x < 26; x++) for (let y = 8; y < 34; y++) for (let z = 1; z < W - 1; z++) {
    const shell = x === 1 || x === 25 || y === 8 || y === 33 || z === 1 || z === W - 2;
    if (!shell) continue;
    let c = y > 30 ? '#2a2a30' : '#1a1a1e';
    if (y >= 20 && y <= 30 && (x === 1 || ((z === 1 || z === W - 2) && x >= 4 && x <= 16))) c = (x + y) % 9 < 2 ? '#2c4a55' : '#10232b';
    if (y === 18 || y === 19) c = '#f2c230';
    put(x, y, z, c, c === '#10232b' || c === '#2c4a55' ? 'glass' : 'paint');
  }
  for (const z of [3, 4, W - 5, W - 4]) for (let y = 11; y < 14; y++) put(0, y, z, '#fff3c4', 'light');
  for (let z = 6; z < W - 6; z++) for (let y = 10; y < 16; y++) put(0, y, z, (y & 1) ? '#5a5e66' : '#1a1a1e');
  for (let x = 3; x < 22; x++) for (let z = 5; z < W - 5; z++) if ((x + z) & 1) put(x, 34, z, '#f2a43a', 'light');     // roof beacon bar
  // tank: cylinder along x, radius 13, centred y 23
  const cy = 23, cz = W / 2 - 0.5, R = 13;
  for (let x = 28; x < L - 2; x++) for (let y = cy - R; y <= cy + R; y++) for (let z = 0; z < W; z++) {
    const d = Math.hypot(y + 0.5 - cy - 0.5, z - cz);
    const endCap = x === 28 || x === L - 3;
    if (d > R || (!endCap && d < R - 1.2)) continue;
    let c = '#c8ccd2';
    if (y + 0.5 - cy > R * 0.62) c = '#e0e3e8';                          // top highlight band
    if (Math.abs(y + 0.5 - cy) < 1.2) c = '#1a1a1e';                       // black waist band
    if ((x - 28) % 26 === 0) c = '#9ca1a8';                                // ring seams
    put(x, y, z, c, 'paint');
  }
  // "VOX OIL" on the camera side of the tank, reading correctly from −z
  const { cells, width } = textCells('VOX OIL');
  const cell = 2, x0 = 34 + Math.floor((L - 40 - width * cell) / 2), y0 = cy + 3;
  for (const [c, r] of cells) for (let dx = 0; dx < cell; dx++) for (let dy = 0; dy < cell; dy++)
    put(x0 + (width - 1 - c) * cell + dx, y0 + (4 - r) * cell + dy, -1, '#f2c230', 'paint');
  // wheels: 1 front axle, 2 rear axles (simple car-density discs with hubs)
  for (const wx of [14, 80, 96]) for (const z of [-1, 0, 1, 2, W - 3, W - 2, W - 1, W]) for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) {
    const d = Math.hypot(x + 0.5, y + 0.5); if (d >= 7) continue;
    const outer = z === -1 || z === W;
    put(wx + x, 7 + y, z, outer && d < 3.5 ? (d < 1.5 ? '#2e3036' : '#9ca1a8') : '#1d1d20', 'tire');
  }
  // tail lights + mudflaps
  for (const z of [2, 3, W - 4, W - 3]) for (let y = 8; y < 11; y++) put(L - 1, y, z, '#e0261c', 'light');
  return out;
}

/** Real-size tanker (~12 m × 2.4 m × 3.4 m): the design above upscaled block-by-block, so it keeps the cars' block size. */
export function tankerVoxels(kx = 1.45, ky = 1.45, kz = 1.15): Vox[] {
  const src = tankerDesign(), map = new Map<string, Vox>();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const v of src) { map.set(`${v.x},${v.y},${v.z}`, v); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  const out: Vox[] = [];
  for (let x = Math.floor(x0 * kx); x <= Math.ceil((x1 + 1) * kx) - 1; x++) for (let y = Math.floor(y0 * ky); y <= Math.ceil((y1 + 1) * ky) - 1; y++) for (let z = Math.floor(z0 * kz); z <= Math.ceil((z1 + 1) * kz) - 1; z++) {
    const v = map.get(`${Math.floor(x / kx)},${Math.floor(y / ky)},${Math.floor(z / kz)}`);
    if (v) out.push({ ...v, x, y, z });
  }
  return out;
}
