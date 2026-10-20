// Collision check (owner 2026-10-19: "always check for collisions in base car models and custom parts").
// Builds every body with no parts and with each part, then reports (1) clashing blocks — two blocks in the same cell
// with different colours or roles (they flicker / z-fight) — and (2) body or part blocks inside a tyre.
import { checkBuild, CarLook, STOCK_LOOK } from '../src/render/carBuilder';
import { BODY_PROFILES } from '../src/render/bodies';
import { VISUAL_PARTS, isFactory } from '../src/data/visualParts';
import type { Vox } from '../src/render/voxel';

const bodies = ['civix', ...Object.keys(BODY_PROFILES).filter(k => k !== 'tuner_up' && k !== 'lab' && BODY_PROFILES[k])];
const parts = VISUAL_PARTS.filter(p => !isFactory(p) && !p.won && p.slot !== 'finish' && p.slot !== 'underglow');
function problems(look: CarLook) {
  const r0 = checkBuild(look), b = r0.b, cells = new Map<string, Vox>(), clash = new Set<string>([...r0.replaced, ...r0.hidden.map(k => 'kit ' + k)]), tyre = new Set<string>();
  const col = (v: Vox) => (v.c ?? '') + '|' + (v.role === 'paint' && !v.c ? 'paint' : v.role === 'paint' ? 'decal' : v.role);
  for (const v of b.body) {
    const k = `${v.s}|${v.x}|${v.y}|${v.z}`, o = cells.get(k);
    if (o && col(o) !== col(v)) clash.add(k); else if (!o) cells.set(k, v);
    if (v.s !== 1) continue;
    if ((v.x < 0 || v.x >= b.L) && (v.z < 0 || v.z > b.W - 1)) clash.add('outside ' + k);   // a nose / tail block hanging off the side of the car
    for (const cx of b.dims.wheels) {                                   // tyre: radius wheelR (body blocks), 4 blocks wide at each side
      const r = Math.hypot(v.x + 0.5 - cx, v.y + 0.5 - b.wheelY), inSide = (v.z >= 0 && v.z <= 2) || (v.z >= b.W - 3 && v.z <= b.W - 1) || v.z < 0 || v.z > b.W - 1;
      if (r < b.wheelY - 0.7 && inSide && (v.z < 4 || v.z > b.W - 5)) tyre.add(k);
    }
  }
  return { clash, tyre };
}
const base = (body: string): CarLook => ({ ...STOCK_LOOK, body, paint: '#d23a2a' });
let bad = 0; const lines: string[] = [];
for (const body of bodies) {
  const b0 = problems(base(body));
  if (b0.clash.size || b0.tyre.size) { bad++; lines.push(`BASE  ${body}: ${b0.clash.size} clashing cells, ${b0.tyre.size} in a tyre ${[...b0.clash].slice(0, 4).join(' ')} ${[...b0.tyre].slice(0, 3).join(' ')}`); }
  for (const p of parts) {
    const r = problems({ ...base(body), parts: { [p.slot]: p.value } });
    const nc = [...r.clash].filter(k => !b0.clash.has(k)), nt = [...r.tyre].filter(k => !b0.tyre.has(k));
    if (nc.length || nt.length) { bad++; lines.push(`PART  ${body} + ${p.id}: ${nc.length} clashing, ${nt.length} in a tyre  e.g. ${[...nc, ...nt].slice(0, 4).join(' ')}`); }
  }
}
// parts that sit near each other, fitted together
const PAIRS: [string, string][] = [['exhaust', 'skirts'], ['roof', 'spoiler'], ['taillights', 'spoiler'], ['plate', 'exhaust'], ['grille', 'headlights'], ['plate', 'bumper']];
let pairs = 0;
for (const body of bodies) for (const [a, b] of PAIRS) for (const pa of parts.filter(p => p.slot === a)) for (const pb of parts.filter(p => p.slot === b)) {
  pairs++;
  const r = problems({ ...base(body), parts: { [a]: pa.value, [b]: pb.value } });
  if (r.clash.size || r.tyre.size) { bad++; lines.push(`PAIR  ${body} + ${pa.id} + ${pb.id}: ${r.clash.size} clashing, ${r.tyre.size} in a tyre  e.g. ${[...r.clash, ...r.tyre].slice(0, 4).join(' ')}`); }
}
console.log(lines.join('\n') || 'no collisions');
console.log(`collision check: ${bodies.length} bodies × ${parts.length} parts + ${pairs} part pairs — ${bad ? bad + ' problem' + (bad > 1 ? 's' : '') : 'clean'}`);
if (bad && process.argv.includes('--strict')) process.exit(1);
