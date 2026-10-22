// Upgrades panel: performance tiers T1–T5 for the car being worked on (league parts; boss cars can't be upgraded) —
// engine, transmission, tyres, weight, turbo (Tuning Update) — plus the car's free gearing choice.
import { SaveV1, carTiers } from '../../save/save';
import { TIERS, Tier, PerfKind, PERF_KINDS, PERF_LABEL, PART_TABLE, ENGINE, TRANSMISSION, TIRES, WEIGHT, TURBO, NITROUS, GEARINGS, Gearing, LEAGUE_EFFECT } from '../../data/parts';
import { CARS, carName } from '../../data/cars';
import { DEV } from '../devConsole';
import { ui, Wire, dynoState } from './shared';
import { dyno } from '../../game/dyno';
import { STAGES } from '../../data/stages';

const pct = (x: number) => Math.round(x * 100);
const att = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** What the fitted tier does on this car, in plain words. */
function effect(kind: PerfKind, carId: string, t: Tier): string {
  const c = CARS[carId], lg = c.league, k = LEAGUE_EFFECT[lg], eg = c.engineGain ?? 1, tg = c.turboGain ?? eg;
  switch (kind) {
    case 'engine': { const e = ENGINE[lg][t - 1]; return `${e.label} — +${pct((e.hpMult - 1) * eg * k)}% power`; }
    case 'trans': { const x = TRANSMISSION[lg][t - 1]; return `${x.label} — ${x.ratios.length} gears, ${x.shiftTime.toFixed(2)} s shifts, ${pct(x.zoneWidth)}% shift zone`; }
    case 'tires': { const x = TIRES[lg][t - 1]; return t === 1 ? `${x.label} — factory grip` : `${x.label} — +${pct((x.gripMult - 1) * k)}% grip, +${pct(x.launchMult - 1)}% launch window`; }
    case 'weight': { const x = WEIGHT[lg][t - 1]; return `${x.label} — ${t === 1 ? 'factory weight' : `−${pct((1 - x.massMult) * k)}% weight`}`; }
    case 'turbo': { const x = TURBO[lg][t - 1]; return t === 1 ? 'No turbo' : `${x.label} — +${pct(x.boost * tg * k)}% top-end power, +${pct(x.massAdd * k)}% weight`; }
    case 'nitrous': { const x = NITROUS[lg][t - 1]; return t === 1 ? 'No nitrous' : `${x.label} — +${pct(x.boost * k)}% power for ${x.seconds.toFixed(1)} s, one shot a race (key 1) — fire it once the tyres grip (3rd gear on), not at the launch`; }
  }
}

/** A set-up's key: every part's tier (not the gearing — the test runs all three). */
const tuneKey = (t: Record<string, unknown>) => PERF_KINDS.map(k => t[k]).join('');
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
    return `<tr class="${r.gearing === gear ? 'cur' : ''}"><td>${GEARINGS.find(g => g.id === r.gearing)!.label}${r.gearing === gear ? ' ◂' : ''}</td><td>${fmt(r.t60)}</td><td>${fmt(r.t600)}</td><td class="${r.t800 === best ? 'best' : ''}">${fmt(r.t800)} ${delta}</td></tr>`;
  };
  return `<div class="dyno"><table><tr><th>Gearing</th><th>0–60</th><th>600 m</th><th>800 m</th></tr>${dynoState.rows.map(row).join('')}</table>
    <span class="g-note">Perfect driving on an empty strip${prev ? ' · ± = change since your last test' : ''}. Change a part and test again to compare.</span></div>`;
}

/** Compact Upgrades (owner 2026-10-22): part names down the left, T1–T5 beside them; what a tier does shows on hover (and in the
 *  line under the grid, which also works on phones: tap a tier you own to fit it, the line shows its effect). */
const UPG_HINT = 'Point at a tier to see what it does · yellow = fitted · outlined = owned';
export function upgradesHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId, T = carTiers(save, W), gear = T.equipped.gearing ?? 'balanced';
  const gearRow = `<div class="upg"><h3 class="hd">Gearing</h3><div class="tiers g3">${GEARINGS.map(g => { const info = `Gearing · ${g.label} — ${g.desc} · free to change${g.id === gear ? ' · fitted' : ''}`;
    return `<button class="tier gear ${g.id === gear ? 'equipped' : ''}" data-gear="${g.id}" title="${att(info)}" data-info="${att(info)}"><b>${g.label}</b></button>`; }).join('')}</div></div>`;
  if (CARS[W].unique) return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades</h2><div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded. It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div>${gearRow}</div>`;
  const lg = CARS[W].league;
  const tierBtn = (kind: PerfKind, t: Tier) => {
    const def = PART_TABLE[kind][lg][t - 1];
    const owned = T.owned[kind].includes(t), eq = T.equipped[kind] === t, afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    const info = `${PERF_LABEL[kind]} T${t} · ${effect(kind, W, t)} · ${eq ? 'fitted' : owned ? 'owned — tap to fit' : `${def.price.toLocaleString()} VX`}`;
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${att(info)}" data-info="${att(info)}"><b>T${t}</b></button>`;
  };
  return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(W)}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
      ${dynoHtml(W, T, gear)}
      <div class="upg-grid">${PERF_KINDS.map(k => `<div class="upg"><h3 class="hd">${PERF_LABEL[k]}</h3><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>`).join('')}
      ${gearRow}</div>
      <div class="upg-info g-note" id="upgInfo">${UPG_HINT}</div></div>`;
}

export const wireUpgrades: Wire = (el, save, on, redraw) => {
  el.querySelector('#dynoBtn')?.addEventListener('click', () => {
    const W = ui.work || save.carId, T = carTiers(save, W), key = tuneKey(T.equipped);
    const prev = dynoState.car === W && dynoState.rows.length ? { key: dynoState.key, rows: dynoState.rows } : undefined;
    Object.assign(dynoState, { car: W, key, rows: dyno(W, T.equipped, STAGES.downtown_grid), prev });
    redraw();
  });
  const info = el.querySelector<HTMLElement>('#upgInfo');
  el.querySelectorAll<HTMLElement>('.g-upg [data-info]').forEach(b => { const show = () => { if (info) info.textContent = b.dataset.info!; };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('mouseleave', () => { if (info) info.textContent = UPG_HINT; }); });
  el.querySelectorAll<HTMLButtonElement>('.tier[data-kind]').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as PerfKind, +b.dataset.tier! as Tier, ui.work)));
  el.querySelectorAll<HTMLButtonElement>('.tier[data-gear]').forEach(b => b.addEventListener('click', () => on.onGearing(b.dataset.gear as Gearing, ui.work)));
};
