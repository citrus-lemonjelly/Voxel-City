// Settings panel (V0.18.0, owner: header bars): Display (race camera, near side, speed blur, graphics) · Audio (sound and
// engine volume) · Keybinds (three key sets — Drag Race, Typing Race, Drift — with each mode's control choices).
import { SaveV1 } from '../../save/save';
import { volOf } from '../../game/sound';
import { keysOf, keyName, KEY_ACTIONS, KEY_MODE_LABEL, KeyMode } from '../../game/keys';
import { DRIFT_BUTTONS } from '../driftButton';
import { ui, Wire } from './shared';

type Row = [string, string, [string, string][]];
const DISPLAY_ROWS: Row[] = [
  ['camera', 'Race camera', [['dynamic', 'Dynamic'], ['close', 'Dynamic close']]],
  ['nearSide', 'Near side', [['mixed', 'Mixed'], ['curb', 'Curb'], ['barrier', 'Barrier']]],
  ['blur', 'Speed blur', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']]],
  ['gfx', 'Graphics', [['auto', 'Auto'], ['full', 'Full'], ['light', 'Light']]],
];
const VOL: [string, string][] = [['0', 'Off'], ['25', '25'], ['50', '50'], ['75', '75'], ['100', '100']];
const AUDIO_ROWS: Row[] = [['sound', 'Sound volume', VOL], ['engineVol', 'Engine volume', VOL]];

/** Phones (owner E3, V0.15.0): how to put the game on the home screen, so it opens full screen like an app (hidden once it is). */
const homeTip = () => !document.documentElement.classList.contains('vc-phone') || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ? ''
  : `<div class="next g-note"><b>Play full screen:</b> add Voxel City to your home screen — iPhone: Share ▸ Add to Home Screen · Android: ⋮ menu ▸ Add to Home screen / Install app.</div>`;

const seg = (key: string, cur: string, opts: [string, string][]) => `<div class="seg">${opts.map(([v, t]) => `<button class="${cur === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div>`;
const rowHtml = (save: SaveV1, [key, label, opts]: Row) => {
  const cur = key === 'sound' || key === 'engineVol' ? String(volOf((save.settings as any)[key], 75)) : (save.settings as any)[key] ?? (key === 'gfx' ? 'auto' : '');
  return `<div class="setrow"><span>${label}</span>${seg(key, cur, opts)}</div>`;
};
/** A section with its header bar (owner, V0.18.0). */
const section = (title: string, body: string, cls = '') => `<section class="set-sec ${cls}"><h3 class="set-hd hd">${title}</h3>${body}</section>`;

export function settingsHtml(save: SaveV1, close: string): string {
  return `<div class="g-panel blk">${close}<h2 class="hd">Settings</h2>${homeTip()}<div class="settings">
      ${section('Display', DISPLAY_ROWS.map(r => rowHtml(save, r)).join(''))}
      ${section('Audio', AUDIO_ROWS.map(r => rowHtml(save, r)).join(''))}
      ${section('Keybinds', controlsHtml(save), 'ctl')}</div></div>`;
}

/** Each mode's control choices, shown above its keys. [key, label, options, default] */
const MODE_ROWS: Record<KeyMode, [string, string, [string, string][], string][]> = {
  // Drag Race (owner 2026-10-21): Pedal mode, which side the phone pedal sits on (Q170), phone buzz (E4)
  drag: [
    ['drive', 'Drive mode', [['classic', 'Classic'], ['pedal', 'Pedal']], 'classic'],
    ['pedalSide', 'Pedal side (phones)', [['right', 'Right'], ['left', 'Left']], 'right'],
    ['buzz', 'Perfect shift buzz (phones)', [['on', 'On'], ['off', 'Off']], 'on'],
  ],
  typing: [],
  // Drift (owner, V0.18.0): the drift button's look — four designs to try
  drift: [
    ['dbtn', 'Drift button', DRIFT_BUTTONS.map(b => [b.id, b.label] as [string, string]), 'brake'],
    ['pedalSide', 'Pedal side (phones)', [['right', 'Right'], ['left', 'Left']], 'right'],
  ],
};
const DRIVE_NOTE = { classic: 'Classic: hold gas to rev, let go on green to launch; the car pulls by itself and gas shifts up.', pedal: 'Pedal: hold gas the whole race (let go to coast), tap shift up on green to launch. Lift off to stop wheelspin.' };
const MODE_NOTE: Record<KeyMode, (save: SaveV1) => string> = {
  drag: save => DRIVE_NOTE[save.settings.drive ?? 'classic'],
  typing: () => 'Letters, numbers, space and punctuation always type.',
  drift: () => 'Gears are automatic. When the lights above the gauge go green, tap Drift — then feather the gas to keep the revs in the green band.',
};

function controlsHtml(save: SaveV1): string {
  const K = keysOf(save.settings), m = ui.kmode;
  const modeRows = MODE_ROWS[m].map(([key, label, opts, def]) => `<div class="setrow"><span>${label}</span>${seg(key, (save.settings as any)[key] ?? def, opts)}</div>`).join('');
  const rows = (KEY_ACTIONS[m] as [string, string][]).map(([a, label]) => { const id = `${m}.${a}`, wait = ui.capture === id;
    return `<div class="setrow"><span>${label}</span><button class="keycap ${wait ? 'wait' : ''}" data-bind="${id}">${wait ? 'Press a key…' : keyName((K[m] as any)[a])}</button></div>`; }).join('');
  return `<div class="seg ctl-tabs">${(Object.keys(KEY_MODE_LABEL) as KeyMode[]).map(k => `<button class="${m === k ? 'on' : ''}" data-kmode="${k}">${KEY_MODE_LABEL[k]}</button>`).join('')}</div>
    ${modeRows}${rows}<div class="ctl-foot"><span class="g-note">${ui.kmsg || MODE_NOTE[m](save)}</span><button class="keycap ghost" id="kReset">Reset</button></div>`;
}

// while a key is waiting, the next key press goes to it (before the game's own key handling)
let onCapture: ((e: KeyboardEvent) => void) | null = null;
window.addEventListener('keydown', e => { if (!onCapture || ui.panel !== 'settings' || e.repeat) return; e.preventDefault(); e.stopImmediatePropagation(); const f = onCapture; onCapture = null; f(e); }, true);

export const wireSettings: Wire = (el, _save, on, redraw) => {
  el.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b => b.addEventListener('click', () => on.onSetting(b.dataset.set!, b.dataset.val!)));
  // Keybinds: pick Drag Race / Typing Race / Drift, click a key, press the new key
  el.querySelectorAll<HTMLButtonElement>('[data-kmode]').forEach(b => b.addEventListener('click', () => { ui.kmode = b.dataset.kmode as KeyMode; ui.capture = ''; ui.kmsg = ''; redraw(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b => b.addEventListener('click', () => { ui.capture = ui.capture === b.dataset.bind ? '' : b.dataset.bind!; ui.kmsg = ''; redraw(); }));
  el.querySelector('#kReset')?.addEventListener('click', () => { ui.capture = ''; ui.kmsg = ''; on.onKeyBind(ui.kmode, '', null); });
  onCapture = ui.capture ? (e: KeyboardEvent) => {
    const [mode, action] = ui.capture.split('.') as [KeyMode, string];
    if (mode === 'typing' && e.key.length === 1) { ui.kmsg = 'That key is used for typing — pick Enter, Tab, Shift, Ctrl, an arrow or an F key.'; return redraw(); }
    ui.capture = ''; ui.kmsg = ''; on.onKeyBind(mode, action, e.code);
  } : null;
};
