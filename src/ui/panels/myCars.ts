// Garage ▸ My cars (owner 2026-10-19): your cars in a list on the left, the picked car on the turntable, a small stats box
// beside it (grey = stock, green = what your upgrades add, red = what they cost), ★ favourites + filter, Cars / Boss cars
// tabs, garage slots (Q152), and the sub-tabs above the Garage button: Drive / Body Shop / Upgrade / Sell (Q153).
import { SaveV1, carTiers, slotsUsed, slotsTotal, sellBlock } from '../../save/save';
import { CARS, CATALOG_ORDER, LEAGUES, carBrand, carName } from '../../data/cars';
import { GARAGE, sellValue, EcoLeague } from '../../data/economy';
import { garageRows } from '../../game/carInfo';
import { PERF_KINDS } from '../../data/parts';
import { DEV } from '../devConsole';
import { ui, scroll, lookOf, crownIcon, TYPE_SUB, GarageHandlers, Wire } from './shared';
import { curSel, partLook } from './bodyShop';

/** Garage sub-tabs: small buttons that pop up above the Garage button for the picked car. */
export function subTabsHtml(save: SaveV1): string {
  if (ui.panel !== 'garage' || !ui.gsel || !CARS[ui.gsel]) return '';      // owner V0.9.1: shown as soon as the Garage opens
  const use = save.carId === ui.gsel, unique = !!CARS[ui.gsel].unique;
  return `<div class="g-sub blk"><b class="g-sub-name">${carName(ui.gsel)}</b>
    <button class="g-subtab drive" id="gDrive" ${use ? 'disabled' : ''}>${use ? 'Driving' : 'Drive'}</button>
    <button class="g-subtab" id="gParts">Body Shop</button>
    <button class="g-subtab" id="gUpg" ${unique ? 'disabled' : ''}>Upgrade</button>${sellTab(save)}<i class="g-sub-stem"></i></div>`;
}
/** Sell sub-tab (owner Q153): half the car's price + half its upgrades; a second click confirms. */
function sellTab(save: SaveV1): string {
  const id = ui.gsel, why = sellBlock(save, id);
  if (why) return `<button class="g-subtab" id="gSell" disabled title="${why}">Sell</button>`;
  const v = sellValue(CARS[id].league as EcoLeague, CARS[id].price, save.cars[id].owned).toLocaleString();
  return ui.sellArm === id ? `<button class="g-subtab sell arm" id="gSell">Confirm · +${v} VX</button>` : `<button class="g-subtab sell" id="gSell" title="Sell for ${v} VX">Sell</button>`;
}
/** This car's drag-race record (owner Q138; counted from V0.6.1). */
function recHtml(save: SaveV1, id: string): string {
  const r = save.cars[id]?.stats, t = (d: number) => r?.best[d] != null ? r.best[d]!.toFixed(2) : '—';
  return `<span><b>${r?.races ?? 0}</b> races</span><span><b>${r?.wins ?? 0}</b> wins</span><span>Best <b>${t(600)}</b> / <b>${t(700)}</b> / <b>${t(800)}</b> s <em>600 / 700 / 800 m</em></span>`;
}
/** Owned cars for the Garage list: favourites first, then by league and catalogue order; optionally favourites only. */
function garageCars(save: SaveV1): string[] {
  const favs = save.favs ?? [], order = [...CATALOG_ORDER, ...Object.keys(CARS).filter(k => CARS[k].unique)];
  const ids = Object.keys(save.cars).filter(id => CARS[id] && !!CARS[id].unique === (ui.gtab === 'boss') && (!ui.favOnly || favs.includes(id)));
  const rank = (id: string) => (favs.includes(id) ? 0 : 1000) + LEAGUES.indexOf(CARS[id].league) * 100 + order.indexOf(id);
  return ids.sort((a, b) => rank(a) - rank(b));
}
export function garageHtml(save: SaveV1, on: GarageHandlers): string {
  const ids = garageCars(save), favs = save.favs ?? [], id = ui.gsel, spec = CARS[id], T = carTiers(save, id);
  const card = (cid: string) => {
    const c = CARS[cid], t = carTiers(save, cid), use = save.carId === cid, fav = favs.includes(cid);
    const tag = use ? '<em class="cat-tag use">Driving</em>' : c.unique ? '<em class="cat-tag own">Boss car</em>' : `<em class="cat-tag own">League ${c.league}</em>`;
    return `<button class="cat-card gr-card ${cid === id ? 'on' : ''}" data-gcar="${cid}"><img class="cat-thumb" alt="" src="${on.thumb(lookOf(save, cid))}">
      <span class="cat-row"><b>${carName(cid)}</b>${tag}</span><span class="gr-sub">${c.unique ? 'No upgrades' : `Upgrades ${PERF_KINDS.reduce((a, k) => a + t.equipped[k] - 1, 0)}/${PERF_KINDS.length * 4}`}</span>
      <i class="gr-star ${fav ? 'on' : ''}" data-fav="${cid}" title="${fav ? 'Remove from favourites' : 'Add to favourites'}">★</i></button>`;
  };
  const list = ids.length ? ids.map(card).join('') : `<div class="g-note gr-empty">${ui.favOnly ? 'No favourites yet — tap ★ on a car.' : ui.gtab === 'boss' ? 'No boss cars yet — beat the boss at level 60 of a Strip.' : 'No cars yet.'}</div>`;
  const bossN = Object.keys(save.cars).filter(k => CARS[k]?.unique).length, used = slotsUsed(save), total = slotsTotal(save);
  const tabs = `<div class="seg gr-tabs"><button class="${ui.gtab === 'cars' ? 'on' : ''}" data-gtab="cars">Cars ${used}/${total}</button><button class="${ui.gtab === 'boss' ? 'on' : ''}" data-gtab="boss">Boss cars ${bossN}</button></div>`;
  const slot = ui.gtab === 'cars' && total < GARAGE.maxSlots ? `<button class="gr-slot" id="gSlot" ${DEV.unlimited || save.crowns >= GARAGE.slotCrowns ? '' : 'disabled'}>+1 slot · ${crownIcon()}${GARAGE.slotCrowns}</button>` : '';
  const more = Object.keys(save.cars).length < 2 ? `<div class="g-note gr-empty">Buy more cars in the Catalog ▸</div>` : '';
  const rows = garageRows(id, T.equipped);
  const pc = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);
  // grey = stock; green = what your upgrades add; red = what they cost (e.g. shorter gears trade top speed for pull)
  const bars = rows.map(r => { const lo = pc(Math.min(r.base, r.now)), hi = pc(Math.max(r.base, r.now)), worse = r.now < r.base - 1e-6;
    return `<div class="gr-stat"><span>${r.label}</span><b>${r.value}</b><i><u style="width:${lo}%"></u><s class="${worse ? 'worse' : ''}" style="left:${lo}%;width:${hi - lo}%"></s></i></div>`; }).join('');
  return `<div class="cat-list gr-list blk">${tabs}<div class="gr-head"><b class="hd">${ids.length} car${ids.length === 1 ? '' : 's'}</b>${slot}<button class="gr-favonly ${ui.favOnly ? 'on' : ''}" id="gFavOnly">★ Favourites</button></div>${list}${ui.gtab === 'cars' ? more : ''}</div>
    <div class="gr-info blk"><button class="g-close" aria-label="Close">✕</button>
      <div class="gr-name"><b class="hd">${carName(id)}</b><span>${spec.unique ? 'Boss car' : `${carBrand(id)} · ${TYPE_SUB[id] ?? ''}`} · League ${spec.league}</span></div>
      <div class="gr-rec">${recHtml(save, id)}</div>
      <div class="gr-stats">${bars}</div>
      <div class="gr-key"><span><u></u>Stock</span><span><s></s>Upgrades add</span><span><em></em>Upgrades cost</span></div>
    </div>`;
}

export const wireMyCars: Wire = (el, save, on, redraw) => {
  const gPick = (id: string, dial = true) => { ui.gsel = id; ui.dial = dial; ui.sellArm = ''; on.onPreview(lookOf(save, id)); redraw(); };
  el.querySelectorAll<HTMLElement>('[data-fav]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); on.onFav(b.dataset.fav!); }));
  el.querySelectorAll<HTMLButtonElement>('[data-gcar]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.gcar!; if (id !== ui.gsel) gPick(id); }));
  const gl = el.querySelector<HTMLElement>('.gr-list');
  if (gl) { gl.scrollTop = scroll.gar; gl.addEventListener('scroll', () => { scroll.gar = gl.scrollTop; }); }
  el.querySelector('#gSlot')?.addEventListener('click', () => on.onBuySlot());
  el.querySelectorAll<HTMLButtonElement>('[data-gtab]').forEach(b => b.addEventListener('click', () => {
    ui.gtab = b.dataset.gtab as 'cars' | 'boss'; ui.dial = false; ui.sellArm = '';
    const ids = garageCars(save); if (ids.length && !ids.includes(ui.gsel)) { ui.gsel = ids[0]; on.onPreview(lookOf(save, ui.gsel)); }
    redraw();
  }));
  // Sell: the first click arms it (shows the price to confirm), the second click sells
  el.querySelector('#gSell')?.addEventListener('click', () => {
    if (ui.sellArm !== ui.gsel) { ui.sellArm = ui.gsel; return redraw(); }
    const id = ui.gsel; ui.sellArm = ''; ui.dial = false; ui.gsel = save.carId; on.onPreview(lookOf(save, save.carId)); on.onSellCar(id);
  });
  el.querySelector('#gFavOnly')?.addEventListener('click', () => { ui.favOnly = !ui.favOnly; const ids = garageCars(save); if (ids.length && !ids.includes(ui.gsel)) { ui.gsel = ids[0]; on.onPreview(lookOf(save, ui.gsel)); } redraw(); });
  el.querySelector('#gDrive')?.addEventListener('click', () => { ui.dial = false; on.onUseCar(ui.gsel); });
  el.querySelector('#gParts')?.addEventListener('click', () => {
    ui.work = ui.gsel; ui.back = 'garage'; ui.panel = 'parts'; ui.dial = false; scroll.part = 0;
    ui.part.sel = curSel(save); on.onPreview(partLook(save, ui.part.sel)); redraw();
  });
  el.querySelector('#gUpg')?.addEventListener('click', () => { ui.work = ui.gsel; ui.back = 'garage'; ui.panel = 'upgrades'; ui.dial = false; on.onView('upgrades'); redraw(); });
};
