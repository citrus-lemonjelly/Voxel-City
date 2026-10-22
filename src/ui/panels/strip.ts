// The Strip (owner Q87/Q100): the race-menu card, and the screen with every level as a card on a sideways scroller
// (like CSR). Owner 2026-10-21 (V0.13.0): each card shows only the level and the money it pays; the next level is the
// yellow card you tap to race; rewards are added automatically when a level is cleared (main.ts grantLevel).
import { SaveV1 } from '../../save/save';
import { CARS } from '../../data/cars';
import { STRIP, levelInfo } from '../../game/strip';
import { ui, scroll, resetGarageUI, crownIcon, GarageHandlers, Wire } from './shared';

/** Race-menu card for the Strip: opens the Strip screen. */
export function stripCard(save: SaveV1): string {
  const lg = CARS[save.carId].league, done = save.strip[lg] ?? 0, total = STRIP.rungs;
  const bar = `<i class="g-strip-bar"><u style="width:${Math.round(done / total * 100)}%"></u></i>`;
  return `<button class="g-mode blk" id="stripOpen"><span class="hd">The Strip</span>
    <span class="g-mode-sub">League ${lg} · ${done >= total ? 'complete' : `Level ${done + 1} of ${total}`}</span>${bar}<span class="g-go">Open ▸</span></button>`;
}

/** The Strip screen. */
export function stripHtml(save: SaveV1, _on: GarageHandlers): string {
  const lg = CARS[save.carId].league, done = save.strip[lg] ?? 0;
  const cards = Array.from({ length: STRIP.rungs }, (_, i) => {
    const n = i + 1, L = levelInfo(lg, n), state = n <= done ? 'done' : n === done + 1 ? 'next' : 'locked', R = L.reward;
    const pay = `<span class="sl-rw">+${(R.vx + R.cash).toLocaleString()} VX${R.crowns ? ` <b class="cr">${crownIcon()}${R.crowns}</b>` : ''}</span>`;
    const cls = `sl-card ${state}${L.boss ? ' boss' : ''}`, title = L.boss ? ' title="Boss level"' : '';
    return state === 'next'
      ? `<button class="${cls}" id="stripGo" data-level="${n}"${title}><b class="hd">Level ${n}</b>${pay}<span class="sl-go">Race ▸</span></button>`
      : `<div class="${cls}" data-level="${n}"${title}><b class="hd">Level ${n}${state === 'done' ? ' ✓' : ''}</b>${pay}</div>`;
  }).join('');
  return `<div class="strip-wrap">
    <div class="sl-head"><h2 class="hd">The Strip</h2><span>League ${lg} · ${done} / ${STRIP.rungs}</span><button class="g-close" aria-label="Close">✕</button></div>
    <div class="sl-row"><button class="sl-arrow" data-scroll="-1" aria-label="Scroll left">◀</button><div class="strip-track">${cards}</div><button class="sl-arrow" data-scroll="1" aria-label="Scroll right">▶</button></div>
    <i class="g-strip-bar sl-bar"><u style="width:${Math.round(done / STRIP.rungs * 100)}%"></u></i>
  </div>`;
}

export const wireStrip: Wire = (el, _save, on, redraw) => {
  el.querySelector('#stripOpen')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); ui.panel = 'strip'; ui.raceMenu = false; scroll.stripFocus = true; on.onView('strip'); redraw(); });
  el.querySelector('#stripGo')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onStrip(); });
  // the scroller: arrows, mouse wheel and drag all slide it sideways; cards snap into place
  const track = el.querySelector<HTMLElement>('.strip-track');
  if (!track) return;
  const cardW = () => (track.querySelector('.sl-card') as HTMLElement).offsetWidth + 6;
  el.querySelectorAll<HTMLButtonElement>('[data-scroll]').forEach(b => b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.scroll! * cardW() * 3, behavior: 'smooth' })));
  track.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); track.scrollBy({ left: e.deltaY }); } }, { passive: false });
  let drag: { x: number; left: number; moved: boolean } | null = null;
  track.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('button')) return; drag = { x: e.clientX, left: track.scrollLeft, moved: false }; track.setPointerCapture(e.pointerId); track.classList.add('dragging'); });
  track.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 3) drag.moved = true; track.scrollLeft = drag.left - dx; });
  const endDrag = () => { if (drag) { drag = null; track.classList.remove('dragging'); } };
  track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag);
  // open on the level you're up to (centred); keep your place when the screen redraws
  const focus = track.querySelector<HTMLElement>('.sl-card.next') ?? track.lastElementChild as HTMLElement;
  track.scrollLeft = scroll.stripFocus || scroll.strip < 0 ? focus.offsetLeft - (track.clientWidth - focus.offsetWidth) / 2 : scroll.strip;
  scroll.stripFocus = false;
  track.addEventListener('scroll', () => (scroll.strip = track.scrollLeft));
};
