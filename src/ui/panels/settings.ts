// Settings panel: race camera, near side, speed blur (time of day moved to the test console, 2026-10-20), and
// Settings ▸ Controls (owner 2026-10-19): two key sets, Drag Race and Typing Race.
import { SaveV1 } from '../../save/save';
import { keysOf, keyName, KEY_ACTIONS } from '../../game/keys';
import { ui, Wire } from './shared';

const SETTING_ROWS: [string, string, [string, string][]][] = [
  ['camera', 'Race camera', [['dynamic', 'Dynamic'], ['close', 'Dynamic close']]],
  ['nearSide', 'Near side', [['mixed', 'Mixed'], ['curb', 'Curb'], ['barrier', 'Barrier']]],
  ['blur', 'Speed blur', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']]],
  ['gfx', 'Graphics', [['auto', 'Auto'], ['full', 'Full'], ['light', 'Light']]],
  ['sound', 'Sound', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']]],
];

/** Phones (owner E3, V0.15.0): how to put the game on the home screen, so it opens full screen like an app (hidden once it is). */
const homeTip = () => !document.documentElement.classList.contains('vc-phone') || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ? ''
  : `<div class="next g-note"><b>Play full screen:</b> add Voxel City to your home screen — iPhone: Share ▸ Add to Home Screen · Android: ⋮ menu ▸ Add to Home screen / Install app.</div>`;

export function settingsHtml(save: SaveV1, close: string): string {
  return `<div class="g-panel blk">${close}<h2 class="hd">Settings</h2>${homeTip()}<div class="settings">${SETTING_ROWS.map(([key, label, opts]) => `<div class="setrow"><span>${label}</span><div class="seg">${opts.map(([v, t]) => `<button class="${((save.settings as any)[key] ?? (key === 'gfx' ? 'auto' : key === 'sound' ? 'full' : '')) === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>
      ${controlsHtml(save)}</div>`;
}

/** Drag Race control choices (owner 2026-10-21): Pedal mode, which side the phone pedal sits on (Q170), phone buzz (E4). [key, label, options, default] */
const DRIVE_ROWS: [string, string, [string, string][], string][] = [
  ['drive', 'Drive mode', [['classic', 'Classic'], ['pedal', 'Pedal']], 'classic'],
  ['pedalSide', 'Pedal side (phones)', [['right', 'Right'], ['left', 'Left']], 'right'],
  ['buzz', 'Perfect shift buzz (phones)', [['on', 'On'], ['off', 'Off']], 'on'],
];
const DRIVE_NOTE = { classic: 'Classic: hold gas to rev, let go on green to launch; the car pulls by itself and gas shifts up.', pedal: 'Pedal: hold gas the whole race (let go to coast), tap shift up on green to launch. Lift off to stop wheelspin.' };

function controlsHtml(save: SaveV1): string {
  const K = keysOf(save.settings), m = ui.kmode, drive = save.settings.drive ?? 'classic';
  const driveRows = m !== 'drag' ? '' : DRIVE_ROWS.map(([key, label, opts, def]) => { const cur = (save.settings as any)[key] ?? def;
    return `<div class="setrow"><span>${label}</span><div class="seg">${opts.map(([v, t]) => `<button class="${cur === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div></div>`; }).join('');
  const rows = (KEY_ACTIONS[m] as [string, string][]).map(([a, label]) => { const id = `${m}.${a}`, wait = ui.capture === id;
    return `<div class="setrow"><span>${label}</span><button class="keycap ${wait ? 'wait' : ''}" data-bind="${id}">${wait ? 'Press a key…' : keyName((K[m] as any)[a])}</button></div>`; }).join('');
  return `<div class="ctl"><h3 class="hd">Controls</h3><div class="seg ctl-tabs"><button class="${m === 'drag' ? 'on' : ''}" data-kmode="drag">Drag Race</button><button class="${m === 'typing' ? 'on' : ''}" data-kmode="typing">Typing Race</button></div>
    ${driveRows}${rows}<div class="ctl-foot"><span class="g-note">${ui.kmsg || (m === 'drag' ? DRIVE_NOTE[drive] : 'Letters, numbers, space and punctuation always type.')}</span><button class="keycap ghost" id="kReset">Reset</button></div></div>`;
}

// while a Controls key is waiting, the next key press goes to it (before the game's own key handling)
let onCapture: ((e: KeyboardEvent) => void) | null = null;
window.addEventListener('keydown', e => { if (!onCapture || ui.panel !== 'settings' || e.repeat) return; e.preventDefault(); e.stopImmediatePropagation(); const f = onCapture; onCapture = null; f(e); }, true);

export const wireSettings: Wire = (el, _save, on, redraw) => {
  el.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b => b.addEventListener('click', () => on.onSetting(b.dataset.set!, b.dataset.val!)));
  // Controls: pick Drag Race / Typing Race, click a key, press the new key
  el.querySelectorAll<HTMLButtonElement>('[data-kmode]').forEach(b => b.addEventListener('click', () => { ui.kmode = b.dataset.kmode as any; ui.capture = ''; ui.kmsg = ''; redraw(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b => b.addEventListener('click', () => { ui.capture = ui.capture === b.dataset.bind ? '' : b.dataset.bind!; ui.kmsg = ''; redraw(); }));
  el.querySelector('#kReset')?.addEventListener('click', () => { ui.capture = ''; ui.kmsg = ''; on.onKeyBind(ui.kmode, '', null); });
  onCapture = ui.capture ? (e: KeyboardEvent) => {
    const [mode, action] = ui.capture.split('.') as ['drag' | 'typing', string];
    if (mode === 'typing' && e.key.length === 1) { ui.kmsg = 'That key is used for typing — pick Enter, Tab, Shift, Ctrl, an arrow or an F key.'; return redraw(); }
    ui.capture = ''; ui.kmsg = ''; on.onKeyBind(mode, action, e.code);
  } : null;
};
