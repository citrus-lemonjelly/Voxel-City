// Race menus (bottom-right): RACE opens the Drag menu (Street Race with difficulty + length pickers, the Strip card); the
// TYPING button under it opens the Typing menu (Typing Race + level picker, the Rival Ladder).
import { SaveV1, RACE_DISTS, RaceDist, typingStats, typingLevelOf, writeSave } from '../../save/save';
import { DIFFICULTY, Difficulty, OpponentDef, TYPING_LEVELS, TypingLevel, TYPING_LADDER, typingLeagueOf } from '../../data/economy';
import { DRIFT_COURSES, DRIFT_BY_ID } from '../../data/driftCourses';
import { StageDef } from '../../data/stages';
import { typingBadge } from '../typingBadge';
import { ui, resetGarageUI, Wire } from './shared';
import { stripCard } from './strip';
import { DEV } from '../devConsole';

export function raceMenuHtml(save: SaveV1, _opp: OpponentDef, stage: StageDef): string {
  if (!ui.raceMenu) return '';
  // V0.19.0 (owner): titles only — who you race, where, pay etc. show on the race screen. Race opens the Drag menu (Street
  // Race + its pickers, the Strip, Drift in dev); the Typing button under Race opens the Typing menu.
  if (ui.raceMenu === 'typing') return `<div class="g-racemenu">${typingCards(save)}</div>`;
  return `<div class="g-racemenu">
      ${card('streetRace', stage.races[save.raceDiff])}
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Difficulty">${(Object.keys(DIFFICULTY) as Difficulty[]).map(d => `<button class="${save.raceDiff === d ? 'on' : ''}" data-diff="${d}">${DIFFICULTY[d].label}</button>`).join('')}</div>
        <div class="g-dist seg" role="group" aria-label="Race length">${RACE_DISTS.map(d => `<button class="${save.raceDist === d ? 'on' : ''}" data-dist="${d}">${d} m</button>`).join('')}</div></div>
      ${stripCard(save)}
      ${DEV.enabled ? driftCard(save) : ''}
    </div>`;
}
/** A menu button: the mode's name and Go ▸. */
const card = (id: string, title: string, go = 'Go ▸') => `<button class="g-mode blk" id="${id}"><span class="hd">${title}</span><span class="g-go">${go}</span></button>`;

/** Typing menu (V0.19.0): Typing Race with its level picker (Easy … Expert), then the Rival Ladder — the rung you're on. */
function typingCards(save: SaveV1) {
  const st = typingStats(save), lv = typingLevelOf(save), rungs = TYPING_LADDER.rungs.length, done = st.ladder ?? 0;
  return `${card('typingRace', `${typingBadge(typingLeagueOf(st.xp ?? 0).i, 1.25)} Typing Race`)}
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Typing level">${(Object.keys(TYPING_LEVELS) as TypingLevel[]).map(d => `<button class="${lv === d ? 'on' : ''}" data-tlevel="${d}">${TYPING_LEVELS[d].label}</button>`).join('')}</div></div>
      ${card('typingLadder', 'Rival Ladder', `${done >= rungs ? 'Done' : `${done + 1}/${rungs}`} ▸`)}`;
}

/** Drift (owner, V0.18.0): the district's winding night road and a course picker. Dev mode only since V0.18.2 (owner:
 *  "this needs a lot of work" — ROADMAP E4.6). */
function driftCard(save: SaveV1) {
  const id = DRIFT_BY_ID[save.driftCourse ?? ''] ? save.driftCourse! : DRIFT_COURSES[0].id;
  return `${card('driftRun', `Drift · ${DRIFT_BY_ID[id].name}`)}
    <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Drift course">${DRIFT_COURSES.map(d => `<button class="${d.id === id ? 'on' : ''}" data-dcourse="${d.id}">${d.district}</button>`).join('')}</div></div>`;
}

export const wireRaceMenu: Wire = (el, _save, on, redraw) => {
  el.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(b => b.addEventListener('click', () => on.onDifficulty(b.dataset.diff as Difficulty)));
  el.querySelectorAll<HTMLButtonElement>('[data-dist]').forEach(b => b.addEventListener('click', () => on.onDistance(+b.dataset.dist! as RaceDist)));
  el.querySelector('#typingRace')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(); });
  el.querySelector('#typingLadder')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(true); });
  el.querySelectorAll<HTMLButtonElement>('[data-tlevel]').forEach(b => b.addEventListener('click', () => { _save.typingLevel = b.dataset.tlevel as TypingLevel; writeSave(_save); redraw(); }));
  el.querySelector('#driftRun')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onDrift(); });
  el.querySelectorAll<HTMLButtonElement>('[data-dcourse]').forEach(b => b.addEventListener('click', () => on.onDriftCourse(b.dataset.dcourse!)));
  el.querySelector('#streetRace')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onRace(); });
};
