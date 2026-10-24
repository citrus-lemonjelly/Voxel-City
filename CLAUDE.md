# Voxel City — project instructions (read first)

Owner: Ethen (no coding background). Voxel drag racing + Typing Race game. Three.js r170 (vendored in `vendor/`) + TypeScript, single-file build.
This folder is the source of truth. The website (GitHub Pages, https://citrus-lemonjelly.github.io/Voxel-City/) serves the `build` folder,
which the owner uploads to the repo `citrus-lemonjelly/Voxel-City`.

## Owner rules (always)
- Every update raises the version in `src/data/changelog.ts` (newest first). Patch 0.x.Y = fixes/tweaks; minor 0.X.0 = features, with a
  `header` named after the biggest feature (e.g. "Garage Update"). **V1.0 is the owner's call** — keep counting V0.X.X until he says so.
- Every changelog entry has Added / Changed / Fixed / Removed lines in plain words (they show in-game in Patch notes).
- New UI follows the game's theme, **Bevel+** (S75, `src/ui/themeBevel.ts`): every panel/button is a lit block (light top-left,
  dark bottom-right), pressed/chosen = sunk in, grouped info in sunken trays; yellow `--accent` only for what you act on (Race,
  the chosen option, panel titles); Silkscreen pixel font (built in) for titles and big numbers, system-ui for the rest; text
  11 px or bigger; no default browser styling, no blinking/pulsing (one short slide is fine). Sleek, but true to the voxel style.
- Cosmetics are visual-only. Same block size everywhere. Asset packs are references only.
- Always check collisions on base cars and every part (`npm run collide`) and fix clashes before shipping.
- Workflow: analyze → suggest / ask (Q# numbered questions, tables) → build → short summary. Detailed, table-heavy replies.
  Replies use lettered sections (§A, §B …) with numbered items (A1, A2 …) so the owner can refer to them in comments.
  Ask / discuss before an update ships; ship only when the owner says so.
  When the owner sends a drawing or reference, match it.
- Every reply ends with recommendations / other paths / ideas, each labelled with effort (Small, Medium, Big).
- Always look for faster ways to work and reduce load: use the project tools first; if a step is slow, fix the tool.

## Commands (run them yourself here — this is the owner's PC)
- **Start every session with `npm run sync`**: shows what GitHub has that this PC doesn't (another session may have shipped),
  files both sides changed, the live version and the next free version / S-row / Q-number. `-- --pull` fast-forwards when safe.
- `npm run typecheck` — TypeScript check
- `npm test` — sim checks (seconds)
- `npm run collide` — collision check, every car × every part + part pairs (seconds)
- `npm run smoke` — browser smoke test (~2–3 min): every screen, a drag race, a Typing Race, a Drift run, Body Shop, Car Lab
- `npm run drift-lab [-- course | pace]` — Drift bench (seconds): score / drag–drift–drag times / spins per car × AI skill; `pace` =
  average part times per league (owner target 5–7 · 10–12 · 5–7 s; feeds `PACING.driftSec`). `npm run drift-feel` — human-like players
  (flat gas / let go / reacting 0.2 s late) through the first turn: when they spin, straighten or finish clean.
- `npm run balance [-- parts | tiers | gearing | niche] [D|C|B|A|S|carId] [--dist=600,800] [--no-nitro]` — drag balance bench (under 1 s):
  perfect-driver times per car × build (Stock / T3 / Max) × 600/800/1200 m; `parts` = what each part is worth on a maxed car,
  `tiers` = seconds saved per tier from stock, `gearing` = best gearing per distance, `niche` = which car wins launch / 600 / 800 / 1200.
- `node tools/probe.mjs "?query" "start code" "wait-until code" "expression"` — opens the test build and prints what an expression
  returns at a moment (element boxes, game state) — quicker than a screenshot for "is it there / why is it hidden".
- `npm run layout` (~3.5 min; `-- pc|small|phone|large` for one size) — every garage screen on PC + 3 phone sizes: fails on anything
  off screen, the fixed buttons overlapping, or text spilling out of its box; warns on text drawn under 10 px. Run it after UI work.
- `npm run release` — version check → package.json sync → sim → collision check → build → list of changed files.
  It refuses if the version wasn't raised. Only use `--same` if that version has never shipped.
- `npm run shot -- OUT.png "Title" "click:SEL; wait:MS; cap:TEXT"` — screenshot sheet for review (1–2 per feature).
  **Presets:** `npm run shot -- OUT.png --preset pc|phone|race` (every main screen / every screen on a phone / a whole race).
  Steps: `size:844x390`, `touch` (touch-screen phone page), `url:?dev&phone`, `hover:SEL`, `waitfor:green|launch|results|nitro|perfect|typing|drift|sliding|cue|cuego`,
  `js:CODE` (no `;` inside — use commas) or `jsfile:PATH` for longer page code. `click:[data-panel=…]` opens the Menu by itself.
  Page/console errors are printed after the shots. Drift shots: `url:?dev&autoplay&weather=clear&course=harbour; js:__vc.startDrift(); waitfor:sliding`; freeze a fleeting
  moment with `js:__vc.setPaused(true)` right after the waitfor.
- **Test builds go to `build-test/`** (git-ignored): smoke, layout and shot build it themselves, so the live `build/` folder and its
  version stamp only change when shipping. `node tools/build.mjs --out build-test` builds it by hand.
- **Code edits on this PC: `node tools/edit.mjs edits.json [--check]`** — a JSON list of {file, find, replace, all?}; checks every edit
  first, writes all or nothing, keeps line endings. (No Python here, and shell quoting mangles code — don't edit through `sed`/`node -e`.)
- `npm run economy` — pacing tables from `economy.ts`: VX/min per mode, hours per league vs the owner's targets
  (D 2–3 h · C 3–4 h · B/A/S 3–6 h), cosmetics in minutes, Crowns. Run it after any price/payout change.
- `npm run ship` (owner: double-click `Ship It.cmd`) — git check → release → commit "V0.x.y" → push to GitHub (no smoke — it runs while building);
  Pages publishes `build` about a minute later. `--no-push` keeps the commit local. Push only when the owner says ship.
- Don't run `npm run build` (the live folder) by itself just to look — use the test build; a rebuild changes the live stamp.
- This folder is a git clone of `citrus-lemonjelly/Voxel-City`; a push to `main` updates the website (`.github/workflows/static.yml`).
  After shipping, tell the owner which version is live.

## Where things live
- Prices / payouts: `src/data/economy.ts` (TYPING, COSMETIC_PRICES, PAINT repaint/premium, PLATE_TEXT). Cars: `src/data/cars.ts`.
- Bodies: `src/render/bodies.ts` (`partFits` = which styles fit a body). Civix + build pipeline: `src/render/carBuilder.ts`.
- Kit / decals / underglow / roof parts / side pipes: `src/render/kit.ts`. Plates: `src/data/plates.ts` + `src/render/plate.ts`.
- Visual parts list, Body Shop tab groups, turntable angle per tab: `src/data/visualParts.ts`.
- Garage screen shell (layout, which panel shows, shared buttons): `src/ui/garage.ts`. **One file per panel** in `src/ui/panels/`:
  `catalog` · `bodyShop` (parts, Paint tab, plate text) · `myCars` (Garage list + sub-tabs, sell, slots) · `upgrades` · `profile` ·
  `settings` (+ Controls) · `daily` (+ calendar) · `notes` · `strip` · `raceMenu` · `miniHud`; shared state/icons/helpers in `shared.ts`.
  What buying/selling/claiming/fitting does: `src/game/garageActions.ts`. Layout styles `src/ui/styles.ts`; the look (block
  surfaces, fonts, garage bar / Menu / side rail, race strip + lights, phone sizes) `src/ui/themeBevel.ts`.
- 3D garage room: `src/render/garage.ts` (room + how each piece looks), placements `src/data/garageLayout.ts`;
  camera views + angles A–D, turntable spin/drag: `src/render/scene.ts`. Race time of day: random, forced from the test console.
- Typing Race: `src/game/typing.ts`, `src/render/typingView.ts`, `src/ui/typingHud.ts`, passages `src/data/passages.ts` (original text only).
- Drift (V0.18.0, S87–S93; **dev mode only** since V0.18.2): run physics + scoring + AI + ghost rival `src/game/drift.ts`; roads per district `src/data/driftCourses.ts`;
  night scene `src/render/driftView.ts`, its props `src/render/driftProps.ts`; HUD `src/ui/driftHud.ts` (wraps the race `Hud` + Drift
  button in the pedal bay); button looks `src/ui/driftButton.ts` (`__vc.driftButtons()` sheet); drift parts in `parts.ts` (`driftKitOf`),
  pay `driftPay` in `economy.ts`. URL: `?course=downtown|harbour|ridge|neon`, `?dbtn=brake|pedal|puck|key`, `?weather=rain|clear`.
- Key bindings: `src/game/keys.ts`. Update notice: `src/game/updates.ts`. Car Lab (dev only, `?dev` → test console → Car Lab): `src/ui/carLab.ts`.
- Tools: `tools/release.mjs`, `tools/collide.mjs` (+ `collide-entry.ts`), `tools/shot.mjs`, `tests/smoke.mjs`, `tests/sim.ts`; owner launcher `Run Smoke Test.cmd`.
- Decisions log: `docs/DECISIONS.md` (S-numbered rows). Patch notes doc is generated: `docs/CHANGELOG.md`.
- Test URL flags: `?dev` (test console), `?fast=N` (clock ×N), `?autoplay`, `?lab` (Car Lab), `?phone` (phone race screen on a PC).
- Garage tabs sit in the side rail behind the **Menu** button (`#menuBtn`); `tests/smoke.mjs` and `tools/shot.mjs` open it themselves.
- Drive modes (Classic / Pedal, S72): `Controller.pedal` in `src/game/race.ts`; phone race HUD (S73): `Hud.buildPhone` in `src/ui/hud.ts`.

## Where we left off (2026-10-21)
- Live before this push: V0.11.0 "Tuning Update" (shipped from another session — tyres, weight, turbo, gearing; S66; read
  `docs/ROADMAP.md` for its open questions). This PC's unshipped work was merged on top and renumbered after it:
  V0.12.0 "Pedal Update" (Pedal mode S72, phone race screen S73, voxel Race button S74) · V0.13.0 "Style Update" (Bevel+ look,
  Menu + side rail, built-in pixel font, S75) · V0.13.1 (race screen look, menu closes on outside click, S76) · V0.14.0 "Phone
  Update" (every screen fits phones via fitUI / `--ui-s`, panels over buttons, Settings by Notes, camera by Race, car info in
  Profile, compact Strip with automatic rewards, S77). Check phones with the shot tool's `touch; size:844x390` (also 667x375, 932x430).
- Note: the two sessions' Q numbers overlap (both used Q164–Q181) and ROADMAP's planned version numbers (V0.11.1, V0.11.2,
  V0.12.0 "Build & Tune") are now taken — give those plans new numbers after V0.14.0.
- Live: **V0.17.0 "Gearbox Update"** (per-gear ratio tuning with Transmission T5, S83). Before it: V0.16.0 "Feel Update" (S79:
  sound `src/game/sound.ts`, nitrous, voxel effects + rain `src/render/fx.ts`, Upgrades ▸ Test run `src/game/dyno.ts`),
  V0.16.1 (end-game balance, A/S 7/8 gears, S81), V0.16.2 (gear spacing, S82), V0.15.0 "Phone Typing Update" (S78).
- V0.17.1 shipped 2026-10-22 (V8 voice S84, gear setup switch + 1200 m S85, pay downtune S86).
- Live: **V0.18.0 "Drift Update"** (shipped 2026-10-22, S87–S90; Q194 A button beside the gas pedal, Q195 Handbrake default): Drift mode (drag → 3–5 drifts → drag, four night districts, ghost rival,
  drift parts, four Drift button looks), Settings header bars Display · Audio · Keybinds. Phone Drift layout: later (owner).
- Live: **V0.18.1** (shipped 2026-10-22): easier drifts (S91), 3-2-1 drift cue above the gauge, automatic gears in Drift (S92).
- Live: **V0.18.2** (shipped 2026-10-22) — Drift hidden behind dev mode (S93); its work list is ROADMAP §E4.6 (D1–D9).
- Live: **V0.18.3** (shipped 2026-10-22) — districts renamed (S94): the Harbor, Downtown, Neon Highrise, Daluda Forest, Oil Fields, Rooftop Skyway.
- Live: **V0.19.0 "Typing Update"** (shipped 2026-10-22, S95–S101): Expert level + its own Typing level picker, made-up passages
  (`src/game/textGen.ts`), Rival Ladder (15 fixed-speed rivals, `TYPING_LADDER`), usernames for typing rivals + the player
  (`src/game/usernames.ts`, Profile), typing XP + 8 typing leagues with keycap badges (`TYPING_LEAGUES`, `src/ui/typingBadge.ts`),
  Profile Drag / Typing tabs, RACE (Drag menu) + TYPE button under it (Typing menu), title-only menu buttons (S100); Q212–Q216 answered (S101): usernames for all rivals, name filter, ranks ×2.5 with
  divisions 1–4 + Crowns per rank up, Supabase Top 500 (`src/game/leaderboard.ts` + `docs/leaderboard.sql`) — **online since V0.19.1**
  (owner's project `kaabvohiyrbnmhgabsto`, publishable key in `LEADERBOARD`; S102). Autoplay races never post; `?lbmock` = made-up board.
- Live: **V0.20.0 "City Update"** (shipped 2026-10-23, S103–S104): RACE opens the city map (`src/render/cityMap.ts` island,
  `src/ui/cityMapUi.ts` tags + district panel, rules `src/data/districts.ts`); the district sets rivals + pay; Typing stays on TYPE.
  `?citymap` opens the map at start. Smoke / layout / shot tools go RACE → map (map takes a few seconds to build the first time).
- **Next (owner, 2026-10-23): `docs/LOOK_ROADMAP.md`** — Terraglass-style techniques (glow, corner shading, tilt-shift, particles,
  colour variation, see-through water) on the map + garage with an On/Off setting; Settings with left-border tabs (Gameplay ·
  Visuals · Audio · Controls); map roads revamp (road network, junctions, kerbs, no 90° hits — Downtown ↔ garage worst); garage
  revamp with ½-size detail blocks. Items L1–L31, versions V0.21.0 → V0.22.0, open Q229–Q236 (S105). Start with L1.
  After that: the race scene for each district (Q222), the Harbor end game (Q219). Run heavy checks one at a time.
- Idea backlog: other panels turn too (Settings → desk, Daily → whiteboard) (Small) · garage at night after night races (Small) ·
  weighted time of day (Small) · garage decor shop with Crowns (Big) · Body Shop "undo" (Small) · saved looks per car (Medium) ·
  rival plate text (Small) · split main.ts further (Typing Race, race setup) (Medium) · Drift on phones (Medium).
