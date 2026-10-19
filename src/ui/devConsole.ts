// Local test console (owner Q58). Stand-in for the owner's admin console until player accounts exist (P8): it only
// changes THIS browser's local save, so it grants nothing anywhere else. The real admin role will be checked by the
// server against the owner's account.
// Turn on: open the game once with ?dev in the address (stays on in this browser). Open/close: the ` key, or the DEV tag.
import { SaveV1, addCar, freshCar } from '../save/save';
import { CARS, STARTER_CAR } from '../data/cars';
import { VISUAL_PARTS } from '../data/visualParts';
import { ENGINE, TRANSMISSION, Tier } from '../data/parts';
import { PADDLES, PADDLE_SHAPES, PEDALS, PaddleShape, PedalStyle } from '../data/cosmetics';
import { Race } from '../game/race';

const KEY = 'voxelcity.dev';
export interface DevState { enabled: boolean; unlimited: boolean; debug: boolean; autoDrive: boolean; opp: 'normal' | 'perfect' | 'sloppy' }
const DEFAULTS: DevState = { enabled: false, unlimited: false, debug: false, autoDrive: false, opp: 'normal' };
/** Live dev flags (read by the garage, the race setup and the purchase code). */
export const DEV: DevState = (() => {
  let s: DevState = { ...DEFAULTS };
  try { const raw = localStorage.getItem(KEY); if (raw) s = { ...s, ...JSON.parse(raw) }; } catch { /* storage blocked */ }
  return s;
})();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(DEV)); } catch { /* storage blocked */ } };

export interface DevHooks {
  save(): SaveV1;
  write(): void;
  /** Re-draw the current screen after a change (garage refresh). */
  refresh(msg?: string): void;
  resetSave(): void;
  race(): Race | null;
  screen(): string;
}

/** Opponent skill override for test races (null = the opponent's own skill). */
export const devOppSkill = (): number | null => DEV.enabled ? (DEV.opp === 'perfect' ? 1 : DEV.opp === 'sloppy' ? 0.3 : null) : null;

export function initDevConsole(hooks: DevHooks, urlHasDev: boolean) {
  if (urlHasDev && !DEV.enabled) { DEV.enabled = true; persist(); }
  if (!DEV.enabled) return { tick() {} };

  const tag = document.createElement('button');
  tag.className = 'dev-tag'; tag.textContent = 'DEV'; tag.title = 'Test console (` key)';
  const panel = document.createElement('div'); panel.className = 'dev-panel blk'; panel.hidden = true;
  const readout = document.createElement('div'); readout.className = 'dev-readout'; readout.hidden = true;
  document.body.append(tag, panel, readout);
  let wipeArmed = false;

  const btn = (id: string, label: string, on = false) => `<button class="dev-b${on ? ' on' : ''}" data-a="${id}">${label}</button>`;
  const sel = (id: string, opts: [string, string][], cur: string) => `<select data-s="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  function render() {
    const s = hooks.save();
    panel.innerHTML = `
      <div class="dev-h hd">Test console <span>local save only</span></div>
      <div class="dev-sec"><b>Voxels</b> <span class="dev-v">${DEV.unlimited ? '∞ (free purchases)' : s.voxels.toLocaleString() + ' VX'}</span><div>
        ${btn('vx1k', '+1,000')}${btn('vx10k', '+10,000')}${btn('vx100k', '+100,000')}${btn('vx0', 'Set 0')}${btn('unl', 'Unlimited (VX + Crowns)', DEV.unlimited)}</div></div>
      <div class="dev-sec"><b>Crowns</b> <span class="dev-v">${DEV.unlimited ? '∞' : s.crowns.toLocaleString()}</span><div>${btn('cr100', '+100')}${btn('cr1k', '+1,000')}${btn('cr0', 'Set 0')}</div></div>
      <div class="dev-sec"><b>Unlock</b><div>${btn('cars', 'All cars')}${btn('parts', 'All parts (every owned car)')}${btn('cosm', 'All cosmetics + visual parts')}${btn('relock', 'Re-lock to stock (starter car only)')}</div></div>
      <div class="dev-sec"><b>Equip</b><div class="dev-row">
        <label>Paddle skin ${sel('skin', Object.values(PADDLES).map(p => [p.id, p.name]), s.paddles.equipped)}</label>
        <label>Paddle shape ${sel('shape', Object.values(PADDLE_SHAPES).map(p => [p.id, p.name]), s.paddles.shape)}</label>
        <label>Gas pedal ${sel('pedal', Object.values(PEDALS).map(p => [p.id, p.name]), s.pedals.equipped)}</label></div></div>
      <div class="dev-sec"><b>Progress</b> <span class="dev-v">races ${s.races} · wins ${s.wins} · perfect shifts ${s.perfectShifts}</span><div>
        ${btn('races0', 'Races = 0 (labels back)')}${btn('perf100', 'Perfect shifts = 100')}${btn('wins25', 'Wins +25')}</div></div>
      <div class="dev-sec"><b>The Strip</b> <span class="dev-v">${Object.entries(s.strip).map(([l, n]) => `${l} ${n}`).join(' · ')}</span><div>${btn('strip10', '+10 levels (this car\'s league)')}</div></div>
      <div class="dev-sec"><b>Race</b><div>
        ${btn('auto', 'Auto-drive my car', DEV.autoDrive)}${btn('dbg', 'Debug readout', DEV.debug)}</div><div>
        Opponent: ${btn('oppN', 'Normal', DEV.opp === 'normal')}${btn('oppP', 'Perfect', DEV.opp === 'perfect')}${btn('oppS', 'Sloppy', DEV.opp === 'sloppy')}</div></div>
      <div class="dev-sec"><b>Save</b><div>${btn('wipe', wipeArmed ? 'Click again to wipe the save' : 'Reset save', wipeArmed)}${btn('off', 'Turn dev mode off')}</div></div>`;
  }
  const toggle = (show = panel.hidden) => { panel.hidden = !show; if (show) { wipeArmed = false; render(); } };
  tag.addEventListener('click', () => toggle());
  window.addEventListener('keydown', e => { if (e.code === 'Backquote') { e.preventDefault(); toggle(); } });

  panel.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement, s = hooks.save(), v = t.value;
    if (t.dataset.s === 'skin') { if (!s.paddles.owned.includes(v)) s.paddles.owned.push(v); s.paddles.equipped = v; }
    if (t.dataset.s === 'shape') { if (!s.paddles.shapes.includes(v as PaddleShape)) s.paddles.shapes.push(v as PaddleShape); s.paddles.shape = v as PaddleShape; }
    if (t.dataset.s === 'pedal') { if (!s.pedals.owned.includes(v as PedalStyle)) s.pedals.owned.push(v as PedalStyle); s.pedals.equipped = v as PedalStyle; }
    hooks.write(); hooks.refresh('Equipped (shows next race)'); render();
  });
  panel.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a; if (!a) return;
    const s = hooks.save(); let msg = '';
    const all: Tier[] = [1, 2, 3, 4, 5];
    switch (a) {
      case 'vx1k': s.voxels += 1000; break;
      case 'vx10k': s.voxels += 10000; break;
      case 'vx100k': s.voxels += 100000; break;
      case 'vx0': s.voxels = 0; break;
      case 'cr100': s.crowns += 100; break;
      case 'cr1k': s.crowns += 1000; break;
      case 'cr0': s.crowns = 0; break;
      case 'unl': DEV.unlimited = !DEV.unlimited; msg = DEV.unlimited ? 'Unlimited voxels on' : 'Unlimited voxels off'; break;
      case 'cars': Object.keys(CARS).forEach(id => addCar(s, id)); msg = 'All cars unlocked (Catalog → Use this car)'; break;
      case 'parts': {
        const eng = all.filter(t => ENGINE.D[t - 1]), tr = all.filter(t => TRANSMISSION.D[t - 1]);
        for (const c of Object.values(s.cars)) c.owned = { engine: [...eng], trans: [...tr] };
        s.owned.engine = [...eng]; s.owned.trans = [...tr]; msg = 'All parts unlocked'; break;
      }
      case 'cosm': s.partsOwned = VISUAL_PARTS.map(p => p.id); s.paddles.owned = Object.keys(PADDLES); s.paddles.shapes = Object.keys(PADDLE_SHAPES) as PaddleShape[]; s.pedals.owned = Object.keys(PEDALS) as PedalStyle[]; msg = 'All cosmetics unlocked'; break;
      case 'relock': s.partsOwned = []; s.carId = STARTER_CAR; s.cars = { [STARTER_CAR]: freshCar() }; s.owned = { engine: [1], trans: [1] }; s.equipped = { engine: 1, trans: 1 }; s.paddles = { owned: ['stock'], equipped: 'stock', shapes: ['arc', 'tab'], shape: 'arc' }; s.pedals = { owned: ['alloy'], equipped: 'alloy' }; msg = 'Back to stock'; break;
      case 'strip10': { const lg = CARS[s.carId].league; s.strip[lg] = Math.min(60, (s.strip[lg] ?? 0) + 10); msg = `Strip ${lg}: level ${s.strip[lg] + 1} next`; break; }
      case 'races0': s.races = 0; break;
      case 'perf100': s.perfectShifts = 100; break;
      case 'wins25': s.wins += 25; break;
      case 'auto': DEV.autoDrive = !DEV.autoDrive; msg = 'Auto-drive ' + (DEV.autoDrive ? 'on (next race)' : 'off'); break;
      case 'dbg': DEV.debug = !DEV.debug; break;
      case 'oppN': DEV.opp = 'normal'; break;
      case 'oppP': DEV.opp = 'perfect'; break;
      case 'oppS': DEV.opp = 'sloppy'; break;
      case 'wipe': if (!wipeArmed) { wipeArmed = true; render(); return; } wipeArmed = false; hooks.resetSave(); msg = 'Save wiped'; break;
      case 'off': DEV.enabled = false; persist(); panel.remove(); tag.remove(); readout.remove(); hooks.refresh('Dev mode off — reopen with ?dev'); return;
    }
    persist(); hooks.write(); hooks.refresh(msg || undefined); render();
  });

  return {
    /** Called every frame: keeps the debug readout current during races. */
    tick() {
      const r = hooks.race(), show = DEV.debug && hooks.screen() === 'race' && !!r;
      readout.hidden = !show;
      if (!show || !r) return;
      const p = r.racers[0], o = r.racers[1];
      readout.textContent = `t ${r.raceTime.toFixed(2)} s · gear ${p.gear + 1} · ${Math.round(p.rpm)} rpm (${Math.round(p.rpm / p.stats.redline * 100)}%) · ${Math.round(p.v * 2.237)} mph · ${p.x.toFixed(1)} m` +
        ` · launch ${p.launchGrade ?? '-'} · downshifts ${p.downshifts}${p.shifting > 0 ? ' · SHIFTING' : ''}\nrival ${o.x.toFixed(1)} m · gap ${(p.x - o.x).toFixed(1)} m`;
    },
  };
}
