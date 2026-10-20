// The Strip (owner Q87/Q100): the race-menu card, and the screen with every level as a card on a sideways scroller
// (like CSR) — cleared / claim / race / locked.
import { SaveV1 } from '../../save/save';
import { CARS, carName } from '../../data/cars';
import { STRIP, levelInfo, decalName } from '../../game/strip';
import { ui, scroll, resetGarageUI, crownIcon, GarageHandlers, Wire } from './shared';

/** Race-menu card for the Strip: opens the Strip screen. */
export function stripCard(save: SaveV1): string {
  const lg = CARS[save.carId].league, done = save.strip[lg] ?? 0, total = STRIP.rungs;
  const toClaim = Array.from({ length: done }, (_, i) => i + 1).filter(n => !(save.stripClaimed[lg] ?? []).includes(n)).length;
  const bar = `<i class="g-strip-bar"><u style="width:${Math.round(done / total * 100)}%"></u></i>`;
  return `<button class="g-mode blk" id="stripOpen"><span class="hd">The Strip</span>
    <span class="g-mode-sub">League ${lg} · ${done >= total ? 'complete' : `Level ${done + 1} of ${total}`}${toClaim ? ` · <b class="g-claimable">${toClaim} reward${toClaim > 1 ? 's' : ''} to claim</b>` : ''}</span>${bar}<span class="g-go">Open ▸</span></button>`;
}

/** The Strip screen. */
export function stripHtml(save: SaveV1, on: GarageHandlers): string {
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

export const wireStrip: Wire = (el, _save, on, redraw) => {
  el.querySelector('#stripOpen')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); ui.panel = 'strip'; ui.raceMenu = false; scroll.stripFocus = true; on.onView('strip'); redraw(); });
  el.querySelector('#stripGo')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onStrip(); });
  el.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(b => b.addEventListener('click', () => on.onClaim(+b.dataset.claim!)));
  // the scroller: arrows, mouse wheel and drag all slide it sideways; cards snap into place
  const track = el.querySelector<HTMLElement>('.strip-track');
  if (!track) return;
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
  track.scrollLeft = scroll.stripFocus || scroll.strip < 0 ? focus.offsetLeft - (track.clientWidth - focus.offsetWidth) / 2 : scroll.strip;
  scroll.stripFocus = false;
  track.addEventListener('scroll', () => (scroll.strip = track.scrollLeft));
};
