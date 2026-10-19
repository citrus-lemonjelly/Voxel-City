// Profile-driven car bodies (owner: muscle coupes, sedans, tuners, hypercars — S23 Body + Spec).
// A body is described by its side profile (belt/hood/deck line + glasshouse line), stance (length, width, wheels) and a
// few feature switches; the builder turns that into car-density voxels with the same rules as the Civix
// (carBuilder.ts): 1 block everywhere, wheels at 2× (A15), paint/trim/glass/light roles, part slots at fixed faces.
// Car-local frame: x = length (front at 0, the car faces −x), y = up, z = width (z = 0 is the camera side).
import { Vox, Role } from './voxel';
import { PAL, buildWheels, WheelVox, CarLook, setBodyBuilder } from './carBuilder';

export type HeadStyle = 'rect' | 'slim' | 'quad' | 'round' | 'wrap' | 'split' | 'bar' | 'popup' | 'popupUp' | 'blade';
export type TailStyle = 'rect' | 'bar' | 'quad' | 'blade' | 'tall';
export interface BodyProfile {
  id: string; name: string;
  L: number; W: number;
  wheels: [number, number];           // wheel centres (x)
  wheelR: number;                      // wheel radius in body blocks (tyres are built at 2×)
  ride: number;                        // body lift above the shell origin
  yBot: number;                        // underside
  lower: [number, number][];           // belt / hood / deck line: control points [x, top y]
  green: [number, number][];           // glasshouse top line: control points [x, y] (glass spans the first..last x)
  wsEnd: number; roofEnd: number;      // windscreen ends / roof panel ends (x) — the rest is rear glass or C-pillar
  cPillar: number;                     // side glass ends here (x); behind it the glasshouse side is painted
  pillars: number[];                   // black B-pillar lines through the side glass (x)
  greenInset: number; roofInset: number;
  rearGlass: 'hatch' | 'window';       // hatch = sloping glass to the tail; window = glass then a painted deck
  doors: number[];                     // door seam lines (x)
  handles: number[];                   // door handle x
  crease?: number;                     // a lit body line this many blocks below the belt
  rocker: string;                      // rocker/side-sill colour
  head: { style: HeadStyle; y0: number; y1: number };
  tail: { style: TailStyle; y0: number; y1: number };
  grille: { y0: number; y1: number; z: number; style: 'slats' | 'mesh' | 'wide' | 'kidney' | 'frame' | 'none' };
  /** camera-side front lamp span in z (mirrored on the far side); default [2, 9] */
  lampZ?: [number, number];
  /** camera-side tail lamp span in z (mirrored); default [1, 8] */
  tailZ?: [number, number];
  /** a coloured pin-stripe across the nose under the grille (hot-hatch signature) */
  grilleAccent?: string;
  /** round fog lamps in the lower bumper corners */
  fogs?: boolean;
  /** dark front splitter lip under the bumper */
  splitter?: boolean;
  /** black plastic cladding: sills and a band around each arch */
  cladding?: boolean;
  /** blacked-out pillars so the roof seems to float */
  floatingRoof?: boolean;
  /** side glass bottom kicks up by `rise` blocks from x onward (window-line kink) */
  glassRise?: [number, number];
  /** bright trim along the bottom of the side glass */
  windowTrim?: string;
  /** tail pipes: dual = two on the right (default), split = one each side, single, twinCentre, quad */
  exhaust?: 'dual' | 'split' | 'single' | 'twinCentre' | 'quad';
  /** big lower bumper air intake (dark mesh), y0..y1 */
  frontIntake?: [number, number];
  /** front fenders rise over the wheels (blocks above the arch) — keeps an arch over the wheel on low noses (owner Q65) */
  fenders?: number;
  scoop?: [number, number];            // hood scoop from x0 to x1
  flares?: number;                     // fender flare thickness (blocks) outside the body sides
  intake?: [number, number];           // side intake (x0..x1) ahead of the rear wheel
  louvres?: [number, number];          // rear deck louvres (x0..x1)
  diffuser?: boolean;
  /** roof = hot-hatch spoiler on the back edge of the roof */
  wing?: 'ducktail' | 'gt' | 'lip' | 'roof' | 'none';
  /** contrast roof colour (city cars: white / black roof) */
  roofColor?: string;
  quadExhaust?: boolean;
  mirrorColor?: string;
  chromeBumpers?: boolean;
  mirrors: boolean;
  paint: string;
  rim: string;
}

const lerpPts = (pts: [number, number][], x: number) => {
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return 0;
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return Math.round(y0 + (y1 - y0) * (x1 === x0 ? 1 : (x - x0) / (x1 - x0)));
  }
  return pts[pts.length - 1][1];
};

export function buildBodyVoxels(P: BodyProfile): { body: Vox[]; wheels: WheelVox[]; wheelY: number } {
  const { L, W, yBot } = P, body: Vox[] = [];
  const wheelY = P.wheelR, archR = P.wheelR + 0.9, archD = 6;          // arch hugs the tyre (owner Q65)
  const put = (x: number, y: number, z: number, c: string | null, role: Role = 'trim', shade = 'mid') => body.push({ x, y: y + P.ride, z, c, role, s: 1, shade });
  const put2 = (x: number, y: number, z: number, c: string | null, role: Role = 'trim') => body.push({ x, y: y + 2 * P.ride, z, c, role, s: 0.5 });
  const lowerTop = (x: number) => lerpPts(P.lower, Math.max(0, Math.min(L - 1, x)));
  const gTop = (x: number) => lerpPts(P.green, x);
  const roofY = Math.max(...P.green.map(p => p[1]));
  const key = (x: number, y: number, z: number) => x + ',' + y + ',' + z;
  const shell = new Map<string, 'lower' | 'green'>();
  for (let x = 0; x < L; x++) {
    const t = lowerTop(x), bot = (x < 2 || x > L - 3) ? yBot + 1 : yBot;
    for (let y = bot; y < t; y++) for (let z = 0; z < W; z++) {
      if ((x === 0 || x === L - 1) && (z < 2 || z > W - 3)) continue;
      if ((x === 1 || x === L - 2) && (z < 1 || z > W - 2)) continue;
      if (y === t - 1 && (z === 0 || z === W - 1)) continue;
      let arch = false;
      for (const wc of P.wheels) { const dx = x + .5 - wc, dy = y + .5 - wheelY; if ((z < archD || z > W - 1 - archD) && dx * dx + dy * dy < archR * archR) arch = true; }
      if (!arch) shell.set(key(x, y, z), 'lower');
    }
    // fenders: the sides rise over each wheel so the arch always has bodywork above it
    if (P.fenders) for (const wc of P.wheels) {
      const dx = Math.abs(x + .5 - wc), R2 = archR + 2.2;
      if (dx >= R2) continue;
      const ft = Math.round(wheelY + Math.sqrt(R2 * R2 - dx * dx) - (R2 - archR) + P.fenders);   // peak = arch top + fenders
      for (let y = t; y < ft; y++) for (let z = 0; z < W; z++) {
        if (z > archD && z < W - 1 - archD) continue;
        if (y === ft - 1 && (z === 0 || z === W - 1)) continue;
        const ddx = x + .5 - wc, dy = y + .5 - wheelY;
        if (ddx * ddx + dy * dy < archR * archR) continue;
        if (!shell.has(key(x, y, z))) shell.set(key(x, y, z), 'lower');
      }
    }
    const gt = gTop(x);
    for (let y = t; y < gt; y++) { const inset = y >= roofY - 2 ? P.roofInset : P.greenInset; for (let z = inset; z < W - inset; z++) shell.set(key(x, y, z), 'green'); }
  }
  // hood scoop: a raised block on the hood centre line, open (dark) at the front
  if (P.scoop) for (let x = P.scoop[0]; x <= P.scoop[1]; x++) for (let z = Math.floor(W / 2) - 3; z < Math.floor(W / 2) + 3; z++) shell.set(key(x, lowerTop(x), z), 'lower');
  const has = (x: number, y: number, z: number) => shell.has(key(x, y, z));
  const glass = (a: number, b: number) => ((a + b) % 10 < 2) ? PAL.streak : PAL.glass;
  for (const [k, part] of shell) {
    const [x, y, z] = k.split(',').map(Number);
    const exposed = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !has(x + a, y + b, z + c));
    if (!exposed) continue;
    const up = !has(x, y + 1, z), front = !has(x - 1, y, z), back = !has(x + 1, y, z);
    const side = !has(x, y, z + 1) || !has(x, y, z - 1);
    let role: Role = 'paint', shade = 'mid', c: string | null = null;
    const t = lowerTop(x);
    if (part === 'green') {
      const gt = gTop(x), region = x <= P.wsEnd ? 'ws' : x <= P.roofEnd ? 'roof' : 'rear';
      const edgeZ = z <= P.greenInset + 1 || z >= W - P.greenInset - 2;
      if (region === 'roof' && up) shade = 'light';
      else if (y === t && (front || region !== 'ws')) { role = 'trim'; c = PAL.frame; }
      else if (side) {
        if (x > P.cPillar) { if (P.floatingRoof && !up && y < gt - 1) { role = 'trim'; c = '#141417'; } else shade = 'mid'; }   // C-pillar / sail panel
        else if (region === 'ws' && (front || up)) { if (P.floatingRoof && !up) { role = 'trim'; c = '#141417'; } else shade = 'mid'; }  // A-pillar
        else if (P.glassRise && x >= P.glassRise[0] && y < t + P.glassRise[1]) shade = 'mid';   // window-line kink
        else if (P.windowTrim && y === t + 1 && !up) { role = 'trim'; c = P.windowTrim; }
        else if (P.pillars.includes(x)) { role = 'trim'; c = P.floatingRoof ? '#141417' : PAL.frame; }   // B-pillar
        else if (up || y === gt - 1) shade = 'mid';                                // roof rail
        else { role = 'glass'; c = glass(x, y); }
      } else if (region === 'ws' || (region === 'rear' && (P.rearGlass === 'hatch' || x <= P.cPillar + 2))) {
        if (edgeZ) { role = 'trim'; c = PAL.frame; } else { role = 'glass'; c = ((z + y) % 11) < 2 ? PAL.streak : PAL.glass; }
      } else if (up && region === 'rear') shade = 'light';
      if (P.roofColor && role === 'paint' && y >= roofY - 1) { role = 'trim'; c = P.roofColor; }
    } else {
      if (up) shade = 'light'; else if (y <= yBot + 1) shade = 'dark';
      if (P.crease && side && y === t - P.crease) shade = 'light';                 // body line catches the light
      if (y === yBot && side) { role = 'trim'; c = P.rocker; }
      if (P.cladding && side) {                                                    // black plastic sills + arch surrounds
        const nearArch = P.wheels.some(wc => { const d = Math.hypot(x + .5 - wc, y + .5 - wheelY); return d < archR + 1.6; });
        if (y <= yBot + 1 || nearArch) { role = 'trim'; c = '#26272b'; }
      }
      if ((front && x <= 1) || (back && x >= L - 2)) { if (y <= yBot + 2) { role = 'trim'; c = P.chromeBumpers ? PAL.chrome : PAL.darkGrey; } }
      if (P.scoop && up && x === P.scoop[0] && z >= Math.floor(W / 2) - 3 && z < Math.floor(W / 2) + 3) { role = 'trim'; c = PAL.dark; }
      if (P.scoop && front && x === P.scoop[0] && y === t) { role = 'trim'; c = PAL.dark; }
      if (P.intake && side && x >= P.intake[0] && x <= P.intake[1] && y >= yBot + 2 && y <= t - 3) { role = 'trim'; c = (x + y) % 2 ? '#121214' : '#1d1d22'; }
      if (P.louvres && up && x >= P.louvres[0] && x <= P.louvres[1] && z > 4 && z < W - 5 && x % 2 === 0) { role = 'trim'; c = PAL.dark; }
    }
    if (role === 'paint' && side && part === 'lower' && P.doors.includes(x) && y > yBot && y < t - 1) { role = 'trim'; c = '#0d0d10'; }
    if (role === 'paint' && side && part === 'lower' && P.handles.includes(x) && y === t - 3) { role = 'trim'; c = PAL.darkGrey; }
    put(x, y, z, c, role, shade);
  }
  // wheel-well shadows
  const sideTop = (x: number) => { let t = lowerTop(x); for (let y = t; y < 40; y++) if (has(x, y, 0) || has(x, y, 1)) t = y + 1; return t; };
  for (const wc of P.wheels) for (let a = 0; a < 360; a += 4) {
    const x = Math.floor(wc + Math.cos(a * Math.PI / 180) * (archR - 0.1)), y = Math.floor(wheelY + Math.sin(a * Math.PI / 180) * (archR - 0.1));
    if (y < yBot || y > sideTop(x) - 2) continue;
    for (const z of [archD, W - 1 - archD]) if (!has(x, y, z)) put(x, y, z, '#121214');
  }
  // fender flares: a paint band around the upper half of each arch, outside the body sides
  if (P.flares) for (const wc of P.wheels) for (let x = Math.floor(wc - archR - 2); x <= Math.ceil(wc + archR + 2); x++) for (let y = Math.floor(wheelY); y <= Math.ceil(wheelY + archR + 2); y++) {
    const d = Math.hypot(x + .5 - wc, y + .5 - wheelY);
    if (d < archR || d > archR + 1.6 || y >= sideTop(x)) continue;
    for (let f = 1; f <= P.flares; f++) { put(x, y, -f, null, 'paint', f === P.flares ? 'mid' : 'light'); put(x, y, W - 1 + f, null, 'paint', 'mid'); }
  }
  // mirrors at the foot of the A-pillar
  if (P.mirrors) { const mx = P.green[0][0] + 3, my = lowerTop(mx); for (const z of [-1, -2, W, W + 1]) { put(mx, my, z, PAL.dark); if (P.mirrorColor) put(mx, my + 1, z, P.mirrorColor); else put(mx, my + 1, z, null, 'paint', z === -2 || z === W + 1 ? 'mid' : 'light'); } }
  // ---- front: headlights, grille, plate ----
  const LZ = P.lampZ ?? [2, 9], H = P.head, zl: [number, number][] = [[LZ[0], LZ[1]], [W - LZ[1], W - LZ[0]]];
  for (const [z0, z1] of zl) {
    const outer = z0 < W / 2 ? z0 : z1 - 1;
    if (H.style === 'rect') for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1; y++) put(-1, y, z, z === outer ? PAL.amber : PAL.head, 'light');
    if (H.style === 'slim') { for (let z = z0 - 1; z < z1 + 1; z++) put(-1, H.y1 - 1, z, PAL.head, 'light'); for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1 - 1; y++) put(-1, y, z, PAL.darkGrey); }
    if (H.style === 'quad') for (const zc of [z0 + 1.8, z0 + 5.2]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = H.y0; y < H.y1; y++) {
      const d = Math.hypot(z + .5 - zc, y + .5 - (H.y0 + H.y1) / 2); if (d < 1.9) put(-1, y, z, d < 1.0 ? PAL.head : PAL.chrome, d < 1.0 ? 'light' : 'trim');
    }
    if (H.style === 'wrap') {                                                      // lamp that sweeps back onto the wing
      for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1; y++) put(-1, y, z, z === outer ? PAL.amber : PAL.head, 'light');
      const sz = z0 < W / 2 ? -1 : W;
      for (let x = 0; x < 5; x++) for (let y = H.y0 + (x > 2 ? 1 : 0); y < H.y1; y++) put(x, y, sz, x === 4 ? PAL.amber : PAL.head, 'light');
    }
    if (H.style === 'split') {                                                     // LED day-light strip over a square projector
      for (let z = z0; z < z1; z++) put(-1, H.y1 - 1, z, '#eaf6ff', 'light');
      for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1 - 1; y++) { const inner = z0 < W / 2 ? z >= z1 - 3 : z < z0 + 3; put(-1, y, z, inner ? PAL.head : '#2a2d33', inner ? 'light' : 'trim'); }
    }
    if (H.style === 'bar') for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1; y++) put(-1, y, z, y === H.y1 - 1 ? '#eaf6ff' : PAL.darkGrey, y === H.y1 - 1 ? 'light' : 'trim');
    if (H.style === 'round') {                                                     // one big round lamp per side with a chrome ring
      const zc = (z0 + z1) / 2, yc = (H.y0 + H.y1) / 2, r = (H.y1 - H.y0) / 2 + 0.3;
      for (let z = z0 - 1; z <= z1; z++) for (let y = H.y0 - 1; y <= H.y1; y++) { const d = Math.hypot(z + .5 - zc, y + .5 - yc); if (d < r) put(-1, y, z, d < r - 1.1 ? PAL.head : PAL.chrome, d < r - 1.1 ? 'light' : 'trim'); }
    }
    if (H.style === 'popup') { for (let z = z0; z < z1; z++) put(-1, H.y0, z, PAL.amber, 'light'); for (let z = z0; z < z1; z++) for (let x = 2; x < 7; x++) put(x, lowerTop(x), z, null, 'paint', x === 2 ? 'mid' : 'light'); for (let z = z0; z < z1; z++) put(1, lowerTop(1), z, PAL.dark); }
    if (H.style === 'popupUp') {                                                   // pop-up lamps raised: a pod stands up on the nose
      const x0 = 2, top = lowerTop(x0);
      for (let z = z0; z < z1; z++) { for (let y = top; y < top + 4; y++) for (let x = x0; x < x0 + 3; x++) put(x, y, z, null, 'paint', y === top + 3 ? 'light' : 'mid'); for (let y = top + 1; y < top + 3; y++) put(x0 - 1, y, z, z === outer ? PAL.amber : PAL.head, 'light'); put(x0 - 1, top, z, PAL.dark); put(x0 - 1, top + 3, z, null, 'paint', 'light'); }
      for (let z = z0; z < z1; z++) put(-1, H.y0, z, PAL.amber, 'light');
    }
    if (H.style === 'blade') { for (let z = z0 - 1; z < z1 + 1; z++) put(-1, H.y1 - 1, z, '#eaf6ff', 'light'); for (let z = z0 + 1; z < z1 - 1; z++) put(-1, H.y0, z, PAL.dark); }
  }
  const G = P.grille;
  for (let z = G.z; z < W - G.z; z++) for (let y = G.y0; y < G.y1; y++) {
    let c: string | null = PAL.dark;
    if (G.style === 'slats') c = y % 2 === 0 ? PAL.midGrey : PAL.dark;
    if (G.style === 'mesh') c = (y + z) % 2 ? PAL.midGrey : PAL.dark;
    if (G.style === 'wide') c = y === G.y0 || y === G.y1 - 1 ? PAL.chrome : (z % 3 ? PAL.dark : PAL.midGrey);
    if (G.style === 'none') c = (y === G.y0) ? PAL.dark : null;
    if (G.style === 'frame') c = (y === G.y0 || y === G.y1 - 1 || z === G.z || z === W - G.z - 1) ? PAL.chrome : ((y + z) % 2 ? '#121214' : PAL.darkGrey);   // single-frame grille, bright surround
    if (G.style === 'kidney') {                                                      // twin grilles with a bright surround and a gap in the middle
      const half = Math.floor(W / 2), inner = Math.abs(z + .5 - half) < 1.2, edge = y === G.y0 || y === G.y1 - 1 || z === G.z || z === W - G.z - 1 || Math.abs(z + .5 - half) < 2.2;
      c = inner ? null : edge ? PAL.chrome : ((y + z) % 2 ? '#121214' : PAL.darkGrey);
    }
    if (c) put(-1, y, z, c);
  }
  if (H.style === 'bar') for (let z = LZ[1]; z < W - LZ[1]; z++) put(-1, H.y1 - 1, z, '#eaf6ff', 'light');   // the light bar runs across the nose
  if (P.grilleAccent) for (let z = LZ[0]; z < W - LZ[0]; z++) put(-1, Math.min(G.y0, H.y0) - 1, z, P.grilleAccent);
  if (P.fogs) for (const zc of [LZ[0] + 2.5, W - LZ[0] - 2.5]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = yBot + 1; y < yBot + 4; y++) { const d = Math.hypot(z + .5 - zc, y + .5 - (yBot + 2.5)); if (d < 1.7) put(-1, y, z, d < 0.9 ? PAL.head : PAL.darkGrey, d < 0.9 ? 'light' : 'trim'); }
  if (P.splitter) for (let z = 1; z < W - 1; z++) put(-2, yBot, z, PAL.dark);
  if (P.frontIntake) for (let z = 4; z < W - 4; z++) for (let y = P.frontIntake[0]; y < P.frontIntake[1]; y++) put(-1, y, z, (y + z) % 2 ? '#121214' : PAL.darkGrey);
  for (let z = Math.floor(W / 2) - 3; z < Math.floor(W / 2) + 3; z++) put(-2, yBot + 1, z, PAL.plate);
  // ---- rear: tail lights, plate, exhaust, diffuser ----
  const TZ = P.tailZ ?? [1, 8], T = P.tail, tl: [number, number][] = [[TZ[0], TZ[1]], [W - TZ[1], W - TZ[0]]];
  for (const [z0, z1] of tl) {
    if (T.style === 'rect') for (let z = z0; z < z1; z++) for (let y = T.y0; y < T.y1; y++) put(L, y, z, (y === T.y0 && (z === z0 + 3 || z === z1 - 4)) ? PAL.reverse : PAL.tail, 'light');
    if (T.style === 'quad') for (const zc of [z0 + 1.8, z0 + 5.2]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = T.y0; y < T.y1; y++) {
      const d = Math.hypot(z + .5 - zc, y + .5 - (T.y0 + T.y1) / 2); if (d < 1.9) put(L, y, z, d < 1.0 ? '#ff6a5a' : PAL.tail, 'light');
    }
    if (T.style === 'bar') for (let z = z0; z < z1; z++) for (let y = T.y0; y < T.y1; y++) put(L, y, z, PAL.tail, 'light');
    if (T.style === 'tall') for (let z = z0; z < z1; z++) for (let y = T.y0; y < T.y1; y++) put(L, y, z, y === T.y0 + 1 ? PAL.reverse : (y + z) % 3 ? PAL.tail : '#ff6a5a', 'light');
  }
  if (T.style === 'bar' || T.style === 'blade') for (let z = 1; z < W - 1; z++) put(L, T.style === 'blade' ? T.y1 - 1 : T.y1, z, PAL.tail, 'light');
  for (let z = Math.floor(W / 2) - 3; z < Math.floor(W / 2) + 3; z++) { put(L, T.y0 - 2, z, PAL.plate); put(L, T.y0 - 3, z, PAL.plate); }
  const ex = P.exhaust ?? (P.quadExhaust ? 'quad' : 'dual'), mid = Math.floor(W / 2);
  const pipes = ex === 'quad' ? [3, 4, W - 5, W - 4] : ex === 'split' ? [4, W - 5] : ex === 'single' ? [W - 6] : ex === 'twinCentre' ? [mid - 3, mid - 2, mid + 1, mid + 2] : [W - 7, W - 6];
  for (const z of pipes) { put(L, yBot + 1, z, PAL.chrome); put(L + 1, yBot + 1, z, PAL.midGrey); if (ex === 'twinCentre' || ex === 'single') { put(L, yBot + 2, z, PAL.chrome); put(L + 1, yBot + 2, z, PAL.midGrey); } }
  if (ex === 'single') { put(L, yBot + 1, W - 7, PAL.chrome); put(L, yBot + 2, W - 7, PAL.chrome); }
  if (P.diffuser) for (let z = 3; z < W - 3; z++) for (let y = yBot; y < yBot + 2; y++) put(L, y, z, z % 3 === 0 ? PAL.midGrey : '#121214');
  // ---- wing ----
  const deck = lowerTop(L - 1);
  if (P.wing === 'ducktail') for (let z = 2; z < W - 2; z++) { put(L - 1, deck, z, null, 'paint', 'light'); put(L, deck, z, null, 'paint', 'light'); put(L, deck + 1, z, null, 'paint', 'light'); }
  if (P.wing === 'lip') for (let z = 2; z < W - 2; z++) put(L - 1, deck, z, PAL.dark);
  if (P.wing === 'gt') {
    for (const zp of [6, W - 7]) for (let y = deck; y < deck + 4; y++) put(L - 3, y, zp, PAL.dark);
    for (let x = L - 5; x <= L; x++) for (let z = 1; z < W - 1; z++) put(x, deck + 4, z, PAL.dark);
    for (const ze of [0, W - 1]) for (let x = L - 5; x <= L; x++) for (let y = deck + 3; y <= deck + 5; y++) put(x, y, ze, PAL.dark);
  }
  if (P.wing === 'roof') {                                                         // hot-hatch roof spoiler: carries the roof line back over the tailgate glass
    for (let x = P.roofEnd + 1; x <= P.roofEnd + 4; x++) for (let z = P.roofInset; z < W - P.roofInset; z++) if (!has(x, roofY - 1, z)) put(x, roofY - 1, z, null, 'paint', 'light');
    for (let z = P.roofInset + 1; z < W - P.roofInset - 1; z++) put(P.roofEnd + 4, roofY - 2, z, PAL.dark);
  }
  void put2;
  return { body, wheels: buildWheels(P.rim, P.wheels, P.wheelR, W), wheelY };
}

// ---------------- concept bodies (owner: muscle coupes, sedans, tuners, hypercars) ----------------
// Real sizes at 1 block ≈ 6.9 cm. Names are placeholders for the owner.
export const BODY_PROFILES: Record<string, BodyProfile> = {
  // modern sport sedan, ~4.7 m (owner Q65: "sleeker, high tech", like a current compact sport sedan): low long hood, steeply
  // raked glass, fastback roof flowing into a short deck, rising wedge belt line, thin LED lamps over a wide black mesh,
  // full-width tail bar, black sport trim (mirrors, sills, lip spoiler, black wheels)
  sedan: {
    id: 'sedan', name: 'Sport sedan (concept)', L: 68, W: 28, wheels: [13, 54], wheelR: 5.0, ride: 1, yBot: 2,
    lower: [[0, 8], [3, 10], [13, 11], [24, 11], [50, 12], [62, 13], [67, 12]],
    green: [[23, 11], [34, 20], [44, 20], [60, 13], [62, 12]], wsEnd: 34, roofEnd: 44, cPillar: 55, pillars: [41, 42],
    greenInset: 2, roofInset: 3, rearGlass: 'window', doors: [24, 41, 55], handles: [37, 52], crease: 2, rocker: PAL.dark,
    head: { style: 'slim', y0: 7, y1: 9 }, tail: { style: 'bar', y0: 10, y1: 12 }, grille: { y0: 3, y1: 7, z: 5, style: 'mesh' },
    mirrors: true, mirrorColor: PAL.dark, wing: 'lip', diffuser: true, paint: '#3b6fa8', rim: 'sixblack',
  },
  // 2-door muscle coupe, ~4.8 m: long hood with a scoop, short fastback, haunches over the rear wheels, quad round lamps
  muscle: {
    id: 'muscle', name: 'Muscle coupe (concept)', L: 70, W: 30, wheels: [14, 56], wheelR: 5.6, ride: 1, yBot: 2,
    lower: [[0, 10], [2, 11], [28, 12], [46, 12], [52, 13], [62, 13], [69, 12]],
    green: [[30, 12], [38, 19], [50, 19], [64, 13], [65, 12]], wsEnd: 38, roofEnd: 50, cPillar: 50, pillars: [],
    greenInset: 3, roofInset: 4, rearGlass: 'hatch', doors: [31, 49], handles: [45], crease: 2, rocker: PAL.dark,
    head: { style: 'quad', y0: 6, y1: 10 }, tail: { style: 'bar', y0: 8, y1: 11 }, grille: { y0: 5, y1: 10, z: 10, style: 'slats' },
    scoop: [8, 20], chromeBumpers: true, mirrors: true, wing: 'ducktail', paint: '#f2a43a', rim: 'sixblack',
  },
  // JDM tuner coupe, ~4.3 m: wedge nose with pop-up lamps, long sloping hatch, wide flares, low and wide, GT wing
  tuner: {
    id: 'tuner', name: 'Tuner coupe (concept)', L: 62, W: 28, wheels: [12, 49], wheelR: 5.2, ride: 0, yBot: 2,
    lower: [[0, 7], [5, 9], [11, 11], [22, 11], [54, 11], [61, 12]],
    green: [[21, 11], [31, 18], [40, 18], [57, 12], [58, 11]], wsEnd: 31, roofEnd: 40, cPillar: 52, pillars: [],
    greenInset: 2, roofInset: 3, rearGlass: 'hatch', doors: [22, 41], handles: [38], crease: 2, rocker: PAL.dark,
    head: { style: 'popup', y0: 5, y1: 7 }, tail: { style: 'bar', y0: 8, y1: 10 }, grille: { y0: 3, y1: 5, z: 6, style: 'mesh' },
    fenders: 1, flares: 2, mirrors: true, wing: 'gt', diffuser: true, paint: '#eeeae0', rim: 'turbofan',
  },
  // mid-engine hypercar, ~4.7 m: very low, cab-forward bubble, big side intakes, louvred engine deck, blade lights
  hyper: {
    id: 'hyper', name: 'Hypercar (concept)', L: 68, W: 30, wheels: [13, 53], wheelR: 5.4, ride: 0, yBot: 2,
    lower: [[0, 5], [4, 8], [11, 10], [16, 10], [22, 9], [38, 9], [48, 11], [66, 11], [67, 10]],
    green: [[18, 8], [28, 15], [38, 15], [52, 11], [53, 10]], wsEnd: 28, roofEnd: 38, cPillar: 40, pillars: [],
    greenInset: 4, roofInset: 5, rearGlass: 'window', doors: [24, 39], handles: [], rocker: '#121214',
    head: { style: 'blade', y0: 4, y1: 6 }, tail: { style: 'blade', y0: 8, y1: 10 }, grille: { y0: 2, y1: 4, z: 7, style: 'mesh' },
    intake: [40, 46], louvres: [52, 62], fenders: 1, diffuser: true, mirrors: true, wing: 'gt', paint: '#6a3ad2', rim: 'sixblack',
  },
  // tuner with the pop-up lamps raised (same body) — the lamps can flip up for dusk/night races
  tuner_up: undefined as unknown as BodyProfile,
  // modern pony car, ~4.7 m (owner: "a Camaro type"): long hood with a power bulge, very high belt line and a chopped
  // roof (slit windows), aggressive slim lamps over a big lower grille, rising rear haunches, ducktail
  pony: {
    id: 'pony', name: 'Pony car (concept)', L: 68, W: 30, wheels: [13, 54], wheelR: 5.6, ride: 1, yBot: 2,
    lower: [[0, 9], [2, 11], [10, 12], [28, 13], [46, 13], [54, 14], [62, 14], [67, 13]],
    green: [[30, 13], [38, 18], [48, 18], [58, 14], [60, 13]], wsEnd: 38, roofEnd: 48, cPillar: 49, pillars: [],
    greenInset: 3, roofInset: 4, rearGlass: 'window', doors: [31, 50], handles: [46], crease: 3, rocker: PAL.dark,
    head: { style: 'slim', y0: 9, y1: 11 }, tail: { style: 'rect', y0: 10, y1: 13 }, grille: { y0: 4, y1: 9, z: 6, style: 'mesh' },
    scoop: [6, 22], mirrors: true, mirrorColor: PAL.dark, wing: 'ducktail', diffuser: true, paint: '#f2c230', rim: 'sixblack',
  },
  // compact sport coupe, ~4.3 m (owner: "something like an M2"): short overhangs, boxy flared arches, twin grille, big lower
  // intakes, notchback with a short deck, quad exhaust
  compact: {
    id: 'compact', name: 'Compact sport coupe (concept)', L: 62, W: 30, wheels: [11, 51], wheelR: 5.4, ride: 1, yBot: 2,
    lower: [[0, 9], [2, 10], [12, 11], [22, 12], [54, 12], [61, 12]],
    green: [[22, 12], [31, 20], [44, 20], [54, 13], [55, 12]], wsEnd: 31, roofEnd: 44, cPillar: 46, pillars: [],
    greenInset: 3, roofInset: 4, rearGlass: 'window', doors: [23, 46], handles: [42], crease: 2, rocker: PAL.dark,
    head: { style: 'rect', y0: 8, y1: 10 }, tail: { style: 'rect', y0: 9, y1: 11 }, grille: { y0: 6, y1: 10, z: 9, style: 'kidney' },
    frontIntake: [3, 6], fenders: 1, flares: 1, quadExhaust: true, diffuser: true, mirrors: true, mirrorColor: PAL.dark, wing: 'lip', paint: '#2a7fd4', rim: 'sixblack',
  },
  // rally-bred AWD sedan, ~4.5 m (extra idea): big hood scoop, flares, tall rear wing, gold wheels
  rally: {
    id: 'rally', name: 'Rally sedan (concept)', L: 64, W: 29, wheels: [12, 51], wheelR: 5.4, ride: 1, yBot: 2,
    lower: [[0, 8], [3, 10], [14, 11], [24, 12], [56, 12], [63, 12]],
    green: [[24, 12], [33, 20], [46, 20], [54, 13], [55, 12]], wsEnd: 33, roofEnd: 46, cPillar: 49, pillars: [39, 40],
    greenInset: 2, roofInset: 3, rearGlass: 'window', doors: [25, 39, 52], handles: [36, 49], crease: 2, rocker: PAL.dark,
    head: { style: 'rect', y0: 7, y1: 10 }, tail: { style: 'rect', y0: 9, y1: 11 }, grille: { y0: 5, y1: 8, z: 9, style: 'mesh' },
    frontIntake: [3, 5], scoop: [9, 18], fenders: 1, flares: 1, mirrors: true, wing: 'gt', paint: '#1f4fa8', rim: 'gold5',
  },
  // ---- League D hatchbacks (owner 2026-10-18: "Golfs, A3s…"; then "make them look like different models"). Each one now has
  // its own silhouette, lamps, grille, tail, exhaust and wheel so they read apart at a glance. Names are placeholders.
  // city car, ~3.5 m (Mini type): shortest and tallest, bolt-upright screen, floating roof (black pillars) in a contrast colour,
  // big round lamps, hexagon chrome grille, fog lamps, black arch cladding, tall tail lamps, twin centre pipes, dish wheels
  city: {
    id: 'city', name: 'City car (concept)', L: 50, W: 28, wheels: [8, 42], wheelR: 4.8, ride: 1, yBot: 2,
    lower: [[0, 10], [2, 11], [8, 12], [49, 12]],
    green: [[16, 12], [22, 22], [45, 22], [48, 18], [49, 12]], wsEnd: 22, roofEnd: 45, cPillar: 44, pillars: [31],
    greenInset: 2, roofInset: 2, rearGlass: 'hatch', doors: [17, 36], handles: [33], rocker: PAL.dark,
    head: { style: 'round', y0: 7, y1: 12 }, tail: { style: 'tall', y0: 8, y1: 14 }, tailZ: [1, 5], grille: { y0: 4, y1: 8, z: 9, style: 'wide' },
    fogs: true, cladding: true, floatingRoof: true, exhaust: 'twinCentre',
    mirrors: true, mirrorColor: '#eeeae0', roofColor: '#eeeae0', wing: 'none', paint: '#2f9a5a', rim: 'dish',
  },
  // supermini 3-door hot hatch, ~3.9 m (Fiesta ST type): wedge belt, roof sloping down to a big spoiler, window line that kicks
  // up at the back, lamps that sweep back onto the wings, large trapezoid grille, splitter, single big pipe, twin-5 wheels
  supermini: {
    id: 'supermini', name: 'Supermini (concept)', L: 56, W: 28, wheels: [10, 46], wheelR: 5.0, ride: 1, yBot: 2,
    lower: [[0, 8], [3, 10], [11, 11], [22, 12], [44, 13], [55, 14]],
    green: [[21, 12], [29, 20], [40, 20], [51, 15], [53, 14]], wsEnd: 29, roofEnd: 40, cPillar: 42, pillars: [],
    greenInset: 2, roofInset: 3, rearGlass: 'hatch', doors: [22, 41], handles: [38], crease: 2, rocker: PAL.dark, glassRise: [37, 2],
    head: { style: 'wrap', y0: 8, y1: 10 }, lampZ: [2, 8], tail: { style: 'tall', y0: 10, y1: 15 }, tailZ: [1, 4], grille: { y0: 2, y1: 8, z: 7, style: 'mesh' },
    splitter: true, exhaust: 'single', mirrors: true, mirrorColor: PAL.dark, wing: 'roof', paint: '#f2a43a', rim: 'twin5',
  },
  // classic 5-door hot hatch, ~4.1 m (Golf GTI type): upright two-box, long flat roof, straight belt, thick C-pillar, square
  // lamps joined by a slim grille with the red pin-stripe, honeycomb bumper with fog lamps, wide tail lamps, one pipe each side
  classic: {
    id: 'classic', name: 'Classic hatch (concept)', L: 60, W: 28, wheels: [11, 49], wheelR: 5.0, ride: 1, yBot: 2,
    lower: [[0, 9], [2, 10], [12, 11], [22, 12], [52, 12], [59, 12]],
    green: [[21, 12], [30, 21], [49, 21], [55, 16], [57, 13], [58, 12]], wsEnd: 30, roofEnd: 49, cPillar: 44, pillars: [35, 36],
    greenInset: 2, roofInset: 3, rearGlass: 'hatch', doors: [22, 36, 47], handles: [33, 45], crease: 2, rocker: PAL.dark,
    head: { style: 'rect', y0: 8, y1: 11 }, tail: { style: 'rect', y0: 9, y1: 12 }, tailZ: [1, 10], grille: { y0: 8, y1: 11, z: 9, style: 'slats' },
    grilleAccent: '#d23a2a', frontIntake: [3, 6], fogs: true, exhaust: 'split', mirrors: true, wing: 'roof', paint: '#eeeae0', rim: 'mesh',
  },
  // premium 5-door sportback, ~4.3 m (A3 type): lower and longer, wedge belt with a sharp shoulder line, sloping fastback hatch,
  // tall single-frame grille with a bright surround, LED strip over square projectors, chrome window line, ten-spoke wheels
  premium: {
    id: 'premium', name: 'Premium hatch (concept)', L: 62, W: 28, wheels: [12, 50], wheelR: 5.0, ride: 1, yBot: 2,
    lower: [[0, 8], [3, 10], [13, 11], [24, 11], [50, 12], [61, 12]],
    green: [[23, 11], [33, 19], [44, 19], [55, 14], [57, 12]], wsEnd: 33, roofEnd: 44, cPillar: 50, pillars: [38, 39],
    greenInset: 2, roofInset: 3, rearGlass: 'hatch', doors: [24, 39, 51], handles: [35, 48], crease: 3, rocker: PAL.dark, windowTrim: PAL.chrome,
    head: { style: 'split', y0: 7, y1: 10 }, tail: { style: 'rect', y0: 10, y1: 12 }, tailZ: [1, 9], grille: { y0: 2, y1: 10, z: 9, style: 'frame' },
    exhaust: 'split', mirrors: true, wing: 'none', paint: '#8e9bb3', rim: 'multi',
  },
  // sport hatch, ~4.3 m (Mégane RS / Focus RS type): widest and lowest, big flared arches, vents behind the front wheels, a
  // light bar across the nose, deep intake and splitter, full-width tail bar, twin centre pipes in a diffuser, roof spoiler
  sporthatch: {
    id: 'sporthatch', name: 'Sport fastback (concept)', L: 62, W: 30, wheels: [12, 50], wheelR: 5.3, ride: 0, yBot: 2,
    lower: [[0, 7], [3, 9], [13, 10], [24, 11], [54, 11], [61, 11]],
    green: [[23, 11], [31, 19], [44, 19], [55, 13], [56, 11]], wsEnd: 31, roofEnd: 44, cPillar: 49, pillars: [38, 39],
    greenInset: 3, roofInset: 4, rearGlass: 'hatch', doors: [24, 39, 50], handles: [36, 47], crease: 2, rocker: PAL.dark,
    head: { style: 'bar', y0: 7, y1: 9 }, tail: { style: 'bar', y0: 9, y1: 11 }, grille: { y0: 5, y1: 7, z: 10, style: 'mesh' },
    frontIntake: [2, 5], splitter: true, intake: [19, 21], fenders: 1, flares: 2, diffuser: true, exhaust: 'twinCentre',
    mirrors: true, mirrorColor: PAL.dark, wing: 'roof', paint: '#1f8a8a', rim: 'sixblack',
  },
};
BODY_PROFILES.tuner_up = { ...BODY_PROFILES.tuner, id: 'tuner_up', name: 'Tuner coupe — lamps up', head: { ...BODY_PROFILES.tuner.head, style: 'popupUp' } };

/** Selectable features per body, shown in the Catalog (owner Q76) — visual only. First value = default. */
export interface BodyOption { id: string; label: string; values: [string, string][] }
export const BODY_OPTIONS: Record<string, BodyOption[]> = {
  tuner: [{ id: 'popups', label: 'Pop-up lamps', values: [['down', 'Down'], ['up', 'Up']] }, { id: 'wing', label: 'Rear wing', values: [['on', 'GT wing'], ['off', 'None']] }],
  hyper: [{ id: 'wing', label: 'Rear wing', values: [['on', 'GT wing'], ['off', 'None']] }],
  rally: [{ id: 'wing', label: 'Rear wing', values: [['on', 'Tall wing'], ['off', 'None']] }],
  muscle: [{ id: 'wing', label: 'Spoiler', values: [['on', 'Ducktail'], ['off', 'None']] }],
  pony: [{ id: 'wing', label: 'Spoiler', values: [['on', 'Ducktail'], ['off', 'None']] }],
  sedan: [{ id: 'wing', label: 'Spoiler', values: [['on', 'Lip'], ['off', 'None']] }],
  compact: [{ id: 'wing', label: 'Spoiler', values: [['on', 'Lip'], ['off', 'None']] }],
  classic: [{ id: 'wing', label: 'Roof spoiler', values: [['on', 'On'], ['off', 'None']] }],
  premium: [{ id: 'spoiler', label: 'Roof spoiler', values: [['off', 'None'], ['on', 'On']] }],
  city: [{ id: 'roof', label: 'Roof', values: [['white', 'White'], ['black', 'Black'], ['body', 'Body colour']] }],
  supermini: [{ id: 'roof', label: 'Roof', values: [['body', 'Body colour'], ['black', 'Black'], ['white', 'White']] }, { id: 'wing', label: 'Roof spoiler', values: [['on', 'On'], ['off', 'None']] }],
  sporthatch: [{ id: 'wing', label: 'Roof spoiler', values: [['on', 'On'], ['off', 'None']] }],
};
const ROOF: Record<string, string | undefined> = { white: '#eeeae0', black: '#1a1a1e', body: undefined };

/** Build the profile a look asks for, with its selected options applied. */
export function profileFor(look: CarLook): BodyProfile | null {
  const base = look.body ? BODY_PROFILES[look.body] : undefined;
  if (!base) return null;
  const o = look.opts || {};
  let P: BodyProfile = { ...base };
  if (o.popups === 'up' && P.head.style === 'popup') P = { ...P, head: { ...P.head, style: 'popupUp' } };
  if (o.wing === 'off') P = { ...P, wing: 'none' };
  if (o.spoiler === 'on') P = { ...P, wing: 'roof' };
  if (o.rim) P = { ...P, rim: o.rim };
  if (o.roof && o.roof in ROOF) { const rc = ROOF[o.roof]; P = { ...P, roofColor: rc, mirrorColor: base.mirrorColor === base.roofColor ? (rc ?? undefined) : P.mirrorColor }; }
  return P;
}
setBodyBuilder(look => { const P = profileFor(look); if (!P) return null; const r = buildBodyVoxels(P); return { ...r, L: P.L, W: P.W }; });
