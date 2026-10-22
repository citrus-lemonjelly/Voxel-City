// Key bindings (owner 2026-10-19): Settings ▸ Controls, with a Drag Race and a Typing Race set. One key per action;
// Shift / Ctrl / Alt match either side. Typing Race keys can't be letters, numbers, space or punctuation (those are typed).
export type DragAction = 'gas' | 'up' | 'down' | 'nitrous';
export type TypeAction = 'nitro' | 'leave';
export interface KeyBinds { drag: Record<DragAction, string>; typing: Record<TypeAction, string> }
export const DEFAULT_KEYS: KeyBinds = { drag: { gas: 'Space', up: 'ArrowUp', down: 'ShiftLeft', nitrous: 'Digit1' }, typing: { nitro: 'Enter', leave: 'Escape' } };
export const KEY_ACTIONS: { drag: [DragAction, string][]; typing: [TypeAction, string][] } = {
  drag: [['gas', 'Gas (Classic: also shifts up)'], ['up', 'Shift up'], ['down', 'Shift down'], ['nitrous', 'Nitrous']],
  typing: [['nitro', 'Nitro (finish the word)'], ['leave', 'Leave the race']],
};
const side = (c: string) => c.replace(/^(Shift|Control|Alt|Meta)(Left|Right)$/, '$1');
export const keyMatches = (code: string, bound: string) => code === bound || side(code) === side(bound) && side(bound) !== bound;
export function keyName(code: string) {
  const s = side(code);
  const named: Record<string, string> = { Space: 'SPACE', Shift: 'SHIFT', Control: 'CTRL', Alt: 'ALT', Meta: 'WIN', Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', CapsLock: 'CAPS', NumpadEnter: 'NUM ENTER' };
  return named[s] ?? s.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}
/** A save's bindings with the defaults filled in. */
export function keysOf(settings: { keys?: Partial<{ drag: Partial<Record<DragAction, string>>; typing: Partial<Record<TypeAction, string>> }> }): KeyBinds {
  return { drag: { ...DEFAULT_KEYS.drag, ...(settings.keys?.drag || {}) }, typing: { ...DEFAULT_KEYS.typing, ...(settings.keys?.typing || {}) } };
}
