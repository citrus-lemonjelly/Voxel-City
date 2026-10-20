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
- **Step 1b:** CSR-style side-view race camera; a lived-in Downtown Grid (shops, brick walk-ups, glass offices, warehouses, diner, side streets with signals, park, VOX OIL station, parking lot, construction site, parked cars and VOX company cars); voxel sky with clouds, sun, moon and stars; Day / Dusk / Night lighting.
- **Real scale:** cars are real-car size and the city is built at real proportions around them (lanes 3.6 m, storeys, doors, lamps, trees, tanker), in the same small blocks as the cars.
- **Trees from your VOX Trees:** saplings as supplied plus young/street/park remixes at real height (`src/render/trees.ts`); new `.vox` files go through `tools/vox2json.py` (see `docs/ASSETS.md`).
- **Race camera:** Dynamic (raised angle) by default, with a swung-to-raised glide over the countdown.
- **Smooth racing:** street built at load, camera locked to your car, cars drawn between physics steps, face-culled car meshes, wheel motion discs at speed.
- **Settings** (Garage Terminal): Race camera *Dynamic* / *Dynamic close*, Time of day, Near side (*Mixed* / *Curb* / *Barrier*), Speed blur (*Off* / *Low* / *Full*). Saved with your progress.

Screens are functional placeholders; each gets its own design pass later (decision X1).

## Project layout

| Path | What lives there |
|---|---|
| `src/data/` | **Tuning lives here.** Cars, parts (tiers, prices), stages, economy, AI opponents. Plain numbers — edit without touching game logic. |
| `src/game/` | Race state machine and physics (`race.ts`), car stats (`stats.ts`), AI driver (`ai.ts`). No rendering. |
| `src/render/` | Speed blur (`speedBlur.ts`), voxel car builder (`carBuilder.ts`), Downtown Grid street segments (`stage.ts`), sky (`sky.ts`), shared block shader (`blockShade.ts`), background vehicles (`vehicles.ts`), cameras/lights/time of day (`scene.ts`). |
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
| `src/render/scene.ts` | `CAMERA_PRESETS`, `LIGHTING` | Camera distance/height per preset; day/dusk/night light colours and strengths |
| `src/render/sky.ts` | `SKY` | Sky gradient colours, cloud count, sun/moon size and position |

Preview URL options: `?camset=close`, `?time=dusk|night`, `?near=curb|barrier|mixed`, `?blur=off|low|full` (override Settings for that visit).

## Building from source (optional)

Requires Node.js 20+.

```
npm install
npm run build      # → build/VoxelCity.html
npm run dev        # live dev server (Vite)
npm run sim        # headless physics checks
```

## Releasing a new version (owner 2026-10-19)

1. Add a new entry at the **top** of `src/data/changelog.ts` (version, date, title, Added / Changed / Fixed / Removed) and set the same version in `package.json`.
2. Build: `node tools/build.mjs` → `build/index.html`, `build/VoxelCity.html`, `build/version.json`, `docs/CHANGELOG.md`.
3. Upload the `build` folder to GitHub. The Pages workflow publishes it at https://citrus-lemonjelly.github.io/Voxel-City/ and anyone playing there gets the **Update ready** notice within ~2 minutes.

## Developer tools (owner 2026-10-19)

| Command | What it does |
|---|---|
| `npm run release` | Checks the version went up in `src/data/changelog.ts`, syncs `package.json`, builds, runs the sim checks and lists every file changed since the last release. |
| `npm run smoke` | Quick browser test: every screen, one drag race, one Typing Race, Car Lab (first time: `npx playwright install chromium`). |
| `npm test` | The sim checks (game maths) in a few seconds. |
| `npm run shot -- OUT.png "Title" "click:[data-panel=garage]; wait:1500; cap:Garage"` | Review sheet of one or more screens. |
| Car Lab | Open the game with `?dev`, press the backquote key, then **Car Lab**. Design a car and use **Copy settings** to send it in. |

Versions: every update raises the version (patch 0.x.Y for fixes and tweaks, minor 0.X.0 for big updates); a big update gets a `header` such as "Garage Update".
