// Race menu (RACE button, bottom-right): Street Race with difficulty + length pickers, the Strip card, Typing Race.
import { SaveV1, RACE_DISTS, RaceDist, typingStats } from '../../save/save';
import { CARS, carName } from '../../data/cars';
import { DIFFICULTY, Difficulty, racePay, typingPay, driftPay, OpponentDef } from '../../data/economy';
import { DRIFT_COURSES, DRIFT_BY_ID } from '../../data/driftCourses';
import { StageDef } from '../../data/stages';
import { averageFor } from '../../game/typing';
import { ui, resetGarageUI, Wire } from './shared';
import { stripCard } from './strip';

export function raceMenuHtml(save: SaveV1, opp: OpponentDef, stage: StageDef): string {
  if (!ui.raceMenu) return '';
  const car = CARS[save.carId];
  return `<div class="g-racemenu">
      <button class="g-mode blk" id="streetRace"><span class="hd">${stage.races[save.raceDiff]}</span><span class="g-mode-sub">Street Race · ${stage.name} · ${save.raceDist} m · ${DIFFICULTY[save.raceDiff].label}<br>vs ${opp.name} · ${carName(opp.carId)} · win +${racePay(car.league, save.raceDiff, true, save.raceDist).result.toLocaleString()} VX</span><span class="g-go">Go ▸</span></button>
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Difficulty">${(Object.keys(DIFFICULTY) as Difficulty[]).map(d => `<button class="${save.raceDiff === d ? 'on' : ''}" data-diff="${d}">${DIFFICULTY[d].label}</button>`).join('')}</div>
        <div class="g-dist seg" role="group" aria-label="Race length">${RACE_DISTS.map(d => `<button class="${save.raceDist === d ? 'on' : ''}" data-dist="${d}">${d} m</button>`).join('')}</div></div>
      ${stripCard(save)}
      <button class="g-mode blk" id="typingRace"><span class="hd">Typing Race</span><span class="g-mode-sub">${stage.name} · ${DIFFICULTY[save.raceDiff].label} · 5 racers · your ${DIFFICULTY[save.raceDiff].label} average ${Math.round(averageFor(typingStats(save), save.raceDiff))} wpm<br>Type to drive · win +${typingPay(car.league, save.raceDiff, 1, false, 0).result.toLocaleString()} VX</span><span class="g-go">Go ▸</span></button>
      ${driftCard(save)}
    </div>`;
}

/** Drift (owner, V0.18.0): the district's winding night road, a course picker, best score. */
function driftCard(save: SaveV1) {
  const id = DRIFT_BY_ID[save.driftCourse ?? ''] ? save.driftCourse! : DRIFT_COURSES[0].id, c = DRIFT_BY_ID[id], best = save.driftBest?.[id];
  return `<button class="g-mode blk" id="driftRun"><span class="hd">Drift · ${c.name}</span><span class="g-mode-sub">${c.district} · night · ${DIFFICULTY[save.raceDiff].label} · vs a ghost rival${best ? ` · best ${best.toLocaleString()}` : ''}<br>${c.blurb} · win +${driftPay(CARS[save.carId].league, save.raceDiff, true).result.toLocaleString()} VX</span><span class="g-go">Go ▸</span></button>
    <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Drift course">${DRIFT_COURSES.map(d => `<button class="${d.id === id ? 'on' : ''}" data-dcourse="${d.id}">${d.district}</button>`).join('')}</div></div>`;
}

export const wireRaceMenu: Wire = (el, _save, on) => {
  el.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(b => b.addEventListener('click', () => on.onDifficulty(b.dataset.diff as Difficulty)));
  el.querySelectorAll<HTMLButtonElement>('[data-dist]').forEach(b => b.addEventListener('click', () => on.onDistance(+b.dataset.dist! as RaceDist)));
  el.querySelector('#typingRace')?.addEventListener('click', () => { on.onView('home'); resetGarageUI(); on.onTyping(); });
  el.querySelector('#driftRun')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onDrift(); });
  el.querySelectorAll<HTMLButtonElement>('[data-dcourse]').forEach(b => b.addEventListener('click', () => on.onDriftCourse(b.dataset.dcourse!)));
  el.querySelector('#streetRace')?.addEventListener('click', () => { if (ui.panel === 'catalog' || ui.panel === 'parts') on.onPreview(null); on.onView('home'); resetGarageUI(); on.onRace(); });
};
