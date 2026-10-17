// The three Step 1 screens as plain DOM overlays: Garage Terminal, race HUD, results.
import { SaveV1 } from '../save/save';
import { ENGINE, TRANSMISSION, TIERS, Tier, LAUNCH } from '../data/parts';
import { CARS } from '../data/cars';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { carStats, displayStats } from '../game/stats';
import { Race, Racer, COUNTDOWN } from '../game/race';

const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
export const fmtTime = (s: number) => s.toFixed(3) + ' s';

// ---------------- Garage Terminal (G7; static garage screen for M1) ----------------
export interface GarageHandlers { onBuyOrEquip(kind: 'engine' | 'trans', tier: Tier): void; onRace(): void }
export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  const car = CARS[save.carId];
  const st = displayStats(carStats(save.carId, save.equipped.engine, save.equipped.trans));
  const tierBtn = (kind: 'engine' | 'trans', t: Tier) => {
    const table = kind === 'engine' ? ENGINE.D : TRANSMISSION.D;
    const def = table[t - 1];
    const owned = save.owned[kind].includes(t), eq = save.equipped[kind] === t;
    const afford = save.voxels >= def.price;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    const sub = eq ? 'Equipped' : owned ? 'Equip' : `${def.price.toLocaleString()} VX`;
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${def.label}"><b>T${t}</b>${sub}</button>`;
  };
  const eqE = ENGINE.D[save.equipped.engine - 1], eqT = TRANSMISSION.D[save.equipped.trans - 1];
  root.innerHTML = '';
  const el = h(`
  <div id="terminal" class="blk">
    <div class="row"><span class="hd screen-title">Garage Terminal</span><span class="voxels">${save.voxels.toLocaleString()} VX</span></div>
    <div><div class="hd screen-title">${car.brand} · League ${car.league}</div><h1 class="hd">${car.name}</h1></div>
    <div class="stats">
      <div class="stat"><b>${st.hp}</b><span>horsepower</span></div>
      <div class="stat"><b>${st.shifts}</b><span>shifts</span></div>
      <div class="stat"><b>${st.shiftTime.toFixed(2)}s</b><span>shift time</span></div>
      <div class="stat"><b>${(st.redline / 1000).toFixed(1)}k</b><span>redline</span></div>
    </div>
    <div class="upg"><h3 class="hd">Engine</h3><div class="desc">${eqE.label} — +${Math.round((eqE.hpMult - 1) * 100)}% power</div><div class="tiers">${TIERS.map(t => tierBtn('engine', t)).join('')}</div></div>
    <div class="upg"><h3 class="hd">Transmission</h3><div class="desc">${eqT.label} — ${eqT.ratios.length} gears, ${eqT.shiftTime.toFixed(2)} s shifts, ${Math.round(eqT.zoneWidth * 100)}% shift zone</div><div class="tiers">${TIERS.map(t => tierBtn('trans', t)).join('')}</div></div>
    <div class="next"><b>Next race:</b> ${opp.name} · ${CARS[opp.carId].brand} ${CARS[opp.carId].name} · ${stage.name} (${stage.distanceM} m)<br>
      <span style="color:var(--dim)">Best ${save.bestTime ? fmtTime(save.bestTime) : '—'} · Record ${save.wins}–${save.races - save.wins}</span></div>
    <div class="spacer"></div>
    <button class="btn race" id="raceBtn">Race ▸</button>
    <div style="font-size:12px;color:var(--dim)">Hold <b>SPACE</b> (or the Shift button) to rev · release on <b style="color:var(--good)">green</b> to launch · tap to shift in the green zone</div>
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));
  el.querySelectorAll<HTMLButtonElement>('.tier').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as any, +b.dataset.tier! as Tier)));
  el.querySelector('#raceBtn')!.addEventListener('click', on.onRace);
}

// ---------------- Race HUD (R10: tach with shift zone, gear, grades; R8: on-screen Shift button) ----------------
export class Hud {
  el: HTMLElement;
  private segs: HTMLElement[];
  private lights: HTMLElement[];
  private gradeEl: HTMLElement; private hint: HTMLElement; private gear: HTMLElement; private speed: HTMLElement;
  private me: HTMLElement; private them: HTMLElement;
  shiftBtn: HTMLButtonElement;
  constructor(root: HTMLElement, private race: Race, private player: Racer, private opp: Racer) {
    root.innerHTML = '';
    this.el = h(`<div class="overlay">
      <div id="progress" class="blk"><div class="row"><span class="hd">You</span><span class="hd">${race.distanceM} m</span></div><div class="track"><i class="me"></i><i class="them"></i></div></div>
      <div id="lights" class="blk"><i></i><i></i><i></i></div>
      <div id="hint" class="blk">Hold <b>SPACE</b> to rev · keep the needle in the <b style="color:var(--good)">green</b> · release on GO</div>
      <div id="grade" class="hd"></div>
      <div id="tach" class="blk"><div class="segs">${'<i></i>'.repeat(40)}</div><div class="lbl"><span>RPM</span><span id="tachNote">Launch zone</span></div></div>
      <div id="gearbox" class="blk"><b>N</b><span>0 mph</span></div>
      <button id="shiftBtn" class="btn">Shift</button>
    </div>`);
    root.appendChild(this.el);
    this.segs = [...this.el.querySelectorAll<HTMLElement>('#tach .segs i')];
    this.lights = [...this.el.querySelectorAll<HTMLElement>('#lights i')];
    this.gradeEl = this.el.querySelector('#grade')!; this.hint = this.el.querySelector('#hint')!;
    this.gear = this.el.querySelector('#gearbox b')!; this.speed = this.el.querySelector('#gearbox span')!;
    this.me = this.el.querySelector('.me')!; this.them = this.el.querySelector('.them')!;
    this.shiftBtn = this.el.querySelector('#shiftBtn')!;
  }
  update() {
    const r = this.player, s = r.stats, t = this.race.t;
    // countdown lights: red, amber, amber… green at COUNTDOWN
    const lit = Math.min(3, Math.floor(t));
    this.lights.forEach((l, i) => { l.className = this.race.green ? 'green' : i < lit ? (i === 0 ? 'red' : 'amber') : ''; });
    if (r.launched) this.hint.style.display = 'none';
    // tach: launch zone before launch, shift zone after
    const frac = Math.min(1, r.rpm / s.redline);
    const [z0, z1] = r.launched ? [s.trans.zoneCentre - s.trans.zoneWidth / 2, s.trans.zoneCentre + s.trans.zoneWidth / 2] : [LAUNCH.perfectMin, LAUNCH.perfectMax];
    this.segs.forEach((seg, i) => {
      const a = i / 40, b = (i + 1) / 40;
      const zone = b > z0 && a < z1, red = a >= 0.97;
      seg.className = (frac >= b - 0.0001 ? 'on ' : '') + (zone ? 'zone' : red ? 'red' : '');
    });
    (this.el.querySelector('#tachNote') as HTMLElement).textContent = r.launched ? 'Shift zone' : 'Launch zone';
    this.gear.textContent = r.launched ? String(r.gear + 1) : 'N';
    this.speed.textContent = Math.round(r.v * 2.237) + ' mph';
    const L = this.race.distanceM;
    this.me.style.left = `calc(${Math.min(1, r.x / L) * 100}% - 4px)`; this.them.style.left = `calc(${Math.min(1, this.opp.x / L) * 100}% - 4px)`;
    const ev = r.lastEvent;
    if (ev && t - ev.t < 0.9) {
      this.gradeEl.style.opacity = '1'; this.gradeEl.textContent = ev.text;
      this.gradeEl.style.color = /Perfect/.test(ev.text) ? 'var(--good)' : /Good/.test(ev.text) ? 'var(--blue)' : 'var(--amber)';
    } else if (!this.race.green && t > 0.2) { this.gradeEl.style.opacity = '1'; this.gradeEl.style.color = 'var(--text)'; this.gradeEl.textContent = String(Math.max(1, Math.ceil(COUNTDOWN - t))); }
    else if (this.race.green && !r.launched) { this.gradeEl.style.opacity = '1'; this.gradeEl.style.color = 'var(--good)'; this.gradeEl.textContent = 'GO!'; }
    else this.gradeEl.style.opacity = '0';
  }
}

// ---------------- Results (R13) ----------------
export interface ResultData { won: boolean; myTime: number; oppTime: number; oppName: string; launch: string; shifts: string[]; earnings: [string, number][]; total: number; newBest: boolean }
export function renderResults(root: HTMLElement, d: ResultData, on: { again(): void; garage(): void }) {
  root.innerHTML = '';
  const margin = Math.abs(d.myTime - d.oppTime);
  const el = h(`<div id="results" class="blk">
    <div class="row"><h1 class="hd ${d.won ? 'win' : 'loss'}">${d.won ? 'You win' : 'You lose'}</h1><span class="hd" style="color:var(--dim)">${d.won ? 'by' : 'behind by'} ${margin.toFixed(3)} s</span></div>
    <div class="times">
      <div class="stat"><b>${fmtTime(d.myTime)}</b><span>Your time${d.newBest ? ' · <b style="color:var(--accent);display:inline;font-size:12px">NEW BEST</b>' : ''}</span></div>
      <div class="stat"><b>${fmtTime(d.oppTime)}</b><span>${d.oppName}</span></div>
    </div>
    <div><div class="hd" style="font-size:13px;color:var(--dim);margin-bottom:6px">Launch &amp; shifts</div>
      <div class="chips"><span class="chip ${d.launch}">Launch: ${d.launch}</span>${d.shifts.map((g, i) => `<span class="chip ${g}">${i + 1}→${i + 2}: ${g}</span>`).join('')}</div></div>
    <div class="earn">${d.earnings.map(([k, v]) => `<span>${k}</span><span>+${v} VX</span>`).join('')}<span class="total">Total</span><span class="total">+${d.total} VX</span></div>
    <div class="row"><button class="btn" id="again">Race again</button><button class="btn ghost" id="garage">Garage</button></div>
  </div>`);
  root.appendChild(el);
  el.querySelector('#again')!.addEventListener('click', on.again);
  el.querySelector('#garage')!.addEventListener('click', on.garage);
}
