-- ============================================================================================================
-- VOXEL CITY TOP 500 — ADMIN LINES (owner 2026-10-22)
-- How to use: Supabase ▸ SQL Editor ▸ New query. Copy ONE block below, change the name in 'quotes', press Run.
-- Lines starting with -- are notes and do nothing. Names are case-sensitive: copy them exactly as the board shows them.
-- Nothing here touches the game itself — only the online board.
-- ============================================================================================================


-- ---------- 1. LOOK ----------------------------------------------------------------------------------------

-- 1a. The top 50, best first
select username, xp, best_wpm, races, updated_at from public.typing_leaderboard order by xp desc limit 50;

-- 1b. Find a player (the % signs mean "anything before / after", so 'canoe' finds orangecanoe224)
select username, xp, best_wpm, races, player_id from public.typing_leaderboard where username ilike '%canoe%';

-- 1c. How many players are on the board
select count(*) as players from public.typing_leaderboard;

-- 1d. Who played today
select username, xp, races, updated_at from public.typing_leaderboard where updated_at > now() - interval '1 day' order by updated_at desc;


-- ---------- 2. REMOVE ONE PLAYER --------------------------------------------------------------------------
-- Takes them off the board. If they race again they come back, starting from 0 XP. To keep them off, ban them (5).

delete from public.typing_leaderboard where username = 'test_run';


-- ---------- 3. FIX A RUDE NAME ----------------------------------------------------------------------------
-- Changes the name on the board. Note: the game sends the player's name with every race, so if they keep the rude name
-- in the game it comes back on their next race — for that, ban them (5).

update public.typing_leaderboard set username = 'renamed_player' where username = 'RUDE_NAME_HERE';


-- ---------- 4. RESET XP ----------------------------------------------------------------------------------

-- 4a. One player back to 0 XP (e.g. you think they cheated but don't want to ban them)
update public.typing_leaderboard set xp = 0, best_wpm = 0, races = 0 where username = 'NAME_HERE';

-- 4b. A NEW SEASON — everyone back to 0 XP. Players stay listed; this can't be undone.
-- update public.typing_leaderboard set xp = 0, best_wpm = 0, races = 0;

-- 4c. EMPTY THE WHOLE BOARD — removes every player. This can't be undone.
-- delete from public.typing_leaderboard;
-- (4b and 4c start with -- on purpose so they can't run by accident. Remove the -- at the start of the line to use one.)


-- ---------- 5. BAN / UNBAN ------------------------------------------------------------------------------
-- One-time setup: run docs/leaderboard.sql again (the whole file). It adds the ban list and keeps everyone's XP.
-- A banned player's races are refused and they are taken off the board. (A determined player could clear their browser
-- data to get a new hidden id — then ban the new name too.)

-- 5a. Ban by name (and take them off the board)
insert into public.banned_players (player_id, reason)
  select player_id, 'rude name' from public.typing_leaderboard where username = 'NAME_HERE'
  on conflict (player_id) do nothing;
delete from public.typing_leaderboard where player_id in (select player_id from public.banned_players);

-- 5b. See who is banned
select player_id, reason, banned_at from public.banned_players order by banned_at desc;

-- 5c. Unban (copy their player_id from 5b). They come back on the board after their next race, from 0 XP.
delete from public.banned_players where player_id = '00000000-0000-0000-0000-000000000000';
