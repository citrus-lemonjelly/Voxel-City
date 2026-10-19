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

// The Garage HUD lives in ui/garage.ts (owner, 2026-10-18).

// ---------------- Results (R13) ----------------
export interface ResultData { won: boolean; myTime: number; oppTime: number; oppName: string; launch: string; shifts: string[]; earnings: [string, number][]; total: number; newBest: boolean; /** e.g. Strip rung line */ note?: string }
export function renderResults(root: HTMLElement, d: ResultData, on: { again(): void; garage(): void }, againLabel = 'Race again') {
  root.innerHTML = '';
  const margin = Math.abs(d.myTime - d.oppTime);
  const el = h(`<div id="results" class="blk">
    <div class="row"><h1 class="hd ${d.won ? 'win' : 'loss'}">${d.won ? 'You win' : 'You lose'}</h1><span class="hd" style="color:var(--dim)">${d.won ? 'by' : 'behind by'} ${margin.toFixed(3)} s</span></div>
    ${d.note ? `<div class="res-note">${d.note}</div>` : ''}
    <div class="times">
      <div class="stat"><b>${fmtTime(d.myTime)}</b><span>Your time${d.newBest ? ' · <b style="color:var(--accent);display:inline;font-size:12px">NEW BEST</b>' : ''}</span></div>
      <div class="stat"><b>${fmtTime(d.oppTime)}</b><span>${d.oppName}</span></div>
    </div>
    <div><div class="hd" style="font-size:13px;color:var(--dim);margin-bottom:6px">Launch &amp; shifts</div>
      <div class="chips"><span class="chip ${d.launch}">Launch: ${d.launch}</span>${d.shifts.map((g, i) => `<span class="chip ${g}">${i + 1}→${i + 2}: ${g}</span>`).join('')}</div></div>
    <div class="earn">${d.earnings.map(([k, v]) => `<span>${k}</span><span>+${v} VX</span>`).join('')}<span class="total">Total</span><span class="total">+${d.total} VX</span></div>
    <div class="row"><button class="btn" id="again">${againLabel}</button><button class="btn ghost" id="toGarage">Garage</button></div>
  </div>`);
  root.appendChild(el);
  el.querySelector('#again')!.addEventListener('click', on.again);
  el.querySelector('#toGarage')!.addEventListener('click', on.garage);   // not id="garage": that id is the Garage HUD's full-screen layer
}
