// Dailies + login calendar (owner Q150–Q151, trial). Three tasks a day, new at local midnight; a 28-day calendar where you
// claim one day per calendar day (missed days don't reset). Numbers live in data/economy.ts (DAILY, CALENDAR).
import { SaveV1 } from '../save/save';
import { DAILY, CALENDAR, PAINT, EcoLeague, dailyVx } from '../data/economy';
import { makeRng } from './ai';

/** Things the game reports as they happen. */
export type DailyEvent = 'streetWin' | 'hardWin' | 'perfectLaunch' | 'perfectShift' | 'race' | 'typingWin' | 'typingAcc' | 'stripClear';
export interface DailyTask { id: string; text: string; event: DailyEvent; target: number; kind: 'drag' | 'typing' | 'any' }
export const DAILY_TASKS: DailyTask[] = [
  { id: 'win3', text: 'Win 3 Street Races', event: 'streetWin', target: 3, kind: 'drag' },
  { id: 'hard1', text: 'Win a Hard Street Race', event: 'hardWin', target: 1, kind: 'drag' },
  { id: 'launch5', text: 'Get 5 Perfect launches', event: 'perfectLaunch', target: 5, kind: 'drag' },
  { id: 'shift20', text: 'Make 20 Perfect shifts', event: 'perfectShift', target: 20, kind: 'drag' },
  { id: 'typewin2', text: 'Win 2 Typing Races', event: 'typingWin', target: 2, kind: 'typing' },
  { id: 'acc1', text: 'Finish a Typing Race at 98%+ accuracy', event: 'typingAcc', target: 1, kind: 'typing' },
  { id: 'race6', text: 'Finish 6 races of any kind', event: 'race', target: 6, kind: 'any' },
  { id: 'strip2', text: 'Clear 2 Strip levels', event: 'stripClear', target: 2, kind: 'any' },
];
export const TASK_BY_ID = Object.fromEntries(DAILY_TASKS.map(t => [t.id, t]));

/** Test console: shift "today" by whole days (Next day button). */
export let dayOffset = 0;
export const shiftDay = (n = 1) => { dayOffset += n; };
/** Today's local date as YYYY-MM-DD. */
export function today(): string {
  // whole calendar days (V0.18.0 fix): adding 24 h could land on the same date across a clock change (the test console's day skip)
  const n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const daySeed = (day: string) => +day.replace(/-/g, '') * 7919;

/** Today's tasks (rolled from the date: one Street Race task, one Typing Race task, one of any kind). */
export function dailyFor(s: SaveV1): NonNullable<SaveV1['daily']> {
  const day = today();
  if (s.daily?.day === day) return s.daily;
  const rng = makeRng(daySeed(day)), pick = (kind: DailyTask['kind'], not: string[]) => {
    const pool = DAILY_TASKS.filter(t => t.kind === kind && !not.includes(t.id));
    return pool[Math.floor(rng() * pool.length)].id;
  };
  const ids: string[] = [pick('drag', []), pick('typing', [])];
  ids.push(pick(rng() < 0.5 ? 'any' : 'drag', ids));
  return (s.daily = { day, ids, prog: ids.map(() => 0), claimed: ids.map(() => false), bonus: false });
}
/** Count something that happened towards today's tasks. */
export function dailyEvent(s: SaveV1, ev: DailyEvent, n = 1) {
  if (n <= 0) return;
  const d = dailyFor(s);
  d.ids.forEach((id, i) => { const t = TASK_BY_ID[id]; if (t?.event === ev) d.prog[i] = Math.min(t.target, d.prog[i] + n); });
}
export const taskDone = (d: NonNullable<SaveV1['daily']>, i: number) => d.prog[i] >= (TASK_BY_ID[d.ids[i]]?.target ?? Infinity);
/** Claim a finished task (i) or the all-three bonus (i = -1). Returns what was paid, or null. */
export function claimDaily(s: SaveV1, i: number, league: EcoLeague): { vx: number; crowns: number } | null {
  const d = dailyFor(s);
  if (i < 0) {
    if (d.bonus || !d.claimed.every(Boolean)) return null;
    d.bonus = true; s.crowns += DAILY.crownsAll; return { vx: 0, crowns: DAILY.crownsAll };
  }
  if (d.claimed[i] || !taskDone(d, i)) return null;
  const vx = dailyVx(league, DAILY.vxShare);
  d.claimed[i] = true; s.voxels += vx; s.crowns += DAILY.crownsEach;
  return { vx, crowns: DAILY.crownsEach };
}

// ---------------- login calendar ----------------
export interface CalReward { vx: number; crowns: number; paint?: string }
/** What day n (1–28) of the calendar gives. */
export function calReward(n: number, league: EcoLeague, paintsOwned: string[] = []): CalReward {
  if (n === CALENDAR.days) {
    const owned = paintsOwned.includes(CALENDAR.finalPaint);
    return owned ? { vx: 0, crowns: CALENDAR.finalCrownsIfOwned } : { vx: 0, crowns: 0, paint: CALENDAR.finalPaint };
  }
  const cr = CALENDAR.crownDays[n];
  return cr ? { vx: 0, crowns: cr } : { vx: dailyVx(league, CALENDAR.vxShare), crowns: 0 };
}
export function calState(s: SaveV1) { return (s.cal ??= { n: 0, last: '', month: 1 }); }
/** Can today's calendar day be claimed? */
export const calReady = (s: SaveV1) => calState(s).last !== today();
/** Claim today's calendar day. After day 28 a new month starts. */
export function claimCalendar(s: SaveV1, league: EcoLeague): (CalReward & { day: number }) | null {
  const c = calState(s); if (!calReady(s)) return null;
  if (c.n >= CALENDAR.days) { c.n = 0; c.month++; }
  const day = c.n + 1, r = calReward(day, league, s.paintsOwned);
  s.voxels += r.vx; s.crowns += r.crowns;
  if (r.paint) (s.paintsOwned ??= []).push(r.paint);
  c.n = day; c.last = today();
  return { ...r, day };
}
export const paintName = (id: string) => PAINT.premium.find(p => p.id === id)?.name ?? id;
/** Anything to claim (garage tab shows a dot)? */
export function dailyClaimable(s: SaveV1): boolean {
  const d = dailyFor(s);
  return calReady(s) || d.ids.some((_, i) => !d.claimed[i] && taskDone(d, i)) || (!d.bonus && d.claimed.every(Boolean));
}
