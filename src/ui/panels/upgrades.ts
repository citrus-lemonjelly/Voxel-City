// Upgrades panel: engine + transmission tiers T1–T5 for the car being worked on (league parts; boss cars can't be upgraded).
import { SaveV1, carTiers } from '../../save/save';
import { ENGINE, TRANSMISSION, TIERS, Tier } from '../../data/parts';
import { CARS, carName } from '../../data/cars';
import { DEV } from '../devConsole';
import { ui, Wire } from './shared';

export function upgradesHtml(save: SaveV1, close: string): string {
  const W = ui.work || save.carId;
  if (CARS[W].unique) return `<div class="g-panel blk">${close}<h2 class="hd">Upgrades</h2><div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded. It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div></div>`;
  const lg = CARS[W].league, T = carTiers(save, W);
  const tierBtn = (kind: 'engine' | 'trans', t: Tier) => {
    const def = (kind === 'engine' ? ENGINE[lg] : TRANSMISSION[lg])[t - 1];
    const owned = T.owned[kind].includes(t), eq = T.equipped[kind] === t, afford = save.voxels >= def.price || DEV.unlimited;
    const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
    return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${def.label}"><b>T${t}</b>${eq ? 'Equipped' : owned ? 'Equip' : `${def.price.toLocaleString()} VX`}</button>`;
  };
  const eqE = ENGINE[lg][T.equipped.engine - 1], eqT = TRANSMISSION[lg][T.equipped.trans - 1];
  return `<div class="g-panel blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(W)}${W !== save.carId ? ' (in your garage)' : ''}</small></h2>
      <div class="upg"><h3 class="hd">Engine</h3><div class="desc">${eqE.label} — +${Math.round((eqE.hpMult - 1) * (CARS[W].engineGain ?? 1) * 100)}% power on this car</div><div class="tiers">${TIERS.map(t => tierBtn('engine', t)).join('')}</div></div>
      <div class="upg"><h3 class="hd">Transmission</h3><div class="desc">${eqT.label} — ${eqT.ratios.length} gears, ${eqT.shiftTime.toFixed(2)} s shifts, ${Math.round(eqT.zoneWidth * 100)}% shift zone</div><div class="tiers">${TIERS.map(t => tierBtn('trans', t)).join('')}</div></div>
      <div class="g-note">More part slots (tyres, nitrous, weight) come with the upgrade roadmap.</div></div>`;
}

export const wireUpgrades: Wire = (el, _save, on) => {
  el.querySelectorAll<HTMLButtonElement>('.tier').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as any, +b.dataset.tier! as Tier, ui.work)));
};
