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

// ---------------- Drift results (owner, V0.18.0) ----------------
export interface DriftResultData { won: boolean; score: number; rival: number; rivalName: string; course: string; turns: string[]; perfect: number; spins: number; bestChain: number; earnings: [string, number][]; total: number; newBest: boolean; best: number }
const TURN_CHIP: Record<string, string> = { Clean: 'Perfect', Linked: 'Perfect', Short: 'Early', Spin: 'Wheelspin', Missed: 'Late', '': 'Late' };
export function renderDriftResults(root: HTMLElement, d: DriftResultData, on: { again(): void; garage(): void }) {
  root.innerHTML = '';
  const el = h(`<div id="results" class="blk">
    <div class="row"><h1 class="hd ${d.won ? 'win' : 'loss'}">${d.won ? 'You win' : 'You lose'}</h1><span class="hd" style="color:var(--dim)">${d.won ? 'by' : 'behind by'} ${Math.abs(d.score - d.rival).toLocaleString()} pts</span></div>
    <div class="res-note">Drift · ${d.course}</div>
    <div class="times">
      <div class="stat"><b>${d.score.toLocaleString()}</b><span>Your score${d.newBest ? ' · <b style="color:var(--accent);display:inline;font-size:12px">NEW BEST</b>' : ` · best ${d.best.toLocaleString()}`}</span></div>
      <div class="stat"><b>${d.rival.toLocaleString()}</b><span>${d.rivalName} (ghost)</span></div>
    </div>
    <div><div class="hd" style="font-size:13px;color:var(--dim);margin-bottom:6px">Turns · ${d.perfect} Perfect entries · best chain ×${(1 + Math.min(d.bestChain, 8) * 0.25).toFixed(2).replace(/\.?0+$/, '')}${d.spins ? ` · ${d.spins} spin${d.spins > 1 ? 's' : ''}` : ''}</div>
      <div class="chips">${d.turns.map((g, i) => `<span class="chip ${TURN_CHIP[g] ?? 'Late'}">${i + 1}: ${g || 'Missed'}</span>`).join('')}</div></div>
    <div class="earn">${d.earnings.map(([k, v]) => `<span>${k}</span><span>+${v} VX</span>`).join('')}<span class="total">Total</span><span class="total">+${d.total} VX</span></div>
    <div class="row"><button class="btn" id="again">Drift again</button><button class="btn ghost" id="toGarage">Garage</button></div>
  </div>`);
  root.appendChild(el);
  el.querySelector('#again')!.addEventListener('click', on.again);
  el.querySelector('#toGarage')!.addEventListener('click', on.garage);
}

// ---------------- Results (R13) ----------------
export interface ResultData { won: boolean; myTime: number; oppTime: number; oppName: string; /** car ratings (Build & Tune) */ ratings?: { me: number; them: number }; launch: string; shifts: string[]; earnings: [string, number][]; total: number; newBest: boolean; /** e.g. Strip rung line */ note?: string }
export function renderResults(root: HTMLElement, d: ResultData, on: { again(): void; garage(): void }, againLabel = 'Race again') {
  root.innerHTML = '';
  const margin = Math.abs(d.myTime - d.oppTime);
  const el = h(`<div id="results" class="blk">
    <div class="row"><h1 class="hd ${d.won ? 'win' : 'loss'}">${d.won ? 'You win' : 'You lose'}</h1><span class="hd" style="color:var(--dim)">${d.won ? 'by' : 'behind by'} ${margin.toFixed(3)} s</span></div>
    ${d.note ? `<div class="res-note">${d.note}</div>` : ''}
    <div class="times">
      <div class="stat"><b>${fmtTime(d.myTime)}</b><span>Your time${d.ratings ? ` · PP ${d.ratings.me}` : ''}${d.newBest ? ' · <b style="color:var(--accent);display:inline;font-size:12px">NEW BEST</b>' : ''}</span></div>
      <div class="stat"><b>${fmtTime(d.oppTime)}</b><span>${d.oppName}${d.ratings ? ` · PP ${d.ratings.them}` : ''}</span></div>
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
