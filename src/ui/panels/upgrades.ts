// Upgrades panel: performance tiers T1–T5 for the car being worked on (league parts; boss cars can't be upgraded) —
// engine, transmission, tyres, weight, turbo (Tuning Update) — plus the car's free gearing choice.
import { SaveV1, carTiers } from '../../save/save';
import { DTYRES, LSD, ANGLE, DRIFT_KINDS, AnyKind, PART_LABEL } from '../../data/parts';
import { TIERS, Tier, PerfKind, PERF_KINDS, PERF_LABEL, PART_TABLE, ENGINE, TRANSMISSION, TIRES, WEIGHT, TURBO, NITROUS, GEARINGS, Gearing, LEAGUE_EFFECT, RATIO_TUNING, legalRatios, usesCustom } from '../../data/parts';
import { carStats } from '../../game/stats';
import { CARS, carName } from '../../data/cars';
import { DEV } from '../devConsole';
import { ui, Wire, dynoState } from './shared';
import { dyno, dynoRun } from '../../game/dyno';
import { STAGES } from '../../data/stages';

const pct = (x: number) => Math.round(x * 100);
const att = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** What the fitted tier does on this car, in plain words. */
function effect(kind: AnyKind, carId: string, t: Tier): string {
  const c = CARS[carId], lg = c.league, k = LEAGUE_EFFECT[lg], eg = c.engineGain ?? 1, tg = c.turboGain ?? eg;
  switch (kind) {
    // Drift parts (owner E6, V0.18.0) — Drift only
    case 'dtyres': { const x = DTYRES[lg][t - 1]; return `${x.label} — ${x.band ? `rev band ${pct(x.band)}% wider` : 'the standard rev band'} (Drift only)`; }
    case 'lsd': { const x = LSD[lg][t - 1]; return `${x.label} — ${x.steady < 1 ? `revs move ${pct(1 - x.steady)}% slower in a slide, easier to hold` : 'revs move at the normal rate'} (Drift only)`; }
    case 'angle': { const x = ANGLE[lg][t - 1]; return `${x.label} — ${x.angle ? `+${x.angle}° of angle before a spin: more points, more room` : 'standard lock'} (Drift only)`; }
    case 'engine': { const e = ENGINE[lg][t - 1]; return `${e.label} — +${pct((e.hpMult - 1) * eg * k)}% power`; }
    case 'trans': { const x = TRANSMISSION[lg][t - 1]; return `${x.label} — ${x.ratios.length} gears, ${x.shiftTime.toFixed(2)} s shifts, ${pct(x.zoneWidth)}% shift zone`; }
    case 'tires': { const x = TIRES[lg][t - 1]; return t === 1 ? `${x.label} — factory grip` : `${x.label} — +${pct((x.gripMult - 1) * k)}% grip, +${pct(x.launchMult - 1)}% launch window`; }
    case 'weight': { const x = WEIGHT[lg][t - 1]; return `${x.label} — ${t === 1 ? 'factory weight' : `−${pct((1 - x.massMult) * k)}% weight`}`; }
    case 'turbo': { const x = TURBO[lg][t - 1]; return t === 1 ? 'No turbo' : `${x.label} — +${pct(x.boost * tg * k)}% top-end power, +${pct(x.massAdd * k)}% weight`; }
    case 'nitrous': { const x = NITROUS[lg][t - 1]; return t === 1 ? 'No nitrous' : `${x.label} — +${pct(x.boost * k)}% power for ${x.seconds.toFixed(1)} s, one shot a race (key 1) — fire it once the tyres grip (3rd gear on), not at the launch`; }
  }
}

/** A set-up's key: every part's tier (not the gearing — the test runs all three). */
const tuneKey = (t: Record<string, unknown>) => PERF_KINDS.map(k => t[k]).join('') + (usesCustom(t as any) ? ':' + ((t.ratios as number[]) ?? []).join(',') : ':preset');

/** Gear ratios drop-down (owner Q192, V0.17.0): unlocked by owning Transmission T5. Each gear: − / + (a lower ratio = a taller
 *  gear: more speed, less pull), its ratio, a bar against the stock ratio and the top speed in that gear at the redline. */
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
let ratioOpen = false, keepScroll = -1;
function ratiosHtml(W: string, T: { owned: Record<string, number[]>; equipped: Record<string, any> }): string {
  if (!T.owned.trans.includes(5)) return `<div class="ratio-lock g-note">Gear ratios — unlocks with Transmission T5</div>`;
  const lg = CARS[W].league, stock = TRANSMISSION[lg][4].ratios, cur = legalRatios(stock, T.equipped.ratios), fitted = T.equipped.trans === 5;
  const st = carStats(W, { ...T.equipped, trans: 5 }), k = st.redline * Math.PI / 30 * st.wheelRadiusM / st.finalDrive * 2.237, S = RATIO_TUNING;
  const tuned = cur.some((r, i) => Math.abs(r - stock[i]) > 0.001);
  const rows = cur.map((r, i) => {
    const pct = (r / stock[i] - (1 - S.spread)) / (2 * S.spread) * 100, mph = Math.round(k / st.trans.ratios[i]), ch = Math.abs(r - stock[i]) > 0.001;
    const info = `${ORD[i]} gear · ratio ${r.toFixed(2)} (stock ${stock[i].toFixed(2)}) · tops out at ${mph} mph · lower = taller gear: more speed, less pull`;
    const mul = i === cur.length - 1 ? st.trans.ratios[i] / r : 1;           // gearing moves the top gear on top of your ratio
    return `<div class="ratio-row" data-info="${att(info)}" data-i="${i}" data-stock="${stock[i]}" data-k="${k}" data-mul="${mul}"><span>${ORD[i]}</span><button class="tier rb" data-ratio="${i}" data-d="-1" aria-label="${ORD[i]} taller">−</button><b class="${ch ? 'ch' : ''}">${r.toFixed(2)}</b><button class="tier rb" data-ratio="${i}" data-d="1" aria-label="${ORD[i]} shorter">+</button><i class="rbar" title="Drag: left = taller gear, right = shorter"><u style="left:${pct.toFixed(1)}%"></u></i><em>${mph} mph</em></div>`;
  }).join('');
  return `<details class="ratios" id="ratioBox"${ratioOpen ? ' open' : ''}><summary class="hd">Gear ratios${tuned ? ' · tuned' : ''}</summary>${rows}
    <div class="ratio-foot"><span class="g-note">${fitted ? '− taller gear (more speed) · + shorter gear (more pull). Test run shows the result.' : 'Fit Transmission T5 to race on these ratios.'}</span><button class="btn ghost" id="ratioReset" ${tuned ? '' : 'disabled'}>Reset</button></div></details>`;
}
const fmt = (x: number) => isNaN(x) ? '—' : x.toFixed(2) + ' s';
/** Test run (owner C11, V0.16.0): 0–60 / 600 m / 800 m on each gearing for the parts fitted now; the gearing you use is marked,
 *  the quickest 800 m is green, and after a change the 800 m shows the difference from the run before. */
function dynoHtml(W: string, T: { equipped: Record<string, unknown> }, gear: string): string {
  const fresh = dynoState.car === W && dynoState.key === tuneKey(T.equipped);
  if (!fresh) return `<div class="dyno"><button class="btn ghost dyno-go" id="dynoBtn">Test run</button><span class="g-note">Race this set-up on an empty strip: 0–60, 600 m and 800 m on each gearing.</span></div>`;
  const best = Math.min(...dynoState.rows.map(r => r.t800)), prev = dynoState.prev;
  const row = (r: typeof dynoState.rows[number]) => {
    const was = prev?.rows.find(p => p.gearing === r.gearing), d = was ? r.t800 - was.t800 : NaN;
    const delta = !isNaN(d) && Math.abs(d) >= 0.005 ? `<em class="${d < 0 ? 'up' : 'down'}">${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(2)}</em>` : '';
    const label = gear === 'custom' ? 'Custom' : GEARINGS.find(g => g.id === r.gearing)!.label, cur = gear === 'custom' || r.gearing === gear;
    return `<tr class="${cur ? 'cur' : ''}"><td>${label}${cur ? ' ◂' : ''}</td><td>${fmt(r.t60)}</td><td>${fmt(r.t600)}</td><td class="${r.t800 === best ? 'best' : ''}">${fmt(r.t800)} ${delta}</td></tr>`;
  };
  return `<div class="dyno"><table><tr><th>Gearing</th><th>0–60</th><th>600 m</th><th>800 m</th></tr>${dynoState.rows.map(row).join('')}</table>
    <span class="g-note">Perfect driving on an empty strip${prev ? ' · ± = change since your last test' : ''}. Change a part and test again to compare.</span></div>`;
}

/** Compact Upgrades (owner 2026-10-22): part names down the left, T1–T5 beside them; what a tier does shows on hover (and in the
 *  line under the grid, which also works on phones: tap a tier you own to fit it, the line shows its effect). */
const UPG_HINT = 'Point at a tier to see what it does · yellow = fitted · outlined = owned';
export function upgradesHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId, T = carTiers(save, W), gear = T.equipped.gearing ?? 'balanced';
  // gear setup (owner, V0.17.1): once T5 is owned, a switch — Preset gearing OR Custom ratios; only the chosen one shows
  const custom = T.owned.trans.includes(5) && (T.equipped.gearMode ?? (T.equipped.ratios?.length ? 'custom' : 'preset')) === 'custom';
  const modeRow = !T.owned.trans.includes(5) || CARS[W].unique ? '' : `<div class="upg"><h3 class="hd">Gear setup</h3><div class="tiers g2">${(['preset', 'custom'] as const).map(m => { const on = (m === 'custom') === custom, info = m === 'preset' ? 'Preset gearing — pick Short, Balanced or Long' : `Custom ratios — tune every gear yourself${T.equipped.trans === 5 ? '' : ' (needs Transmission T5 fitted)'}`;
    return `<button class="tier gear ${on ? 'equipped' : ''}" data-mode="${m}" title="${att(info)}" data-info="${att(info)}"><b>${m === 'preset' ? 'Preset gearing' : 'Custom ratios'}</b></button>`; }).join('')}</div></div>`;
  const gearRow = custom ? modeRow + ratiosHtml(W, T) : modeRow + `<div class="upg"><h3 class="hd">Gearing</h3><div class="tiers g3">${GEARINGS.map(g => { const info = `Gearing · ${g.label} — ${g.desc} · free to change${g.id === gear ? ' · fitted' : ''}`;
    return `<button class="tier gear ${g.id === gear ? 'equipped' : ''}" data-gear="${g.id}" title="${att(info)}" data-info="${att(info)}"><b>${g.label}</b></button>`; }).join('')}</div></div>`;
  if (CARS[W].unique) return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades</h2><div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded. It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div>${gearRow}</div>`;
  const lg = CARS[W].league;
  const tierBtn = (kind: AnyKind, t: Tier) => {
    const def = PART_TABLE[kind][lg][t - 1];
    const owned = (T.owned[kind] ?? [1]).includes(t), eq = (T.equipped[kind] ?? 1) === t, afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    const info = `${PART_LABEL[kind]} T${t} · ${effect(kind, W, t)} · ${eq ? 'fitted' : owned ? 'owned — tap to fit' : `${def.price.toLocaleString()} VX`}`;
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${att(info)}" data-info="${att(info)}"><b>T${t}</b></button>`;
  };
  return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(W)}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
      ${dynoHtml(W, T, custom ? 'custom' : gear)}
      <div class="upg-grid">${PERF_KINDS.map(k => `<div class="upg"><h3 class="hd">${PERF_LABEL[k]}</h3><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>${k === 'trans' && !T.owned.trans.includes(5) ? ratiosHtml(W, T) : ''}`).join('')}
      ${gearRow}</div>
      ${DEV.enabled ? `<div class="pt-group">Drift parts — Drift only (dev)</div>
      <div class="upg-grid">${DRIFT_KINDS.map(k => `<div class="upg"><h3 class="hd">${PART_LABEL[k]}</h3><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>`).join('')}</div>` : ''}
      <div class="upg-info g-note" id="upgInfo">${UPG_HINT}</div></div>`;
}

export const wireUpgrades: Wire = (el, save, on, redraw) => {
  const panel = el.querySelector<HTMLElement>('.g-upg');
  if (panel && keepScroll >= 0) { panel.scrollTop = keepScroll; keepScroll = -1; }        // stay put while tuning ratios
  el.querySelector<HTMLDetailsElement>('#ratioBox')?.addEventListener('toggle', e => { ratioOpen = (e.target as HTMLDetailsElement).open; });
  const ratioSave = (r: number[] | null) => { const W = ui.work || save.carId; keepScroll = panel?.scrollTop ?? -1; on.onRatios(r, W); };
  el.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b => b.addEventListener('click', () => {
    const W = ui.work || save.carId, T = carTiers(save, W), stock = TRANSMISSION[CARS[W].league][4].ratios, cur = legalRatios(stock, T.equipped.ratios);
    const i = +b.dataset.ratio!, want = cur.slice(); want[i] = +(cur[i] + +b.dataset.d! * RATIO_TUNING.step).toFixed(3);
    const next = legalRatios(stock, want);
    ratioSave(next.every((r, j) => Math.abs(r - stock[j]) < 0.001) ? null : next);
  }));
  el.querySelector('#ratioReset')?.addEventListener('click', () => ratioSave(null));
  // drag a gear's bar (owner 2026-10-22): left = taller gear, right = shorter; the ratio and top speed follow live, saved on release
  el.querySelectorAll<HTMLElement>('.ratio-row .rbar').forEach(bar => {
    const row = bar.closest<HTMLElement>('.ratio-row')!, i = +row.dataset.i!, stock = +row.dataset.stock!, k = +row.dataset.k!, mul = +row.dataset.mul!, S = RATIO_TUNING;
    let live = NaN;
    const at = (x: number) => { const r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (x - r.left) / r.width));
      live = +(stock * (1 - S.spread + 2 * S.spread * p)).toFixed(3);
      bar.querySelector<HTMLElement>('u')!.style.left = (p * 100).toFixed(1) + '%';
      row.querySelector('b')!.textContent = live.toFixed(2); row.querySelector('b')!.classList.toggle('ch', Math.abs(live - stock) > 0.001);
      row.querySelector('em')!.textContent = `${Math.round(k / (live * mul))} mph`; };
    bar.addEventListener('pointerdown', e => { e.preventDefault(); bar.setPointerCapture(e.pointerId); bar.classList.add('drag'); at(e.clientX); });
    bar.addEventListener('pointermove', e => { if (bar.hasPointerCapture(e.pointerId)) at(e.clientX); });
    const done = () => { if (isNaN(live)) return; bar.classList.remove('drag');
      const W = ui.work || save.carId, T = carTiers(save, W), all = TRANSMISSION[CARS[W].league][4].ratios, want = legalRatios(all, T.equipped.ratios); want[i] = live; live = NaN;
      const next = legalRatios(all, want); ratioSave(next.every((r, j) => Math.abs(r - all[j]) < 0.001) ? null : next); };
    bar.addEventListener('pointerup', done); bar.addEventListener('pointercancel', done);
  });
  el.querySelector('#dynoBtn')?.addEventListener('click', () => {
    const W = ui.work || save.carId, T = carTiers(save, W), key = tuneKey(T.equipped);
    const prev = dynoState.car === W && dynoState.rows.length ? { key: dynoState.key, rows: dynoState.rows } : undefined;
    const rows = usesCustom(T.equipped) ? [dynoRun(W, T.equipped, STAGES.downtown_grid, 'balanced')] : dyno(W, T.equipped, STAGES.downtown_grid);   // custom: one row
    Object.assign(dynoState, { car: W, key, rows, prev });
    redraw();
  });
  const info = el.querySelector<HTMLElement>('#upgInfo');
  el.querySelectorAll<HTMLElement>('.g-upg [data-info]').forEach(b => { const show = () => { if (info) info.textContent = b.dataset.info!; };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('mouseleave', () => { if (info) info.textContent = UPG_HINT; }); });
  el.querySelectorAll<HTMLButtonElement>('.tier[data-kind]').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as AnyKind, +b.dataset.tier! as Tier, ui.work)));
  el.querySelectorAll<HTMLButtonElement>('.tier[data-gear]').forEach(b => b.addEventListener('click', () => on.onGearing(b.dataset.gear as Gearing, ui.work)));
  el.querySelectorAll<HTMLButtonElement>('.tier[data-mode]').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode === 'custom') ratioOpen = true; on.onGearMode(b.dataset.mode as 'preset' | 'custom', ui.work || save.carId); }));
};
