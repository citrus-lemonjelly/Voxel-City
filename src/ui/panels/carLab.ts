// Car Lab (Build & Tune Update, owner Q245–Q260): every tuning setting for the car being worked on, on its own screen — opened
// from Upgrades. Final drive (open on every car), nitrous mix (Nitrous T2), tire pressure (Tires T3) and gear ratios
// (Transmission T4), each a slider that trades one thing for another; the car rating (PP) with the tuner points (TP) your
// settings add, counting up / down as you move a slider; and the Test run (moved here from Upgrades). No hints on what is best —
// the player experiments (owner F3).
import { SaveV1, carTiers, setupsOf } from '../../save/save';
import { CARS, carName } from '../../data/cars';
import { TRANSMISSION, TUNING, TUNE_UNLOCK, TuneKey, Tune, RATIO_TUNING, legalRatios, tuneOpen, PERF_LABEL } from '../../data/parts';
import { carStats } from '../../game/stats';
import { carRating, tunerPoints, isTuned } from '../../game/rating';
import { dyno } from '../../game/dyno';
import { STAGES } from '../../data/stages';
import { ratingBox, ratingTick } from '../ratingBox';
import { ui, Wire, dynoState } from './shared';

const att = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
type Slider = 'fd' | 'nm' | 'tp';
/** Each slider: range, what its two ends do, and how its value reads. Left end of the bar = min. */
const SLIDERS: Record<Slider, { label: string; min: number; max: number; step: number; left: string; right: string; read(W: string, v: number, t: Tune): string }> = {
  fd: { label: 'Final drive', min: TUNING.fd.min, max: TUNING.fd.max, step: TUNING.fd.step, left: 'Taller · more top speed', right: 'Shorter · quicker off the line',
    read: (W, v) => (CARS[W].finalDrive * v).toFixed(2) },
  nm: { label: 'Nitrous mix', min: -1, max: 1, step: TUNING.nm.step, left: 'Long, gentle burn', right: 'Short, strong burst',
    read: (W, v, t) => { const s = carStats(W, { ...t, nm: v }); return `${s.nitro.seconds.toFixed(1)} s · +${Math.round(s.nitro.boost * 100)}%`; } },
  tp: { label: 'Tire pressure', min: -1, max: 1, step: TUNING.tp.step, left: 'Low · more grip', right: 'High · less drag, taller tire',
    read: (_W, v) => `${Math.round(32 + 6 * v)} psi` },
};
const ORDER: Slider[] = ['fd', 'nm', 'tp'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
/** The TP each car's box showed last, so a re-draw counts from it to the new value. */
const shownTp: Record<string, number> = {};
let ratioOpen = false, keepScroll = -1;

const valueOf = (k: Slider, t: Partial<Tune>) => k === 'fd' ? t.fd ?? 1 : t[k] ?? 0;
/** Why a setting is closed on this car right now (null = open). */
function lockOf(W: string, k: TuneKey, T: { owned: Record<string, number[]>; equipped: Partial<Tune> }): string | null {
  if (CARS[W].unique) return k === 'fd' ? null : 'Boss cars come as they are: final drive only';
  if (tuneOpen(k, T.equipped)) return null;
  const u = TUNE_UNLOCK[k], part = PERF_LABEL[u.kind!];
  return (T.owned[u.kind!] ?? [1]).some(x => x >= u.tier) ? `Fit ${part} T${u.tier} or higher to use it` : `Unlocks with ${part} T${u.tier} (Upgrades)`;
}
function sliderRow(W: string, k: Slider, T: { owned: Record<string, number[]>; equipped: Partial<Tune> }): string {
  const S = SLIDERS[k], lock = lockOf(W, k, T);
  if (lock) return `<div class="cl-row lock"><span class="cl-name">${S.label}</span><span class="cl-lock">${lock}</span></div>`;
  const v = valueOf(k, T.equipped), p = (v - S.min) / (S.max - S.min) * 100, mid = k === 'fd' ? 1 : 0, ch = Math.abs(v - mid) > 1e-6;
  return `<div class="cl-row" data-key="${k}" data-v="${v}">
    <span class="cl-name">${S.label}</span>
    <button class="tier rb" data-nudge="-1" aria-label="${S.label} toward ${att(S.left)}">−</button><b class="cl-val ${ch ? 'ch' : ''}">${S.read(W, v, T.equipped as Tune)}</b><button class="tier rb" data-nudge="1" aria-label="${S.label} toward ${att(S.right)}">+</button>
    <i class="rbar cl-bar" title="Drag the marker"><u style="left:${p.toFixed(1)}%"></u></i>
    <span class="cl-ends"><span>◂ ${S.left}</span><span>${S.right} ▸</span></span></div>`;
}
/** Gear ratios (owner Q192; Transmission T4+ since V0.21.0): each gear − / + and a bar against the fitted box's stock ratio. */
function ratiosHtml(W: string, T: { owned: Record<string, number[]>; equipped: Partial<Tune> }): string {
  const lock = lockOf(W, 'ratios', T);
  if (lock) return `<div class="cl-row lock"><span class="cl-name">Gear ratios</span><span class="cl-lock">${lock}</span></div>`;
  const lg = CARS[W].league, stock = TRANSMISSION[lg][(T.equipped.trans ?? 1) - 1].ratios, cur = legalRatios(stock, T.equipped.ratios), S = RATIO_TUNING;
  const st = carStats(W, T.equipped), k = st.redline * Math.PI / 30 * st.wheelRadiusM / st.finalDrive * 2.237;
  const tuned = cur.some((r, i) => Math.abs(r - stock[i]) > 0.001);
  const rows = cur.map((r, i) => {
    const pct = (r / stock[i] - (1 - S.spread)) / (2 * S.spread) * 100, mph = Math.round(k / st.trans.ratios[i]), ch = Math.abs(r - stock[i]) > 0.001;
    return `<div class="ratio-row" data-i="${i}" data-stock="${stock[i]}" data-k="${k}"><span>${ORD[i]}</span><button class="tier rb" data-ratio="${i}" data-d="-1" aria-label="${ORD[i]} taller">−</button><b class="${ch ? 'ch' : ''}">${r.toFixed(2)}</b><button class="tier rb" data-ratio="${i}" data-d="1" aria-label="${ORD[i]} shorter">+</button><i class="rbar" title="Drag: left = taller gear, right = shorter"><u style="left:${pct.toFixed(1)}%"></u></i><em>${mph} mph</em></div>`;
  }).join('');
  return `<details class="ratios" id="ratioBox"${ratioOpen ? ' open' : ''}><summary class="hd">Gear ratios${tuned ? ' · tuned' : ''}</summary>${rows}
    <div class="ratio-foot"><span class="g-note">− taller gear (more speed) · + shorter gear (more pull) · mph = top of each gear</span><button class="btn ghost" id="ratioReset" ${tuned ? '' : 'disabled'}>Stock ratios</button></div></details>`;
}
const fmt = (x: number) => isNaN(x) ? '—' : x.toFixed(2) + ' s';
const tuneKey = (t: Partial<Tune>) => JSON.stringify(t);
/** Test run: your tune and the factory tune, at 0–60 / 600 / 800 / 1200 m; after a change, ± against your last test. */
function dynoHtml(W: string, T: { equipped: Partial<Tune> }): string {
  const fresh = dynoState.car === W && dynoState.key === tuneKey(T.equipped);
  if (!fresh) return `<div class="dyno"><button class="btn ghost dyno-go" id="dynoBtn">Test run</button><span class="g-note">Race your tune and the factory tune on an empty strip: 0–60, 600, 800 and 1200 m.</span></div>`;
  const prev = dynoState.prev?.rows[0], cols = ['t60', 't600', 't800', 't1200'] as const;
  const row = (r: typeof dynoState.rows[number], mine: boolean) => `<tr class="${mine ? 'cur' : ''}"><td>${r.label}</td>${cols.map(c => {
    const d = mine && prev ? r[c] - prev[c] : NaN, delta = !isNaN(d) && Math.abs(d) >= 0.005 ? `<em class="${d < 0 ? 'up' : 'down'}">${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(2)}</em>` : '';
    const other = dynoState.rows[mine ? 1 : 0], best = !isNaN(r[c]) && r[c] < other[c] - 0.005;
    return `<td class="${best ? 'best' : ''}">${fmt(r[c])}${delta}</td>`; }).join('')}</tr>`;
  return `<div class="dyno"><table><tr><th></th><th>0–60</th><th>600 m</th><th>800 m</th><th>1200 m</th></tr>${row(dynoState.rows[0], true)}${row(dynoState.rows[1], false)}</table>
    <span class="g-note">Perfect driving on an empty strip · green = the quicker of the two${prev ? ' · ± = change since your last test' : ''}</span></div>`;
}

export function carLabHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId, T = carTiers(save, W), pp = carRating(W, T.equipped), tp = tunerPoints(W, T.equipped);
  const lg = CARS[W].league, shown = shownTp[W] ?? tp;
  return `<div class="g-panel g-upg g-lab blk">${close}<h2 class="hd">Car Lab <small class="g-sub">${carName(W)} · League ${lg}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
    ${setupsHtml(save, W)}
    <div class="cl-top">${ratingBox(pp, shown, 'labRating')}<span class="g-note">PP = the car with its parts · TP = what your settings add (+) or cost (−) over 600, 800 and 1200 m</span></div>
    <div class="cl-rows">${ORDER.map(k => sliderRow(W, k, T)).join('')}${ratiosHtml(W, T)}</div>
    ${dynoHtml(W, T)}
    <div class="cl-foot"><button class="btn ghost" id="labBack">◂ Upgrades</button><button class="btn ghost" id="labReset" ${isTuned(T.equipped) ? '' : 'disabled'}>Factory settings</button></div>
  </div>`;
}

export const wireCarLab: Wire = (el, save, on, redraw) => {
  const panel = el.querySelector<HTMLElement>('.g-lab'); if (!panel) return;
  const W = ui.work || save.carId, T = carTiers(save, W), box = panel.querySelector<HTMLElement>('#labRating');
  if (keepScroll >= 0) { panel.scrollTop = keepScroll; keepScroll = -1; }
  // count the TP box from what it showed last to the value now (after a slider was saved and the screen re-drawn)
  const tick = (t: Partial<Tune>) => { const tp = tunerPoints(W, t); ratingTick(box, carRating(W, t), tp); shownTp[W] = tp; };
  tick(T.equipped);
  const save1 = (patch: Partial<Tune> | null) => { keepScroll = panel.scrollTop; on.onTune(patch, W); };
  panel.querySelector('#labBack')?.addEventListener('click', () => { ui.panel = 'upgrades'; redraw(); });
  panel.querySelector('#labReset')?.addEventListener('click', () => save1(null));
  // sliders: − / + steps, or drag the marker (value + TP follow live, saved on release)
  panel.querySelectorAll<HTMLElement>('.cl-row[data-key]').forEach(row => {
    const k = row.dataset.key as Slider, S = SLIDERS[k], snap = (v: number) => +Math.min(S.max, Math.max(S.min, Math.round(v / S.step) * S.step)).toFixed(3);
    const set = (v: number) => save1({ [k]: Math.abs(v - (k === 'fd' ? 1 : 0)) < 1e-6 ? undefined : v });
    row.querySelectorAll<HTMLButtonElement>('[data-nudge]').forEach(b => b.addEventListener('click', () => set(snap(+row.dataset.v! + +b.dataset.nudge! * S.step))));
    const bar = row.querySelector<HTMLElement>('.cl-bar')!; let live = NaN;
    const at = (x: number) => { const r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (x - r.left) / r.width)); live = snap(S.min + p * (S.max - S.min));
      bar.querySelector<HTMLElement>('u')!.style.left = ((live - S.min) / (S.max - S.min) * 100).toFixed(1) + '%';
      const t = { ...T.equipped, [k]: live } as Tune, val = row.querySelector('.cl-val')!; val.textContent = S.read(W, live, t); val.classList.toggle('ch', Math.abs(live - (k === 'fd' ? 1 : 0)) > 1e-6);
      tick(t); };
    bar.addEventListener('pointerdown', e => { e.preventDefault(); bar.setPointerCapture(e.pointerId); bar.classList.add('drag'); at(e.clientX); });
    bar.addEventListener('pointermove', e => { if (bar.hasPointerCapture(e.pointerId)) at(e.clientX); });
    const done = () => { if (isNaN(live)) return; bar.classList.remove('drag'); const v = live; live = NaN; set(v); };
    bar.addEventListener('pointerup', done); bar.addEventListener('pointercancel', done);
  });
  // gear ratios (moved from Upgrades)
  panel.querySelector<HTMLDetailsElement>('#ratioBox')?.addEventListener('toggle', e => { ratioOpen = (e.target as HTMLDetailsElement).open; });
  const stockR = () => TRANSMISSION[CARS[W].league][(T.equipped.trans ?? 1) - 1].ratios;
  const ratioSave = (next: number[]) => { const st = stockR(); save1({ ratios: next.every((r, j) => Math.abs(r - st[j]) < 0.001) ? undefined : next }); };
  panel.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b => b.addEventListener('click', () => {
    const st = stockR(), cur = legalRatios(st, T.equipped.ratios), i = +b.dataset.ratio!, want = cur.slice(); want[i] = +(cur[i] + +b.dataset.d! * RATIO_TUNING.step).toFixed(3);
    ratioSave(legalRatios(st, want));
  }));
  panel.querySelector('#ratioReset')?.addEventListener('click', () => save1({ ratios: undefined }));
  panel.querySelectorAll<HTMLElement>('.ratio-row .rbar').forEach(bar => {
    const row = bar.closest<HTMLElement>('.ratio-row')!, i = +row.dataset.i!, stock = +row.dataset.stock!, k = +row.dataset.k!, S = RATIO_TUNING;
    let live = NaN;
    const at = (x: number) => { const r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (x - r.left) / r.width));
      live = +(stock * (1 - S.spread + 2 * S.spread * p)).toFixed(3);
      bar.querySelector<HTMLElement>('u')!.style.left = (p * 100).toFixed(1) + '%';
      row.querySelector('b')!.textContent = live.toFixed(2); row.querySelector('b')!.classList.toggle('ch', Math.abs(live - stock) > 0.001);
      row.querySelector('em')!.textContent = `${Math.round(k / live)} mph`; };
    bar.addEventListener('pointerdown', e => { e.preventDefault(); bar.setPointerCapture(e.pointerId); bar.classList.add('drag'); at(e.clientX); });
    bar.addEventListener('pointermove', e => { if (bar.hasPointerCapture(e.pointerId)) at(e.clientX); });
    const done = () => { if (isNaN(live)) return; bar.classList.remove('drag');
      const st = stockR(), want = legalRatios(st, T.equipped.ratios); want[i] = live; live = NaN; ratioSave(legalRatios(st, want)); };
    bar.addEventListener('pointerup', done); bar.addEventListener('pointercancel', done);
  });
  panel.querySelector('#dynoBtn')?.addEventListener('click', () => {
    const key = tuneKey(T.equipped), prev = dynoState.car === W && dynoState.rows.length ? { key: dynoState.key, rows: dynoState.rows } : undefined;
    Object.assign(dynoState, { car: W, key, rows: dyno(W, T.equipped, STAGES.downtown_grid), prev });
    keepScroll = panel.scrollTop; redraw();
  });
};
/** Saved set-ups (owner Q179/Q249): three tabs, the one in use yellow; its name can be changed in the box beside them. Each set-up
 *  is the parts fitted + the Car Lab settings. Shown in Car Lab and Upgrades. */
export function setupsHtml(save: SaveV1, W: string): string {
  const S = setupsOf(save, W);
  return `<div class="cl-setups"><div class="seg" role="group" aria-label="Saved set-ups">${S.names.map((n, i) => `<button class="${i === S.active ? 'on' : ''}" data-setup="${i}" title="${att(`Set-up ${i + 1}: ${n} — parts + Car Lab settings`)}">${att(n)}</button>`).join('')}</div>
    <input class="cl-sname" maxlength="14" value="${att(S.names[S.active])}" aria-label="Name this set-up" title="Name this set-up (e.g. 600 Launch)"></div>`;
}
export const wireSetups: Wire = (el, save, on) => {
  const W = ui.work || save.carId, box = el.querySelector('.cl-setups'); if (!box) return;
  box.querySelectorAll<HTMLButtonElement>('[data-setup]').forEach(b => b.addEventListener('click', () => { if (!b.classList.contains('on')) on.onSetup(+b.dataset.setup!, W); }));
  const inp = box.querySelector<HTMLInputElement>('.cl-sname')!, act = setupsOf(save, W).active;
  const commit = () => { if (inp.value.trim() !== setupsOf(save, W).names[act]) on.onSetupName(act, inp.value, W); };
  inp.addEventListener('change', commit); inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
};
/** Upgrades lists what opens each Car Lab setting (owner: "mention the milestones in the Upgrades section"). */
export function labUnlocks(W: string, T: { owned: Record<string, number[]>; equipped: Partial<Tune> }): { label: string; open: boolean; need: string }[] {
  const L: Record<TuneKey, string> = { fd: 'Final drive', nm: 'Nitrous mix', tp: 'Tire pressure', ratios: 'Gear ratios' };
  return (['fd', 'nm', 'tp', 'ratios'] as TuneKey[]).map(k => { const u = TUNE_UNLOCK[k];
    return { label: L[k], open: !lockOf(W, k, T), need: u.kind ? `${PERF_LABEL[u.kind]} T${u.tier}` : 'every car' }; });
}
