# Voxel City — project instructions (read first)

Owner: Ethen (no coding background). Voxel drag racing + Typing Race game. Three.js r170 (vendored in `vendor/`) + TypeScript, single-file build.
This folder is the source of truth. The website (GitHub Pages, https://citrus-lemonjelly.github.io/Voxel-City/) serves the `build` folder,
which the owner uploads to the repo `citrus-lemonjelly/Voxel-City`.

## Owner rules (always)
- Every update raises the version in `src/data/changelog.ts` (newest first). Patch 0.x.Y = fixes/tweaks; minor 0.X.0 = features, with a
  `header` named after the biggest feature (e.g. "Garage Update"). **V1.0 is the owner's call** — keep counting V0.X.X until he says so.
- Every changelog entry has Added / Changed / Fixed / Removed lines in plain words (they show in-game in Patch notes).
- New UI follows the game's theme: blocky panels (`.blk`), Courier New uppercase headings, accent yellow `--accent`, no default browser
  styling, no blinking/pulsing. Sleek, but true to the voxel style.
- Cosmetics are visual-only. Same block size everywhere. Asset packs are references only.
- Always check collisions on base cars and every part (`npm run collide`) and fix clashes before shipping.
- Workflow: analyze → suggest / ask (Q# numbered questions, tables) → build → short summary. Detailed, table-heavy replies.
  Replies use lettered sections (§A, §B …) with numbered items (A1, A2 …) so the owner can refer to them in comments.
  Ask / discuss before an update ships; ship only when the owner says so.
  When the owner sends a drawing or reference, match it.
- Every reply ends with recommendations / other paths / ideas, each labelled with effort (Small, Medium, Big).
- Always look for faster ways to work and reduce load: use the project tools first; if a step is slow, fix the tool.

## Commands (run them yourself here — this is the owner's PC)
- `npm run typecheck` — TypeScript check
- `npm test` — sim checks (seconds)
- `npm run collide` — collision check, every car × every part + part pairs (seconds)
- `npm run smoke` — browser smoke test (~1 min): every screen, a drag race, a Typing Race, Body Shop, Car Lab
- `npm run release` — version check → package.json sync → sim → collision check → build → list of changed files.
  It refuses if the version wasn't raised. Only use `--same` if that version has never shipped.
- `npm run shot -- OUT.png "Title" "click:SEL; wait:MS; cap:TEXT"` — screenshot sheet for review (1–2 per feature)
- `npm run economy` — pacing tables from `economy.ts`: VX/min per mode, hours per league vs the owner's targets
  (D 2–3 h · C 3–4 h · B/A/S 3–6 h), cosmetics in minutes, Crowns. Run it after any price/payout change.
- `npm run ship` (owner: double-click `Ship It.cmd`) — git check → release → commit "V0.x.y" → push to GitHub (no smoke — it runs while building);
  Pages publishes `build` about a minute later. `--no-push` keeps the commit local. Push only when the owner says ship.
- Don't run `npm run build` by itself just to look — a rebuild changes the build stamp and triggers the website's Update notice.
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
  What buying/selling/claiming/fitting does: `src/game/garageActions.ts`. Styles `src/ui/styles.ts`.
- 3D garage room: `src/render/garage.ts` (room + how each piece looks), placements `src/data/garageLayout.ts`;
  camera views + angles A–D, turntable spin/drag: `src/render/scene.ts`. Race time of day: random, forced from the test console.
- Typing Race: `src/game/typing.ts`, `src/render/typingView.ts`, `src/ui/typingHud.ts`, passages `src/data/passages.ts` (original text only).
- Key bindings: `src/game/keys.ts`. Update notice: `src/game/updates.ts`. Car Lab (dev only, `?dev` → test console → Car Lab): `src/ui/carLab.ts`.
- Tools: `tools/release.mjs`, `tools/collide.mjs` (+ `collide-entry.ts`), `tools/shot.mjs`, `tests/smoke.mjs`, `tests/sim.ts`; owner launcher `Run Smoke Test.cmd`.
- Decisions log: `docs/DECISIONS.md` (S-numbered rows). Patch notes doc is generated: `docs/CHANGELOG.md`.
- Test URL flags: `?dev` (test console), `?fast=N` (clock ×N), `?autoplay`, `?lab` (Car Lab).

## Where we left off (V0.10.0 "Garage Room Update", 2026-10-20 — live, shipped for the owner's testing)
- Shipped: 3D garage room behind the menus (showcase turntable, loft, office nook, mechanic bay + lift with primer shell, roll-up
  door with the street; S64), garage door + camera-angle buttons (Cam A–D, default D), Upgrades/Profile camera turns (E2),
  random race time of day (test console can force it; S65), garage UI split into one file per panel. Smoke 16/16 on the PC.
- **Next:** owner feedback on the garage room. Q159 trophy shelf (later). Run heavy checks one at a time (owner: don't max the CPU).
- Idea backlog: other panels turn too (Settings → desk, Daily → whiteboard) (Small) · garage at night after night races (Small) ·
  weighted time of day (Small) · garage decor shop with Crowns (Big) · Body Shop "undo" (Small) · saved looks per car (Medium) ·
  rival plate text (Small) · split main.ts further (Typing Race, race setup) (Medium).
