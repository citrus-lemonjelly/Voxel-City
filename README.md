# Voxel City

A voxel-styled drag-racing and car-collecting game. Desktop browser, built with Three.js + TypeScript.

## Play

Double-click **`build/VoxelCity.html`**. No install, no server.

| Control | Action |
|---|---|
| Hold **SPACE** (or the yellow **Shift** button) during the countdown | Rev the engine |
| Keep the needle in the **green launch zone**, release on **GO** | Launch (Perfect / Good / Bog / Wheelspin) |
| Tap **SPACE** / **Shift** when the needle reaches the green **shift zone** | Shift (Perfect / Good / Early / Late) |

Progress (Voxels, upgrades, best time) saves in the browser automatically.

## What's in Step 1

- Garage Terminal (static garage screen): buy and equip **Engine** and **Transmission** tiers T1–T5 with Voxels.
- Panda Civix v2.1 (voxel model from Step 0) vs one AI rival on **Downtown Grid**, 800 m.
- Race: countdown → hold-and-release launch → 4 shifts on the stock box (5 on T3+) → finish → results with grades and Voxels earned.
- Better transmissions = more, quicker shifts with tighter green zones and a bigger Perfect-shift boost.

Screens are functional placeholders; each gets its own design pass later (decision X1).

## Project layout

| Path | What lives there |
|---|---|
| `src/data/` | **Tuning lives here.** Cars, parts (tiers, prices), stages, economy, AI opponents. Plain numbers — edit without touching game logic. |
| `src/game/` | Race state machine and physics (`race.ts`), car stats (`stats.ts`), AI driver (`ai.ts`). No rendering. |
| `src/render/` | Voxel car builder (`carBuilder.ts`), Downtown Grid (`stage.ts`), cameras/lights (`scene.ts`). |
| `src/ui/` | Garage Terminal, race HUD, results (`screens.ts`); styling (`styles.ts`). |
| `src/save/` | Versioned localStorage save. |
| `tests/` | `sim.ts` (headless physics checks), `e2e.py` (full browser playthrough). |
| `vendor/` | three.js r170 (MIT), vendored so the build works offline. |
| `docs/` | Design brief, decisions log, part-slot standard, palette, reference renders. |
| `prototypes/` | Step 0 render prototypes. |

## Tuning knobs (no code changes needed)

| File | Knob | Effect |
|---|---|---|
| `src/data/cars.ts` | `hp`, `massKg`, `finalDrive`, `redline` | Overall pace and how many gears you use |
| `src/data/stages.ts` | `distanceM` | Race length (800 m ≈ 25 s stock) |
| `src/data/parts.ts` | `ENGINE[].hpMult`, `price` | Engine upgrade strength and cost |
| `src/data/parts.ts` | `TRANSMISSION[].ratios / shiftTime / zoneWidth / perfectBoost` | Shift count, shift speed, green-zone size, Perfect payoff |
| `src/data/parts.ts` | `LAUNCH` | Launch green-zone and bog / wheelspin penalties |
| `src/data/economy.ts` | `ECONOMY`, `OPPONENTS[].skill` | Payouts; how good the AI is (1.0 = always Perfect) |

## Building from source (optional)

Requires Node.js 20+.

```
npm install
npm run build      # → build/VoxelCity.html
npm run dev        # live dev server (Vite)
npm run sim        # headless physics checks
```
