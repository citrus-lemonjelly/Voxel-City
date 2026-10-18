// The three Step 1 screens as plain DOM overlays: Garage Terminal, race HUD, results.
import { SaveV1 } from '../save/save';
import { ENGINE, TRANSMISSION, TIERS, Tier, LAUNCH } from '../data/parts';
import { CARS, carBrand, carName } from '../data/cars';
import { DEV } from './devConsole';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { carStats, displayStats } from '../game/stats';
import { Race, Racer, COUNTDOWN } from '../game/race';

const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
export const fmtTime = (s: number) => s.toFixed(3) + ' s';

// ---------------- Garage Terminal (G7; static garage screen for M1) ----------------
export interface GarageHandlers { onBuyOrEquip(kind: 'engine' | 'trans', tier: Tier): void; onRace(): void; onSetting(key: string, value: string): void }
const SETTING_ROWS: [string, string, [string, string][]][] = [
  ['camera', 'Race camera', [['dynamic', 'Dynamic'], ['close', 'Dynamic close']]],
  ['time', 'Time of day', [['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']]],
  ['nearSide', 'Near side', [['mixed', 'Mixed'], ['curb', 'Curb'], ['barrier', 'Barrier']]],
  ['blur', 'Speed blur', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']]],
];
export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  const car = CARS[save.carId];
  const st = displayStats(carStats(save.carId, save.equipped.engine, save.equipped.trans));
  const tierBtn = (kind: 'engine' | 'trans', t: Tier) => {
    const table = kind === 'engine' ? ENGINE.D : TRANSMISSION.D;
    const def = table[t - 1];
    const owned = save.owned[kind].includes(t), eq = save.equipped[kind] === t;
    const afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    const sub = eq ? 'Equipped' : owned ? 'Equip' : `${def.price.toLocaleString()} VX`;
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${def.label}"><b>T${t}</b>${sub}</button>`;
  };
  const eqE = ENGINE.D[save.equipped.engine - 1], eqT = TRANSMISSION.D[save.equipped.trans - 1];
  root.innerHTML = '';
  const el = h(`
  <div id="terminal" class="blk">
    <div class="row"><span class="hd screen-title">Garage Terminal</span><span class="voxels">${DEV.unlimited ? '∞' : save.voxels.toLocaleString()} VX</span></div>
    <div><div class="hd screen-title">${carBrand(save.carId)} · League ${car.league}</div><h1 class="hd">${carName(save.carId)}</h1></div>
    <div class="stats">
      <div class="stat"><b>${st.hp}</b><span>horsepower</span></div>
      <div class="stat"><b>${st.shifts}</b><span>shifts</span></div>
      <div class="stat"><b>${st.shiftTime.toFixed(2)}s</b><span>shift time</span></div>
      <div class="stat"><b>${(st.redline / 1000).toFixed(1)}k</b><span>redline</span></div>
    </div>
    <div class="upg"><h3 class="hd">Engine</h3><div class="desc">${eqE.label} — +${Math.round((eqE.hpMult - 1) * 100)}% power</div><div class="tiers">${TIERS.map(t => tierBtn('engine', t)).join('')}</div></div>
    <div class="upg"><h3 class="hd">Transmission</h3><div class="desc">${eqT.label} — ${eqT.ratios.length} gears, ${eqT.shiftTime.toFixed(2)} s shifts, ${Math.round(eqT.zoneWidth * 100)}% shift zone</div><div class="tiers">${TIERS.map(t => tierBtn('trans', t)).join('')}</div></div>
    <div class="next"><b>Next race:</b> ${opp.name} · ${carBrand(opp.carId)} ${carName(opp.carId)} · ${stage.name} (${stage.distanceM} m)<br>
      <span style="color:var(--dim)">Best ${save.bestTime ? fmtTime(save.bestTime) : '—'} · Record ${save.wins}–${save.races - save.wins}</span></div>
    <div class="settings"><h3 class="hd">Settings</h3>${SETTING_ROWS.map(([key, label, opts]) => `<div class="setrow"><span>${label}</span><div class="seg">${opts.map(([v, t]) => `<button class="${(save.settings as any)[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="spacer"></div>
    <button class="btn race" id="raceBtn">Race ▸</button>
    <div style="font-size:12px;color:var(--dim)">Hold <b>SPACE</b> (or the gas pedal) to rev · release on <b style="color:var(--good)">green</b> to launch · <b>SPACE</b> shifts up in the green zone · <b>SHIFT</b> shifts down</div>
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));
  el.querySelectorAll<HTMLButtonElement>('.tier').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as any, +b.dataset.tier! as Tier)));
  el.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b => b.addEventListener('click', () => on.onSetting(b.dataset.set!, b.dataset.val!)));
  el.querySelector('#raceBtn')!.addEventListener('click', on.onRace);
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
