---
name: "voxel-city-release"
description: "Use for ANY Voxel City work (features, fixes, art, cars, parts, UI, questions, builds, tests, publishing): owner rules, version rules, tools, release and delivery routine."
---

# Voxel City release routine (Claude Code on the owner's PC)

Follow CLAUDE.md in this folder for the owner rules. First thing each session: `npm run sync` (GitHub may have changes from
another session; use the next free version / S / Q numbers it prints). Make code edits with `node tools/edit.mjs` (JSON list).
For every update:
1. Build the change. Add the new version entry at the top of `src/data/changelog.ts` (Added / Changed / Fixed / Removed; header on minor versions).
2. `npm run typecheck` and `npm test`; for car/part work also `npm run collide` and fix any clash; for price/payout work `npm run economy`;
   for Drift work `npm run drift-lab` (and `-- pace` after changing roads or physics — keep 5–7 · 10–12 · 5–7 s, then update `PACING.driftSec`).
3. 1–2 screenshots of the new feature with `npm run shot -- ...` (or `--preset pc|phone|race`) and look at them; after UI work run
   `npm run layout` (PC + 3 phone sizes). Tests use `build-test/` — never `build/` — so nothing needs undoing before shipping.
4. When the owner says ship: `npm run ship -- --trailer "<your Co-Authored-By line>"` (git check → release → commit → push;
   the website updates ~1 min later). Run `npm run smoke` while building the update (step 3), not again at shipping.
5. Tell the owner: version, what changed (table), whether it is live, plus ideas with effort (Small / Medium / Big).
