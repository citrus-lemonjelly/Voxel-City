// Garage HUD (owner, 2026-10-18): the car on its turntable in the middle, voxels top-right (car info is in Profile since V0.14.0),
// a bottom bar of icon buttons (mini HUD · Profile · Garage · Catalog · Settings), Patch notes + camera angle
// bottom-left, and a RACE button bottom-right that opens the race menu. Panels open on the right; Catalog, Body Shop and
// My cars put a list on the left.
// This file is the screen shell: layout, which panel shows, and the shared buttons. Each panel has its own file in
// src/ui/panels/ (owner 2026-10-20: one file per feature) — its HTML and its event wiring.
import { SaveV1, typingStats } from '../save/save';
import { typingBadge } from './typingBadge';
import { CARS, carName } from '../data/cars';
import { OpponentDef, typingLeagueOf } from '../data/economy';
import { StageDef } from '../data/stages';
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
import { carLabHtml, wireCarLab, wireSetups } from './panels/carLab';
import { settingsHtml, wireSettings } from './panels/settings';
import { profileHtml, wireProfile } from './panels/profile';
import { dailyHtml, calendarHtml, wireDaily } from './panels/daily';
import { notesHtml } from './panels/notes';

export type { GarageHandlers } from './panels/shared';
export { resetGarageUI, garageInCatalog, garageOpenStrip } from './panels/shared';
export { factoryTwin } from './panels/bodyShop';

/** Every panel's wiring, run on each render (each only finds its own buttons). Order kept from the single-file version. */
const WIRES: Wire[] = [wireMiniHud, wireRaceMenu, wireStrip, wireUpgrades, wireCarLab, wireSetups, wireMyCars, wireSettings, wireDaily, wireBodyShop, wireCatalog, wireProfile];

export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  if (!ui.work || !save.cars[ui.work]) ui.work = save.carId;
  if (!ui.gsel || !save.cars[ui.gsel] || !ui.panel) ui.gsel = save.carId;   // home screen: the sub-tabs act on the car you drive
  const vx = DEV.unlimited ? '∞' : save.voxels.toLocaleString(), gcam = save.settings.gcam ?? 'd';
  const redraw = () => renderGarage(root, save, opp, stage, on);
  root.innerHTML = '';
  const inCat = ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage';
  const el = h(`<div id="garage" class="${inCat ? 'catalog-mode' : ui.panel === 'strip' ? 'strip-mode' : ''}${ui.panel ? '' : ' home-mode'}">
    ${inCat ? `<div class="g-title"><div class="hd screen-title">Garage${ui.panel === 'parts' ? ` · ${carName(ui.work)}` : ''}</div><h1 class="hd">${ui.panel === 'parts' ? 'Body Shop' : ui.panel === 'garage' ? 'My cars' : 'Catalog'}</h1></div>` : ''}
    <div class="g-wallet"><span class="voxels">${vx} VX</span><span class="crowns">${crownIcon()}${DEV.unlimited ? '∞' : save.crowns.toLocaleString()}</span><span class="g-rec">Best ${save.raceDist} m ${save.best[save.raceDist] ? fmtTime(save.best[save.raceDist]!) : '—'} · ${save.wins}–${save.races - save.wins}</span></div>
    <div class="g-bar">${miniHud(save)}${(['profile', 'garage', 'catalog', 'settings'] as const).map(k => `<div class="g-tabwrap"><button class="g-tab ${ui.panel === k ? 'on' : ''}" data-panel="${k}">${icon(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span></button>${k === 'garage' ? subTabsHtml(save) : ''}</div>`).join('')}</div>
    <button class="g-notesbtn ${ui.panel === 'notes' ? 'on' : ''}" id="notesBtn" title="Patch notes" aria-label="Patch notes">${icon('notes', 2)}<span>V${VERSION}</span>${save.seenVersion !== VERSION ? '<em class="g-new">New</em>' : ''}</button>
    <button class="g-cambtn" id="camBtn" title="Camera angle ${gcam.toUpperCase()} (${GARAGE_CAMS[gcam].label}) — click for the next angle" aria-label="Camera angle">${icon('camera', 2)}<span>Cam ${gcam.toUpperCase()}</span></button>
    <button class="g-racebtn" id="raceBtn" aria-label="Race"><span class="rb-face"><i class="rb-ic rb-wheel">${icon('parts', 2)}</i><span>Race</span><i class="rb-ic rb-gear">${icon('settings', 2)}</i></span></button>
    <button class="g-typebtn ${ui.raceMenu === 'typing' ? 'on' : ''}" id="typingBtn" aria-label="Type"><span class="tb-face">${typingBadge(typingLeagueOf(typingStats(save).xp ?? 0).i, 1.25)}<span class="tb-label">Type</span><span class="tb-keys" aria-hidden="true"><i>A</i><i>S</i><i>D</i></span></span></button>
    ${raceMenuHtml(save, opp, stage)}
    ${ui.panel === 'strip' ? stripHtml(save, on) : ui.panel === 'parts' ? partsHtml(save, on) : ui.panel === 'garage' ? garageHtml(save, on) : panelHtml(save, on)}
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));
  menuLayout(el);

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
  // V0.19.0: TYPE (under Race) opens the Typing menu; again closes it. (RACE opens the city map since V0.20.0.)
  const openMenu = (m: 'typing') => {
    if (ui.panel) {
      if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || ui.back) on.onPreview(null);
      ui.panel = null; ui.back = null; ui.dial = false; on.onView('home'); ui.raceMenu = m;
    } else ui.raceMenu = ui.raceMenu === m ? false : m;
    redraw();
  };
  el.querySelector('#raceBtn')!.addEventListener('click', () => on.onMap());                     // V0.20.0: RACE opens the city map
  el.querySelector('#typingBtn')!.addEventListener('click', () => openMenu('typing'));
  el.querySelectorAll<HTMLButtonElement>('.g-close').forEach(b => b.addEventListener('click', () => {
    if (ui.back) { ui.panel = ui.back; ui.back = null; ui.work = save.carId; on.onPreview(lookOf(save, ui.gsel)); on.onView('mycars'); return redraw(); }
    if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage') on.onPreview(null); on.onView('home'); ui.panel = null; ui.dial = false; redraw();
  }));
  for (const wire of WIRES) wire(el, save, on, redraw);
}

/** Garage layout (V0.13.0, owner 2026-10-21): Menu · Notes · Cam in the bottom-left; Menu opens the side rail (tabs + the
 *  2×2 mini square: Spin · Daily · Calendar · Door); the Garage sub-tabs sit beside Menu · Notes · Cam; each panel title
 *  gets its icon. Runs before the wiring, so the moved buttons keep working. Looks: ui/themeBevel.ts. */
const PANEL_ICON: Record<string, string> = { profile: 'profile', upgrades: 'upgrades', lab: 'upgrades', settings: 'settings', daily: 'tasks', calendar: 'daily', notes: 'notes' };
/** Is the side rail open? Phones: closed on start; Menu toggles it; picking a tab, clicking outside it or Esc closes it (owner Q185).
 *  PCs (owner 2026-10-22, V0.15.0): the rail is always up the left side and the Menu button is hidden. */
let railOpen = false, railEl: HTMLElement | null = null;
const railPinned = () => !document.documentElement.classList.contains('vc-phone');
const MENU_ICON = `<svg width="24" height="24" viewBox="0 0 12 12" shape-rendering="crispEdges"><rect x="1" y="2" width="10" height="2" fill="currentColor"/><rect x="1" y="5" width="10" height="2" fill="currentColor"/><rect x="1" y="8" width="10" height="2" fill="currentColor"/></svg>`;
function setRail(open: boolean) {
  if (railPinned()) open = true;
  railOpen = open;
  if (!railEl) return;
  railEl.classList.toggle('rail-open', open);
  const m = railEl.querySelector('#menuBtn'); m?.classList.toggle('on', open); m?.setAttribute('aria-expanded', String(open));
  if (open) m?.querySelector('.g-dot')?.remove();
}
// a click anywhere outside the rail closes it, and the click still does what it was for (on 'click', not 'pointerdown',
// so a list that slides back under the mouse can't swallow it)
document.addEventListener('click', e => { if (railOpen && railEl?.isConnected && !(e.target as Element).closest?.('.g-bar, #menuBtn')) setRail(false); }, true);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && railOpen && railEl?.isConnected) setRail(false); });
function menuLayout(el: HTMLElement) {
  railEl = el; if (railPinned()) railOpen = true;
  const bar = el.querySelector('.g-bar'), mini = el.querySelector('.g-mini');
  if (bar && mini) bar.appendChild(mini);
  const util = h(`<div class="g-util"></div>`);
  const dot = !railOpen && el.querySelector('.g-bar .g-dot') ? '<em class="g-dot"></em>' : '';      // something to claim inside
  const menu = h(`<button class="g-mb g-menubtn ${railOpen ? 'on' : ''}" id="menuBtn" aria-label="Menu" aria-expanded="${railOpen}">${MENU_ICON}<span>Menu</span>${dot}</button>`);
  menu.addEventListener('click', () => setRail(!railOpen));
  util.appendChild(menu);
  el.classList.toggle('rail-open', railOpen);
  bar?.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => { railOpen = railPinned(); }));   // runs before the redraw
  const sub = el.querySelector('.g-tabwrap .g-sub'); if (sub) el.appendChild(sub);                 // sub-tabs beside Menu · Notes · Cam
  // Settings sits beside Patch notes, not in the rail (owner 2026-10-21): Menu · Notes · Settings · Cam
  const set = el.querySelector<HTMLElement>('.g-bar [data-panel="settings"]'), setWrap = set?.closest('.g-tabwrap');
  for (const b of [el.querySelector('#notesBtn'), set]) if (b) util.appendChild(b);
  setWrap?.remove();
  // the camera is a small icon just left of Race (owner 2026-10-21)
  const raceSide = h(`<div class="g-raceside"><div class="g-racestack"></div></div>`), stack = raceSide.firstElementChild!;
  const cam = el.querySelector('#camBtn'); if (cam) raceSide.insertBefore(cam, stack);
  for (const b of [el.querySelector('#raceBtn'), el.querySelector('#typingBtn')]) if (b) stack.appendChild(b);   // Typing sits under Race (V0.19.0)
  el.appendChild(raceSide);
  el.appendChild(util);
  const t = el.querySelector('.g-panel>h2.hd'), k = ui.panel && PANEL_ICON[ui.panel];
  if (t && k) t.insertAdjacentHTML('afterbegin', icon(k, 1.6));
}

/** The right-hand panels (and the Catalog), by bottom-bar tab. */
function panelHtml(save: SaveV1, on: GarageHandlers): string {
  const close = `<button class="g-close" aria-label="Close">✕</button>`;
  switch (ui.panel) {
    case 'upgrades': return upgradesHtml(save, close);
    case 'lab': return carLabHtml(save, close);
    case 'daily': return dailyHtml(save, close);
    case 'calendar': return calendarHtml(save, close);
    case 'settings': return settingsHtml(save, close);
    case 'notes': return notesHtml(close);
    case 'profile': return profileHtml(save, close);
    case 'catalog': return catalogHtml(save, on, close);
    default: return '';
  }
}
