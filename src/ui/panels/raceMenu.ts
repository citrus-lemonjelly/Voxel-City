// Typing menu (bottom-right, V0.19.0): the TYPE button under RACE opens it — Typing Race + level picker, the Rival Ladder.
// Typing stays off the city map (owner, V0.20.0). Street Races, the Strip and Drift moved to the map's district panel
// (ui/cityMapUi.ts) when RACE started opening the city map.
import { SaveV1, typingStats, typingLevelOf, writeSave } from '../../save/save';
import { OpponentDef, TYPING_LEVELS, TypingLevel, TYPING_LADDER, typingLeagueOf } from '../../data/economy';
import { StageDef } from '../../data/stages';
import { typingBadge } from '../typingBadge';
import { ui, resetGarageUI, Wire } from './shared';

export function raceMenuHtml(save: SaveV1, _opp: OpponentDef, _stage: StageDef): string {
  return ui.raceMenu === 'typing' ? `<div class="g-racemenu">${typingCards(save)}</div>` : '';
}
/** A menu button: the mode's name and Go ▸ (V0.19.0, owner: titles only). */
const card = (id: string, title: string, go = 'Go ▸') => `<button class="g-mode blk" id="${id}"><span class="hd">${title}</span><span class="g-go">${go}</span></button>`;

/** Typing menu (V0.19.0): Typing Race with its level picker (Easy … Expert), then the Rival Ladder — the rung you're on. */
function typingCards(save: SaveV1) {
  const st = typingStats(save), lv = typingLevelOf(save), rungs = TYPING_LADDER.rungs.length, done = st.ladder ?? 0;
  return `${card('typingRace', `${typingBadge(typingLeagueOf(st.xp ?? 0).i, 1.25)} Typing Race`)}
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Typing level">${(Object.keys(TYPING_LEVELS) as TypingLevel[]).map(d => `<button class="${lv === d ? 'on' : ''}" data-tlevel="${d}">${TYPING_LEVELS[d].label}</button>`).join('')}</div></div>
      ${card('typingLadder', 'Rival Ladder', `${done >= rungs ? 'Done' : `${done + 1}/${rungs}`} ▸`)}`;
}

export const wireRaceMenu: Wire = (el, save, on, redraw) => {
  el.querySelector('#typingRace')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(); });
  el.querySelector('#typingLadder')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(true); });
  el.querySelectorAll<HTMLButtonElement>('[data-tlevel]').forEach(b => b.addEventListener('click', () => { save.typingLevel = b.dataset.tlevel as TypingLevel; writeSave(save); redraw(); }));
};
