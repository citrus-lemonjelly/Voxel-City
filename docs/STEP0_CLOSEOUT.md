# Step 0 — Art-style proof: close-out

**Status:** Closed 2026-10-16. Owner approved the Panda Civix v2.1 and the glow / livery / underglow rules.
**Purpose:** settle how Voxel City looks before any game code, so Step 1 builds on a fixed art direction.

## What was decided

| Area | Outcome | Log |
|---|---|---|
| Art direction | Voxel/blocky everything except text; fixed palette; flat shading + soft shadows | A1, A3–A5 |
| Car style & scale | Pack style (monogon "Voxel Cars" sample used as reference only); cars ~58 long × 28 wide | A10, A2 |
| Proportions | Civix v2.1: ride height +1, roof 21; other cars within a small margin of this | A30, A32 |
| Wheels | 2× density (half-size blocks) — the one agreed density exception | A15 |
| Parts | Every part is a swappable, visual-only module; 13-slot standard | A17, A24, `PART_SLOTS.md` |
| Starter car | Panda Civix v2.1, first option in every slot | A25, A32 |
| Windows | Solid dark glass with glare streaks | A12 |
| Drivers in cars | Tabled until car design work is further along | A8 |
| Liveries | Layered data (pattern × finish × optional glow), any livery fits any car | A14 |
| Glow | Paint doesn't glow except rare premium liveries; player-set Glow intensity (Off / Low / Full) | A22, A27 |
| Rare animated liveries | Circuit Scroll (half speed, half brightness), Flame Flicker (original), Rainbow Tron (toned) | A31 |
| Underglow | One colour by default; rare items may breathe or slow-blink; purely cosmetic | A18, A28, A33 |
| Accessibility | Freeze cosmetic animation; no hard flashing | A23, A27 |
| Day / night | Both; night lit by moonlight and lamp posts | W8, A29 |
| Camera | Framed per screen (gallery, showcase, Terminal detail, race) | A13 |

## Deliverables (in the repo)

| Path | Contents |
|---|---|
| `docs/DECISIONS.md` | Running decisions log |
| `docs/PART_SLOTS.md` | Part-slot standard for every future car |
| `docs/PALETTE_v0.md` | First palette draft (to be extended in Step 1) |
| `docs/reference/step0/` | First Civix proof (32-long, superseded) |
| `docs/reference/assets-study/` | Reference-pack study, rim study, camera framing |
| `docs/reference/step0b/` | Civix v2/v2.1 renders, parts, liveries, glow levels, size lineup, animations |
| `prototypes/step0b/civix2.html` | The modular Civix prototype (source for Step 1's car builder) |
| `tools/obj2vox.py` | MagicaVoxel OBJ → voxel converter |

## Carried into later steps

| Item | When |
|---|---|
| Finishes pass (chrome, chameleon with proper reflections) | With the garage scene |
| Hand-drawn masks for complex patterns (rims, flame art) where code-generated ones fall short | As premium items are produced |
| Glow presets per screen (garage / race-day / race-night) | Step 1 race view uses race-day |
| Drivers in cars, Hollowcrown avatar reuse + modern clothing set | Milestone 3 (garage) |
| Second car (car #2) built to `PART_SLOTS.md` | Milestone 2 |
