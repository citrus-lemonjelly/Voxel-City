// Profile-driven car bodies (owner: muscle coupes, sedans, tuners, hypercars — S23 Body + Spec).
// A body is described by its side profile (belt/hood/deck line + glasshouse line), stance (length, width, wheels) and a
// few feature switches; the builder turns that into car-density voxels with the same rules as the Civix
// (carBuilder.ts): 1 block everywhere, wheels at 2× (A15), paint/trim/glass/light roles, part slots at fixed faces.
// Car-local frame: x = length (front at 0, the car faces −x), y = up, z = width (z = 0 is the camera side).
import { Vox, Role } from './voxel';
import { PAL, buildWheels, WheelVox } from './carBuilder';

export type HeadStyle = 'rect' | 'slim' | 'quad' | 'popup' | 'popupUp' | 'blade';
export type TailStyle = 'rect' | 'bar' | 'quad' | 'blade';
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
  grille: { y0: number; y1: number; z: number; style: 'slats' | 'mesh' | 'wide' | 'kidney' | 'none' };
  /** big lower bumper air intake (dark mesh), y0..y1 */
  frontIntake?: [number, number];
  /** front fenders rise over the wheels (blocks above the arch) — keeps an arch over the wheel on low noses (owner Q65) */
  fenders?: number;
  scoop?: [number, number];            // hood scoop from x0 to x1
  flares?: number;                     // fender flare thickness (blocks) outside the body sides
  intake?: [number, number];           // side intake (x0..x1) ahead of the rear wheel
  louvres?: [number, number];          // rear deck louvres (x0..x1)
  diffuser?: boolean;
  wing?: 'ducktail' | 'gt' | 'lip' | 'none';
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
        if (x > P.cPillar) shade = 'mid';                                          // C-pillar / sail panel
        else if (region === 'ws' && (front || up)) shade = 'mid';                  // A-pillar
        else if (P.pillars.includes(x)) { role = 'trim'; c = PAL.frame; }          // B-pillar
        else if (up || y === gt - 1) shade = 'mid';                                // roof rail
        else { role = 'glass'; c = glass(x, y); }
      } else if (region === 'ws' || (region === 'rear' && (P.rearGlass === 'hatch' || x <= P.cPillar + 2))) {
        if (edgeZ) { role = 'trim'; c = PAL.frame; } else { role = 'glass'; c = ((z + y) % 11) < 2 ? PAL.streak : PAL.glass; }
      } else if (up && region === 'rear') shade = 'light';
    } else {
      if (up) shade = 'light'; else if (y <= yBot + 1) shade = 'dark';
      if (P.crease && side && y === t - P.crease) shade = 'light';                 // body line catches the light
      if (y === yBot && side) { role = 'trim'; c = P.rocker; }
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
  const H = P.head, zl: [number, number][] = [[2, 9], [W - 9, W - 2]];
  for (const [z0, z1] of zl) {
    const outer = z0 < W / 2 ? z0 : z1 - 1;
    if (H.style === 'rect') for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1; y++) put(-1, y, z, z === outer ? PAL.amber : PAL.head, 'light');
    if (H.style === 'slim') { for (let z = z0 - 1; z < z1 + 1; z++) put(-1, H.y1 - 1, z, PAL.head, 'light'); for (let z = z0; z < z1; z++) for (let y = H.y0; y < H.y1 - 1; y++) put(-1, y, z, PAL.darkGrey); }
    if (H.style === 'quad') for (const zc of [z0 + 1.8, z0 + 5.2]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = H.y0; y < H.y1; y++) {
      const d = Math.hypot(z + .5 - zc, y + .5 - (H.y0 + H.y1) / 2); if (d < 1.9) put(-1, y, z, d < 1.0 ? PAL.head : PAL.chrome, d < 1.0 ? 'light' : 'trim');
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
    if (G.style === 'kidney') {                                                      // twin grilles with a bright surround and a gap in the middle
      const half = Math.floor(W / 2), inner = Math.abs(z + .5 - half) < 1.2, edge = y === G.y0 || y === G.y1 - 1 || z === G.z || z === W - G.z - 1 || Math.abs(z + .5 - half) < 2.2;
      c = inner ? null : edge ? PAL.chrome : ((y + z) % 2 ? '#121214' : PAL.darkGrey);
    }
    if (c) put(-1, y, z, c);
  }
  if (P.frontIntake) for (let z = 4; z < W - 4; z++) for (let y = P.frontIntake[0]; y < P.frontIntake[1]; y++) put(-1, y, z, (y + z) % 2 ? '#121214' : PAL.darkGrey);
  for (let z = Math.floor(W / 2) - 3; z < Math.floor(W / 2) + 3; z++) put(-2, yBot + 1, z, PAL.plate);
  // ---- rear: tail lights, plate, exhaust, diffuser ----
  const T = P.tail, tl: [number, number][] = [[1, 8], [W - 8, W - 1]];
  for (const [z0, z1] of tl) {
    if (T.style === 'rect') for (let z = z0; z < z1; z++) for (let y = T.y0; y < T.y1; y++) put(L, y, z, (y === T.y0 && (z === z0 + 3 || z === z1 - 4)) ? PAL.reverse : PAL.tail, 'light');
    if (T.style === 'quad') for (const zc of [z0 + 1.8, z0 + 5.2]) for (let z = Math.floor(zc - 2); z < zc + 2; z++) for (let y = T.y0; y < T.y1; y++) {
      const d = Math.hypot(z + .5 - zc, y + .5 - (T.y0 + T.y1) / 2); if (d < 1.9) put(L, y, z, d < 1.0 ? '#ff6a5a' : PAL.tail, 'light');
    }
    if (T.style === 'bar') for (let z = z0; z < z1; z++) for (let y = T.y0; y < T.y1; y++) put(L, y, z, PAL.tail, 'light');
  }
  if (T.style === 'bar' || T.style === 'blade') for (let z = 1; z < W - 1; z++) put(L, T.style === 'blade' ? T.y1 - 1 : T.y1, z, PAL.tail, 'light');
  for (let z = Math.floor(W / 2) - 3; z < Math.floor(W / 2) + 3; z++) { put(L, T.y0 - 2, z, PAL.plate); put(L, T.y0 - 3, z, PAL.plate); }
  for (const z of P.quadExhaust ? [3, 4, W - 5, W - 4] : [W - 7, W - 6]) { put(L, yBot + 1, z, PAL.chrome); put(L + 1, yBot + 1, z, PAL.midGrey); }
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
};
BODY_PROFILES.tuner_up = { ...BODY_PROFILES.tuner, id: 'tuner_up', name: 'Tuner coupe — lamps up', head: { ...BODY_PROFILES.tuner.head, style: 'popupUp' } };
