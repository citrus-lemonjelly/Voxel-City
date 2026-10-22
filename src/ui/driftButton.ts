// Drift button (owner, V0.18.0): sits beside the gas pedal in Drift. Four looks to try (Settings ▸ Keybinds ▸ Drift):
//   brake = a handbrake lever in a metal housing · pedal = a second pedal (orange, skid-mark tread) · puck = a round block button
//   with a skid-mark badge · key = a big keycap that says DRIFT.
// Drawn block by block like the gas pedal (hud.ts): each cell takes its material's face colour, the light edge where the cell
// above or to the left is empty, the dark edge where the cell to the right or below is empty — lit from the top-left.
const NS = 'http://www.w3.org/2000/svg';

export type DriftButtonId = 'brake' | 'pedal' | 'puck' | 'key';
export const DRIFT_BUTTONS: { id: DriftButtonId; label: string }[] = [
  { id: 'brake', label: 'Handbrake' }, { id: 'pedal', label: 'Pedal' }, { id: 'puck', label: 'Puck' }, { id: 'key', label: 'Key' },
];

/** material → [face, light edge, dark edge] (a second face colour makes a fine checker, like the alloy pedal) */
const MAT: Record<string, [string, string, string, string?]> = {
  metal: ['#5a5f6b', '#8a919e', '#2b2e36', '#565b67'],
  chrome: ['#b9bfc7', '#eef1f5', '#666c75', '#b1b7bf'],
  grip: ['#22252b', '#4a4f5a', '#111317'],
  rib: ['#33373f', '#4a4f5a', '#111317'],
  red: ['#e0261c', '#ff7a5c', '#8a1410'],
  orange: ['#f2a43a', '#ffd08a', '#a8681c', '#eb9d33'],
  mark: ['#5a3412', '#5a3412', '#3a2008'],
  ring: ['#3d4250', '#6b7283', '#1b1e26'],
  key: ['#e9ecf2', '#ffffff', '#9aa1ae'],
  ink: ['#14161c', '#14161c', '#14161c'],
  slot: ['#14161c', '#14161c', '#14161c'],
  white: ['#f4f1e8', '#ffffff', '#c9c4b8'],
};
type Cell = (c: number, r: number) => string | null;

function paint(W: number, H: number, cell: number, at: Cell, bevel = true): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', String(W * cell)); svg.setAttribute('height', String(H * cell)); svg.setAttribute('shape-rendering', 'crispEdges');
  const empty = (c: number, r: number) => c < 0 || r < 0 || c >= W || r >= H || !at(c, r);
  const out: string[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const m = at(c, r); if (!m) continue;
    const [face, light, dark, face2] = MAT[m];
    let fill = face2 && ((r + c) & 1) ? face2 : face;
    if (bevel && m !== 'ink' && m !== 'mark' && m !== 'slot') {
      // bevel against empty space and against a different material, so every part reads as its own block
      const other = (dc: number, dr: number) => empty(c + dc, r + dr) || at(c + dc, r + dr) !== m;
      if (other(0, -1) || other(-1, 0)) fill = light;
      if (other(1, 0) || other(0, 1)) fill = dark;
    }
    out.push(`<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`);
  }
  svg.innerHTML = out.join('');
  return svg;
}

/** Two wavy skid marks (the drift badge), 7 × 8 cells: true where a mark is. */
const SKID = ['.X...X.', '..X...X', '..X...X', '.X...X.', 'X...X..', 'X...X..', '.X...X.', '..X...X'];
const skidAt = (c: number, r: number) => r >= 0 && r < SKID.length && c >= 0 && c < 7 && SKID[r][c] === 'X';
/** 3 × 5 block letters for DRIFT */
const L5: Record<string, string[]> = { D: ['110', '101', '101', '101', '110'], R: ['110', '101', '110', '101', '101'], I: ['111', '010', '010', '010', '111'], F: ['111', '100', '110', '100', '100'], T: ['111', '010', '010', '010', '010'] };
const textAt = (str: string, c: number, r: number) => { const i = Math.floor(c / 4), cc = c % 4; return r >= 0 && r < 5 && i < str.length && cc < 3 && L5[str[i]]?.[r][cc] === '1'; };

/** Handbrake: a lever rising from a metal housing, black ribbed grip, red release button on the end. */
function brake(): [number, number, Cell] {
  const W = 16, H = 32, P0 = [6.5, 26], P1 = [11.2, 3.2];
  return [W, H, (c, r) => {
    const x = c + 0.5, y = r + 0.5, dx = P1[0] - P0[0], dy = P1[1] - P0[1];
    const t = Math.max(0, Math.min(1, ((x - P0[0]) * dx + (y - P0[1]) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(x - (P0[0] + t * dx), y - (P0[1] + t * dy));
    if (Math.hypot(x - 11.9, y - 1.6) < 1.7) return 'red';                        // release button
    if (d < 1.9) return t > 0.55 ? ((r & 1) ? 'rib' : 'grip') : 'chrome';           // lever: grip on the top 45 %
    if (r >= 25 && c >= 1 && c <= 14) return r <= 26 && c >= 4 && c <= 10 ? 'slot' : 'metal';   // housing with the lever slot
    return null;
  }];
}
/** Pedal: the gas pedal's shape in orange, with a skid-mark tread. */
function pedal(): [number, number, Cell] {
  const W = 15, H = 33, R = 3;
  return [W, H, (c, r) => {
    if (r >= 30) return c >= 2 && c < W - 2 ? 'metal' : null;                       // hinge block
    const ax = Math.abs(c + 0.5 - W / 2) - (W / 2 - R), ay = (r + 0.5) - R;
    if (!(ax <= 0 || ay >= 0 || ax * ax + ay * ay <= R * R)) return null;
    if (skidAt(c - 4, r - 5) || skidAt(c - 4, r - 17)) return 'mark';
    return 'orange';
  }];
}
/** Puck: a round block button — dark ring, red dome, white skid-mark badge. */
function puck(): [number, number, Cell] {
  const W = 18, H = 18, cx = 9, cy = 9;
  return [W, H, (c, r) => {
    const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cy);
    if (d > 9) return null;
    if (d > 7.2) return 'ring';
    if (skidAt(c - 5, r - 5)) return 'white';
    return 'red';
  }];
}
/** Key: a big off-white keycap, DRIFT in block letters over an orange swoosh. */
function key(): [number, number, Cell] {
  const W = 24, H = 16;
  return [W, H, (c, r) => {
    const ax = Math.abs(c + 0.5 - W / 2) - (W / 2 - 2), ay = Math.abs(r + 0.5 - H / 2) - (H / 2 - 2);
    if (!(ax <= 0 || ay <= 0 || ax * ax + ay * ay <= 4)) return null;
    if (textAt('DRIFT', c - 3, r - 3)) return 'ink';
    if (r >= 10 && r <= 11 && c >= 4 && c <= 19 && Math.abs((c - 4) / 15 * 2 - 1) * 1.6 < 1 + (r - 10) * 0.5) return 'orange';   // swoosh
    return 'key';
  }];
}
const DESIGNS: Record<DriftButtonId, () => [number, number, Cell]> = { brake, pedal, puck, key };

/** The drift button art at `cell` px per block. */
export function drawDriftButton(id: string, cell = 4): SVGSVGElement {
  const [W, H, at] = (DESIGNS[id as DriftButtonId] ?? brake)();
  return paint(W, H, cell, at);
}

/** Review sheet (dev, `__vc.driftButtons()`): every design beside the gas pedal, at game size and at 2×, pressed and not. */
export function driftButtonSheet(pedal: (cell: number) => SVGElement): HTMLElement {
  const el = document.createElement('div');
  el.className = 'blk';
  el.style.cssText = 'position:absolute;inset:24px;display:flex;flex-direction:column;gap:14px;padding:18px 22px;overflow:auto;z-index:30';
  el.innerHTML = `<h2 class="hd" style="margin:0;color:#f2c230;font-size:20px">Drift button — four designs</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;flex:1"></div>`;
  const grid = el.lastElementChild as HTMLElement;
  for (const b of DRIFT_BUTTONS) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d';
    card.innerHTML = `<b class="hd" style="font-size:16px;color:#e9ecf2">${b.label}</b><span style="font:600 12px system-ui;color:#9aa3b5">PC size · beside the gas pedal</span>`;
    const row = (cell: number, pressed = false) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;align-items:flex-end;gap:12px';
      const btn = drawDriftButton(b.id, b.id === 'key' ? cell - 1 : cell); if (pressed) btn.style.cssText = 'transform:translateY(4px);filter:brightness(.8)';
      r.append(btn, pedal(cell)); return r; };
    card.append(row(4), Object.assign(document.createElement('span'), { textContent: '2× (phone thumbs) · pressed', style: 'font:600 12px system-ui;color:#9aa3b5' }), row(7, true));
    grid.appendChild(card);
  }
  return el;
}
