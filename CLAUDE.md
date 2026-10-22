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

## Working with the owner (every session)
- **Prompt feedback:** every reply has a short "Prompt feedback" note (1–3 lines): what was clear, what was missing or could be
  read two ways, and a tighter way to word the same ask next time.
- **Unclear = don't build yet:** if an instruction is unclear, could mean two different things, or clashes with an earlier rule or
  decision (`docs/DECISIONS.md`), don't guess and build. Push back: say exactly what is unclear and ask Q# questions, with the
  options in a table and a recommended pick. Build once the owner answers.
- **Skills & tools:** always look for chances to make a new skill (`.claude/skills/`) or tool (`tools/`, `npm run …`) that makes the
  work faster or more reliable, or answers the owner's kind of requests better. Small tool fixes ride along with the work; new
  skills/tools go in the ideas list with an effort label and are built once the owner agrees. Keep CLAUDE.md and skills current.
- **Steady ideas:** every reply's ideas list carries 2–4 fresh ideas (game features, polish, tools, workflow) — not repeats of
  earlier replies. Ideas the owner likes but doesn't start yet go in the Idea backlog at the bottom of this file.
- **3-line summary first (Q197):** every reply opens with three lines — **Done:** what was done · **Need from you:** answers /
  checks / "say ship" · **Next:** what happens after. The detailed §-sections come below it.
- **Plain words (Q198):** no coding terms in replies. If one can't be avoided, explain it in a few words in brackets.
- **Show, don't tell (Q202):** every change you can see in the game comes with screenshots — PC and phone (`touch; size:844x390`) —
  sent straight to the owner (in the cloud: attach them to the reply; on the PC: give the PNG paths).
- **What could break (Q204):** before any Medium or Big change, a short table: what could break · how it will be checked.
- **Asking template (Q203):** `docs/ASK_TEMPLATE.md` (Goal · Where · Look & feel · Done when · Must not change · Size). For a short
  or vague ask, use the **`/feature`** skill to fill it in and ask only about the gaps.
- **Wrap-up (Q200):** at the end of a session (or when the owner says wrap up), run the **`/wrapup`** skill: decisions + answers
  logged, "Where we left off" updated, open Q numbers listed, work committed.
- **Numbers never reused:** take versions, S-rows and Q-numbers from `npm run numbers` (checks this PC and every branch on GitHub).

## Cloud sessions (Q199)
A session is in the cloud when it runs from the Claude app / claude.ai (env `CLAUDE_CODE_REMOTE=true`, branch `claude/…`).
- Work, commit and push **only on the session's `claude/…` branch**. Never push to `main`, never run `npm run ship` / `release`:
  the website only changes from `main`. Tell the owner the work is on that branch and **not live**.
- Start with `npm install` if `node_modules` is missing, then `npm run sync` as usual. Chromium for smoke / layout / shot is
  pre-installed (don't run `playwright install`). The normal edit tool works here; `tools/edit.mjs` is for the owner's PC.
- Send screenshots and files to the owner in the chat — the owner can't open paths inside the cloud machine.
- Getting the work live: the owner (or a PC session) merges the branch into `main`, then ships from the PC.

## Commands (run them yourself — on the owner's PC; cloud sessions: see above)
- **Start every session with `npm run sync`**: shows what GitHub has that this PC doesn't (another session may have shipped),
  files both sides changed, the live version and the next free version / S-row / Q-number. `-- --pull` fast-forwards when safe.
- `npm run numbers` (`-- --local` offline) — next free version / S / Q across this PC, `main` and every other GitHub branch;
  lists numbers not on `main` yet per branch and warns (`!`) when two places used the same one. `sync` prints it too.
- Skills: **`/feature`** (one-line idea → feature card + gap questions, no building) · **`/wrapup`** (end-of-session hand-over) ·
  `voxel-city-release` (build → check → ship routine).
- `npm run typecheck` — TypeScript check
- `npm test` — sim checks (seconds)
- `npm run collide` — collision check, every car × every part + part pairs (seconds)
- `npm run smoke` — browser smoke test (~2–3 min): every screen, a drag race, a Typing Race, a Drift run, Body Shop, Car Lab
- `npm run drift-lab [-- course | pace]` — Drift bench (seconds): score / drag–drift–drag times / spins per car × AI skill; `pace` =
  average part times per league (owner target 5–7 · 10–12 · 5–7 s; feeds `PACING.driftSec`).
- `npm run layout` (~3.5 min; `-- pc|small|phone|large` for one size) — every garage screen on PC + 3 phone sizes: fails on anything
  off screen, the fixed buttons overlapping, or text spilling out of its box; warns on text drawn under 10 px. Run it after UI work.
- `npm run release` — version check → package.json sync → sim → collision check → build → list of changed files.
  It refuses if the version wasn't raised. Only use `--same` if that version has never shipped.
- `npm run shot -- OUT.png "Title" "click:SEL; wait:MS; cap:TEXT"` — screenshot sheet for review (1–2 per feature).
  **Presets:** `npm run shot -- OUT.png --preset pc|phone|race` (every main screen / every screen on a phone / a whole race).
  Steps: `size:844x390`, `touch` (touch-screen phone page), `url:?dev&phone`, `hover:SEL`, `waitfor:green|launch|results|nitro|perfect|typing|drift|sliding`,
  `js:CODE` (no `;` inside — use commas) or `jsfile:PATH` for longer page code. `click:[data-panel=…]` opens the Menu by itself.
  Page/console errors are printed after the shots. Drift shots: `url:?dev&autoplay&weather=clear&course=harbour; js:__vc.startDrift(); waitfor:sliding`.
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
- Drift (V0.18.0, S87–S90): run physics + scoring + AI + ghost rival `src/game/drift.ts`; roads per district `src/data/driftCourses.ts`;
  night scene `src/render/driftView.ts`, its props `src/render/driftProps.ts`; HUD `src/ui/driftHud.ts` (wraps the race `Hud` + Drift
  button in the pedal bay); button looks `src/ui/driftButton.ts` (`__vc.driftButtons()` sheet); drift parts in `parts.ts` (`driftKitOf`),
  pay `driftPay` in `economy.ts`. URL: `?course=downtown|harbour|ridge|neon`, `?dbtn=brake|pedal|puck|key`, `?weather=rain|clear`.
- Key bindings: `src/game/keys.ts`. Update notice: `src/game/updates.ts`. Car Lab (dev only, `?dev` → test console → Car Lab): `src/ui/carLab.ts`.
- Tools: `tools/release.mjs`, `tools/collide.mjs` (+ `collide-entry.ts`), `tools/shot.mjs`, `tools/sync.mjs` + `tools/numbers.mjs`, `tests/smoke.mjs`, `tests/sim.ts`; owner launcher `Run Smoke Test.cmd`.
  Skills: `.claude/skills/` (`voxel-city-release`, `feature`, `wrapup`); asking template `docs/ASK_TEMPLATE.md`.
- Decisions log: `docs/DECISIONS.md` (S-numbered rows). Patch notes doc is generated: `docs/CHANGELOG.md`.
- Test URL flags: `?dev` (test console), `?fast=N` (clock ×N), `?autoplay`, `?lab` (Car Lab), `?phone` (phone race screen on a PC).
- Garage tabs sit in the side rail behind the **Menu** button (`#menuBtn`); `tests/smoke.mjs` and `tools/shot.mjs` open it themselves.
- Drive modes (Classic / Pedal, S72): `Controller.pedal` in `src/game/race.ts`; phone race HUD (S73): `Hud.buildPhone` in `src/ui/hud.ts`.

## Where we left off (2026-10-22) — keep to 5–10 lines; older lines go to `docs/ROADMAP.md` §G History (/wrapup)
- Live: **V0.18.0 "Drift Update"** (shipped 2026-10-22, S87–S90; Q194 A button beside the gas pedal, Q195 Handbrake default): Drift
  mode (drag → 3–5 drifts → drag, four night districts, ghost rival, drift parts, four Drift button looks), Settings header bars.
- Not shipped: working rules X4–X12 (Q197–Q204) + tools S91 (`npm run numbers`, `/feature`, `/wrapup`) on branch
  `claude/confident-heisenberg-obet90` — docs/tools only, no game change.
- Open questions: Q196 (Drift district names), Q205 (how cloud branches reach `main`); older open ones in `docs/ROADMAP.md` §B2.
- **Next:** owner tries Drift; answer Q196 / Q205; then ROADMAP items. Phone Drift layout: later (owner). Run heavy checks one at a time.
- Idea backlog: other panels turn too (Settings → desk, Daily → whiteboard) (Small) · garage at night after night races (Small) ·
  weighted time of day (Small) · garage decor shop with Crowns (Big) · Body Shop "undo" (Small) · saved looks per car (Medium) ·
  rival plate text (Small) · split main.ts further (Typing Race, race setup) (Medium) · Drift on phones (Medium).
