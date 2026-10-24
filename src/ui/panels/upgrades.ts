// Upgrades panel: performance tiers T1–T5 for the car being worked on (league parts; boss cars can't be upgraded) —
// engine, transmission, tires, weight, turbo, nitrous — plus the car rating and the way into Car Lab (Build & Tune Update).
import { SaveV1, carTiers } from '../../save/save';
import { DTYRES, LSD, ANGLE, DRIFT_KINDS, AnyKind, PART_LABEL, TUNE_UNLOCK, TuneKey, Tune } from '../../data/parts';
import { TIERS, Tier, PERF_KINDS, PERF_LABEL, PART_TABLE, ENGINE, TRANSMISSION, TIRES, WEIGHT, TURBO, NITROUS, LEAGUE_EFFECT } from '../../data/parts';
import { CARS, carName } from '../../data/cars';
import { DEV } from '../devConsole';
import { ui, Wire } from './shared';
import { labUnlocks, setupsHtml } from './carLab';
import { ratingBoxFor } from '../ratingBox';

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
    case 'nitrous': { const x = NITROUS[lg][t - 1]; return t === 1 ? 'No nitrous' : `${x.label} — +${pct(x.boost * k)}% power for ${x.seconds.toFixed(1)} s, one shot a race (key 1) — fire it once the tires grip (3rd gear on), not at the launch`; }
  }
}

/** Compact Upgrades (owner 2026-10-22): part names down the left, T1–T5 beside them; what a tier does shows on hover (and in the
 *  line under the grid, which also works on phones: tap a tier you own to fit it, the line shows its effect). Tuning lives in
 *  Car Lab since V0.21.0 (owner Q260): Upgrades shows the car rating, the Car Lab button and what opens each setting. */
const UPG_HINT = 'Point at a tier to see what it does · yellow = fitted · outlined = owned';
/** The Car Lab button + which settings are open (owner: "mention the milestones to unlock the tuning in the upgrades section"). */
function labBlock(W: string, T: { owned: Record<string, number[]>; equipped: Partial<Tune> }): string {
  const u = labUnlocks(W, T);
  return `<div class="cl-unlocks">${u.map(x => `<span class="${x.open ? 'ok' : ''}">${x.open ? '✓' : '·'} ${x.label}<i>${x.open ? 'open' : x.need}</i></span>`).join('')}</div>`;
}
export function upgradesHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId, T = carTiers(save, W);
  const top = `${setupsHtml(save, W)}<div class="cl-top">${ratingBoxFor(W, T.equipped)}<button class="btn" id="openLab">Car Lab ▸</button></div>${labBlock(W, T)}`;
  if (CARS[W].unique) return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades</h2>${top}<div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded (Car Lab: final drive only). It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div></div>`;
  const lg = CARS[W].league;
  const tierBtn = (kind: AnyKind, t: Tier) => {
    const def = PART_TABLE[kind][lg][t - 1];
    const owned = (T.owned[kind] ?? [1]).includes(t), eq = (T.equipped[kind] ?? 1) === t, afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    const opens = (Object.keys(TUNE_UNLOCK) as TuneKey[]).find(k => TUNE_UNLOCK[k].kind === kind && TUNE_UNLOCK[k].tier === t);
    const info = `${PART_LABEL[kind]} T${t} · ${effect(kind, W, t)}${opens ? ` · opens ${LAB_NAME[opens]} in Car Lab` : ''} · ${eq ? 'fitted' : owned ? 'owned — tap to fit' : `${def.price.toLocaleString()} VX`}`;
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${att(info)}" data-info="${att(info)}"><b>T${t}</b></button>`;
  };
  return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(W)}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
      ${top}
      <div class="upg-grid">${PERF_KINDS.map(k => `<div class="upg"><h3 class="hd">${PERF_LABEL[k]}</h3><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>`).join('')}</div>
      ${DEV.enabled ? `<div class="pt-group">Drift parts — Drift only (dev)</div>
      <div class="upg-grid">${DRIFT_KINDS.map(k => `<div class="upg"><h3 class="hd">${PART_LABEL[k]}</h3><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>`).join('')}</div>` : ''}
      <div class="upg-info g-note" id="upgInfo">${UPG_HINT}</div></div>`;
}
const LAB_NAME: Record<TuneKey, string> = { fd: 'Final drive', nm: 'Nitrous mix', tp: 'Tire pressure', ratios: 'Gear ratios' };

export const wireUpgrades: Wire = (el, save, on, redraw) => {
  el.querySelector('.g-upg:not(.g-lab) #openLab')?.addEventListener('click', () => { ui.panel = 'lab'; redraw(); });
  const info = el.querySelector<HTMLElement>('#upgInfo');
  el.querySelectorAll<HTMLElement>('.g-upg [data-info]').forEach(b => { const show = () => { if (info) info.textContent = b.dataset.info!; };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('mouseleave', () => { if (info) info.textContent = UPG_HINT; }); });
  el.querySelectorAll<HTMLButtonElement>('.tier[data-kind]').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as AnyKind, +b.dataset.tier! as Tier, ui.work)));
};
