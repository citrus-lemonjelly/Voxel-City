// Race HUD (decision S20): compact gauge + paddle cluster at the bottom centre, race strip top-left.
// Gauge = dark glass dial, rev ring of block dashes (white → green shift zone → red redline), tick marks, 0–N rev
// numbers (×1000 rpm), golden needle, gear + speed in our 5×7 block numerals. 3D bezel (Q33). Paddle = shape (Arc or Tab,
// Q36/Q39) + skin, tucked behind the dial; the whole right side of the plate is the press target. No blinking or pulsing (A22–A23).
import { Race, Racer, COUNTDOWN } from '../game/race';
import { LAUNCH } from '../data/parts';
import { PADDLES, PaddleSkin, PedalStyle } from '../data/cosmetics';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
  const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, String(attrs[k])); if (parent) parent.appendChild(e); return e;
};
const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };

// HUD numerals: the block style of the street signs at 5×7 so they read at a glance
const F7: Record<string, string[]> = { '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], 'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'] };
const F5: Record<string, string[]> = { P: ['110', '101', '110', '100', '100'], E: ['111', '100', '110', '100', '111'], R: ['110', '101', '110', '101', '101'], F: ['111', '100', '110', '100', '100'], C: ['011', '100', '100', '100', '011'], T: ['111', '010', '010', '010', '010'], G: ['011', '100', '101', '101', '011'], O: ['111', '101', '101', '101', '111'], D: ['110', '101', '101', '101', '110'], A: ['010', '101', '111', '101', '101'], L: ['100', '100', '100', '100', '111'], S: ['011', '100', '010', '001', '110'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], B: ['110', '101', '110', '101', '110'], W: ['101', '101', '111', '111', '101'], N: ['110', '101', '101', '101', '101'], U: ['101', '101', '101', '101', '111'], Y: ['101', '101', '010', '010', '010'], K: ['101', '110', '100', '110', '101'], '!': ['010', '010', '010', '000', '010'], '1': ['010', '110', '010', '010', '111'], '2': ['110', '001', '010', '100', '111'], '3': ['110', '001', '010', '001', '110'], V: ['101', '101', '101', '101', '010'], '-': ['000', '000', '111', '000', '000'], ' ': ['000', '000', '000', '000', '000'] };
/** Draw block text into an SVG group; returns its width. */
function blockText(g: Element, str: string, font: Record<string, string[]>, cell: number, color: string, x0: number, y0: number, shadow = 0) {
  g.innerHTML = '';
  const gw = (font['1'] || font[' '])[0].length;
  [...str].forEach((ch, i) => (font[ch] || font[' ']).forEach((row, r) => [...row].forEach((b, c) => {
    if (b !== '1') return;
    if (shadow) svgEl('rect', { x: x0 + (i * (gw + 1) + c) * cell, y: y0 + r * cell + shadow, width: cell, height: cell, fill: '#0009' }, g);
    svgEl('rect', { x: x0 + (i * (gw + 1) + c) * cell, y: y0 + r * cell, width: cell - 0.4, height: cell - 0.4, fill: color }, g);
  })));
  return (str.length * (gw + 1) - 1) * cell;
}

/** Gas pedal exit timing after the launch (owner Q56: slow enough to read, so nobody mistakes it for a button to spam).
 *  Keep in step with the .pedal-pod.gone transition in styles.ts. */
export const PEDAL_EXIT = { restMs: 500, dropMs: 900, foldDelayMs: 1300, foldMs: 700 };
// Reserved (owner Q56): the nitrous badge — a small voxel circle with a blue voxel nitrous bottle — will sit at the
// gauge's top-left, overlapping the downshift paddle. Owner will supply a rough drawing; nothing is drawn there yet.
const D = 236, CX = D / 2, CY = D / 2, R = 92, N_DASH = 36, SWEEP0 = 210, SWEEP = 240;
const ang = (f: number) => (SWEEP0 - f * SWEEP) * Math.PI / 180;
const COL = { lit: '#eeeae0', unlit: '#474c5a', zone: '#4ade80', zoneOff: '#2d5a3e', red: '#e0261c', redOff: '#5a2a2c', gold: '#f2c230' };

export class Hud {
  el: HTMLElement;
  /** The paddle shifter (pointer target for press/release). */
  shiftBtn: HTMLElement;
  /** The downshift paddle (pointer target). */
  downBtn: HTMLElement;
  /** The gas pedal (pointer target) — launch control only; it leaves once the car has launched. */
  gasBtn: HTMLElement;
  private pedalPod!: HTMLElement; private pedalEl!: HTMLElement; private pedalGone = false; private goneAt = 0;
  private plateFill!: Element; private plateEdge!: Element; private platePH = 0; private plateW = { compact: 0, full: 0 };
  private dashes: Element[] = [];
  private needle!: Element;
  private zoneBand!: Element;
  private gearG!: Element; private speedG!: Element; private gradeG!: Element; private countG!: Element;
  private lights: HTMLElement[];
  private hint: HTMLElement; private keyHint: HTMLElement;
  private me: HTMLElement; private them: HTMLElement; private gapEl: HTMLElement;
  private gaugeMax: number;
  private paddleEl!: HTMLElement; private downEl!: HTMLElement; private plusRects: Element[] = []; private skin!: PaddleSkin;
  private last = { gear: '', mph: -1, zone: '', grade: '', count: '' };

  constructor(root: HTMLElement, private race: Race, private player: Racer, private opp: Racer, opts: { oppName: string; paddle: string; paint?: string; showKeyHint: boolean; paddleShape?: 'arc' | 'tab'; pedal?: PedalStyle }) {
    root.innerHTML = '';
    this.gaugeMax = Math.ceil(player.stats.redline / 1000);
    this.el = h(`<div class="overlay hud2">
      <div id="lights" class="blk"><i></i><i></i><i></i></div>
      <div id="hint" class="blk">Hold <b>Space</b> to keep the revs in the green. Let go when the light turns green.</div>
      <div class="race-strip"><div class="gap"></div><div class="road"></div><div class="flag"></div><div class="car them"></div><div class="car me"></div></div>
      <div class="cluster"></div>
    </div>`);
    root.appendChild(this.el);
    // scale the cluster with the window height (designed at 900 px tall)
    this.el.style.setProperty('--hud-scale', String(0.85 * Math.max(0.75, Math.min(1.3, (window.innerHeight || 900) / 900))));   // owner: a smidge smaller
    this.lights = [...this.el.querySelectorAll<HTMLElement>('#lights i')];
    this.hint = this.el.querySelector('#hint')!;
    const strip = this.el.querySelector('.race-strip')!;
    for (let m = 100; m < race.distanceM; m += 100) strip.appendChild(h(`<div class="tick" style="left:calc(16px + ${m / race.distanceM} * (100% - 44px))"></div>`));
    this.me = strip.querySelector('.me')!; this.them = strip.querySelector('.them')!; this.gapEl = strip.querySelector('.gap')!;
    this.oppName = opts.oppName;

    const cluster = this.el.querySelector('.cluster') as HTMLElement;
    // ---- gauge ----
    // paddles first: the gauge sits between a "−" downshift paddle (left, mirrored) and the "+" upshift paddle (right)
    let skin = PADDLES[opts.paddle] || PADDLES.stock;
    if (skin.paintMatch && opts.paint) skin = { ...skin, face: [opts.paint, opts.paint] };
    this.skin = skin;
    const cell = 4, shape = opts.paddleShape === 'tab' ? 'tab' : 'arc';
    const build = (mirror: boolean, sym: '+' | '-') => shape === 'arc' ? arcPaddle(skin, cell, mirror, sym) : tabPaddle(skin, cell, mirror, sym);
    const r = build(false, '+'), rl = build(true, '-');
    const pw = +r.svg.getAttribute('width')!, ph = +r.svg.getAttribute('height')!;
    const reach = r.ox + pw;                                            // how far a paddle reaches past the gauge centre
    const GXO = Math.max(22, 14 + reach - CX);                          // gauge offset inside the dash plate (room for the left paddle)
    const plate = svgEl('svg', { class: 'plate' }, cluster);
    const g = svgEl('svg', { width: D, height: D, class: 'gauge', style: `left:${GXO}px` }, cluster);
    // 3D body (owner Q33): drop shadow, rim thickness, metal bezel lit from the top-left, recessed face, glass sheen
    const defs = svgEl('defs', {}, g);
    const bez = svgEl('linearGradient', { id: 'vcBezel', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#a3a9b5' }, bez); svgEl('stop', { offset: '0.45', 'stop-color': '#5a5f6b' }, bez); svgEl('stop', { offset: '1', 'stop-color': '#22252c' }, bez);
    const face = svgEl('radialGradient', { id: 'vcFace', cx: '0.5', cy: '0.42', r: '0.62' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#262a33' }, face); svgEl('stop', { offset: '1', 'stop-color': '#101217' }, face);
    const blur = svgEl('filter', { id: 'vcShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs); svgEl('feGaussianBlur', { stdDeviation: 5 }, blur);
    svgEl('circle', { cx: CX + 5, cy: CY + 9, r: D / 2 - 4, fill: '#000', 'fill-opacity': 0.45, filter: 'url(#vcShadow)' }, g);
    for (let d = 6; d >= 1; d--) svgEl('circle', { cx: CX + d * 0.6, cy: CY + d, r: D / 2 - 6, fill: d > 3 ? '#121418' : '#1c1f25' }, g);   // rim thickness
    svgEl('circle', { cx: CX, cy: CY, r: D / 2 - 11, fill: 'none', stroke: 'url(#vcBezel)', 'stroke-width': 10 }, g);
    svgEl('circle', { cx: CX, cy: CY, r: D / 2 - 16, fill: 'url(#vcFace)', 'fill-opacity': 0.9 }, g);
    svgEl('circle', { cx: CX, cy: CY + 2, r: D / 2 - 17, fill: 'none', stroke: '#000', 'stroke-opacity': 0.45, 'stroke-width': 4 }, g);   // recess shadow under the bezel
    svgEl('path', { d: `M ${CX - 78} ${CY - 40} A 96 96 0 0 1 ${CX + 40} ${CY - 84} A 140 140 0 0 0 ${CX - 78} ${CY - 40} Z`, fill: '#fff', 'fill-opacity': 0.06 }, g);   // glass sheen
    for (let i = 0; i < N_DASH; i++) {
      const f = i / (N_DASH - 1), a = ang(f);
      this.dashes.push(svgEl('rect', { x: -4.5, y: -7, width: 9, height: 14, fill: COL.unlit, transform: `translate(${CX + Math.cos(a) * R} ${CY - Math.sin(a) * R}) rotate(${90 - (SWEEP0 - f * SWEEP)})` }, g));
    }
    this.zoneBand = svgEl('path', { stroke: COL.zone, 'stroke-width': 3, fill: 'none' }, g);
    const steps = this.gaugeMax * 2;
    for (let k = 0; k <= steps; k++) {
      const a = ang(k / steps), r0 = R - 11, r1 = k % 2 ? R - 15 : R - 19;
      svgEl('line', { x1: CX + Math.cos(a) * r0, y1: CY - Math.sin(a) * r0, x2: CX + Math.cos(a) * r1, y2: CY - Math.sin(a) * r1, stroke: '#ffffffb0', 'stroke-width': k % 2 ? 1.5 : 2.5 }, g);
    }
    for (let k = 0; k <= this.gaugeMax; k++) {
      const a = ang(k / this.gaugeMax);
      svgEl('text', { x: CX + Math.cos(a) * (R - 30), y: CY - Math.sin(a) * (R - 30) + 4, fill: '#ffffffa8', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle', class: 'revnum' }, g).textContent = String(k);
    }
    this.needle = svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY - R, stroke: COL.gold, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    svgEl('circle', { cx: CX, cy: CY, r: 8, fill: '#2b2e38', stroke: COL.gold, 'stroke-width': 2 }, g);
    this.gearG = svgEl('g', {}, g); this.speedG = svgEl('g', {}, g);
    svgEl('text', { x: CX + 20, y: CY + 91, fill: '#a7adbb', 'font-size': 12, class: 'mph' }, g).textContent = 'mph';
    // ---- paddles: shape + skin, tucked partly behind the gauge (owner Q33/Q36/Q39); left = downshift (owner) ----
    const px = GXO + CX + r.ox, py = CY + r.oy, pxl = GXO + CX - reach;
    this.plusRects = r.plus;
    this.paddleEl = h(`<div class="paddle" style="left:${px}px;top:${py}px;width:${pw}px;height:${ph}px"></div>`);
    this.paddleEl.appendChild(r.svg);
    this.downEl = h(`<div class="paddle left" style="left:${pxl}px;top:${py}px;width:${pw}px;height:${ph}px"></div>`);
    this.downEl.appendChild(rl.svg);
    cluster.insertBefore(this.paddleEl, g); cluster.insertBefore(this.downEl, g);   // behind the gauge
    // ---- dash plate (owner): ONE see-through panel behind gauge + paddles + gas-pedal bay, stepped top-left corner and a
    //      stepped curve on the top-right. When the car launches the pedal drops away and the bay folds in (plate shrinks). ----
    const PT = -16, PH = D - PT + 90, PWc = Math.round(GXO + CX + reach + 14), BAY = 86, PWf = PWc + BAY;
    this.plateW = { compact: PWc, full: PWf };
    (plate as any).style.cssText = `left:0;top:${PT}px`;
    plate.setAttribute('height', String(PH));
    this.plateFill = svgEl('path', { fill: '#14161c', 'fill-opacity': 0.55 }, plate);
    this.plateEdge = svgEl('path', { stroke: '#ffffff2e', 'stroke-width': 3, fill: 'none' }, plate);
    this.platePH = PH; this.setPlateWidth(PWf);
    (cluster as HTMLElement).style.width = PWc + 'px';                     // centred on the gauge; the bay hangs off to the right
    (g as any).style.pointerEvents = 'none';
    // press targets: each half of the plate (gauge centre → plate edge), so the hidden part of each paddle counts too
    const HX = GXO + CX + 24, HL = GXO + CX - 24;
    this.shiftBtn = h(`<button class="paddle-hit" aria-label="Shift up" style="left:${HX}px;top:${PT}px;width:${PWc - HX}px;height:${D - PT}px"></button>`);
    this.downBtn = h(`<button class="paddle-hit" aria-label="Shift down" style="left:0;top:${PT}px;width:${HL}px;height:${D - PT}px"></button>`);
    cluster.appendChild(this.shiftBtn); cluster.appendChild(this.downBtn);
    // labels with key pictures (owner): "SHIFT DOWN" + [SHIFT] under the left paddle, "SHIFT UP" + [SPACE] under the right
    const visR = Math.round((GXO + D - 8 + px + pw) / 2), visL = PWc - visR, LY = D - 34;
    this.keyHint = h(`<div class="keylabels">${keyLabel('SHIFT DOWN', 'SHIFT', visL, LY)}${keyLabel('SHIFT UP', 'SPACE', visR, LY)}</div>`);
    if (opts.showKeyHint) cluster.appendChild(this.keyHint);
    // ---- gas pedal (owner): sits in the plate's bay right of the "+" paddle for the launch, then drops away ----
    this.pedalPod = h(`<div class="pedal-pod" style="left:${PWc}px;top:0;width:${BAY}px;height:${D}px"></div>`);
    const art = drawPedal(opts.pedal || 'alloy', skin, 4);
    const aw = +art.getAttribute('width')!;
    this.pedalEl = h(`<div class="pedal" style="left:${(BAY - aw) / 2 - 4}px;top:34px"></div>`);
    this.pedalEl.appendChild(art);
    this.pedalPod.appendChild(this.pedalEl);
    this.gasBtn = h(`<button class="paddle-hit" aria-label="Gas" style="left:0;top:${PT}px;width:${BAY}px;height:${D - PT}px"></button>`);
    this.pedalPod.appendChild(this.gasBtn);
    if (opts.showKeyHint) this.pedalPod.appendChild(h(`<div class="keylabels">${keyLabel('GAS', 'SPACE', BAY / 2 - 4, LY)}</div>`));
    cluster.appendChild(this.pedalPod);
    // ---- grade + countdown (block lettering above the gauge / centre screen) ----
    const over = svgEl('svg', { width: 520, height: 46, class: 'grade' }, this.el); this.gradeG = svgEl('g', {}, over);
    const cnt = svgEl('svg', { width: 200, height: 170, class: 'count' }, this.el); this.countG = svgEl('g', {}, cnt);
  }
  private oppName = 'Rival';

  /** Paddle press feedback (mouse, touch or Space): pulls in toward the dial and darkens — no flashing (Q40 #1). */
  setPressed(down: boolean) { this.paddleEl.classList.toggle('down', down); }
  /** Redraw the dash plate at width w (stepped top-left corner, stepped curve on the top-right). */
  private setPlateWidth(w: number) {
    w = Math.round(w / 2) * 2;
    const st = 8, RC = 52, H = this.platePH, plate = this.plateFill.parentNode as Element;
    plate.setAttribute('width', String(w));
    let top = `M0 ${2 * st} H${st} V${st} H${2 * st} V0 H${w - RC}`;
    for (let a = 1; a <= 6; a++) {                                       // 6 block steps approximating a quarter circle
      const t = a / 6 * Math.PI / 2, x = w - RC + Math.sin(t) * RC, y = RC - Math.cos(t) * RC;
      top += ` V${Math.round(y)} H${Math.round(x)}`;
    }
    this.plateFill.setAttribute('d', `${top} V${H} H0 Z`);
    this.plateEdge.setAttribute('d', top);
  }
  /** Gas pedal press feedback: the pedal tips forward under your foot. */
  setGas(down: boolean) { this.pedalEl.classList.toggle('down', down); }
  /** Downshift paddle press feedback (mirror of the upshift paddle). */
  setDownPressed(down: boolean) { this.downEl.classList.toggle('down', down); }

  update() {
    const r = this.player, s = r.stats, t = this.race.t;
    // countdown lights (to be redesigned later, owner Q24)
    const lit = Math.min(3, Math.floor(t));
    this.lights.forEach((l, i) => { l.className = this.race.green ? 'green' : i < lit ? (i === 0 ? 'red' : 'amber') : ''; });
    if (r.launched) this.hint.style.display = 'none';
    if (r.launched && !this.pedalGone) { this.pedalGone = true; this.goneAt = performance.now(); this.pedalEl.classList.remove('down'); this.pedalPod.classList.add('gone'); }
    if (this.pedalGone && this.goneAt) {                                // the bay folds in once, smoothly, after the pedal has dropped
      // owner Q56: slower — the pedal rests (released) for 0.5 s, drops over 0.9 s, then the bay folds in over 0.7 s
      const k = Math.min(1, Math.max(0, (performance.now() - this.goneAt - PEDAL_EXIT.foldDelayMs) / PEDAL_EXIT.foldMs)), e = k * k * (3 - 2 * k);
      this.setPlateWidth(this.plateW.full + (this.plateW.compact - this.plateW.full) * e);
      if (k >= 1) this.goneAt = 0;
    }
    // gauge
    const frac = Math.min(1, r.rpm / (this.gaugeMax * 1000));
    const red0 = s.redline / (this.gaugeMax * 1000);
    const [z0r, z1r] = r.launched ? [s.trans.zoneCentre - s.trans.zoneWidth / 2, s.trans.zoneCentre + s.trans.zoneWidth / 2] : [LAUNCH.perfectMin, LAUNCH.perfectMax];
    const z0 = z0r * red0, z1 = z1r * red0, inZone = frac >= z0 && frac <= z1;
    const zoneKey = `${z0.toFixed(3)}`;
    this.dashes.forEach((d, i) => {
      const f = i / (N_DASH - 1), zone = f >= z0 && f <= z1, red = f >= red0, on = f <= frac + 1e-4;
      d.setAttribute('fill', red ? (on ? COL.red : COL.redOff) : zone ? (on ? COL.zone : COL.zoneOff) : (on ? COL.lit : COL.unlit));
    });
    if (zoneKey !== this.last.zone) {
      const a0 = ang(z0), a1 = ang(z1), rb = R + 10;
      this.zoneBand.setAttribute('d', `M ${CX + Math.cos(a0) * rb} ${CY - Math.sin(a0) * rb} A ${rb} ${rb} 0 0 1 ${CX + Math.cos(a1) * rb} ${CY - Math.sin(a1) * rb}`);
      this.last.zone = zoneKey;
    }
    const a = ang(frac);
    this.needle.setAttribute('x1', String(CX - Math.cos(a) * 12)); this.needle.setAttribute('y1', String(CY + Math.sin(a) * 12));
    this.needle.setAttribute('x2', String(CX + Math.cos(a) * (R - 6))); this.needle.setAttribute('y2', String(CY - Math.sin(a) * (R - 6)));
    const gear = r.launched ? String(r.gear + 1) : 'N', gearKey = gear + (inZone && r.launched ? 'z' : '');
    if (gearKey !== this.last.gear && this.skin.zonePlus) this.plusRects[1].setAttribute('fill', inZone && r.launched ? this.skin.zonePlus : this.skin.plus);   // Perfect Shift perk (Q41), steady
    if (gearKey !== this.last.gear) { blockText(this.gearG, gear, F7, 6, inZone && r.launched ? COL.zone : COL.lit, CX - 15, CY + 20, 3); this.last.gear = gearKey; }
    const mph = Math.round(r.v * 2.237);
    if (mph !== this.last.mph) { const str = String(mph), w = (str.length * 6 - 1) * 2.5; blockText(this.speedG, str, F7, 2.5, COL.lit, CX + 14 - w, CY + 74); this.last.mph = mph; }
    // race strip
    const L = this.race.distanceM, pos = (x: number) => `calc(16px + ${Math.min(1, x / L)} * (100% - 44px) - 13px)`;
    this.me.style.left = pos(r.x); this.them.style.left = pos(this.opp.x);
    if (!r.launched) this.gapEl.textContent = `You vs ${this.oppName}, ${L} m`;
    else {
      const dx = r.x - this.opp.x, v = Math.max(5, (r.v + this.opp.v) / 2), sec = Math.abs(dx) / v;
      this.gapEl.innerHTML = dx >= 0 ? `${this.oppName} is <span class="good">${sec.toFixed(2)} s</span> behind you` : `${this.oppName} is <span class="bad">${sec.toFixed(2)} s</span> ahead`;
    }
    // grade (steady, fades out — never flashes) and countdown
    const ev = r.lastEvent;
    let grade = '';
    if (ev && t - ev.t < 0.9) grade = (/launch|Bog|Downshift|Over-rev/i.test(ev.text) ? ev.text : `${ev.text} shift`).toUpperCase();
    else if (this.race.green && !r.launched) grade = 'GO!';
    if (grade !== this.last.grade) {
      const col = /PERFECT|GO!/.test(grade) ? COL.zone : /GOOD/.test(grade) ? '#5aa9ff' : /DOWNSHIFT/.test(grade) ? COL.lit : '#f2a43a';
      const w = blockText(this.gradeG, grade.replace(/[^A-Z0-9! -]/g, ''), F5, 6, col, 0, 6, 3);
      this.gradeG.setAttribute('transform', `translate(${(520 - w) / 2} 0)`); this.last.grade = grade;
    }
    let count = '';
    if (!this.race.green && t > 0.2) count = String(Math.max(1, Math.ceil(COUNTDOWN - t)));
    if (count !== this.last.count) { const w = count ? blockText(this.countG, count, F7, 18, COL.lit, 0, 0, 8) : (this.countG.innerHTML = '', 0); this.countG.setAttribute('transform', `translate(${(200 - w) / 2} 0)`); this.last.count = count; }
  }
}

/** Arc paddle: a ring segment concentric with the dial, its inner edge tucked behind the gauge. Flat top/bottom ends so the
 *  outline steps evenly (Q40 #6). */
function arcPaddle(k: PaddleSkin, cell: number, mirror = false, sym: '+' | '-' = '+') {
  const Ri = D / 2 - 26, Ro = D / 2 + 46, YM = Ro * Math.sin(40 * Math.PI / 180);
  const x0 = Math.floor(Ri * Math.cos(Math.asin(Math.min(1, YM / Ri))) / cell) - 1, x1 = Math.ceil(Ro / cell), y0 = -Math.ceil(YM / cell), y1 = -y0;
  const W = x1 - x0, H = y1 - y0;
  const inside = (c: number, r: number) => { if (c < 0 || r < 0 || c >= W || r >= H) return false; const x = (c + x0 + 0.5) * cell, y = (r + y0 + 0.5) * cell, rr = Math.hypot(x, y); return rr >= Ri && rr <= Ro && Math.abs(y) <= YM; };
  const vis = (D / 2 + 8 + Ro) / 2;                                           // "+" centred on the visible band (past the rim's shadow)
  const out = drawPaddle(k, cell, W, H, inside, vis - x0 * cell, -y0 * cell, -x0 * cell, -y0 * cell, mirror, sym);
  return { ...out, ox: x0 * cell, oy: y0 * cell };
}
/** Tab paddle: an upright rounded paddle, its left part tucked behind the gauge. */
function tabPaddle(k: PaddleSkin, cell: number, mirror = false, sym: '+' | '-' = '+') {
  const W = 22, H = 40, x0 = Math.floor((D / 2 - 34) / cell), y0 = -H / 2;
  const inside = (c: number, r: number) => {
    const rx = c + 0.5 - W / 2, ry = r + 0.5 - H / 2, R = 6, ax = Math.abs(rx) - (W / 2 - R), ay = Math.abs(ry) - (H / 2 - R);
    return c >= 0 && r >= 0 && c < W && r < H && (ax <= 0 || ay <= 0 || ax * ax + ay * ay <= R * R);
  };
  const visCx = ((D / 2 + 8 - x0 * cell) + W * cell) / 2;                     // centre of the part not hidden by the dial
  const out = drawPaddle(k, cell, W, H, inside, visCx, H * cell / 2, -x0 * cell, H * cell / 2, mirror, sym);
  return { ...out, ox: x0 * cell, oy: y0 * cell };
}
/** Draw a paddle ("+" up or "−" down) with bevel lighting, a one-block shadow where it slides under the dial's rim (Q40 #4), optional skin
 *  stripes, and the engraved "+" on a finer half-block grid so it stays small and crisp. (gx, gy) = gauge centre in paddle px. */
function drawPaddle(k: PaddleSkin, cell: number, W: number, H: number, inside0: (c: number, r: number) => boolean, plusX: number, plusY: number, gx: number, gy: number, mirror = false, sym: '+' | '-' = '+') {
  const p = svgEl('svg', { width: W * cell, height: H * cell }) as SVGElement;
  // mirrored (left, downshift) paddle: flip the mask, not the drawing, so the bevel stays lit from the top-left like everything else
  const inside = mirror ? (c: number, r: number) => inside0(W - 1 - c, r) : inside0;
  if (mirror) { plusX = W * cell - plusX; gx = W * cell - gx; }
  const rim = D / 2 - 6, pc = Math.floor(plusX / cell), pr = Math.floor(plusY / cell);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!inside(c, r)) continue;
    let fill = k.face[(r + c) & 1];
    if (k.stripe && (c === pc - 3 || c === pc + 3) && Math.abs(r - pr) > 4) fill = k.stripe;   // two stripes, broken around the "+"
    if (!inside(c, r - 1) || !inside(c - 1, r)) fill = k.light;
    if (!inside(c + 1, r) || !inside(c, r + 1)) fill = k.dark;
    svgEl('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill }, p);
    const d = Math.hypot((c + 0.5) * cell - gx - 3, (r + 0.5) * cell - gy - 5);
    if (d >= rim && d < rim + cell * 1.25) svgEl('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill: '#000', 'fill-opacity': 0.55 }, p);
  }
  const hc = cell / 2, L = 5, T = 1;                                          // arms ±5 half-blocks, 3 half-blocks thick
  const px = Math.round(plusX / hc) * hc, py = Math.round(plusY / hc) * hc;
  const plus: Element[] = [];
  for (const [dx, dy] of [[1, 2], [0, 0]]) {
    const g = svgEl('g', { fill: dx ? k.plusShade : k.plus }, p); plus.push(g);
    svgEl('rect', { x: px - L * hc - hc / 2 + dx, y: py - T * hc - hc / 2 + dy, width: (2 * L + 1) * hc, height: (2 * T + 1) * hc }, g);
    if (sym === '+') svgEl('rect', { x: px - T * hc - hc / 2 + dx, y: py - L * hc - hc / 2 + dy, width: (2 * T + 1) * hc, height: (2 * L + 1) * hc }, g);
  }
  return { svg: p, plus };
}

/** Gas pedal art (owner: launch control). Three looks to choose from:
 *  alloy  = drilled aluminium race pedal; rubber = ribbed rubber pad in a metal frame; skin = matches the paddle skin. */
function drawPedal(style: PedalStyle, k: PaddleSkin, cell: number): SVGElement {
  const W = 15, H = 30, HB = 3;                                      // pedal face + hinge block below it
  const p = svgEl('svg', { width: W * cell, height: (H + HB) * cell }) as SVGElement;
  const R = 3;
  const inside = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= W || r >= H) return false;
    const ax = Math.abs(c + 0.5 - W / 2) - (W / 2 - R), ay = (r + 0.5) - R;      // rounded top corners only
    return ax <= 0 || ay >= 0 || ax * ax + ay * ay <= R * R;
  };
  const pal = style === 'alloy' ? { face: ['#b9bfc7', '#b1b7bf'], light: '#e8ecf0', dark: '#666c75', mark: '#2b2e36' }
    : style === 'rubber' ? { face: ['#26282d', '#26282d'], light: '#9aa1ab', dark: '#5d636c', mark: '#383b42' }
    : { face: k.face, light: k.light, dark: k.dark, mark: k.dark };
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!inside(c, r)) continue;
    let fill = pal.face[(r + c) & 1];
    const edge = !inside(c, r - 1) || !inside(c - 1, r), edgeD = !inside(c + 1, r) || !inside(c, r + 1);
    if (style === 'alloy' && !edge && !edgeD && r > 1 && r < H - 2 && (r % 3 === 1) && ((c >= 2 && c <= 5) || (c >= 9 && c <= 12))) fill = pal.mark;      // drilled slots
    if (style === 'rubber' && !edge && !edgeD && c > 1 && c < W - 2 && r > 1 && r < H - 2 && (r & 1)) fill = pal.mark;                            // rubber ribs
    if (style === 'skin' && !edge && !edgeD && c > 2 && c < W - 3 && r > 2 && r < H - 3 && (r % 4 === 2)) fill = pal.mark;                         // grip slots
    if (edge) fill = pal.light;
    if (edgeD) fill = pal.dark;
    svgEl('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill }, p);
  }
  // hinge block + pivot pin
  svgEl('rect', { x: 2 * cell, y: H * cell, width: (W - 4) * cell, height: HB * cell, fill: '#2b2e36' }, p);
  svgEl('rect', { x: 2 * cell, y: H * cell, width: (W - 4) * cell, height: cell, fill: '#4a4f5c' }, p);
  svgEl('rect', { x: (W / 2 - 1) * cell, y: (H + 1) * cell, width: 2 * cell, height: cell, fill: '#8a919b' }, p);
  return p;
}

/** A label with a picture of the key to press (owner): small caps text above an off-white keycap. cx = centre x. */
function keyLabel(text: string, key: string, cx: number, top: number) {
  const kw = key.length > 4 ? 58 : 46;
  return `<div class="keylabel" style="left:${Math.round(cx - 50)}px;top:${top}px"><span>${text}</span><i style="width:${kw}px">${key}</i></div>`;
}
