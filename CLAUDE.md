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
- `npm run smoke` — browser smoke test (~2–3 min): every screen, a drag race, a Typing Race, Body Shop, Car Lab
- `npm run layout` (~3.5 min; `-- pc|small|phone|large` for one size) — every garage screen on PC + 3 phone sizes: fails on anything
  off screen, the fixed buttons overlapping, or text spilling out of its box; warns on text drawn under 10 px. Run it after UI work.
- `npm run release` — version check → package.json sync → sim → collision check → build → list of changed files.
  It refuses if the version wasn't raised. Only use `--same` if that version has never shipped.
- `npm run shot -- OUT.png "Title" "click:SEL; wait:MS; cap:TEXT"` — screenshot sheet for review (1–2 per feature).
  **Presets:** `npm run shot -- OUT.png --preset pc|phone|race` (every main screen / every screen on a phone / a whole race).
  Steps: `size:844x390`, `touch` (touch-screen phone page), `url:?dev&phone`, `hover:SEL`, `waitfor:green|launch|results|nitro|perfect|typing`,
  `js:CODE` (no `;` inside — use commas) or `jsfile:PATH` for longer page code. `click:[data-panel=…]` opens the Menu by itself.
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
- Built, not shipped: **V0.17.1** — V8 muscle voice + smoother engines (S84, `tools/engine-sound.mjs` renders WAVs), gear setup
  switch Preset OR Custom + draggable ratio bars + 1200 m track (S85), pay downtune (S86; `npm run economy` has a grinder table).
- **Next:** owner listens to the engine WAVs and says ship; then ROADMAP items (renumber its versions after V0.17). Run heavy checks one at a time.
- Idea backlog: other panels turn too (Settings → desk, Daily → whiteboard) (Small) · garage at night after night races (Small) ·
  weighted time of day (Small) · garage decor shop with Crowns (Big) · Body Shop "undo" (Small) · saved looks per car (Medium) ·
  rival plate text (Small) · split main.ts further (Typing Race, race setup) (Medium) · **Drift mode** — winding road per district,
  Drift button + hold revs in a band (Big, ROADMAP E4.6, Q193).
