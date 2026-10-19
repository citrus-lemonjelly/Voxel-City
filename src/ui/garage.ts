// Garage HUD (owner, 2026-10-18): the car on its turntable in the middle, car name top-left, voxels top-right,
// a bottom bar of four icon buttons (Profile · Upgrades · Catalog · Settings) and a RACE button bottom-right that opens
// Street Race / Typing Race (Coming soon, Q69). Panels open on the right; the Catalog (Q76) is a scrolling car list on the
// left with the turntable on the right, paint swatches and the car's optional features under it.
import { SaveV1 } from '../save/save';
import { ENGINE, TRANSMISSION, TIERS, Tier } from '../data/parts';
import { CARS, CATALOG_ORDER, carBody, carBrand, carName, carPaint } from '../data/cars';
import { DEV } from './devConsole';
import { OpponentDef } from '../data/economy';
import { StageDef } from '../data/stages';
import { carStats, displayStats } from '../game/stats';
import { BODY_OPTIONS } from '../render/bodies';
import { CarLook, STOCK_LOOK } from '../render/carBuilder';

const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const fmtTime = (s: number) => s.toFixed(3) + ' s';

export interface GarageHandlers {
  onBuyOrEquip(kind: 'engine' | 'trans', tier: Tier): void;
  onRace(): void;
  onSetting(key: string, value: string): void;
  /** show a car on the turntable (Catalog preview) or put the player's car back (null) */
  onPreview(look: CarLook | null): void;
  onView(v: 'home' | 'catalog' | 'panel'): void;
  /** Catalog (Q79): buy a car with the paint/options picked; use an owned car; save paint/options on an owned car. */
  onBuyCar(id: string, paint: string, opts: Record<string, string>): void;
  onUseCar(id: string): void;
  onCarStyle(id: string, paint: string, opts: Record<string, string>): void;
  /** 3D still of a car for the Catalog cards (Q78). */
  thumb(look: CarLook): string;
}
type Panel = 'profile' | 'upgrades' | 'catalog' | 'settings' | null;
/** UI state that survives re-renders (buying a part re-draws the screen). */
const ui = { panel: null as Panel, raceMenu: false, cat: { id: 'panda_civix', paint: '', opts: {} as Record<string, string> } };
export function resetGarageUI() { ui.panel = null; ui.raceMenu = false; }
export const garageInCatalog = () => ui.panel === 'catalog';

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
const icon = (k: string, px = 3) => `<svg width="${12 * px}" height="${12 * px}" viewBox="0 0 12 12" shape-rendering="crispEdges">${ICONS[k].map((row, y) => [...row].map((b, x) => b === '0' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${b === '2' ? 'var(--accent)' : 'currentColor'}"/>`).join('')).join('')}</svg>`;

const PAINTS: [string, string][] = [['#d23a2a', 'Race red'], ['#f2a43a', 'Sunset orange'], ['#f2c230', 'VOX yellow'], ['#2f9a5a', 'Racing green'], ['#1f8a8a', 'Teal'], ['#3b6fa8', 'Aegean blue'], ['#1f4fa8', 'Rally blue'], ['#6a3ad2', 'Violet'], ['#b83a7a', 'Magenta'], ['#eeeae0', 'Chalk white'], ['#8e9bb3', 'Steel grey'], ['#5a5e66', 'Gunmetal'], ['#1a1a1e', 'Midnight']];
const TYPE_SUB: Record<string, string> = { panda_civix: 'Hot hatch', city: 'City car', supermini: 'Supermini', classic: 'Classic hatch', premium: 'Premium hatch', sporthatch: 'Sport fastback', sedan: 'Sport sedan', compact: 'Sport coupe', muscle: 'Muscle coupe', pony: 'Pony car', rally: 'Rally sedan', tuner: 'Tuner coupe', hyper: 'Hypercar' };
/** Body profile a car is drawn with ('civix' = the original builder). */
const profileOf = (id: string) => carBody(id).profile ?? 'civix';
/** The car as the Catalog shows it: an owned car in its saved paint/options, otherwise factory. */
const lookOf = (save: SaveV1, id: string, paint?: string, opts?: Record<string, string>): CarLook => {
  const c = save.cars[id];
  return { ...STOCK_LOOK, body: profileOf(id), paint: paint || c?.paint || carPaint(id), opts: { ...(opts ?? c?.opts ?? {}) } };
};
const catLook = (save: SaveV1) => lookOf(save, ui.cat.id, ui.cat.paint, ui.cat.opts);
/** Select a car in the Catalog (owned cars start from their saved paint/options). */
const pickCar = (save: SaveV1, id: string) => { const c = save.cars[id]; ui.cat = { id, paint: c?.paint || '', opts: { ...(c?.opts || {}) } }; };
const price = (n: number) => n.toLocaleString() + ' VX';

export function renderGarage(root: HTMLElement, save: SaveV1, opp: OpponentDef, stage: StageDef, on: GarageHandlers, toast?: string) {
  const car = CARS[save.carId];
  const st = displayStats(carStats(save.carId, save.equipped.engine, save.equipped.trans));
  const vx = DEV.unlimited ? '∞' : save.voxels.toLocaleString();
  root.innerHTML = '';
  const inCat = ui.panel === 'catalog';
  const el = h(`<div id="garage" class="${inCat ? 'catalog-mode' : ''}">
    <div class="g-title">${inCat ? `<div class="hd screen-title">Garage</div><h1 class="hd">Catalog</h1>`
      : `<div class="hd screen-title">${carBrand(save.carId)} · League ${car.league}</div><h1 class="hd">${carName(save.carId)}</h1>
      <div class="g-stats"><span><b>${st.hp}</b> hp</span><span><b>${st.shifts}</b> shifts</span><span><b>${st.shiftTime.toFixed(2)}s</b> shift</span><span><b>${(st.redline / 1000).toFixed(1)}k</b> redline</span></div>`}</div>
    <div class="g-wallet"><span class="voxels">${vx} VX</span><span class="g-rec">Best ${save.bestTime ? fmtTime(save.bestTime) : '—'} · ${save.wins}–${save.races - save.wins}</span></div>
    <div class="g-bar">${(['profile', 'upgrades', 'catalog', 'settings'] as const).map(k => `<button class="g-tab ${ui.panel === k ? 'on' : ''}" data-panel="${k}">${icon(k)}<span>${k[0].toUpperCase() + k.slice(1)}</span></button>`).join('')}</div>
    <button class="btn race g-racebtn" id="raceBtn">Race ▸</button>
    ${ui.raceMenu ? `<div class="g-racemenu">
      <button class="g-mode blk" id="streetRace"><span class="hd">Street Race</span><span class="g-mode-sub">vs ${opp.name} · ${carName(opp.carId)} · engine T${opp.engineTier} · box T${opp.transTier}<br>${stage.name} · ${stage.distanceM} m · new rival every race</span><span class="g-go">Go ▸</span></button>
      <div class="g-mode blk off"><span class="hd">Typing Race</span><span class="g-mode-sub">Race by typing — words per minute drive your car</span><span class="g-soon">Coming soon</span></div>
    </div>` : ''}
    ${panelHtml(save, on)}
  </div>`);
  root.appendChild(el);
  if (toast) root.appendChild(h(`<div class="toast blk">${toast}</div>`));

  // ---- wiring ----
  el.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.panel as Panel, was = ui.panel;
    ui.panel = was === k ? null : k; ui.raceMenu = false;
    if (ui.panel === 'catalog' && was !== 'catalog') { pickCar(save, save.carId); on.onPreview(catLook(save)); }
    if (was === 'catalog' && ui.panel !== 'catalog') on.onPreview(null);
    on.onView(ui.panel === 'catalog' ? 'catalog' : ui.panel ? 'panel' : 'home');
    renderGarage(root, save, opp, stage, on);
  }));
  el.querySelector('#raceBtn')!.addEventListener('click', () => { ui.raceMenu = !ui.raceMenu; renderGarage(root, save, opp, stage, on); });
  el.querySelector('#streetRace')?.addEventListener('click', () => { if (ui.panel === 'catalog') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onRace(); });
  el.querySelectorAll<HTMLButtonElement>('.g-close').forEach(b => b.addEventListener('click', () => { if (ui.panel === 'catalog') on.onPreview(null); on.onView('home'); ui.panel = null; renderGarage(root, save, opp, stage, on); }));
  el.querySelectorAll<HTMLButtonElement>('.tier').forEach(b => b.addEventListener('click', () => on.onBuyOrEquip(b.dataset.kind as any, +b.dataset.tier! as Tier)));
  el.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b => b.addEventListener('click', () => on.onSetting(b.dataset.set!, b.dataset.val!)));
  // catalog
  const restyle = () => { on.onPreview(catLook(save)); if (save.cars[ui.cat.id]) on.onCarStyle(ui.cat.id, ui.cat.paint, ui.cat.opts); else renderGarage(root, save, opp, stage, on); };
  el.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(b => b.addEventListener('click', () => { pickCar(save, b.dataset.car!); on.onPreview(catLook(save)); renderGarage(root, save, opp, stage, on); }));
  el.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(b => b.addEventListener('click', () => { ui.cat.paint = b.dataset.paint!; restyle(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach(b => b.addEventListener('click', () => { ui.cat.opts[b.dataset.opt!] = b.dataset.val!; restyle(); }));
  el.querySelector('#buyCar')?.addEventListener('click', () => on.onBuyCar(ui.cat.id, ui.cat.paint, { ...ui.cat.opts }));
  el.querySelector('#useCar')?.addEventListener('click', () => on.onUseCar(ui.cat.id));
  const list = el.querySelector('.cat-list'); if (list) list.scrollTop = catScroll; list?.addEventListener('scroll', () => (catScroll = (list as HTMLElement).scrollTop));
}
let catScroll = 0;

function panelHtml(save: SaveV1, on: GarageHandlers): string {
  const close = `<button class="g-close" aria-label="Close">✕</button>`;
  if (ui.panel === 'upgrades') {
    const lg = CARS[save.carId].league;
    const tierBtn = (kind: 'engine' | 'trans', t: Tier) => {
      const def = (kind === 'engine' ? ENGINE[lg] : TRANSMISSION[lg])[t - 1];
      const owned = save.owned[kind].includes(t), eq = save.equipped[kind] === t, afford = save.voxels >= def.price || DEV.unlimited;
      const cls = eq ? 'equipped' : owned ? 'owned' : afford ? '' : 'locked';
      return `<button class="tier ${cls}" data-kind="${kind}" data-tier="${t}" title="${def.label}"><b>T${t}</b>${eq ? 'Equipped' : owned ? 'Equip' : `${def.price.toLocaleString()} VX`}</button>`;
    };
    const eqE = ENGINE[lg][save.equipped.engine - 1], eqT = TRANSMISSION[lg][save.equipped.trans - 1];
    return `<div class="g-panel blk">${close}<h2 class="hd">Upgrades <small class="g-sub">League ${lg} parts · ${carName(save.carId)}</small></h2>
      <div class="upg"><h3 class="hd">Engine</h3><div class="desc">${eqE.label} — +${Math.round((eqE.hpMult - 1) * 100)}% power</div><div class="tiers">${TIERS.map(t => tierBtn('engine', t)).join('')}</div></div>
      <div class="upg"><h3 class="hd">Transmission</h3><div class="desc">${eqT.label} — ${eqT.ratios.length} gears, ${eqT.shiftTime.toFixed(2)} s shifts, ${Math.round(eqT.zoneWidth * 100)}% shift zone</div><div class="tiers">${TIERS.map(t => tierBtn('trans', t)).join('')}</div></div>
      <div class="g-note">More part slots (tyres, nitrous, weight) come with the upgrade roadmap.</div></div>`;
  }
  if (ui.panel === 'settings') return `<div class="g-panel blk">${close}<h2 class="hd">Settings</h2><div class="settings">${SETTING_ROWS.map(([key, label, opts]) => `<div class="setrow"><span>${label}</span><div class="seg">${opts.map(([v, t]) => `<button class="${(save.settings as any)[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="g-note">Controls: hold <b>SPACE</b> (or the gas pedal) to rev, release on green to launch · <b>SPACE</b> shifts up · <b>SHIFT</b> shifts down.</div></div>`;
  if (ui.panel === 'profile') {
    const rate = save.races ? Math.round(save.wins / save.races * 100) + '%' : '—';
    return `<div class="g-panel blk">${close}<h2 class="hd">Profile</h2>
      <div class="g-avatar"><div class="g-avatar-box">${icon('profile', 7)}</div><div><b class="hd">Driver</b><span>League ${CARS[save.carId].league}</span><span class="g-note">Avatar comes with the avatar system.</span></div></div>
      <div class="g-grid"><div><b>${save.races}</b><span>races</span></div><div><b>${save.wins}</b><span>wins</span></div><div><b>${rate}</b><span>win rate</span></div>
        <div><b>${save.bestTime ? fmtTime(save.bestTime) : '—'}</b><span>best 800 m</span></div><div><b>${save.perfectShifts}</b><span>perfect shifts</span></div><div><b>${DEV.unlimited ? '∞' : save.voxels.toLocaleString()}</b><span>voxels</span></div></div></div>`;
  }
  if (ui.panel === 'catalog') {
    const id = ui.cat.id, spec = CARS[id], paint = ui.cat.paint || save.cars[id]?.paint || carPaint(id), opts = BODY_OPTIONS[profileOf(id)] || [];
    const owned = !!save.cars[id], inUse = save.carId === id, afford = DEV.unlimited || save.voxels >= spec.price;
    const card = (cid: string) => {
      const c = CARS[cid], own = !!save.cars[cid], use = save.carId === cid, can = DEV.unlimited || save.voxels >= c.price;
      const tag = use ? '<em class="cat-tag use">In use</em>' : own ? '<em class="cat-tag own">Owned</em>' : `<em class="cat-tag ${can ? '' : 'short'}">${price(c.price)}</em>`;
      return `<button class="cat-card ${cid === id ? 'on' : ''}" data-car="${cid}"><img class="cat-thumb" alt="" src="${on.thumb(lookOf(save, cid))}"><span class="cat-row"><b>${carName(cid)}</b>${tag}</span></button>`;
    };
    const action = inUse ? `<button class="btn cat-act" disabled>In use</button>`
      : owned ? `<button class="btn race cat-act" id="useCar">Use this car</button>`
      : `<button class="btn race cat-act" id="buyCar" ${afford ? '' : 'disabled'}>Buy · ${price(spec.price)}</button>${afford ? '' : `<span class="cat-short">Need ${price(spec.price - save.voxels)} more</span>`}`;
    const LEAGUE_NAME: Record<string, string> = { D: 'Hatchbacks', C: 'Muscle', B: 'Street racers', A: 'Tuners · GTs · Super sports', S: 'Hypercars' };
    const list = CATALOG_ORDER.map((cid, i) => (i === 0 || CARS[CATALOG_ORDER[i - 1]].league !== CARS[cid].league
      ? `<div class="cat-league"><b class="hd">League ${CARS[cid].league}</b><span>${LEAGUE_NAME[CARS[cid].league]}</span></div>` : '') + card(cid)).join('');
    return `<div class="cat-list blk">${list}</div>
      <div class="cat-under">${close}
        <div class="cat-name"><b class="hd">${carName(id)}</b><span>${carBrand(id)} · ${TYPE_SUB[id] ?? ''} · ${spec.hp} hp · ${spec.massKg.toLocaleString()} kg · ${spec.drive} · League ${spec.league}</span></div>
        <div class="cat-paints">${PAINTS.map(([c, n]) => `<button class="swatch ${c === paint ? 'on' : ''}" data-paint="${c}" title="${n}" style="background:${c}"></button>`).join('')}</div>
        ${opts.length ? `<div class="cat-opts">${opts.map(o => `<div class="setrow"><span>${o.label}</span><div class="seg">${o.values.map(([v, t]) => `<button class="${(ui.cat.opts[o.id] ?? o.values[0][0]) === v ? 'on' : ''}" data-opt="${o.id}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>` : `<div class="g-note">No optional features on this body yet.</div>`}
        <div class="cat-buy">${action}<span class="g-note">${owned ? 'Paint and options save to this car.' : 'Paint and options you pick here come with the car.'}</span></div>
      </div>`;
  }
  return '';
}
