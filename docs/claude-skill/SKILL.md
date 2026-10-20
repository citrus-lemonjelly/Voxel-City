---
name: "voxel-city-release"
description: "Use for ANY Voxel City work (features, fixes, art, cars, parts, UI, questions, builds, tests, publishing): owner rules, version rules, tools, release and delivery routine."
---

# Voxel City release routine (Claude Code on the owner's PC)

Follow CLAUDE.md in this folder for the owner rules. For every update:
1. Build the change. Add the new version entry at the top of `src/data/changelog.ts` (Added / Changed / Fixed / Removed; header on minor versions).
2. `npm run typecheck` and `npm test`; for car/part work also `npm run collide` and fix any clash.
3. 1–2 screenshots of the new feature with `npm run shot -- ...` and look at them.
4. `npm run release` (runs sim + collision check + build). Then `npm run smoke` (~1 min).
5. Tell the owner: version, what changed (table), that `build` is ready to upload to GitHub, plus ideas with effort (Small / Medium / Big).
