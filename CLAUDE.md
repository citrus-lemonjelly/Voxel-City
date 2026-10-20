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
- Don't run `npm run build` by itself just to look — a rebuild changes the build stamp and triggers the website's Update notice.
- After a release: tell the owner which version shipped and that the `build` folder is ready to upload to GitHub
  (or commit + push it if this folder is a git clone and he asks).

## Where things live
- Prices / payouts: `src/data/economy.ts` (TYPING, COSMETIC_PRICES, PAINT repaint/premium, PLATE_TEXT). Cars: `src/data/cars.ts`.
- Bodies: `src/render/bodies.ts` (`partFits` = which styles fit a body). Civix + build pipeline: `src/render/carBuilder.ts`.
- Kit / decals / underglow / roof parts / side pipes: `src/render/kit.ts`. Plates: `src/data/plates.ts` + `src/render/plate.ts`.
- Visual parts list, Body Shop tab groups, turntable angle per tab: `src/data/visualParts.ts`.
- Garage, Body Shop (Paint tab, plate text), Garage sub-tabs: `src/ui/garage.ts`; styles `src/ui/styles.ts`; turntable spin/drag: `src/render/scene.ts`.
- Typing Race: `src/game/typing.ts`, `src/render/typingView.ts`, `src/ui/typingHud.ts`, passages `src/data/passages.ts` (original text only).
- Key bindings: `src/game/keys.ts`. Update notice: `src/game/updates.ts`. Car Lab (dev only, `?dev` → test console → Car Lab): `src/ui/carLab.ts`.
- Tools: `tools/release.mjs`, `tools/collide.mjs` (+ `collide-entry.ts`), `tools/shot.mjs`, `tests/smoke.mjs`, `tests/sim.ts`; owner launcher `Run Smoke Test.cmd`.
- Decisions log: `docs/DECISIONS.md` (S-numbered rows). Patch notes doc is generated: `docs/CHANGELOG.md`.
- Test URL flags: `?dev` (test console), `?fast=N` (clock ×N), `?autoplay`, `?lab` (Car Lab).

## Where we left off (V0.8.0 "Tint & Grille Update", 2026-10-19)
- Shipped: Body Shop (paint rules, premium paints, plates + custom text, roof, side exhaust, rims, lights, mirrors, grille, tint),
  grouped tabs, car turns to the part, Garage sub-tabs over the Garage button, Spin toggle + drag-to-turn. Smoke test passed on the PC (V0.7.0).
- **Next: Economy Pass.** Open questions to ask the owner: Q148 per-minute earnings parity across modes · Q149 2–3 hours per league ·
  Q150 dailies · Q151 monthly login calendar · Q152 Garage slots (6 free, 50 Crowns each) · Q153 selling cars at 50% · Q154 crew events later.
  Also review the League S repaint price (115,050 VX).
- Idea backlog: Body Shop "undo" back to fitted (Small) · saved looks / presets per car (Medium) · rival plate text (Small) ·
  one-click "Ship It" = smoke test + push (Medium).
