// City map screen (V0.20.0 "City Update", owner Q199–Q227): RACE opens the voxel island and glides in on the district your
// car races in. A name tag over each district (league chip, or what opens it); tap one to glide there. The district panel on
// the right holds its races — the Street Race (difficulty + length) and the Strip, held at the district's league — or says
// what's needed. "Whole city" zooms out, "Garage" goes back. Typing isn't here (owner: it keeps its TYPE button).
import { SaveV1, RACE_DISTS, RaceDist } from '../save/save';
import { CARS, carName } from '../data/cars';
import { DIFFICULTY, Difficulty } from '../data/economy';
import { DISTRICT_LIST, DISTRICT_BY_ID, DistrictId, isOpen, canRace, progressLeague } from '../data/districts';
import { DRIFT_COURSES, DRIFT_BY_ID } from '../data/driftCourses';
import { stripCard } from './panels/strip';
import { DEV } from './devConsole';

export interface CityMapHandlers {
  select(id: DistrictId): void; city(): void; garage(): void; cars(): void;
  race(): void; strip(): void; drift(): void;
  difficulty(d: Difficulty): void; distance(d: RaceDist): void; course(id: string): void;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const card = (id: string, title: string, go = 'Go ▸') => `<button class="g-mode blk" id="${id}"><span class="hd">${title}</span><span class="g-go">${go}</span></button>`;

/** The whole overlay: title, tags (placed each frame by main.ts), the panel for `sel` (null = whole city), buttons. */
export function cityMapHtml(save: SaveV1, sel: DistrictId | null): string {
  const tags = DISTRICT_LIST.map(d => {
    const open = isOpen(save, d), lock = d.league === null ? 'Coming soon' : `Unlocks · League ${d.league}`;
    return `<button class="cm-tag blk${open ? '' : ' locked'}${sel === d.id ? ' on' : ''}" data-a="${d.id}"><b class="hd">${esc(d.name)}</b><span class="${open ? 'g-chipL' : 'cm-lock'}">${open ? `League ${d.league}` : lock}</span></button>`;
  }).join('');
  return `<div id="citymap"><div class="cm-title blk"><b class="hd">Vox City</b><span>${sel ? 'Pick a race · or another district' : 'Pick a district'}</span></div>
    ${tags}${sel ? panelHtml(save, sel) : ''}
    <div class="cm-btns"><button class="btn ghost" id="cmBack">Garage</button>${sel ? '<button class="btn ghost" id="cmCity">Whole city</button>' : ''}</div></div>`;
}

function panelHtml(save: SaveV1, id: DistrictId) {
  const d = DISTRICT_BY_ID[id], car = CARS[save.carId];
  let body: string;
  if (!isOpen(save, d)) body = `<div class="cm-need">${d.league === null ? 'The end game: the hardest races, a boss Strip and weekly events — coming after League S.' : `Opens when you own a League ${d.league} car. You're in League ${progressLeague(save)} now.`}</div>`;
  else if (!canRace(save, d)) body = `<div class="cm-need">Your ${esc(carName(save.carId))} is League ${car.league}. Bring a League ${d.league} car or better to race here.</div><button class="btn" id="cmCars">My cars</button>`;
  else body = `${card('streetRace', esc(d.races[save.raceDiff]))}
      <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Difficulty">${(Object.keys(DIFFICULTY) as Difficulty[]).map(k => `<button class="${save.raceDiff === k ? 'on' : ''}" data-diff="${k}">${DIFFICULTY[k].label}</button>`).join('')}</div>
        <div class="g-dist seg" role="group" aria-label="Race length">${RACE_DISTS.map(m => `<button class="${save.raceDist === m ? 'on' : ''}" data-dist="${m}">${m} m</button>`).join('')}</div></div>
      ${stripCard(save)}${DEV.enabled ? driftCard(save) : ''}
      ${car.league !== d.league ? `<div class="g-note">Your League ${car.league} car races League ${d.league} rivals here — easier, at League ${d.league} pay.</div>` : ''}`;
  return `<div class="cm-panel blk"><div class="cm-head"><b class="hd">${esc(d.name)}</b>${d.league ? `<span class="g-chipL">League ${d.league}</span>` : ''}</div><span class="g-note">${esc(d.blurb)}</span>${body}</div>`;
}

/** Drift (dev only since V0.18.2): the course picker under its card. */
function driftCard(save: SaveV1) {
  const id = DRIFT_BY_ID[save.driftCourse ?? ''] ? save.driftCourse! : DRIFT_COURSES[0].id;
  return `${card('driftRun', `Drift · ${DRIFT_BY_ID[id].name}`)}
    <div class="g-pick"><div class="g-dist seg" role="group" aria-label="Drift course">${DRIFT_COURSES.map(c => `<button class="${c.id === id ? 'on' : ''}" data-dcourse="${c.id}">${c.district}</button>`).join('')}</div></div>`;
}

export function wireCityMap(el: HTMLElement, on: CityMapHandlers) {
  el.querySelectorAll<HTMLElement>('.cm-tag').forEach(b => b.addEventListener('click', () => on.select(b.dataset.a as DistrictId)));
  el.querySelector('#cmBack')?.addEventListener('click', on.garage);
  el.querySelector('#cmCity')?.addEventListener('click', on.city);
  el.querySelector('#cmCars')?.addEventListener('click', on.cars);
  el.querySelector('#streetRace')?.addEventListener('click', on.race);
  el.querySelector('#stripOpen')?.addEventListener('click', on.strip);
  el.querySelector('#driftRun')?.addEventListener('click', on.drift);
  el.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(b => b.addEventListener('click', () => on.difficulty(b.dataset.diff as Difficulty)));
  el.querySelectorAll<HTMLButtonElement>('[data-dist]').forEach(b => b.addEventListener('click', () => on.distance(+b.dataset.dist! as RaceDist)));
  el.querySelectorAll<HTMLButtonElement>('[data-dcourse]').forEach(b => b.addEventListener('click', () => on.course(b.dataset.dcourse!)));
}
