// Upgrades panel: performance tiers T1–T5 for the car being worked on (league parts; boss cars can't be upgraded) —
// engine, transmission, tyres, weight, turbo (Tuning Update) — plus the car's free gearing choice.
import { SaveV1, carTiers } from '../../save/save';
import { TIERS, Tier, PerfKind, PERF_KINDS, PERF_LABEL, PART_TABLE, ENGINE, TRANSMISSION, TIRES, WEIGHT, TURBO, GEARINGS, Gearing, LEAGUE_EFFECT } from '../../data/parts';
import { CARS, carName } from '../../data/cars';
import { DEV } from '../devConsole';
import { ui, Wire } from './shared';

const pct = (x: number) => Math.round(x * 100);

/** What the fitted tier does on this car, in plain words. */
function effect(kind: PerfKind, carId: string, t: Tier): string {
  const c = CARS[carId], lg = c.league, k = LEAGUE_EFFECT[lg], eg = c.engineGain ?? 1, tg = c.turboGain ?? eg;
  switch (kind) {
    case 'engine': { const e = ENGINE[lg][t - 1]; return `${e.label} — +${pct((e.hpMult - 1) * eg * k)}% power`; }
    case 'trans': { const x = TRANSMISSION[lg][t - 1]; return `${x.label} — ${x.ratios.length} gears, ${x.shiftTime.toFixed(2)} s shifts, ${pct(x.zoneWidth)}% shift zone`; }
    case 'tires': { const x = TIRES[lg][t - 1]; return t === 1 ? `${x.label} — factory grip` : `${x.label} — +${pct((x.gripMult - 1) * k)}% grip, +${pct(x.launchMult - 1)}% launch window`; }
    case 'weight': { const x = WEIGHT[lg][t - 1]; return `${x.label} — ${t === 1 ? 'factory weight' : `−${pct((1 - x.massMult) * k)}% weight`}`; }
    case 'turbo': { const x = TURBO[lg][t - 1]; return t === 1 ? 'No turbo' : `${x.label} — +${pct(x.boost * tg * k)}% top-end power, +${pct(x.massAdd * k)}% weight`; }
  }
}

export function upgradesHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId, T = carTiers(save, W), gear = T.equipped.gearing ?? 'balanced';
  const gearRow = `<div class="upg"><div class="upg-hd"><h3 class="hd">Gearing</h3><span class="desc">${GEARINGS.find(g => g.id === gear)!.desc} · free to change</span></div>
      <div class="tiers g3">${GEARINGS.map(g => `<button class="tier gear ${g.id === gear ? 'equipped' : ''}" data-gear="${g.id}" title="${g.desc}"><b>${g.label}</b></button>`).join('')}</div></div>`;
  if (CARS[W].unique) return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades</h2><div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded. It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div>${gearRow}</div>`;
  const lg = CARS[W].league;
  const tierBtn = (kind: PerfKind, t: Tier) => {
    const def = PART_TABLE[kind][lg][t - 1];
    const owned = T.owned[kind].includes(t), eq = T.equipped[kind] === t, afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${def.label}"><b>T${t}</b>${eq ? 'Equipped' : owned ? 'Equip' : `${def.price.toLocaleString()} VX`}</button>`;
  };
  return `<div class="g-panel g-upg blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(W)}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
      ${PERF_KINDS.map(k => `<div class="upg"><div class="upg-hd"><h3 class="hd">${PERF_LABEL[k]}</h3><span class="desc">${effect(k, W, T.equipped[k])}</span></div><div class="tiers">${TIERS.map(t => tierBtn(k, t)).join('')}</div></div>`).join('')}
      ${gearRow}</div>`;
}

export const wireUpgrades: Wire = (el, _save, on) => {
  el.querySelectorAll<HTMLButtonElement>('.tier[data-kind]').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as PerfKind, +b.dataset.tier! as Tier, ui.work)));
  el.querySelectorAll<HTMLButtonElement>('.tier[data-gear]').forEach(b => b.addEventListener('click', () => on.onGearing(b.dataset.gear as Gearing, ui.work)));
};
