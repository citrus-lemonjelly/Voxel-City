// Daily tasks (owner Q150, trial) and the login calendar (owner Q151): 28 days, one claim per calendar day,
// missed days don't reset.
import { SaveV1 } from '../../save/save';
import { dailyFor, TASK_BY_ID, taskDone, calState, calReady, calReward, paintName } from '../../game/daily';
import { DAILY, CALENDAR, dailyVx, EcoLeague, PAINT } from '../../data/economy';
import { CARS } from '../../data/cars';
import { crownIcon, Wire } from './shared';

/** Daily panel: today's three tasks + the all-three bonus. */
export function dailyHtml(save: SaveV1, close: string): string {
  const d = dailyFor(save), lg = CARS[save.carId].league as EcoLeague, vx = dailyVx(lg, DAILY.vxShare);
  const cr = (n: number) => `<b class="dl-cr">${crownIcon()}+${n}</b>`;
  const tasks = d.ids.map((id, i) => {
    const t = TASK_BY_ID[id], done = taskDone(d, i), got = d.claimed[i];
    const act = got ? '<em class="dl-st">Claimed ✓</em>' : done ? `<button class="btn dl-btn" data-dclaim="${i}">Claim</button>` : `<em class="dl-st">${d.prog[i]} / ${t.target}</em>`;
    return `<div class="dl-task ${got ? 'got' : done ? 'done' : ''}"><span class="dl-txt">${t.text}</span><span class="dl-rw">+${vx.toLocaleString()} VX ${cr(DAILY.crownsEach)}</span>
      <i class="dl-bar"><u style="width:${Math.round(Math.min(1, d.prog[i] / t.target) * 100)}%"></u></i>${act}</div>`;
  }).join('');
  const allGot = d.claimed.every(Boolean);
  const bonus = `<div class="dl-task dl-bonus ${d.bonus ? 'got' : allGot ? 'done' : ''}"><span class="dl-txt">All three done</span><span class="dl-rw">${cr(DAILY.crownsAll)}</span><i></i>${d.bonus ? '<em class="dl-st">Claimed ✓</em>' : allGot ? '<button class="btn dl-btn" data-dclaim="-1">Claim</button>' : '<em class="dl-st">Bonus</em>'}</div>`;
  return `<div class="g-panel g-daily blk">${close}<h2 class="hd">Daily <small class="g-sub">New tasks at midnight · pay is for League ${lg}</small></h2>
    <div class="dl-list">${tasks}${bonus}</div>
    <div class="g-note">Tasks count every race you finish today. Crowns buy garage slots, premium paints and special parts.</div></div>`;
}

/** Login calendar panel. */
export function calendarHtml(save: SaveV1, close: string): string {
  const lg = CARS[save.carId].league as EcoLeague;
  const c = calState(save), ready = calReady(save), fresh = c.n >= CALENDAR.days && ready, shown = fresh ? 0 : c.n, next = shown + 1;
  const short = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n.toLocaleString();
  const cells = Array.from({ length: CALENDAR.days }, (_, i) => {
    const n = i + 1, r = calReward(n, lg, save.paintsOwned), st = n <= shown ? 'got' : n === next && ready ? 'today' : '';
    const paint = r.paint ? PAINT.premium.find(p => p.id === r.paint) : undefined;
    const what = paint ? `<i class="cal-sw" style="background:${paint.color}" title="${paintName(paint.id)} paint"></i>` : r.crowns ? `<span class="cal-cr">${crownIcon()}${r.crowns}</span>` : `<span>${short(r.vx)}</span>`;
    return `<div class="cal-day ${st} ${n === CALENDAR.days ? 'big' : ''}"><b>${n}</b>${what}${n <= shown ? '<em>✓</em>' : ''}</div>`;
  }).join('');
  const calBtn = ready ? `<button class="btn race" id="calClaim">Claim day ${next}</button>` : `<span class="g-note">Day ${c.n} claimed — come back tomorrow.</span>`;
  return `<div class="g-panel g-daily blk">${close}<h2 class="hd">Calendar <small class="g-sub">Month ${c.month + (fresh ? 1 : 0)} · ${shown} of ${CALENDAR.days} · missed days don't reset</small></h2>
    <div class="cal-grid">${cells}</div>
    <div class="cal-foot">${calBtn}<span class="g-note">Day 28: ${paintName(CALENDAR.finalPaint)} paint (calendar only) · VX days pay for League ${lg}</span></div></div>`;
}

export const wireDaily: Wire = (el, _save, on) => {
  el.querySelectorAll<HTMLButtonElement>('[data-dclaim]').forEach(b => b.addEventListener('click', () => on.onClaimDaily(+b.dataset.dclaim!)));
  el.querySelector('#calClaim')?.addEventListener('click', () => on.onClaimCal());
};
