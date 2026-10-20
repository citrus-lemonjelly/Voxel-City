// Garage HUD (owner, 2026-10-18): the car on its turntable in the middle, car name top-left, voxels top-right,
// a bottom bar of four icon buttons (Profile · Upgrades · Catalog · Settings) and a RACE button bottom-right that opens
// Street Race / Typing Race (Coming soon, Q69). Panels open on the right; the Catalog (Q76) is a scrolling car list on the
// left with the turntable on the right, paint swatches and the car's optional features under it.
import { SaveV1, RACE_DISTS, RaceDist, typingStats, carTiers } from '../save/save';
import { ENGINE, TRANSMISSION, TIERS, Tier } from '../data/parts';
import { CARS, CATALOG_ORDER, LEAGUES, carBody, carBrand, carName, carPaint } from '../data/cars';
import { DEV } from './devConsole';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { carStats, displayStats } from '../game/stats';
import { BODY_OPTIONS, stockParts } from '../render/bodies';
import { infoRows, garageRows } from '../game/carInfo';
import { STRIP, levelInfo, decalName } from '../game/strip';
import { DIFFICULTY, Difficulty, racePay, cosmeticPrice, typingPay } from '../data/economy';
import { averageWpm, averageFor } from '../game/typing';
import { PART_SLOTS, SOON_SLOTS, partsFor, PART_BY_ID, STOCK_PART, SLOT_VIEW, PartSlot, lookParts, VISUAL_PARTS, ownsPart, isFactory, VisualPart } from '../data/visualParts';
import { CarLook, STOCK_LOOK } from '../render/carBuilder';
import { CHANGELOG, VERSION } from '../data/changelog';

const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const fmtTime = (s: number) => s.toFixed(3) + ' s';

export interface GarageHandlers {
  onBuyOrEquip(kind: 'engine' | 'trans', tier: Tier, carId: string): void;
  /** Garage (owner 2026-10-19): ★ a car */
  onFav(id: string): void;
  onRace(): void;
  /** The Strip: race the next rung; and what that rung is (null = this league's Strip is done). */
  onStrip(): void;
  stripNext(): import('../game/strip').Rung | null;
  onSetting(key: string, value: string): void;
  /** show a car on the turntable (Catalog preview) or put the player's car back (null) */
  onPreview(look: CarLook | null): void;
  onView(v: 'home' | 'catalog' | 'panel' | 'strip' | 'mycars'): void;
  /** claim a cleared Strip level's one-time reward */
  onClaim(n: number): void;
  /** Catalog (Q79): buy a car with the paint/options picked; use an owned car; save paint/options on an owned car. */
  onBuyCar(id: string, paint: string, opts: Record<string, string>): void;
  onUseCar(id: string): void;
  onCarStyle(id: string, paint: string, opts: Record<string, string>): void;
  /** Street Race length (600 / 700 / 800 m). */
  onDistance(d: RaceDist): void;
  /** Street Race difficulty (Easy / Medium / Hard). */
  onDifficulty(d: Difficulty): void;
  /** 3D still of a car (Catalog cards, Q78; Parts cards aim at the part, Q113). */
  thumb(look: CarLook, view?: import('../data/visualParts').ThumbView): string;
  /** Visual parts: buy (then fit) / fit an owned part on the car in use. */
  onBuyPart(id: string, carId: string): void;
  onFitPart(id: string, carId: string): void;
  /** the car in use as it looks now (Parts preview starts from it) */
  playerLook(): CarLook;
  /** Typing Race (owner 2026-10-19). */
  onTyping(): void;
  /** Patch notes opened: remember the version so the NEW tag goes away. */
  onNotesSeen(): void;
}
type Panel = 'profile' | 'garage' | 'upgrades' | 'parts' | 'catalog' | 'settings' | 'strip' | 'notes' | null;
/** UI state that survives re-renders (buying a part re-draws the screen). */
// work = the car Parts / Upgrades act on (the one in use, or the one picked in the Garage); back = panel to return to
const ui = { panel: null as Panel, back: null as Panel, work: '', gsel: '', dial: false, favOnly: false, raceMenu: false, part: { slot: 'spoiler' as PartSlot, sel: '' }, cat: { id: 'panda_civix', paint: '', opts: {} as Record<string, string> } };
export function resetGarageUI() { ui.panel = null; ui.back = null; ui.dial = false; ui.raceMenu = false; }
export const garageInCatalog = () => ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || !!ui.back;
/** Open the Strip screen on the next garage render (results → "The Strip"). */
export function garageOpenStrip() { ui.panel = 'strip'; ui.raceMenu = false; stripFocus = true; }

const SETTING_ROWS: [string, string, [string, string][]][] = [
  ['camera', 'Race camera', [['dynamic', 'Dynamic'], ['close', 'Dynamic close']]],
  ['time', 'Time of day', [['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']]],
  ['nearSide', 'Near side', [['mixed', 'Mixed'], ['curb', 'Curb'], ['barrier', 'Barrier']]],
  ['blur', 'Speed blur', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']]],
];

// ---- block icons (12 × 12; 1 = light, 2 = accent) ----
const ICONS: Record<string, string[]> = {
  profile: ['000111111000', '001111111100', '011111111110', '011111111110', '112222222211', '112222222211', '111111111111', '111111111111', '011111111110', '001111111100', '001100001100', '011100001110'],   // racing helmet
  upgrades: ['000000001100', '000000011110', '000000110110', '000001100110', '000011111100', '000111111000', '001111100000', '011111000000', '111110000000', '111100000000', '011000000000', '000000000000'],  // wrench
  catalog: ['000000000000', '000000000000', '000011111000', '000111111100', '001122122110', '011111111111', '111111111111', '111111111111', '011101111011', '001000000100', '000000000000', '000000000000'],   // car
  settings: ['000011110000', '001011110100', '011111111110', '001111111100', '111110011111', '111100001111', '111100001111', '111110011111', '001111111100', '011111111110', '001011110100', '000011110000'], // gear
};
ICONS.parts = ['000011110000', '001122221100', '011200002110', '012000000210', '120001100021', '120011110021', '120011110021', '120001100021', '012000000210', '011200002110', '001122221100', '000011110000'];   // wheel rim
// garage: roof and a roller door
ICONS.garage = ['000001100000', '000111111000', '011111111110', '111111111111', '110000000011', '110222222011', '110000000011', '110222222011', '110000000011', '110222222011', '110000000011', '110000000011'];
ICONS.crown = ['000000000000', '010001000100', '011001100110', '011101110110', '011111111110', '011111111110', '012112112110', '011111111110', '011111111110', '000000000000', '000000000000', '000000000000'];
ICONS.notes = ['011111112000', '011111112200', '011111112220', '011111111110', '011111111110', '011000000110', '011111111110', '011000001110', '011111111110', '011000000110', '011111111110', '011111111110'];   // paper with a folded corner
const icon = (k: string, px = 3) => `<svg width="${12 * px}" height="${12 * px}" viewBox="0 0 12 12" shape-rendering="crispEdges">${ICONS[k].map((row, y) => [...row].map((b, x) => b === '0' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${b === '2' ? 'var(--accent)' : 'currentColor'}"/>`).join('')).join('')}</svg>`;

const PAINTS: [string, string][] = [['#d23a2a', 'Race red'], ['#f2a43a', 'Sunset orange'], ['#f2c230', 'VOX yellow'], ['#2f9a5a', 'Racing green'], ['#1f8a8a', 'Teal'], ['#3b6fa8', 'Aegean blue'], ['#1f4fa8', 'Rally blue'], ['#6a3ad2', 'Violet'], ['#b83a7a', 'Magenta'], ['#eeeae0', 'Chalk white'], ['#8e9bb3', 'Steel grey'], ['#5a5e66', 'Gunmetal'], ['#1a1a1e', 'Midnight']];
const TYPE_SUB: Record<string, string> = { panda_civix: 'Hot hatch', city: 'City car', supermini: 'Supermini', classic: 'Classic hatch', premium: 'Premium hatch', sporthatch: 'Sport fastback', perfhatch: 'Performance hatch', sedan: 'Sport sedan', compact: 'Sport coupe', muscle: 'Muscle coupe', pony: 'Pony car', rally: 'Rally sedan', tuner: 'Tuner coupe', hyper: 'Hypercar' };
/** Body profile a car is drawn with ('civix' = the original builder). */
const profileOf = (id: string) => carBody(id).profile ?? 'civix';
/** The car as the Catalog shows it: an owned car in its saved paint/options, otherwise factory. */
const lookOf = (save: SaveV1, id: string, paint?: string, opts?: Record<string, string>): CarLook => {
  const c = save.cars[id];
  return { ...STOCK_LOOK, body: profileOf(id), paint: paint || c?.paint || carPaint(id), opts: { ...(opts ?? c?.opts ?? {}) }, parts: lookParts(c?.parts) };
};
const catLook = (save: SaveV1) => lookOf(save, ui.cat.id, ui.cat.paint, ui.cat.opts);
/** Select a car in the Catalog (owned cars start from their saved paint/options). */
const pickCar = (save: SaveV1, id: string) => { const c = save.cars[id]; ui.cat = { id, paint: c?.paint || '', opts: { ...(c?.opts || {}) } }; };
const price = (n: number) => n.toLocaleString() + ' VX';
const crownIcon = () => `<i class="crown-ic">${icon('crown', 1.4)}</i>`;
/** A car's price in its own currency (Voxels, or Crowns for Crowns-only cars). */
const carPrice = (id: string) => CARS[id].currency === 'crowns' ? `${crownIcon()}${CARS[id].price.toLocaleString()} Crowns` : price(CARS[id].price);
const wallet = (save: SaveV1, id: string) => CARS[id].currency === 'crowns' ? save.crowns : save.voxels;
const CHARACTER: Record<string, string> = { dash: 'Best at short dashes', long: 'Best over the full 800 m', balanced: 'All-rounder' };

export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  const car = CARS[save.carId];
  if (!ui.work || !save.cars[ui.work]) ui.work = save.carId;
  if (!ui.gsel || !save.cars[ui.gsel]) ui.gsel = save.carId;
  const st = displayStats(carStats(save.carId, save.equipped.engine, save.equipped.trans));
  const vx = DEV.unlimited ? '∞' : save.voxels.toLocaleString();
  root.innerHTML = '';
  const inCat = ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage';
  const el = h(`<div id="garage" class="${inCat ? 'catalog-mode' : ui.panel === 'strip' ? 'strip-mode' : ''}">
    <div class="g-title">${inCat ? `<div class="hd screen-title">Garage${ui.panel === 'parts' ? ` · ${carName(ui.work)}` : ''}</div><h1 class="hd">${ui.panel === 'parts' ? 'Parts' : ui.panel === 'garage' ? 'My cars' : 'Catalog'}</h1>`
      : `<div class="hd screen-title">${carBrand(save.carId)} · League ${car.league}</div><h1 class="hd">${carName(save.carId)}</h1>
      <div class="g-stats"><span><b>${st.hp}</b> hp</span><span><b>${st.shifts}</b> shifts</span><span><b>${st.shiftTime.toFixed(2)}s</b> shift</span><span><b>${(st.redline / 1000).toFixed(1)}k</b> redline</span></div>`}</div>
    <div class="g-wallet"><span class="voxels">${vx} VX</span><span class="crowns">${crownIcon()}${DEV.unlimited ? '∞' : save.crowns.toLocaleString()}</span><span class="g-rec">Best ${save.raceDist} m ${save.best[save.raceDist] ? fmtTime(save.best[save.raceDist]!) : '—'} · ${save.wins}–${save.races - save.wins}</span></div>
    <div class="g-bar">${(['profile', 'garage', 'upgrades', 'catalog', 'settings'] as const).map(k => `<button class="g-tab ${ui.panel === k ? 'on' : ''}" data-panel="${k}">${icon(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span></button>`).join('')}</div>
    <button class="g-notesbtn ${ui.panel === 'notes' ? 'on' : ''}" id="notesBtn" title="Patch notes" aria-label="Patch notes">${icon('notes', 2)}<span>V${VERSION}</span>${save.seenVersion !== VERSION ? '<em class="g-new">New</em>' : ''}</button>
    <button class="btn race g-racebtn" id="raceBtn">Race ▸</button>
    ${ui.raceMenu ? `<div class="g-racemenu">
      <button class="g-mode blk" id="streetRace"><span class="hd">${stage.races[save.raceDiff]}</span><span class="g-mode-sub">Street Race · ${stage.name} · ${save.raceDist} m · ${DIFFICULTY[save.raceDiff].label}<br>vs ${opp.name} · ${carName(opp.carId)} · win +${racePay(car.league, save.raceDiff, true).result.toLocaleString()} VX</span><span class="g-go">Go ▸</span></button>
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Difficulty">${(Object.keys(DIFFICULTY) as Difficulty[]).map(d => `<button class="${save.raceDiff === d ? 'on' : ''}" data-diff="${d}">${DIFFICULTY[d].label}</button>`).join('')}</div>
        <div class="g-dist seg" role="group" aria-label="Race length">${RACE_DISTS.map(d => `<button class="${save.raceDist === d ? 'on' : ''}" data-dist="${d}">${d} m</button>`).join('')}</div></div>
      ${stripCard(save)}
      <button class="g-mode blk" id="typingRace"><span class="hd">Typing Race</span><span class="g-mode-sub">${stage.name} · ${DIFFICULTY[save.raceDiff].label} · 5 racers · your ${DIFFICULTY[save.raceDiff].label} average ${Math.round(averageFor(typingStats(save), save.raceDiff))} wpm<br>Type to drive · win +${typingPay(car.league, save.raceDiff, 1, false, 0).result.toLocaleString()} VX</span><span class="g-go">Go ▸</span></button>
    </div>` : ''}
    ${ui.panel === 'strip' ? stripHtml(save, on) : ui.panel === 'parts' ? partsHtml(save, on) : ui.panel === 'garage' ? garageHtml(save, on) : panelHtml(save, on)}
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));

  // ---- wiring ----
  el.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.panel as Panel, was = ui.panel, back = ui.back;
    ui.panel = was === k && !back ? null : k; ui.raceMenu = false; ui.back = null; ui.dial = false;
    if (ui.panel !== 'parts') ui.work = save.carId;                                   // bottom-bar Upgrades = the car in use
    if (ui.panel === 'garage') { ui.gsel = save.carId; on.onPreview(lookOf(save, ui.gsel)); }
    if (back && !ui.panel) on.onPreview(null);
    if (ui.panel === 'catalog' && was !== 'catalog') { pickCar(save, save.carId); on.onPreview(catLook(save)); }
    if (ui.panel === 'parts' && was !== 'parts') { ui.part.sel = save.cars[ui.work]?.parts[ui.part.slot] ?? STOCK_PART[ui.part.slot]; on.onPreview(partLook(save, ui.part.sel)); }
    if ((was === 'catalog' || was === 'parts' || was === 'garage' || back) && ui.panel !== was && ui.panel !== 'garage') on.onPreview(null);
    on.onView(ui.panel === 'catalog' || ui.panel === 'parts' ? 'catalog' : ui.panel === 'garage' ? 'mycars' : ui.panel ? 'panel' : 'home');   // Garage: whole car centred, pulled back
    renderGarage(root, save, opp, stage, on);
  }));
  el.querySelector('#notesBtn')!.addEventListener('click', () => {
    if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || ui.back) on.onPreview(null);
    ui.panel = ui.panel === 'notes' ? null : 'notes'; ui.raceMenu = false; ui.back = null;
    if (ui.panel === 'notes' && save.seenVersion !== VERSION) on.onNotesSeen();
    on.onView('home'); renderGarage(root, save, opp, stage, on);
  });
  // Race overrides everything (owner V0.1.2): close any open panel / Catalog / Parts / Strip / notes, then toggle the race menu
  el.querySelector('#raceBtn')!.addEventListener('click', () => {
    if (ui.panel) {
      if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || ui.back) on.onPreview(null);
      ui.panel = null; ui.back = null; ui.dial = false; on.onView('home'); ui.raceMenu = true;
    } else ui.raceMenu = !ui.raceMenu;
    renderGarage(root, save, opp, stage, on);
  });
  el.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(b => b.addEventListener('click', () => on.onDifficulty(b.dataset.diff as Difficulty)));
  el.querySelectorAll<HTMLButtonElement>('[data-dist]').forEach(b => b.addEventListener('click', () => on.onDistance(+b.dataset.dist! as RaceDist)));
  el.querySelector('#stripOpen')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); ui.panel = 'strip'; ui.raceMenu = false; stripFocus = true; on.onView('strip'); renderGarage(root, save, opp, stage, on); });
  el.querySelector('#stripGo')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onStrip(); });
  el.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(b => b.addEventListener('click', () => on.onClaim(+b.dataset.claim!)));
  // the scroller: arrows, mouse wheel and drag all slide it sideways; cards snap into place
  const track = el.querySelector<HTMLElement>('.strip-track');
  if (track) {
    const cardW = () => (track.querySelector('.sl-card') as HTMLElement).offsetWidth + 12;
    el.querySelectorAll<HTMLButtonElement>('[data-scroll]').forEach(b => b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.scroll! * cardW() * 3, behavior: 'smooth' })));
    track.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); track.scrollBy({ left: e.deltaY }); } }, { passive: false });
    let drag: { x: number; left: number; moved: boolean } | null = null;
    track.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('button')) return; drag = { x: e.clientX, left: track.scrollLeft, moved: false }; track.setPointerCapture(e.pointerId); track.classList.add('dragging'); });
    track.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 3) drag.moved = true; track.scrollLeft = drag.left - dx; });
    const endDrag = () => { if (drag) { drag = null; track.classList.remove('dragging'); } };
    track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag);
    // open on the level you're up to (centred); keep your place when the screen redraws (e.g. after a claim)
    const focus = track.querySelector<HTMLElement>('.sl-card.claim') ?? track.querySelector<HTMLElement>('.sl-card.next') ?? track.lastElementChild as HTMLElement;
    track.scrollLeft = stripFocus || stripScroll < 0 ? focus.offsetLeft - (track.clientWidth - focus.offsetWidth) / 2 : stripScroll;
    stripFocus = false;
    track.addEventListener('scroll', () => (stripScroll = track.scrollLeft));
  }
  el.querySelector('#typingRace')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(); });
  el.querySelector('#streetRace')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onRace(); });
  el.querySelectorAll<HTMLButtonElement>('.g-close').forEach(b => b.addEventListener('click', () => {
    if (ui.back) { ui.panel = ui.back; ui.back = null; ui.work = save.carId; on.onPreview(lookOf(save, ui.gsel)); on.onView('mycars'); return renderGarage(root, save, opp, stage, on); }
    if (ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage') on.onPreview(null); on.onView('home'); ui.panel = null; ui.dial = false; renderGarage(root, save, opp, stage, on);
  }));
  el.querySelectorAll<HTMLButtonElement>('.tier').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as any, +b.dataset.tier! as Tier, ui.work)));
  // ---- Garage (owner 2026-10-19): pick a car → dial Drive / Parts / Upgrade; ◀ ▶; ★ favourites ----
  const gPick = (id: string, dial = true) => { ui.gsel = id; ui.dial = dial; on.onPreview(lookOf(save, id)); renderGarage(root, save, opp, stage, on); };
  el.querySelectorAll<HTMLElement>('[data-fav]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); on.onFav(b.dataset.fav!); }));
  el.querySelectorAll<HTMLButtonElement>('[data-gcar]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.gcar!; if (id === ui.gsel) { ui.dial = !ui.dial; renderGarage(root, save, opp, stage, on); } else gPick(id); }));
  // keep the dial beside the picked card (and follow the list as it scrolls; hide it when the card scrolls away)
  const gl = el.querySelector<HTMLElement>('.gr-list'), gd = el.querySelector<HTMLElement>('.gr-dial');
  const placeDial = () => {
    const c = gl?.querySelector<HTMLElement>('.gr-card.on'); if (!gd || !c || !gl) return;
    const r = c.getBoundingClientRect(), L = gl.getBoundingClientRect(), host = el.getBoundingClientRect(), mid = r.top + r.height / 2;
    gd.style.left = `${L.right - host.left + 6}px`; gd.style.top = `${mid - host.top - 75}px`;
    gd.style.visibility = mid > L.top + 20 && mid < L.bottom - 20 ? 'visible' : 'hidden';
  };
  if (gl) { gl.scrollTop = garScroll; gl.addEventListener('scroll', () => { garScroll = gl.scrollTop; placeDial(); }); }
  requestAnimationFrame(placeDial);
  el.querySelector('#gFavOnly')?.addEventListener('click', () => { ui.favOnly = !ui.favOnly; const ids = garageCars(save); if (ids.length && !ids.includes(ui.gsel)) { ui.gsel = ids[0]; on.onPreview(lookOf(save, ui.gsel)); } renderGarage(root, save, opp, stage, on); });
  el.querySelector('#gDrive')?.addEventListener('click', () => { ui.dial = false; on.onUseCar(ui.gsel); });
  el.querySelector('#gParts')?.addEventListener('click', () => {
    ui.work = ui.gsel; ui.back = 'garage'; ui.panel = 'parts'; ui.dial = false; partScroll = 0;
    ui.part.sel = save.cars[ui.work]?.parts[ui.part.slot] ?? STOCK_PART[ui.part.slot]; on.onPreview(partLook(save, ui.part.sel)); renderGarage(root, save, opp, stage, on);
  });
  el.querySelector('#gUpg')?.addEventListener('click', () => { ui.work = ui.gsel; ui.back = 'garage'; ui.panel = 'upgrades'; ui.dial = false; on.onView('panel'); renderGarage(root, save, opp, stage, on); });
  el.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b => b.addEventListener('click', () => on.onSetting(b.dataset.set!, b.dataset.val!)));
  // catalog
  const restyle = () => { on.onPreview(catLook(save)); if (save.cars[ui.cat.id]) on.onCarStyle(ui.cat.id, ui.cat.paint, ui.cat.opts); else renderGarage(root, save, opp, stage, on); };
  el.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(b => b.addEventListener('click', () => { pickCar(save, b.dataset.car!); on.onPreview(catLook(save)); renderGarage(root, save, opp, stage, on); }));
  el.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(b => b.addEventListener('click', () => { ui.cat.paint = b.dataset.paint!; restyle(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach(b => b.addEventListener('click', () => { ui.cat.opts[b.dataset.opt!] = b.dataset.val!; restyle(); }));
  el.querySelector('#buyCar')?.addEventListener('click', () => on.onBuyCar(ui.cat.id, ui.cat.paint, { ...ui.cat.opts }));
  el.querySelector('#useCar')?.addEventListener('click', () => on.onUseCar(ui.cat.id));
  // parts
  el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => b.addEventListener('click', () => { ui.part.slot = b.dataset.slot as PartSlot; ui.part.sel = save.cars[ui.work]?.parts[ui.part.slot] ?? STOCK_PART[ui.part.slot]; partScroll = 0; on.onPreview(partLook(save, ui.part.sel)); renderGarage(root, save, opp, stage, on); }));
  el.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b => b.addEventListener('click', () => { ui.part.sel = b.dataset.part!; on.onPreview(partLook(save, ui.part.sel)); renderGarage(root, save, opp, stage, on); }));
  el.querySelector('#buyPart')?.addEventListener('click', () => on.onBuyPart(ui.part.sel, ui.work));
  el.querySelector('#fitPart')?.addEventListener('click', () => on.onFitPart(ui.part.sel, ui.work));
  const plist = el.querySelector<HTMLElement>('.pt-list'); if (plist) { plist.scrollTop = partScroll; plist.addEventListener('scroll', () => (partScroll = plist.scrollTop)); }
  const list = el.querySelector('.cat-list'); if (list) list.scrollTop = catScroll; list?.addEventListener('scroll', () => (catScroll = (list as HTMLElement).scrollTop));
}
let catScroll = 0, partScroll = 0, garScroll = 0;

/** The car being worked on wearing one part (Parts preview and card stills). */
function partLook(save: SaveV1, id: string): CarLook {
  const base = lookOf(save, ui.work || save.carId), p = PART_BY_ID[id]; if (!p) return base;
  const parts = { ...(base.parts || {}) };
  if (isFactory(p)) delete parts[p.slot]; else parts[p.slot] = p.value;
  return { ...base, parts };
}
const RARITY: Record<string, string> = { common: 'Common', rare: 'Rare', epic: 'Epic' };
/** Parts screen (owner 2026-10-19): side banner tabs by slot, 3D close-up cards of your car wearing each part, buy / fit. */
/** The car's own factory part for a slot, when a catalogue part is the same thing (owner Q114: no duplicates). */
export function factoryTwin(carId: string, slot: PartSlot): VisualPart | undefined {
  const v = (stockParts(profileOf(carId)) as Record<string, string>)[slot];
  return v ? partsFor(slot).find(p => !isFactory(p) && p.value === v) : undefined;
}
function partsHtml(save: SaveV1, on: GarageHandlers): string {
  const W = ui.work || save.carId, slot = ui.part.slot, twin = factoryTwin(W, slot);
  let fitted = save.cars[W]?.parts[slot] ?? STOCK_PART[slot];
  if (twin && fitted === twin.id) fitted = STOCK_PART[slot];                       // fitting the factory twin = factory
  const sel = PART_BY_ID[ui.part.sel === twin?.id ? STOCK_PART[slot] : ui.part.sel] ?? PART_BY_ID[fitted];
  ui.part.sel = sel.id;
  const owns = (id: string) => ownsPart(id, save.partsOwned, save.decals);
  const priceTag = (id: string) => { const c = cosmeticPrice(id); return c.currency === 'crowns' ? `${crownIcon()}${c.price} Crowns` : `${c.price.toLocaleString()} VX`; };
  const can = (id: string) => { const c = cosmeticPrice(id); return DEV.unlimited || (c.currency === 'crowns' ? save.crowns : save.voxels) >= c.price; };
  const tabs = PART_SLOTS.map(t => `<button class="pt-tab ${t.id === slot ? 'on' : ''}" data-slot="${t.id}">${t.label}</button>`).join('')
    + SOON_SLOTS.map(t => `<span class="pt-tab soon" title="Coming soon">${t}</span>`).join('');
  const nameOf = (p: VisualPart) => isFactory(p) && twin ? (twin.value === 'none' ? `${p.name} · none` : `${p.name} · ${twin.name}`) : p.name;
  const shown = partsFor(slot).filter(p => p !== twin && (!p.won || owns(p.id)));    // boss decals appear once won
  const lockedWon = partsFor(slot).filter(p => p.won && !owns(p.id)).length;
  const cards = shown.map(p => {
    const tag = fitted === p.id ? '<em class="cat-tag use">Fitted</em>' : owns(p.id) ? `<em class="cat-tag own">${p.won ? 'Won' : 'Owned'}</em>` : `<em class="cat-tag ${can(p.id) ? '' : 'short'} ${cosmeticPrice(p.id).currency === 'crowns' ? 'cr' : ''}">${priceTag(p.id)}</em>`;
    return `<button class="cat-card pt-card ${p.id === sel.id ? 'on' : ''}" data-part="${p.id}"><img class="cat-thumb" alt="" src="${on.thumb(partLook(save, p.id), p.view ?? SLOT_VIEW[slot])}">
      <span class="cat-row"><b>${nameOf(p)}</b>${tag}</span><span class="pt-rar ${p.rarity}">${p.won ? 'Strip boss' : RARITY[p.rarity]}</span></button>`;
  }).join('') + (lockedWon ? `<div class="pt-more g-note">${lockedWon} boss decals left to win — beat the boss on every 10th Strip level.</div>` : '');
  const action = fitted === sel.id ? `<button class="btn cat-act" disabled>Fitted</button>`
    : owns(sel.id) ? `<button class="btn race cat-act" id="fitPart">Fit to ${carName(W)}</button>`
    : `<button class="btn race cat-act" id="buyPart" ${can(sel.id) ? '' : 'disabled'}>Buy · ${priceTag(sel.id)}</button>`;
  return `<div class="pt-tabs blk">${tabs}</div><div class="cat-list pt-list blk">${cards}</div>
    <div class="cat-under"><button class="g-close" aria-label="Close">✕</button>
      <div class="cat-name"><b class="hd">${nameOf(sel)}</b><span>${PART_SLOTS.find(t => t.id === slot)!.label} · ${sel.won ? 'Strip boss decal' : RARITY[sel.rarity]} · ${isFactory(sel) && twin ? (twin.value === 'none' ? 'This car has none from the factory.' : `This car comes with the ${twin.name} from the factory.`) : sel.blurb}</span></div>
      <div class="cat-buy">${action}<span class="g-note">Bought once, fits every car · looks only — no effect on speed</span></div>
    </div>`;
}

/** Owned cars for the Garage list: favourites first, then by league and catalogue order; optionally favourites only. */
function garageCars(save: SaveV1): string[] {
  const favs = save.favs ?? [], order = [...CATALOG_ORDER, ...Object.keys(CARS).filter(k => CARS[k].unique)];
  const ids = Object.keys(save.cars).filter(id => CARS[id] && (!ui.favOnly || favs.includes(id)));
  const rank = (id: string) => (favs.includes(id) ? 0 : 1000) + LEAGUES.indexOf(CARS[id].league) * 100 + order.indexOf(id);
  return ids.sort((a, b) => rank(a) - rank(b));
}
/** Garage (owner 2026-10-19): your cars in a list on the left, the picked car on the turntable with ◀ ▶, a small stats box
 *  beside it (grey = stock, green = what your upgrades add) and a dial: Drive / Parts / Upgrade. ★ favourites + filter. */
function garageHtml(save: SaveV1, on: GarageHandlers): string {
  const ids = garageCars(save), favs = save.favs ?? [], id = ui.gsel, spec = CARS[id], T = carTiers(save, id);
  const card = (cid: string) => {
    const c = CARS[cid], t = carTiers(save, cid), use = save.carId === cid, fav = favs.includes(cid);
    const tag = use ? '<em class="cat-tag use">Driving</em>' : c.unique ? '<em class="cat-tag own">Boss car</em>' : `<em class="cat-tag own">League ${c.league}</em>`;
    return `<button class="cat-card gr-card ${cid === id ? 'on' : ''}" data-gcar="${cid}"><img class="cat-thumb" alt="" src="${on.thumb(lookOf(save, cid))}">
      <span class="cat-row"><b>${carName(cid)}</b>${tag}</span><span class="gr-sub">${c.unique ? 'No upgrades' : `Engine T${t.equipped.engine} · Gearbox T${t.equipped.trans}`}</span>
      <i class="gr-star ${fav ? 'on' : ''}" data-fav="${cid}" title="${fav ? 'Remove from favourites' : 'Add to favourites'}">★</i></button>`;
  };
  const list = ids.length ? ids.map(card).join('') : `<div class="g-note gr-empty">${ui.favOnly ? 'No favourites yet — tap ★ on a car.' : 'No cars yet.'}</div>`;
  const more = Object.keys(save.cars).length < 2 ? `<div class="g-note gr-empty">Buy more cars in the Catalog ▸</div>` : '';
  const rows = garageRows(id, T.equipped.engine, T.equipped.trans);
  const pc = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);
  // grey = stock; green = what your upgrades add; red = what they cost (e.g. shorter gears trade top speed for pull)
  const bars = rows.map(r => { const lo = pc(Math.min(r.base, r.now)), hi = pc(Math.max(r.base, r.now)), worse = r.now < r.base - 1e-6;
    return `<div class="gr-stat"><span>${r.label}</span><b>${r.value}</b><i><u style="width:${lo}%"></u><s class="${worse ? 'worse' : ''}" style="left:${lo}%;width:${hi - lo}%"></s></i></div>`; }).join('');
  const use = save.carId === id;
  // the dial pops out to the right of the picked card (owner drawing): Drive / Parts / Upgrade, fanned from the card
  const dial = ui.dial ? `<div class="gr-dial" style="visibility:hidden"><div class="gr-fan"><i class="in"></i><i class="rail"></i><i style="top:18px"></i><i style="top:72px"></i><i style="top:126px"></i></div>
      <div class="gr-dbtns"><button class="gr-dbtn drive" id="gDrive" ${use ? 'disabled' : ''}><b>${use ? 'Driving' : 'Drive'}</b><span>${use ? 'in use' : 'race in it'}</span></button>
      <button class="gr-dbtn" id="gParts"><b>Parts</b><span>looks</span></button>
      <button class="gr-dbtn" id="gUpg" ${spec.unique ? 'disabled' : ''}><b>Upgrade</b><span>${spec.unique ? 'boss car' : 'engine · gears'}</span></button></div></div>`
    : `<div class="gr-pick g-note">Click a car to Drive · Parts · Upgrade</div>`;
  return `<div class="cat-list gr-list blk"><div class="gr-head"><b class="hd">${ids.length} car${ids.length === 1 ? '' : 's'}</b><button class="gr-favonly ${ui.favOnly ? 'on' : ''}" id="gFavOnly">★ Favourites only</button></div>${list}${more}</div>
    <div class="gr-info blk"><button class="g-close" aria-label="Close">✕</button>
      <div class="gr-name"><b class="hd">${carName(id)}</b><span>${spec.unique ? 'Boss car' : `${carBrand(id)} · ${TYPE_SUB[id] ?? ''}`} · League ${spec.league}</span></div>
      <div class="gr-stats">${bars}</div>
      <div class="gr-key"><span><u></u>Stock</span><span><s></s>Upgrades add</span><span><em></em>Upgrades cost</span></div>
    </div>${dial}`;
}

/** Race-menu card for the Strip: opens the Strip screen (owner: a sliding level scroller, like CSR). */
function stripCard(save: SaveV1): string {
  const lg = CARS[save.carId].league, done = save.strip[lg] ?? 0, total = STRIP.rungs;
  const toClaim = Array.from({ length: done }, (_, i) => i + 1).filter(n => !(save.stripClaimed[lg] ?? []).includes(n)).length;
  const bar = `<i class="g-strip-bar"><u style="width:${Math.round(done / total * 100)}%"></u></i>`;
  return `<button class="g-mode blk" id="stripOpen"><span class="hd">The Strip</span>
    <span class="g-mode-sub">League ${lg} · ${done >= total ? 'complete' : `Level ${done + 1} of ${total}`}${toClaim ? ` · <b class="g-claimable">${toClaim} reward${toClaim > 1 ? 's' : ''} to claim</b>` : ''}</span>${bar}<span class="g-go">Open ▸</span></button>`;
}

/** The Strip screen: every level as a card on a sideways scroller — cleared / claim / race / locked. */
function stripHtml(save: SaveV1, on: GarageHandlers): string {
  const lg = CARS[save.carId].league, done = save.strip[lg] ?? 0, claimed = save.stripClaimed[lg] ?? [], next = on.stripNext();
  const cards = Array.from({ length: STRIP.rungs }, (_, i) => {
    const n = i + 1, L = levelInfo(lg, n), state = n <= done ? (claimed.includes(n) ? 'done' : 'claim') : n === done + 1 ? 'next' : 'locked';
    const R = L.reward, rewards = `<span class="sl-rw"><b>+${(R.vx + R.cash).toLocaleString()} VX</b>${R.crowns ? `<b class="cr">${crownIcon()}+${R.crowns}</b>` : ''}</span>`
      + (R.decal || R.car ? `<span class="sl-extra">${R.decal ? `<em>Decal · ${decalName(R.decal)}</em>` : ''}${R.car ? `<em class="car">Boss car · ${carName(R.car)}</em>` : ''}</span>` : '');
    const foot = state === 'done' ? `<span class="sl-st ok">Cleared ✓ · claimed</span>`
      : state === 'claim' ? `<button class="btn sl-btn" data-claim="${n}">Claim</button>`
      : state === 'next' ? `<button class="btn race sl-btn" id="stripGo">Race ▸</button>`
      : `<span class="sl-st">Locked</span>`;
    const rival = state === 'next' && next ? `vs ${next.rival.name} · ${carName(next.rival.carId)}` : `vs ${L.name}`;
    return `<div class="sl-card ${state}${L.boss ? ' boss' : ''}" data-level="${n}">
      <span class="sl-top"><b class="hd">Level ${n}</b>${L.boss ? '<em class="g-boss">Boss</em>' : ''}</span>
      <span class="sl-dist">${L.dist} m</span><span class="sl-rival">${rival}</span>${rewards}${foot}</div>`;
  }).join('');
  return `<div class="strip-wrap">
    <div class="sl-head"><h2 class="hd">The Strip</h2><span>League ${lg} · ${done} of ${STRIP.rungs} cleared · each level is harder than the last</span><button class="g-close" aria-label="Close">✕</button></div>
    <div class="sl-row"><button class="sl-arrow" data-scroll="-1" aria-label="Scroll left">◀</button><div class="strip-track">${cards}</div><button class="sl-arrow" data-scroll="1" aria-label="Scroll right">▶</button></div>
    <i class="g-strip-bar sl-bar"><u style="width:${Math.round(done / STRIP.rungs * 100)}%"></u></i>
  </div>`;
}
let stripScroll = -1, stripFocus = false;

function panelHtml(save: SaveV1, on: GarageHandlers): string {
  const close = `<button class="g-close" aria-label="Close">✕</button>`;
  const W = ui.work || save.carId;
  if (ui.panel === 'upgrades' && CARS[W].unique) return `<div class="g-panel blk">${close}<h2 class="hd">Upgrades</h2><div class="g-note">${carName(W)} is a Strip boss car: it comes tuned as it is and can't be upgraded. It gives you a head start in League ${CARS[W].league}; upgraded cars will soon catch it.</div></div>`;
  if (ui.panel === 'upgrades') {
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
  if (ui.panel === 'settings') return `<div class="g-panel blk">${close}<h2 class="hd">Settings</h2><div class="settings">${SETTING_ROWS.map(([key, label, opts]) => `<div class="setrow"><span>${label}</span><div class="seg">${opts.map(([v, t]) => `<button class="${(save.settings as any)[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="g-note">Controls: hold <b>SPACE</b> (or the gas pedal) to rev, release on green to launch · <b>SPACE</b> shifts up · <b>SHIFT</b> shifts down.</div></div>`;
  if (ui.panel === 'notes') {
    const KINDS = [['added', 'Added'], ['changed', 'Changed'], ['fixed', 'Fixed'], ['removed', 'Removed']] as const;
    return `<div class="g-panel g-notes blk">${close}<h2 class="hd">Patch notes <small class="g-sub">Current V${VERSION}</small></h2>
      ${CHANGELOG.map(v => `<section class="pn-ver ${v.header ? 'big' : ''}">${v.header ? `<div class="pn-banner hd">${v.header}</div>` : ''}<div class="pn-head"><b class="hd">V${v.version}</b><span>${v.title}</span><time>${v.date}</time></div>
        ${KINDS.filter(([k]) => v[k]?.length).map(([k, label]) => `<div class="pn-kind pn-${k}">${label}</div><ul>${v[k]!.map(t => `<li>${t.replace(/</g, '&lt;')}</li>`).join('')}</ul>`).join('')}</section>`).join('')}</div>`;
  }
  if (ui.panel === 'profile') {
    const rate = save.races ? Math.round(save.wins / save.races * 100) + '%' : '—';
    return `<div class="g-panel blk">${close}<h2 class="hd">Profile</h2>
      <div class="g-avatar"><div class="g-avatar-box">${icon('profile', 7)}</div><div><b class="hd">Driver</b><span>League ${CARS[save.carId].league}</span><span class="g-note">Avatar comes with the avatar system.</span></div></div>
      <div class="g-grid"><div><b>${save.races}</b><span>races</span></div><div><b>${save.wins}</b><span>wins</span></div><div><b>${rate}</b><span>win rate</span></div>
        ${RACE_DISTS.map(d => `<div><b>${save.best[d] ? fmtTime(save.best[d]!) : '—'}</b><span>best ${d} m</span></div>`).join('')}<div><b>${save.perfectShifts}</b><span>perfect shifts</span></div><div><b>${typingStats(save).best ? Math.round(typingStats(save).best) : '—'}</b><span>best wpm</span></div><div><b>${typingStats(save).races ? Math.round(averageWpm(typingStats(save).recent)) : '—'}</b><span>avg wpm (10)</span></div><div><b>${typingStats(save).wins}/${typingStats(save).races}</b><span>typing wins</span></div><div><b>${DEV.unlimited ? '∞' : save.voxels.toLocaleString()}</b><span>voxels</span></div></div></div>`;
  }
  if (ui.panel === 'catalog') {
    const id = ui.cat.id, spec = CARS[id], paint = ui.cat.paint || save.cars[id]?.paint || carPaint(id), opts = BODY_OPTIONS[profileOf(id)] || [];
    const owned = !!save.cars[id], inUse = save.carId === id, afford = DEV.unlimited || wallet(save, id) >= spec.price;
    const card = (cid: string) => {
      const c = CARS[cid], own = !!save.cars[cid], use = save.carId === cid, can = DEV.unlimited || wallet(save, cid) >= c.price;
      const tag = use ? '<em class="cat-tag use">In use</em>' : own ? `<em class="cat-tag own">${c.unique ? 'Boss car' : 'Owned'}</em>` : `<em class="cat-tag ${can ? '' : 'short'} ${c.currency === 'crowns' ? 'cr' : ''}">${carPrice(cid)}</em>`;
      return `<button class="cat-card ${cid === id ? 'on' : ''}" data-car="${cid}"><img class="cat-thumb" alt="" src="${on.thumb(lookOf(save, cid))}"><span class="cat-row"><b>${carName(cid)}</b>${tag}</span></button>`;
    };
    const action = inUse ? `<button class="btn cat-act" disabled>In use</button>`
      : owned ? `<button class="btn race cat-act" id="useCar">Use this car</button>`
      : `<button class="btn race cat-act" id="buyCar" ${afford ? '' : 'disabled'}>Buy · ${carPrice(id)}</button>${afford ? '' : `<span class="cat-short">Need ${(spec.price - wallet(save, id)).toLocaleString()} more ${spec.currency === 'crowns' ? 'Crowns' : 'VX'}</span>`}`;
    const LEAGUE_NAME: Record<string, string> = { D: 'Hatchbacks', C: 'Muscle', B: 'Street racers', A: 'Tuners · GTs · Super sports', S: 'Hypercars' };
    const order = [...CATALOG_ORDER, ...Object.keys(save.cars).filter(k => CARS[k]?.unique)].sort((a, b) => LEAGUES.indexOf(CARS[a].league) - LEAGUES.indexOf(CARS[b].league));
    const list = order.map((cid, i) => (i === 0 || CARS[order[i - 1]].league !== CARS[cid].league
      ? `<div class="cat-league"><b class="hd">League ${CARS[cid].league}</b><span>${LEAGUE_NAME[CARS[cid].league]}</span></div>` : '') + card(cid)).join('');
    return `<div class="cat-list blk">${list}</div>
      <div class="cat-under">${close}
        <div class="cat-name"><b class="hd">${carName(id)}</b><span>${spec.unique ? 'Boss car · won on the Strip · no upgrades' : `${carBrand(id)} · ${TYPE_SUB[id] ?? ''}`} · ${spec.hp} hp · ${spec.massKg.toLocaleString()} kg · ${spec.drive} · League ${spec.league} · ${CHARACTER[spec.character ?? 'balanced']}${spec.currency === 'crowns' ? ' · Crowns only' : ''}</span></div>
        <div class="cat-stats">${infoRows(id).map(r => `<div class="cs"><span>${r.label}</span><b>${r.value}</b><i><u style="width:${Math.round(r.bar * 100)}%"></u></i></div>`).join('')}</div>
        <div class="cat-paints">${PAINTS.map(([c, n]) => `<button class="swatch ${c === paint ? 'on' : ''}" data-paint="${c}" title="${n}" style="background:${c}"></button>`).join('')}</div>
        ${opts.length ? `<div class="cat-opts">${opts.map(o => `<div class="setrow"><span>${o.label}</span><div class="seg">${o.values.map(([v, t]) => `<button class="${(ui.cat.opts[o.id] ?? o.values[0][0]) === v ? 'on' : ''}" data-opt="${o.id}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>` : `<div class="g-note">No optional features on this body yet.</div>`}
        <div class="cat-buy">${action}<span class="g-note">${owned ? 'Paint and options save to this car.' : 'Paint and options you pick here come with the car.'}</span></div>
      </div>`;
  }
  return '';
}
