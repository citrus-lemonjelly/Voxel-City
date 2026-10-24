// Catalog (owner Q76–Q79): a scrolling car list by league on the left, the picked car on the turntable, its stats,
// paint swatches (free with the car) and the body's optional features; buy / use.
import { SaveV1 } from '../../save/save';
import { CARS, CATALOG_ORDER, LEAGUES, carBrand, carName, carPaint } from '../../data/cars';
import { BODY_OPTIONS } from '../../render/bodies';
import { infoRows } from '../../game/carInfo';
import { DEV } from '../devConsole';
import { ui, scroll, lookOf, catLook, pickCar, profileOf, carPrice, wallet, PAINTS, TYPE_SUB, GarageHandlers, Wire } from './shared';
import { carRating } from '../../game/rating';
import { carTiers } from '../../save/save';
import { MAX_TUNE } from '../../data/parts';
import { ratingBox, ratingChip } from '../ratingBox';

const LEAGUE_NAME: Record<string, string> = { D: 'Hatchbacks', C: 'Muscle', B: 'Street racers', A: 'Tuners · GTs · Super sports', S: 'Hypercars' };

export function catalogHtml(save: SaveV1, on: GarageHandlers, close: string): string {
  const id = ui.cat.id, spec = CARS[id], paint = ui.cat.paint || save.cars[id]?.paint || carPaint(id), opts = BODY_OPTIONS[profileOf(id)] || [];
  const owned = !!save.cars[id], inUse = save.carId === id, afford = DEV.unlimited || wallet(save, id) >= spec.price;
  const card = (cid: string) => {
    const c = CARS[cid], own = !!save.cars[cid], use = save.carId === cid, can = DEV.unlimited || wallet(save, cid) >= c.price;
    const tag = use ? '<em class="cat-tag use">In use</em>' : own ? `<em class="cat-tag own">${c.unique ? 'Boss car' : 'Owned'}</em>` : `<em class="cat-tag ${can ? '' : 'short'} ${c.currency === 'crowns' ? 'cr' : ''}">${carPrice(cid)}</em>`;
    return `<button class="cat-card ${cid === id ? 'on' : ''}" data-car="${cid}"><img class="cat-thumb" alt="" src="${on.thumb(lookOf(save, cid))}">${ratingChip(carRating(cid))}<span class="cat-row"><b>${carName(cid)}</b>${tag}</span></button>`;
  };
  const action = inUse ? `<button class="btn cat-act" disabled>In use</button>`
    : owned ? `<button class="btn race cat-act" id="useCar">Use this car</button>`
    : `<button class="btn race cat-act" id="buyCar" ${afford ? '' : 'disabled'}>Buy · ${carPrice(id)}</button>${afford ? '' : `<span class="cat-short">Need ${(spec.price - wallet(save, id)).toLocaleString()} more ${spec.currency === 'crowns' ? 'Crowns' : 'VX'}</span>`}`;
  const order = [...CATALOG_ORDER, ...Object.keys(save.cars).filter(k => CARS[k]?.unique)].sort((a, b) => LEAGUES.indexOf(CARS[a].league) - LEAGUES.indexOf(CARS[b].league));
  const list = order.map((cid, i) => (i === 0 || CARS[order[i - 1]].league !== CARS[cid].league
    ? `<div class="cat-league"><b class="hd">League ${CARS[cid].league}</b><span>${LEAGUE_NAME[CARS[cid].league]}</span></div>` : '') + card(cid)).join('');
  return `<div class="cat-list blk">${list}</div>
      <div class="cat-under">${close}
        <div class="cat-name"><b class="hd">${carName(id)}</b><span>${spec.unique ? 'Boss car · won on the Strip · no upgrades' : `${carBrand(id)} · ${TYPE_SUB[id] ?? ''}`} · ${spec.hp} hp · ${spec.massKg.toLocaleString()} kg · ${spec.drive} · League ${spec.league}${spec.currency === 'crowns' ? ' · Crowns only' : ''}</span></div>
        <div class="cat-rating">${ratingBox(carRating(id))}<span class="g-note">${spec.unique ? 'Car rating · boss cars come as they are' : `Car rating stock · <b>${carRating(id, MAX_TUNE)}</b> fully upgraded${owned ? ` · yours now <b>${carRating(id, carTiers(save, id).equipped)}</b>` : ''}`}</span></div>
        <div class="cat-stats">${infoRows(id).map(r => `<div class="cs"><span>${r.label}</span><b>${r.value}</b><i><u style="width:${Math.round(r.bar * 100)}%"></u></i></div>`).join('')}</div>
        ${owned ? `<div class="g-note cat-repaint">Repaint this car in the Body Shop (Garage → pick the car → Body Shop → Paint).</div>` : `<div class="cat-paints">${PAINTS.map(([c, n]) => `<button class="swatch ${c === paint ? 'on' : ''}" data-paint="${c}" title="${n}" style="background:${c}"></button>`).join('')}</div>`}
        ${opts.length ? `<div class="cat-opts">${opts.map(o => `<div class="setrow"><span>${o.label}</span><div class="seg">${o.values.map(([v, t]) => `<button class="${(ui.cat.opts[o.id] ?? o.values[0][0]) === v ? 'on' : ''}" data-opt="${o.id}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>` : `<div class="g-note">No optional features on this body yet.</div>`}
        <div class="cat-buy">${action}<span class="g-note">${owned ? 'Options save to this car.' : 'Pick your paint now — it comes free with the car. Repaints later cost VX in the Body Shop.'}</span></div>
      </div>`;
}

export const wireCatalog: Wire = (el, save, on, redraw) => {
  const restyle = () => { on.onPreview(catLook(save)); if (save.cars[ui.cat.id]) on.onCarStyle(ui.cat.id, ui.cat.paint, ui.cat.opts); else redraw(); };
  el.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(b => b.addEventListener('click', () => { pickCar(save, b.dataset.car!); on.onPreview(catLook(save)); redraw(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(b => b.addEventListener('click', () => { ui.cat.paint = b.dataset.paint!; restyle(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach(b => b.addEventListener('click', () => { ui.cat.opts[b.dataset.opt!] = b.dataset.val!; restyle(); }));
  el.querySelector('#buyCar')?.addEventListener('click', () => on.onBuyCar(ui.cat.id, ui.cat.paint, { ...ui.cat.opts }));
  el.querySelector('#useCar')?.addEventListener('click', () => on.onUseCar(ui.cat.id));
  // the Catalog keeps its scroll; the Body Shop list (.pt-list) also carries .cat-list, so the first list on screen is used
  const list = el.querySelector('.cat-list'); if (list) list.scrollTop = scroll.cat; list?.addEventListener('scroll', () => (scroll.cat = (list as HTMLElement).scrollTop));
};
