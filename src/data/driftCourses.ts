// Drift courses (owner, V0.18.0, ROADMAP E4.6): one winding night road per district. Each road is generated from a seed out of
// road pieces — straights, sweepers, 90° corners, hairpins and esses (two turns the opposite way, linked) — so it looks
// built, not hand-placed, and never crosses itself. Units: metres; x/z is the ground plane, heading 0 = toward −x (the way
// cars face in the drag race); the heading grows when the road bends right, so dir +1 = a right-hander.
import { makeRng } from '../game/ai';

export type DriftTheme = 'city' | 'harbour' | 'ridge' | 'neon';
export interface DriftCourseDef {
  id: string; name: string; district: string; theme: DriftTheme; seed: number;
  /** turn-piece weights for this district: [sweeper, ninety, hairpin, esses] */
  mix: [number, number, number, number];
  /** unused since the run shape changed (owner, V0.18.0): 3–5 turns between two drag straights */
  groups: number;
  /** road width (m) */
  width: number;
  blurb: string;
}
export const DRIFT_COURSES: DriftCourseDef[] = [
  { id: 'downtown', name: 'Downtown Switchbacks', district: 'Downtown', theme: 'city', seed: 1201, mix: [2, 3, 1, 2], groups: 9, width: 13, blurb: 'Tight city blocks, neon shops and towers' },
  { id: 'harbour', name: 'Harbour Hairpins', district: 'Harbour', theme: 'harbour', seed: 2203, mix: [1, 2, 3, 1], groups: 8, width: 14, blurb: 'Container stacks, cranes and the dark water' },
  { id: 'ridge', name: 'Ridge Pass', district: 'The Ridge', theme: 'ridge', seed: 3307, mix: [3, 1, 1, 3], groups: 9, width: 12, blurb: 'Pines, rock walls and guardrails up the hill' },
  { id: 'neon', name: 'Neon Row', district: 'Neon Row', theme: 'neon', seed: 4409, mix: [2, 2, 2, 2], groups: 9, width: 13, blurb: 'Arcades, signs and warehouses that never sleep' },
];
export const DRIFT_BY_ID = Object.fromEntries(DRIFT_COURSES.map(c => [c.id, c])) as Record<string, DriftCourseDef>;

type Piece = { kind: 'straight'; len: number } | { kind: 'turn'; dir: 1 | -1; deg: number; r: number };
export interface DriftTurn { s0: number; s1: number; dir: 1 | -1; r: number; deg: number; /** the next turn starts right after this one, the other way (esses) */ linked: boolean; name: string }
export interface DriftPath {
  def: DriftCourseDef;
  length: number;
  /** samples every STEP m: position, heading (rad), curvature (1/m, + = left) */
  x: Float32Array; z: Float32Array; h: Float32Array; k: Float32Array;
  turns: DriftTurn[];
}
export const PATH_STEP = 0.5;
/** Run shape (owner, V0.18.0): a drag straight from the line (about 5–7 s of launching and shifting up), 3–5 turns to drift
 *  (10–12 s), then a drag straight to the finish (5–7 s). Quicker leagues get longer straights so the drags take about as long. */
export const DRAG_STRAIGHTS: Record<string, [number, number]> = { D: [95, 185], C: [108, 215], B: [145, 253], A: [177, 312], S: [268, 423] };
/** turns per run, and the drift section's target length (s): turns are added (3 at least, 6 at most) until about this long */
export const TURN_COUNT: [number, number] = [3, 6], DRIFT_SECONDS = 10;
/** rough grip of each league's cars (tyres), to guess how long a turn takes before the run exists */
const LEAGUE_MU: Record<string, number> = { D: 0.9, C: 0.95, B: 1.2, A: 1.75, S: 2.5 };

function pieces(def: DriftCourseDef, seed: number, league: string): Piece[] {
  const [first, last] = DRAG_STRAIGHTS[league] ?? DRAG_STRAIGHTS.D;
  const rng = makeRng(seed), out: Piece[] = [{ kind: 'straight', len: first }];
  const between = (a: number, b: number) => a + rng() * (b - a);
  let lastDir: 1 | -1 = rng() < 0.5 ? 1 : -1, turns = 0, est = 0;
  const mu = LEAGUE_MU[league] ?? 1, turnSec = (r: number, deg: number) => r * deg * Math.PI / 180 / (Math.sqrt(mu * 9.81 * r) * 0.92 * 1.1);
  const enough = () => turns >= TURN_COUNT[1] || (turns >= TURN_COUNT[0] && est >= DRIFT_SECONDS);
  for (let g = 0; !enough(); g++) {
    const want = turns + (est < DRIFT_SECONDS - 4 ? 2 : 1);
    const w = def.mix, tot = w[0] + w[1] + w[2] + w[3]; let roll = rng() * tot, kind = 0;
    while (kind < 3 && (roll -= w[kind]) > 0) kind++;
    if (kind === 3 && turns + 2 > want) kind = 1;                                     // esses are two turns: only if they fit
    // mostly alternate directions so the road winds back and forth instead of looping round
    const dir: 1 | -1 = rng() < 0.72 ? (-lastDir as 1 | -1) : lastDir;
    if (kind === 0) out.push({ kind: 'turn', dir, deg: between(55, 85), r: between(50, 68) });
    else if (kind === 1) out.push({ kind: 'turn', dir, deg: between(84, 96), r: between(26, 34) });
    else if (kind === 2) out.push({ kind: 'turn', dir, deg: between(150, 178), r: between(17, 22) });
    else { const r = between(32, 42), d = between(48, 64); out.push({ kind: 'turn', dir, deg: d, r }, { kind: 'straight', len: between(6, 10) }, { kind: 'turn', dir: -dir as 1 | -1, deg: d * between(0.9, 1.1), r }); }
    lastDir = kind === 3 ? (-dir as 1 | -1) : dir;
    turns += kind === 3 ? 2 : 1;
    for (const p of out.slice(-3)) if (p.kind === 'turn' && !(p as any).counted) { est += turnSec(p.r, p.deg); (p as any).counted = true; }
    const link = between(10, 24); if (!enough()) est += link / 15;
    out.push({ kind: 'straight', len: enough() ? last : link });   // short links keep the drift section flowing   // short links keep the drift section flowing
  }
  return out;
}

function trace(def: DriftCourseDef, list: Piece[]): DriftPath {
  let len = 0; for (const p of list) len += p.kind === 'straight' ? p.len : p.r * p.deg * Math.PI / 180;
  const n = Math.ceil(len / PATH_STEP) + 1;
  const X = new Float32Array(n), Z = new Float32Array(n), H = new Float32Array(n), K = new Float32Array(n), turns: DriftTurn[] = [];
  let x = 0, z = 0, h = 0, s = 0, i = 0;
  for (let pi = 0; pi < list.length; pi++) {
    const p = list[pi], plen = p.kind === 'straight' ? p.len : p.r * p.deg * Math.PI / 180, kap = p.kind === 'turn' ? p.dir / p.r : 0;
    if (p.kind === 'turn') {
      const nx = list[pi + 1], nn = list[pi + 2], linked = nx?.kind === 'straight' && nx.len < 12 && nn?.kind === 'turn' && nn.dir !== p.dir;
      const name = p.deg > 140 ? 'Hairpin' : p.r < 36 && p.deg > 80 ? '90°' : p.deg < 70 && p.r < 45 ? 'Esse' : 'Sweeper';
      turns.push({ s0: s, s1: s + plen, dir: p.dir, r: p.r, deg: p.deg, linked, name: (p.dir > 0 ? 'Right ' : 'Left ') + name });
    }
    const end = s + plen;
    while (i < n && i * PATH_STEP <= end + 1e-6) {
      const ds = i * PATH_STEP - s;
      if (kap === 0) { X[i] = x - Math.cos(h) * ds; Z[i] = z - Math.sin(h) * ds; H[i] = h; }
      else { const hh = h + kap * ds; X[i] = x + (Math.sin(hh) - Math.sin(h)) / kap * -1; Z[i] = z + (Math.cos(h) - Math.cos(hh)) / kap * -1; H[i] = hh; }
      K[i] = kap; i++;
    }
    // advance the piece's end point exactly
    if (kap === 0) { x -= Math.cos(h) * plen; z -= Math.sin(h) * plen; }
    else { const hh = h + kap * plen; x += -(Math.sin(hh) - Math.sin(h)) / kap; z += -(Math.cos(h) - Math.cos(hh)) / kap; h = hh; }
    s = end;
  }
  for (; i < n; i++) { X[i] = X[i - 1]; Z[i] = Z[i - 1]; H[i] = H[i - 1]; K[i] = 0; }
  return { def, length: len, x: X, z: Z, h: H, k: K, turns };
}

/** Does the road come too close to itself? (pieces more than 60 m apart along the road must stay `gap` m apart) */
function crosses(p: DriftPath, gap: number): boolean {
  const n = p.x.length, every = 4, skip = Math.round(60 / PATH_STEP);
  for (let i = 0; i < n; i += every) for (let j = i + skip; j < n; j += every)
    if (Math.hypot(p.x[i] - p.x[j], p.z[i] - p.z[j]) < gap) return true;
  return false;
}

const cache = new Map<string, DriftPath>();
/** A district's road for one run (cached): `variant` picks a new layout each run (owner: "shifting roads"); the first seed
 *  from there whose road keeps clear of itself. League sets the drag straights. */
export function driftPath(id: string, variant = 0, league = 'D'): DriftPath {
  const key = `${id}:${variant}:${league}`, hit = cache.get(key); if (hit) return hit;
  const def = DRIFT_BY_ID[id] ?? DRIFT_COURSES[0];
  let path: DriftPath | null = null;
  for (let k = 0; k < 400 && !path; k++) { const p = trace(def, pieces(def, def.seed + variant * 104729 + k * 7919, league)); if (!crosses(p, def.width + 46)) path = p; }
  path ??= trace(def, pieces(def, def.seed + variant * 104729, league));
  if (cache.size > 24) cache.clear();
  cache.set(key, path);
  return path;
}

/** Position / heading / curvature at distance s (m) along the road (between samples). */
export function pathAt(p: DriftPath, s: number) {
  const f = Math.max(0, Math.min(p.x.length - 1.001, s / PATH_STEP)), i = Math.floor(f), t = f - i;
  return { x: p.x[i] + (p.x[i + 1] - p.x[i]) * t, z: p.z[i] + (p.z[i + 1] - p.z[i]) * t, h: p.h[i] + (p.h[i + 1] - p.h[i]) * t, k: p.k[i] };
}
