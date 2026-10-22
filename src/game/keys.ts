// Key bindings (owner 2026-10-19): Settings ▸ Keybinds, with a Drag Race, a Typing Race and a Drift set (drift: V0.18.0).
// One key per action; Shift / Ctrl / Alt match either side. Typing Race keys can't be letters, numbers, space or punctuation
// (those are typed).
export type DragAction = 'gas' | 'up' | 'down' | 'nitrous';
export type TypeAction = 'nitro' | 'leave';
export type DriftAction = 'gas' | 'drift' | 'up' | 'down' | 'leave';
export type KeyMode = 'drag' | 'typing' | 'drift';
export interface KeyBinds { drag: Record<DragAction, string>; typing: Record<TypeAction, string>; drift: Record<DriftAction, string> }
export const DEFAULT_KEYS: KeyBinds = { drag: { gas: 'Space', up: 'ArrowUp', down: 'ShiftLeft', nitrous: 'Digit1' }, typing: { nitro: 'Enter', leave: 'Escape' },
  drift: { gas: 'Space', drift: 'ShiftLeft', up: 'ArrowUp', down: 'ArrowDown', leave: 'Escape' } };
export const KEY_ACTIONS: { drag: [DragAction, string][]; typing: [TypeAction, string][]; drift: [DriftAction, string][] } = {
  drag: [['gas', 'Gas (Classic: also shifts up)'], ['up', 'Shift up'], ['down', 'Shift down'], ['nitrous', 'Nitrous']],
  typing: [['nitro', 'Nitro (finish the word)'], ['leave', 'Leave the race']],
  drift: [['gas', 'Gas (launch revs · revs in a drift)'], ['drift', 'Drift (kick the rear out at a turn)'], ['up', 'Shift up'], ['down', 'Shift down'], ['leave', 'Leave the run']],
};
export const KEY_MODE_LABEL: Record<KeyMode, string> = { drag: 'Drag Race', typing: 'Typing Race', drift: 'Drift' };
const side = (c: string) => c.replace(/^(Shift|Control|Alt|Meta)(Left|Right)$/, '$1');
export const keyMatches = (code: string, bound: string) => code === bound || side(code) === side(bound) && side(bound) !== bound;
export function keyName(code: string) {
  const s = side(code);
  const named: Record<string, string> = { Space: 'SPACE', Shift: 'SHIFT', Control: 'CTRL', Alt: 'ALT', Meta: 'WIN', Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', CapsLock: 'CAPS', NumpadEnter: 'NUM ENTER' };
  return named[s] ?? s.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}
type Partial2<T> = { [K in keyof T]?: Partial<T[K]> };
/** A save's bindings with the defaults filled in. */
export function keysOf(settings: { keys?: Partial2<KeyBinds> }): KeyBinds {
  const k = settings.keys || {};
  return { drag: { ...DEFAULT_KEYS.drag, ...(k.drag || {}) }, typing: { ...DEFAULT_KEYS.typing, ...(k.typing || {}) }, drift: { ...DEFAULT_KEYS.drift, ...(k.drift || {}) } };
}
