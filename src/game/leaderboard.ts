// Typing leaderboard (V0.19.0, owner Q215: Supabase) — the top 500 typers by typing XP. The database side is
// docs/leaderboard.sql. Each browser signs in anonymously (a hidden player id, no email or password), sends each Typing Race
// result to submit_typing() — which checks it — and reads the top 500 back. Until LEADERBOARD has the project's URL and
// anon key the game stays offline and never calls out. Nothing here can break a race: every call fails quietly.
import { makeRng } from './ai';
import { usernames } from './usernames';

/** Owner: Supabase ▸ Project Settings ▸ API — the Project URL and the anon public key (safe to ship; the table's rules
 *  only allow reading, and writing through the checked submit_typing function). */
export const LEADERBOARD = { url: '', anonKey: '', top: 500 };
export const leaderboardOnline = () => !!(LEADERBOARD.url && LEADERBOARD.anonKey);
/** Test hook (?lbmock): a made-up board so the screen can be checked without a server. */
export const LB_MOCK = { on: false };

export interface BoardRow { username: string; xp: number; best_wpm: number; races: number; player_id: string }
interface Session { access: string; refresh: string; expires: number; id: string }
const KEY = 'voxelcity.leaderboard';

async function call(path: string, init: RequestInit & { token?: string } = {}): Promise<any> {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(LEADERBOARD.url.replace(/\/$/, '') + path, { ...init, signal: ctl.signal,
      headers: { apikey: LEADERBOARD.anonKey, Authorization: `Bearer ${init.token ?? LEADERBOARD.anonKey}`, 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`${res.status}`);
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  } finally { clearTimeout(timer); }
}
const keep = (j: any): Session => ({ access: j.access_token, refresh: j.refresh_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000, id: j.user?.id ?? '' });
/** This browser's sign-in: kept in localStorage, refreshed when old, made the first time (anonymous). */
async function session(): Promise<Session> {
  let s: Session | null = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* private mode */ }
  if (s && s.expires > Date.now()) return s;
  const j = s?.refresh ? await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh }) }).catch(() => null) : null;
  const fresh = keep(j ?? await call('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ data: {} }) }));
  if (!fresh.id && s) fresh.id = s.id;
  try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* fine */ }
  return fresh;
}
/** Your player id on the board ('' until you have raced online). */
export function myBoardId(): string { try { return JSON.parse(localStorage.getItem(KEY) || 'null')?.id ?? ''; } catch { return ''; } }

/** What a finished Typing Race sends (the server re-checks every number). */
export function racePayload(username: string, xpGain: number, chars: number, seconds: number, accuracy: number) {
  return { p_username: username, p_xp_gain: Math.round(xpGain), p_wpm: Math.round((chars / 5) / (seconds / 60) * 100) / 100, p_chars: chars, p_seconds: Math.round(seconds * 100) / 100, p_accuracy: Math.round(accuracy * 1000) / 1000 };
}
/** Send a finished Typing Race. True when the board took it. */
export async function submitTypingRace(username: string, xpGain: number, chars: number, seconds: number, accuracy: number): Promise<boolean> {
  if (!leaderboardOnline() || chars < 50 || seconds <= 0) return false;
  try { const s = await session(); await call('/rest/v1/rpc/submit_typing', { method: 'POST', token: s.access, body: JSON.stringify(racePayload(username, xpGain, chars, seconds, accuracy)) }); return true; }
  catch { return false; }
}
/** The top typers by XP (null = offline or the server didn't answer). */
export async function topTypers(): Promise<BoardRow[] | null> {
  if (LB_MOCK.on) return mockBoard();
  if (!leaderboardOnline()) return null;
  try { return await call(`/rest/v1/typing_leaderboard?select=player_id,username,xp,best_wpm,races&order=xp.desc&limit=${LEADERBOARD.top}`); }
  catch { return null; }
}
function mockBoard(): BoardRow[] {
  const rng = makeRng(77);
  let xp = 240_000;
  return usernames(99, LEADERBOARD.top).map((u, i) => ({ username: u, xp: (xp = Math.max(40, Math.round(xp * (0.97 + rng() * 0.025)))), best_wpm: Math.round(140 - i * 0.2 - rng() * 20), races: 50 + Math.round(rng() * 900), player_id: `mock-${i}` }));
}
