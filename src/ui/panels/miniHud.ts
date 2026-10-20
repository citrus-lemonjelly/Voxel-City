// Mini HUD (owner drawing, V0.9.1): four small square buttons in one tab-sized square beside Profile —
// Spin · Daily / Calendar · Garage door (V0.10.0, the old spare slot). A dot = something to claim.
import { SaveV1 } from '../../save/save';
import { dailyFor, taskDone, calReady } from '../../game/daily';
import { ui, icon, Wire } from './shared';

export function miniHud(save: SaveV1): string {
  const d = dailyFor(save), dailyDot = d.ids.some((_, i) => !d.claimed[i] && taskDone(d, i)) || (!d.bonus && d.claimed.every(Boolean)), calDot = calReady(save), spin = save.settings.spin !== 'off', door = save.settings.door !== 'closed';
  const dot = (on: boolean) => on ? '<em class="g-dot"></em>' : '';
  return `<div class="g-mini">
    <button class="g-mb ${spin ? 'on' : 'off'}" id="spinBtn" title="Spin ${spin ? 'on' : 'off'} — the car's slow spin (drag the car to turn it yourself)" aria-label="Spin">${icon('spin', 2)}</button>
    <button class="g-mb ${ui.panel === 'daily' ? 'sel' : ''}" data-panel="daily" title="Daily tasks" aria-label="Daily">${icon('tasks', 2)}${dot(dailyDot)}</button>
    <button class="g-mb ${ui.panel === 'calendar' ? 'sel' : ''}" data-panel="calendar" title="Login calendar" aria-label="Calendar">${icon('daily', 2)}${dot(calDot)}</button>
    <button class="g-mb ${door ? 'on' : 'off'}" id="doorBtn" title="Garage door ${door ? 'open' : 'closed'} — click to ${door ? 'close' : 'open'} it" aria-label="Garage door">${icon(door ? 'doorOpen' : 'doorShut', 2)}</button>
  </div>`;
}

/** Spin and door toggles (Daily / Calendar open panels through the shared data-panel wiring). */
export const wireMiniHud: Wire = (el, save, on) => {
  el.querySelector('#spinBtn')?.addEventListener('click', () => on.onSetting('spin', save.settings.spin === 'off' ? 'on' : 'off'));
  el.querySelector('#doorBtn')?.addEventListener('click', () => on.onSetting('door', save.settings.door === 'closed' ? 'open' : 'closed'));
};
