// Profile panel: driver card with your username (V0.19.0: pick your own, or roll a random one), then two header tabs —
// Drag (the car you drive, moved here from the home screen's top-left card, owner 2026-10-21, and Street Race stats) and
// Typing (V0.19.0: your typing league badge + XP, every league's badge, typing stats per level, the Rival Ladder).
import { SaveV1, RACE_DISTS, typingStats, playerName, writeSave } from '../../save/save';
import { CARS, carBrand, carName } from '../../data/cars';
import { carStats, displayStats } from '../../game/stats';
import { averageWpm, ladderRival } from '../../game/typing';
import { TYPING_LEAGUES, TYPING_LADDER, TYPING_LEVELS, TYPING_XP, TypingLevel, typingLeagueOf } from '../../data/economy';
import { cleanUsername, makeUsername, isBlockedName, USERNAME } from '../../game/usernames';
import { typingBadge } from '../typingBadge';
import { topTypers, leaderboardOnline, myBoardId, BoardRow, LB_MOCK, LEADERBOARD } from '../../game/leaderboard';
import { DEV } from '../devConsole';
import { icon, fmtTime, ui, Wire } from './shared';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cell = (v: string | number, label: string) => `<div><b>${v}</b><span>${label}</span></div>`;

export function profileHtml(save: SaveV1, close: string): string {
  const name = playerName(save), tl = typingLeagueOf(typingStats(save).xp ?? 0);
  return `<div class="g-panel blk">${close}<h2 class="hd">Profile</h2>
      <div class="g-avatar"><div class="g-avatar-box">${icon('profile', 7)}</div><div class="pf-id"><b class="hd pf-name">${esc(name)}</b>
        <span class="pf-leagues"><span class="g-chipL">League ${CARS[save.carId].league}</span><span class="pf-tl">${typingBadge(tl.i, 1.25)}${tl.name} typist</span></span>
        <div class="pf-edit"><input id="pfName" maxlength="${USERNAME.max}" spellcheck="false" autocomplete="off" value="${esc(name)}" aria-label="Username"><button class="btn ghost" id="pfSave">Save</button><button class="btn ghost" id="pfRandom">Random</button></div>
        <span class="g-note">${ui.pmsg ? esc(ui.pmsg) : `${USERNAME.min}–${USERNAME.max} letters, numbers, _ or .`}</span></div></div>
      <div class="seg pf-tabs">${(['drag', 'typing', 'top'] as const).map(t => `<button class="${ui.ptab === t ? 'on' : ''}" data-ptab="${t}">${{ drag: 'Drag', typing: 'Typing', top: `Top ${LEADERBOARD.top}` }[t]}</button>`).join('')}</div>
      ${ui.ptab === 'typing' ? typingTab(save) : ui.ptab === 'top' ? topTab(name) : dragTab(save)}</div>`;
}

function dragTab(save: SaveV1) {
  const rate = save.races ? Math.round(save.wins / save.races * 100) + '%' : '—';
  const st = displayStats(carStats(save.carId, save.equipped));
  return `<div class="g-pcar"><div class="g-league"><span class="g-chipL">League ${CARS[save.carId].league}</span>${carBrand(save.carId)} · driving</div><b class="hd">${carName(save.carId)}</b>
        <div class="g-stats"><span><b>${st.hp}</b> hp</span><span><b>${st.shifts}</b> shifts</span><span><b>${st.shiftTime.toFixed(2)}s</b> shift</span><span><b>${(st.redline / 1000).toFixed(1)}k</b> redline</span></div></div>
      <div class="g-grid">${cell(save.races, 'races')}${cell(save.wins, 'wins')}${cell(rate, 'win rate')}
        ${RACE_DISTS.map(d => cell(save.best[d] ? fmtTime(save.best[d]!) : '—', `best ${d} m`)).join('')}${cell(save.perfectShifts, 'perfect shifts')}${cell(DEV.unlimited ? '∞' : save.voxels.toLocaleString(), 'voxels')}</div>`;
}

function typingTab(save: SaveV1) {
  const s = typingStats(save), xp = s.xp ?? 0, tl = typingLeagueOf(xp), rungs = TYPING_LADDER.rungs.length, done = s.ladder ?? 0;
  const acc = s.keys ? `${Math.floor((s.keys - s.errors) / s.keys * 100)}%` : '—';
  const avg = (l: TypingLevel) => { const r = s.recentBy?.[l] ?? []; return r.length ? Math.round(averageWpm(r)) : '—'; };
  return `<div class="pf-tleague">${typingBadge(tl.i, 4)}<div><b class="hd">${tl.name}</b><span>Typing league · ${xp.toLocaleString()} XP</span>
        <div class="pf-xpbar"><i style="width:${(tl.progress * 100).toFixed(1)}%"></i></div>
        <span>${tl.next ? `${(tl.next.xp - xp).toLocaleString()} XP to ${tl.next.name}` : 'Top league reached'}${tl.next ? ` · +${tl.next.div <= 1 ? TYPING_XP.crowns.league : TYPING_XP.crowns.division} Crowns` : ''}</span></div></div>
      <div class="pf-ladder">${TYPING_LEAGUES.map((l, i) => `<span title="${l.name} · ${l.xp.toLocaleString()} XP">${typingBadge(i, 2, i > tl.i)}<i>${l.name}</i></span>`).join('')}</div>
      <div class="g-grid">${cell(s.races, 'typing races')}${cell(s.wins, 'wins')}${cell(s.races ? Math.round(s.wins / s.races * 100) + '%' : '—', 'win rate')}
        ${cell(s.best ? Math.round(s.best) : '—', 'best wpm')}${cell(s.races ? Math.round(averageWpm(s.recent)) : '—', 'avg wpm (10)')}${cell(acc, 'accuracy')}
        ${(Object.keys(TYPING_LEVELS) as TypingLevel[]).map(l => cell(avg(l), `${TYPING_LEVELS[l].label} avg`)).join('')}
        ${cell(`${Math.min(done, rungs)}/${rungs}`, 'ladder rungs')}${cell(done >= rungs ? 'done' : esc(ladderRival(done)), 'next ladder rival')}</div>`;
}

// ---- Top 500 (V0.19.0, owner Q215): the online typing leaderboard by XP. Fetched when the tab opens (again after a minute). ----
const board: { rows: BoardRow[] | null; loading: boolean; at: number } = { rows: null, loading: false, at: 0 };
function topTab(me: string) {
  if (!leaderboardOnline() && !LB_MOCK.on) return `<div class="pf-top-msg"><b class="hd">Coming soon</b><span>The online leaderboard of the top ${LEADERBOARD.top} typers isn't switched on yet. Your typing XP keeps counting here in the meantime.</span></div>`;
  if (!board.rows) return `<div class="pf-top-msg"><span>${board.loading || !board.at ? 'Loading the leaderboard…' : 'The leaderboard didn’t answer — try again in a moment.'}</span></div>`;
  const id = myBoardId(), mine = board.rows.findIndex(r => (id && r.player_id === id) || (!id && r.username === me));
  return `<div class="pf-top-head"><span>${mine >= 0 ? `You are <b>#${mine + 1}</b> of ${board.rows.length}` : `Not on the board yet — the top ${LEADERBOARD.top} by typing XP`}</span></div>
      <div class="pf-top">${board.rows.map((r, i) => { const t = typingLeagueOf(r.xp); return `<div class="pf-trow${i === mine ? ' me' : ''}"><span class="hd">${i + 1}</span>${typingBadge(t.i, 1)}<b>${esc(r.username)}</b><span>${t.name}</span><span>${Math.round(r.best_wpm)} wpm</span><span class="hd">${r.xp.toLocaleString()}</span></div>`; }).join('')}</div>`;
}

export const wireProfile: Wire = (el, save, _on, redraw) => {
  el.querySelectorAll<HTMLButtonElement>('[data-ptab]').forEach(b => b.addEventListener('click', () => { ui.ptab = b.dataset.ptab as typeof ui.ptab; redraw(); }));
  if (ui.ptab === 'top' && !board.loading && Date.now() - board.at > 60_000 && (leaderboardOnline() || LB_MOCK.on)) {
    board.loading = true;
    topTypers().then(rows => { board.rows = rows; board.loading = false; board.at = Date.now(); if (ui.panel === 'profile' && ui.ptab === 'top') redraw(); });
  }
  const input = el.querySelector<HTMLInputElement>('#pfName');
  if (!input) return;
  const set = (raw: string) => {
    const n = cleanUsername(raw);
    if (!n) { ui.pmsg = `Use ${USERNAME.min}–${USERNAME.max} letters, numbers, _ or .`; return redraw(); }
    if (isBlockedName(n)) { ui.pmsg = 'That name is not allowed — keep it friendly'; return redraw(); }   // owner Q214
    save.username = n; writeSave(save); ui.pmsg = n === raw.trim() ? 'Username saved' : `Saved as ${n}`; redraw();
  };
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') set(input.value); });
  el.querySelector('#pfSave')?.addEventListener('click', () => set(input.value));
  el.querySelector('#pfRandom')?.addEventListener('click', () => set(makeUsername(() => Math.random())));
};
