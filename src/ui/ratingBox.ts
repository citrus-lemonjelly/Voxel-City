// Car rating box (Build & Tune Update, owner Q246 + "251 +101"): the car rating (PP) in a sunken tray, and beside it the tuner
// points (TP) your Car Lab sliders add — green when they help, red when they cost. When TP changes, the number counts to its
// new value and a small ▲ / ▼ shows for a moment (a short count + fade, no blinking — Bevel+ rule).
import { carRating, tunerPoints } from '../game/rating';
import { Tune } from '../data/parts';

const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
/** The PP tray, optionally with the TP box. `id` lets ratingTick() find it again after a slider moves. */
export function ratingBox(pp: number, tp?: number, id = ''): string {
  const tpBox = tp === undefined ? '' : `<span class="rt-tp ${tp > 0 ? 'up' : tp < 0 ? 'down' : ''}" title="Tuner points: what your Car Lab settings add (+) or cost (−), over 600 / 800 / 1200 m"><i>TP</i><b data-v="${tp}">${sign(tp)}</b><em></em></span>`;
  return `<span class="rt-box"${id ? ` id="${id}"` : ''}><span class="rt-pp" title="Car rating: how quick this car is with its parts, before tuning"><i>PP</i><b>${pp}</b></span>${tpBox}</span>`;
}
/** A car's rating box for a tune (PP from its parts, TP from its sliders). */
export const ratingBoxFor = (carId: string, tune: Partial<Tune>, withTp = true, id = '') => ratingBox(carRating(carId, tune), withTp ? tunerPoints(carId, tune) : undefined, id);
/** Small "PP 95" chip (Catalog cards, Garage list). */
export const ratingChip = (pp: number) => `<i class="rt-chip" title="Car rating (stock)">PP <b>${pp}</b></i>`;

/** Count a rating box's numbers to new values (~0.3 s) and show ▲ / ▼ beside TP for a moment. */
export function ratingTick(box: HTMLElement | null, pp: number, tp: number) {
  if (!box) return;
  const ppB = box.querySelector<HTMLElement>('.rt-pp b'), tpS = box.querySelector<HTMLElement>('.rt-tp'), tpB = tpS?.querySelector<HTMLElement>('b');
  if (ppB) ppB.textContent = String(pp);
  if (!tpS || !tpB) return;
  const from = +(tpB.dataset.v ?? 0); tpB.dataset.v = String(tp);
  tpS.classList.toggle('up', tp > 0); tpS.classList.toggle('down', tp < 0);
  if (from === tp) return;
  const arrow = tpS.querySelector<HTMLElement>('em')!;
  arrow.textContent = tp > from ? '▲' : '▼'; arrow.className = tp > from ? 'go-up' : 'go-down';
  arrow.style.transition = 'none'; arrow.style.opacity = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => { arrow.style.transition = 'opacity .5s ease .7s'; arrow.style.opacity = '0'; }));
  const t0 = performance.now(), dur = 300;
  const step = (now: number) => {
    if (tpB.dataset.v !== String(tp)) return;                     // a newer tick took over
    const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (tp - from) * (1 - (1 - k) * (1 - k)));
    tpB.textContent = sign(v);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const PX = 'font-family:Silkscreen,"Courier New",monospace;font-weight:400';
const B = (sels: string, body: string) => sels.split(',').map(s => `html.ui-bevel ${s.trim()}`).join(',') + `{${body}}`;
/** Looks (added to the Bevel+ sheet): PP = sunken tray, TP = a well beside it; labels 11 px, numbers in the pixel font. */
export const RATING_CSS = [
  B('.rt-box', 'display:inline-flex;gap:6px;align-items:stretch;vertical-align:middle'),
  B('.rt-pp,.rt-tp', 'display:inline-flex;align-items:baseline;gap:6px;padding:4px 9px 5px;font-style:normal'),
  B('.rt-pp', 'background:#2a2e39;box-shadow:inset 2px 2px 0 #15171d,inset -2px -2px 0 #474e60,0 0 0 2px #0b0c10'),
  B('.rt-tp', 'background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d,0 0 0 2px #0b0c10;min-width:84px'),
  B('.rt-pp i,.rt-tp i', 'font:700 11px system-ui;letter-spacing:.08em;color:#9aa3b5;font-style:normal'),
  B('.rt-pp b', `${PX};font-size:18px;color:#f2c230`),
  B('.rt-tp b', `${PX};font-size:18px;color:#9aa3b5;font-variant-numeric:tabular-nums`),
  B('.rt-tp.up b', 'color:#4ade80'), B('.rt-tp.down b', 'color:#ff7a6b'),
  B('.rt-tp em', 'font-style:normal;font-size:12px;width:12px;opacity:0'),
  B('.rt-tp em.go-up', 'color:#4ade80'), B('.rt-tp em.go-down', 'color:#ff7a6b'),
  B('.rt-chip', 'position:absolute;left:10px;top:10px;padding:2px 6px 3px;font:700 11px system-ui;font-style:normal;color:#9aa3b5;background:#1e2129e6;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d'),
  B('.rt-chip b', `${PX};font-size:12px;color:#f2c230`),
  B('.rt-chip.inl', 'position:static;display:inline-block'),
].join('\n');
