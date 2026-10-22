-- Voxel City typing leaderboard (V0.19.0, owner Q215: Supabase). Run this once in Supabase ▸ SQL Editor ▸ New query ▸ Run.
-- Also turn on Authentication ▸ Sign In / Providers ▸ "Allow anonymous sign-ins" (each browser gets its own hidden player id,
-- no email or password). Then copy Project Settings ▸ API ▸ Project URL + the anon public key into src/game/leaderboard.ts.
--
-- How it works: anyone can READ the table (the top 500 list). Nobody can write to it directly; a race result goes through
-- submit_typing(), which checks it first (WPM matches letters ÷ time, no more than 250 WPM, XP no more than a race can earn,
-- no faster than one race at a time) and then adds the XP to that player's row. Your XP on the board counts from when the
-- leaderboard went online, so everyone starts level.

create table if not exists public.typing_leaderboard (
  player_id   uuid primary key references auth.users (id) on delete cascade,
  username    text not null check (char_length(username) between 3 and 16 and username ~ '^[A-Za-z0-9_.]+$'),
  xp          integer not null default 0 check (xp >= 0),
  best_wpm    real not null default 0,
  races       integer not null default 0,
  last_submit timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists typing_leaderboard_xp on public.typing_leaderboard (xp desc);

alter table public.typing_leaderboard enable row level security;
drop policy if exists "anyone can read" on public.typing_leaderboard;
create policy "anyone can read" on public.typing_leaderboard for select using (true);
-- (no insert / update / delete policies: writes only happen inside submit_typing below)

create or replace function public.submit_typing(p_username text, p_xp_gain integer, p_wpm real, p_chars integer, p_seconds real, p_accuracy real)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  prev timestamptz;
begin
  if uid is null then raise exception 'not signed in'; end if;
  -- cheat checks
  if p_chars < 50 or p_chars > 400 or p_seconds < 5 or p_seconds > 900 then raise exception 'bad race'; end if;
  if p_wpm > 250 or abs(p_wpm - (p_chars / 5.0) / (p_seconds / 60.0)) > 2 then raise exception 'bad wpm'; end if;
  if p_accuracy < 0 or p_accuracy > 1 then raise exception 'bad accuracy'; end if;
  if p_xp_gain < 0 or p_xp_gain > p_chars * 3 + 200 then raise exception 'bad xp'; end if;
  select last_submit into prev from typing_leaderboard where player_id = uid;
  if prev is not null and now() - prev < make_interval(secs => greatest(p_seconds * 0.9, 5)) then raise exception 'too fast'; end if;

  insert into typing_leaderboard as t (player_id, username, xp, best_wpm, races, last_submit, updated_at)
  values (uid, p_username, p_xp_gain, p_wpm, 1, now(), now())
  on conflict (player_id) do update
    set username = excluded.username, xp = t.xp + p_xp_gain, best_wpm = greatest(t.best_wpm, p_wpm),
        races = t.races + 1, last_submit = now(), updated_at = now();
end;
$$;

revoke all on function public.submit_typing(text, integer, real, integer, real, real) from public, anon;
grant execute on function public.submit_typing(text, integer, real, integer, real, real) to authenticated;
