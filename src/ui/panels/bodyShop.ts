// Body Shop (owner 2026-10-19): side banner tabs by slot, 3D close-up cards of your car wearing each part, buy / fit;
// the Paint tab (repaint for VX, premium paints with Crowns) and your own plate text.
import { SaveV1 } from '../../save/save';
import { CARS, carName, carPaint } from '../../data/cars';
import { DEV } from '../devConsole';
import { stockParts, partFits } from '../../render/bodies';
import { cleanPlate, DEFAULT_PLATE } from '../../render/plate';
import { cosmeticPrice, PAINT, PLATE_TEXT, repaintPrice, EcoLeague } from '../../data/economy';
import { SLOT_GROUPS, SLOT_FACE, PART_SLOTS, SOON_SLOTS, partsFor, PART_BY_ID, STOCK_PART, SLOT_VIEW, PartSlot, ownsPart, isFactory, VisualPart } from '../../data/visualParts';
import { CarLook } from '../../render/carBuilder';
import { ui, scroll, lookOf, profileOf, crownIcon, PAINTS, GarageHandlers, Wire } from './shared';

/** The car being worked on wearing one part (Parts preview and card stills). */
export function partLook(save: SaveV1, id: string): CarLook {
  const base = lookOf(save, ui.work || save.carId);
  if (id.startsWith('paint:')) return { ...base, paint: paintOf(id).hex };
  const p = PART_BY_ID[id]; if (!p) return base;
  const parts = { ...(base.parts || {}) };
  if (isFactory(p)) delete parts[p.slot]; else parts[p.slot] = p.value;
  return { ...base, parts };
}
const RARITY: Record<string, string> = { common: 'Common', rare: 'Rare', epic: 'Epic' };
/** The car's own factory part for a slot, when a catalogue part is the same thing (owner Q114: no duplicates). */
export function factoryTwin(carId: string, slot: PartSlot): VisualPart | undefined {
  const v = (stockParts(profileOf(carId)) as Record<string, string>)[slot];
  return v ? partsFor(slot).find(p => !isFactory(p) && p.value === v) : undefined;
}
/** What is on the car now for the open Body Shop tab (paint: 'paint:<colour or premium id>'). */
export function curSel(save: SaveV1): string {
  const W = ui.work || save.carId;
  if (ui.part.slot === 'paint') { const hex = save.cars[W]?.paint || carPaint(W), pr = PAINT.premium.find(p => p.color === hex); return 'paint:' + (pr ? pr.id : hex); }
  return save.cars[W]?.parts[ui.part.slot] ?? STOCK_PART[ui.part.slot];
}
const paintOf = (sel: string) => { const v = sel.slice(6), premium = PAINT.premium.find(p => p.id === v); return { hex: premium ? premium.color : v, premium }; };
/** Body Shop · Paint (owner 2026-10-19): picked free when you buy the car; a repaint costs VX; premium paints are bought once
 *  with Crowns and are then free on every car. */
function paintHtml(save: SaveV1, tabs: string): string {
  const W = ui.work || save.carId, cur = curSel(save);
  if (!ui.part.sel.startsWith('paint:')) ui.part.sel = cur;
  const sel = paintOf(ui.part.sel), owned = save.paintsOwned ?? [], vx = repaintPrice(CARS[W].league as any);
  const sw = (key: string, hex: string, name: string, extra = '') => `<button class="swatch pt-swatch ${key === ui.part.sel ? 'on' : ''} ${key === cur ? 'cur' : ''} ${extra}" data-part="${key}" title="${name}" style="background:${hex}"></button>`;
  const cards = `<div class="pt-paints"><div class="pt-group">Standard · ${vx.toLocaleString()} VX a repaint</div><div class="cat-paints">${PAINTS.map(([c, n]) => sw('paint:' + c, c, n)).join('')}</div>
    <div class="pt-group">Premium · Crowns once, then free</div><div class="cat-paints">${PAINT.premium.map(p => sw('paint:' + p.id, p.color, `${p.name} · ${owned.includes(p.id) ? 'owned' : p.calendar ? 'login calendar day 28' : p.crowns + ' Crowns'}`, 'prem' + (owned.includes(p.id) ? ' own' : ''))).join('')}</div>
    <div class="g-note pt-key">▣ yellow = selected · white = on the car now</div></div>`;
  const name = sel.premium?.name ?? PAINTS.find(p => p[0] === sel.hex)?.[1] ?? 'Factory paint';
  const action = ui.part.sel === cur ? `<button class="btn cat-act" disabled>On the car</button>`
    : sel.premium ? (owned.includes(sel.premium.id) ? `<button class="btn race cat-act" id="repaint">Paint it · free</button>` : sel.premium.calendar ? `<button class="btn cat-act" disabled>Calendar reward</button>` : `<button class="btn race cat-act" id="repaint" ${DEV.unlimited || save.crowns >= sel.premium.crowns ? '' : 'disabled'}>Buy · ${crownIcon()}${sel.premium.crowns} Crowns</button>`)
    : `<button class="btn race cat-act" id="repaint" ${DEV.unlimited || save.voxels >= vx ? '' : 'disabled'}>Repaint · ${vx.toLocaleString()} VX</button>`;
  return `<div class="pt-tabs blk">${tabs}</div><div class="cat-list pt-list pt-plist blk">${cards}</div>
    <div class="cat-under"><button class="g-close" aria-label="Close">✕</button>
      <div class="cat-name"><b class="hd">${name}</b><span>Paint · ${sel.premium?.calendar ? 'Login calendar — won on day 28, then free on every car' : sel.premium ? 'Premium — buy once with Crowns, then free on every car' : `Standard — a repaint costs ${vx.toLocaleString()} VX`}</span></div>
      <div class="cat-buy">${action}<span class="g-note">Your first paint is picked free when you buy a car · looks only</span></div>
    </div>`;
}
export function partsHtml(save: SaveV1, on: GarageHandlers): string {
  const tab = (id: string, label: string) => `<button class="pt-tab ${ui.part.slot === id ? 'on' : ''}" data-slot="${id}">${label}</button>`;
  const tabs = SLOT_GROUPS.map(g => `<div class="pt-group">${g}</div>` + (g === 'Paint' ? tab('paint', 'Paint') : '') + PART_SLOTS.filter(t => t.group === g).map(t => tab(t.id, t.label)).join('')).join('')
    + SOON_SLOTS.map(t => `<span class="pt-tab soon" title="Coming soon">${t}</span>`).join('');
  if (ui.part.slot === 'paint') return paintHtml(save, tabs);
  const W = ui.work || save.carId, slot = ui.part.slot as PartSlot, twin = factoryTwin(W, slot), body = profileOf(W);
  let fitted = save.cars[W]?.parts[slot] ?? STOCK_PART[slot];
  if (twin && fitted === twin.id) fitted = STOCK_PART[slot];                       // fitting the factory twin = factory
  const sel = PART_BY_ID[ui.part.sel === twin?.id ? STOCK_PART[slot] : ui.part.sel] ?? PART_BY_ID[fitted];
  ui.part.sel = sel.id;
  const lg = CARS[W].league as EcoLeague;                                       // VX parts: priced + owned per league (Q156, Q158a)
  const owns = (id: string) => ownsPart(id, save.partsOwned, save.decals, lg);
  const priceTag = (id: string) => { const c = cosmeticPrice(id, lg); return c.currency === 'crowns' ? `${crownIcon()}${c.price} Crowns` : `${c.price.toLocaleString()} VX`; };
  const can = (id: string) => { const c = cosmeticPrice(id, lg); return DEV.unlimited || (c.currency === 'crowns' ? save.crowns : save.voxels) >= c.price; };
  const nameOf = (p: VisualPart) => isFactory(p) && twin ? (twin.value === 'none' ? `${p.name} · none` : `${p.name} · ${twin.name}`) : p.name;
  const shown = partsFor(slot).filter(p => p !== twin && (!p.won || owns(p.id)) && partFits(body, slot, p.value));    // boss decals appear once won; styles that don't fit this car are hidden
  const lockedWon = partsFor(slot).filter(p => p.won && !owns(p.id)).length;
  const cards = shown.map(p => {
    const tag = fitted === p.id ? '<em class="cat-tag use">Fitted</em>' : owns(p.id) ? `<em class="cat-tag own">${p.won ? 'Won' : 'Owned'}</em>` : `<em class="cat-tag ${can(p.id) ? '' : 'short'} ${cosmeticPrice(p.id, lg).currency === 'crowns' ? 'cr' : ''}">${priceTag(p.id)}</em>`;
    return `<button class="cat-card pt-card ${p.id === sel.id ? 'on' : ''}" data-part="${p.id}"><img class="cat-thumb" alt="" src="${on.thumb(partLook(save, p.id), p.view ?? SLOT_VIEW[slot])}">
      <span class="cat-row"><b>${nameOf(p)}</b>${tag}</span><span class="pt-rar ${p.rarity}">${p.won ? 'Strip boss' : RARITY[p.rarity]}</span></button>`;
  }).join('') + (lockedWon ? `<div class="pt-more g-note">${lockedWon} boss decals left to win — beat the boss on every 10th Strip level.</div>` : '');
  const action = fitted === sel.id ? `<button class="btn cat-act" disabled>Fitted</button>`
    : owns(sel.id) ? `<button class="btn race cat-act" id="fitPart">Fit to ${carName(W)}</button>`
    : `<button class="btn race cat-act" id="buyPart" ${can(sel.id) ? '' : 'disabled'}>Buy · ${priceTag(sel.id)}</button>`;
  return `<div class="pt-tabs blk">${tabs}</div><div class="cat-list pt-list blk">${cards}</div>
    <div class="cat-under"><button class="g-close" aria-label="Close">✕</button>
      <div class="cat-name"><b class="hd">${nameOf(sel)}</b><span>${PART_SLOTS.find(t => t.id === slot)!.label} · ${sel.won ? 'Strip boss decal' : RARITY[sel.rarity]} · ${isFactory(sel) && twin ? (twin.value === 'none' ? 'This car has none from the factory.' : `This car comes with the ${twin.name} from the factory.`) : sel.blurb}</span></div>
      <div class="cat-buy">${action}<span class="g-note">${cosmeticPrice(sel.id, lg).currency === 'crowns' ? 'Crowns part: bought once, fits every car' : `Bought once for every League ${lg} car`} · looks only — no effect on speed</span></div>
      ${slot === 'plate' ? `<div class="pt-plate"><label>Plate text <input id="plateText" maxlength="${PLATE_TEXT.maxLength}" spellcheck="false" autocomplete="off" value="${save.cars[W]?.plateText || DEFAULT_PLATE}"></label>
        <button class="btn ghost" id="setPlate" ${DEV.unlimited || save.crowns >= PLATE_TEXT.crowns ? '' : 'disabled'}>Set text · ${crownIcon()}${PLATE_TEXT.crowns} Crowns</button><span class="g-note">A–Z, 0–9, space and - · up to ${PLATE_TEXT.maxLength} · Crowns for every change</span></div>` : ''}
    </div>`;
}

export const wireBodyShop: Wire = (el, save, on, redraw) => {
  el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => b.addEventListener('click', () => { ui.part.slot = b.dataset.slot as PartSlot | 'paint'; ui.part.sel = curSel(save); scroll.part = 0; on.onPreview(partLook(save, ui.part.sel)); redraw(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b => b.addEventListener('click', () => { ui.part.sel = b.dataset.part!; on.onPreview(partLook(save, ui.part.sel)); redraw(); }));
  on.onFace(ui.panel === 'parts' ? SLOT_FACE[ui.part.slot] : null);
  el.querySelector('#buyPart')?.addEventListener('click', () => on.onBuyPart(ui.part.sel, ui.work));
  el.querySelector('#repaint')?.addEventListener('click', () => { const p = paintOf(ui.part.sel); on.onRepaint(ui.work, p.hex, p.premium?.id); });
  const plateIn = el.querySelector<HTMLInputElement>('#plateText');
  plateIn?.addEventListener('input', () => { const v = cleanPlate(plateIn.value, PLATE_TEXT.maxLength); if (v !== plateIn.value) plateIn.value = v; });
  plateIn?.addEventListener('keydown', e => e.stopPropagation());
  el.querySelector('#setPlate')?.addEventListener('click', () => plateIn && on.onPlateText(ui.work, plateIn.value));
  el.querySelector('#fitPart')?.addEventListener('click', () => on.onFitPart(ui.part.sel, ui.work));
  const plist = el.querySelector<HTMLElement>('.pt-list'); if (plist) { plist.scrollTop = scroll.part; plist.addEventListener('scroll', () => (scroll.part = plist.scrollTop)); }
};
