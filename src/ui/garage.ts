// Garage HUD (owner, 2026-10-18): the car on its turntable in the middle, car name top-left, voxels top-right,
// a bottom bar of icon buttons (mini HUD · Profile · Garage · Catalog · Settings), Patch notes + camera angle
// bottom-left, and a RACE button bottom-right that opens the race menu. Panels open on the right; Catalog, Body Shop and
// My cars put a list on the left.
// This file is the screen shell: layout, which panel shows, and the shared buttons. Each panel has its own file in
// src/ui/panels/ (owner 2026-10-20: one file per feature) — its HTML and its event wiring.
import { SaveV1 } from '../save/save';
import { CARS, carBrand, carName } from '../data/cars';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { carStats, displayStats } from '../game/stats';
import { GARAGE_CAMS, GarageCam } from '../render/scene';
import { VERSION } from '../data/changelog';
import { DEV } from './devConsole';
import { ui, h, fmtTime, icon, crownIcon, lookOf, catLook, pickCar, GarageHandlers, Panel, Wire } from './panels/shared';
import { miniHud, wireMiniHud } from './panels/miniHud';
import { raceMenuHtml, wireRaceMenu } from './panels/raceMenu';
import { stripHtml, wireStrip } from './panels/strip';
import { partsHtml, wireBodyShop, curSel, partLook } from './panels/bodyShop';
import { garageHtml, subTabsHtml, wireMyCars } from './panels/myCars';
import { catalogHtml, wireCatalog } from './panels/catalog';
import { upgradesHtml, wireUpgrades } from './panels/upgrades';
import { settingsHtml, wireSettings } from './panels/settings';
import { profileHtml } from './panels/profile';
import { dailyHtml, calendarHtml, wireDaily } from './panels/daily';
import { notesHtml } from './panels/notes';

export type { GarageHandlers } from './panels/shared';
export { resetGarageUI, garageInCatalog, garageOpenStrip } from './panels/shared';
export { factoryTwin } from './panels/bodyShop';

/** Every panel's wiring, run on each render (each only finds its own buttons). Order kept from the single-file version. */
const WIRES: Wire[] = [wireMiniHud, wireRaceMenu, wireStrip, wireUpgrades, wireMyCars, wireSettings, wireDaily, wireBodyShop, wireCatalog];

export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  const car = CARS[save.carId];
  if (!ui.work || !save.cars[ui.work]) ui.work = save.carId;
  if (!ui.gsel || !save.cars[ui.gsel]) ui.gsel = save.carId;
  const st = displayStats(carStats(save.carId, save.equipped.engine, save.equipped.trans));
  const vx = DEV.unlimited ? '∞' : save.voxels.toLocaleString(), gcam = save.settings.gcam ?? 'd';
  const redraw = () => renderGarage(root, save, opp, stage, on);
  root.innerHTML = '';
  const inCat = ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage';
  const el = h(`<div id="garage" class="${inCat ? 'catalog-mode' : ui.panel === 'strip' ? 'strip-mode' : ''}">
    <div class="g-title">${inCat ? `<div class="hd screen-title">Garage${ui.panel === 'parts' ? ` · ${carName(ui.work)}` : ''}</div><h1 class="hd">${ui.panel === 'parts' ? 'Body Shop' : ui.panel === 'garage' ? 'My cars' : 'Catalog'}</h1>`
      : `<div class="hd screen-title">${carBrand(save.carId)} · League ${car.league}</div><h1 class="hd">${carName(save.carId)}</h1>
      <div class="g-stats"><span><b>${st.hp}</b> hp</span><span><b>${st.shifts}</b> shifts</span><span><b>${st.shiftTime.toFixed(2)}s</b> shift</span><span><b>${(st.redline / 1000).toFixed(1)}k</b> redline</span></div>`}</div>
    <div class="g-wallet"><span class="voxels">${vx} VX</span><span class="crowns">${crownIcon()}${DEV.unlimited ? '∞' : save.crowns.toLocaleString()}</span><span class="g-rec">Best ${save.raceDist} m ${save.best[save.raceDist] ? fmtTime(save.best[save.raceDist]!) : '—'} · ${save.wins}–${save.races - save.wins}</span></div>
    <div class="g-bar">${miniHud(save)}${(['profile', 'garage', 'catalog', 'settings'] as const).map(k => `<div class="g-tabwrap"><button class="g-tab ${ui.panel === k ? 'on' : ''}" data-panel="${k}">${icon(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span></button>${k === 'garage' ? subTabsHtml(save) : ''}</div>`).join('')}</div>
    <button class="g-notesbtn ${ui.panel === 'notes' ? 'on' : ''}" id="notesBtn" title="Patch notes" aria-label="Patch notes">${icon('notes', 2)}<span>V${VERSION}</span>${save.seenVersion !== VERSION ? '<em class="g-new">New</em>' : ''}</button>
    <button class="g-cambtn" id="camBtn" title="Camera angle ${gcam.toUpperCase()} (${GARAGE_CAMS[gcam].label}) — click for the next angle" aria-label="Camera angle">${icon('camera', 2)}<span>Cam ${gcam.toUpperCase()}</span></button>
    <button class="btn race g-racebtn" id="raceBtn">Race ▸</button>
    ${raceMenuHtml(save, opp, stage)}
    ${ui.panel === 'strip' ? stripHtml(save, on) : ui.panel === 'parts' ? partsHtml(save, on) : ui.panel === 'garage' ? garageHtml(save, on) : panelHtml(save, on)}
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));

  // ---- shared wiring: bottom-bar tabs, Patch notes, camera angle, Race, close buttons ----
  el.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.panel as Panel, was = ui.panel, back = ui.back;
    ui.panel = was === k && !back ? null : k; ui.raceMenu = false; ui.back = null; ui.dial = false;
    if (ui.panel !== 'parts') ui.work = save.carId;
    if (ui.panel === 'garage') { ui.gsel = save.carId; on.onPreview(lookOf(save, ui.gsel)); }
    if (back && !ui.panel) on.onPreview(null);
    if (ui.panel === 'catalog' && was !== 'catalog') { pickCar(save, save.carId); on.onPreview(catLook(save)); }
    if (ui.panel === 'parts' && was !== 'parts') { ui.part.sel = curSel(save); on.onPreview(partLook(save, ui.part.sel)); }
    if ((was === 'catalog' || was === 'parts' || was === 'garage' || back) && ui.panel !== was && ui.panel !== 'garage') on.onPreview(null);
    on.onView(ui.panel === 'catalog' || ui.panel === 'parts' ? 'catalog' : ui.panel === 'garage' ? 'mycars' : ui.panel === 'upgrades' || ui.panel === 'profile' ? ui.panel : ui.panel ? 'panel' : 'home');   // Garage: whole car centred, pulled back; Upgrades faces the bay, Profile the loft (E2)
    redraw();
  }));
  el.querySelector('#notesBtn')!.addEventListener('click', () => {
    if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || ui.back) on.onPreview(null);
    ui.panel = ui.panel === 'notes' ? null : 'notes'; ui.raceMenu = false; ui.back = null;
    if (ui.panel === 'notes' && save.seenVersion !== VERSION) on.onNotesSeen();
    on.onView('home'); redraw();
  });
  el.querySelector('#camBtn')?.addEventListener('click', () => { const ids = Object.keys(GARAGE_CAMS) as GarageCam[]; on.onSetting('gcam', ids[(ids.indexOf(save.settings.gcam ?? 'd') + 1) % ids.length]); });
  // Race overrides everything (owner V0.1.2): close any open panel / Catalog / Parts / Strip / notes, then toggle the race menu
  el.querySelector('#raceBtn')!.addEventListener('click', () => {
    if (ui.panel) {
      if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || ui.back) on.onPreview(null);
      ui.panel = null; ui.back = null; ui.dial = false; on.onView('home'); ui.raceMenu = true;
    } else ui.raceMenu = !ui.raceMenu;
    redraw();
  });
  el.querySelectorAll<HTMLButtonElement>('.g-close').forEach(b => b.addEventListener('click', () => {
    if (ui.back) { ui.panel = ui.back; ui.back = null; ui.work = save.carId; on.onPreview(lookOf(save, ui.gsel)); on.onView('mycars'); return redraw(); }
    if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage') on.onPreview(null); on.onView('home'); ui.panel = null; ui.dial = false; redraw();
  }));
  for (const wire of WIRES) wire(el, save, on, redraw);
}

/** The right-hand panels (and the Catalog), by bottom-bar tab. */
function panelHtml(save: SaveV1, on: GarageHandlers): string {
  const close = `<button class="g-close" aria-label="Close">✕</button>`;
  switch (ui.panel) {
    case 'upgrades': return upgradesHtml(save, close);
    case 'daily': return dailyHtml(save, close);
    case 'calendar': return calendarHtml(save, close);
    case 'settings': return settingsHtml(save, close);
    case 'notes': return notesHtml(close);
    case 'profile': return profileHtml(save, close);
    case 'catalog': return catalogHtml(save, on, close);
    default: return '';
  }
}
