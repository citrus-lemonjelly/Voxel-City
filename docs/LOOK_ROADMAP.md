# Look Update roadmap — graphics techniques, Settings revamp, map roads, garage revamp

Written 2026-10-23 (after V0.20.0 "City Update" shipped). **Planning only — nothing here is built yet.**
To start: open a new chat in this folder and say *"Read CLAUDE.md and docs/LOOK_ROADMAP.md, then start with L1."*
Every item has a number (L1, L2 …) so it can be referred to in comments. Effort: Small · Medium · Big.

---

## §0 What the owner decided (2026-10-23)

| # | Decision |
|---|---|
| O1 | Use the Terraglass-style **techniques** (glow / bloom, corner shading / ambient occlusion, distance blur, particles, per-block colour, see-through water) on the **city map** and the **garage**. Techniques only — no Terraglass assets (owner rule: asset packs and other games are references only). |
| O2 | An **On / Off setting** for the new effects. |
| O3 | **Settings revamp**: header tabs down the **left border** of the panel — Gameplay · Visuals · Audio · Controls (names open, Q231). |
| O4 | **Smaller blocks are allowed** for new or revamped garage and world items **if they visually connect and make one cohesive style** (answers Q228). |
| O5 | **Map road revamp**: some roads are fine, others need help — angular cuts, roads running straight into things at 90°, worst of all the road out of Downtown towards the garage. |
| O6 | Owner's earlier picks still stand: always dusk on the map (Q224), Typing stays off the map (Q220), the garage computer will later hold every menu (D4), district race scenes come next (Q222). |

Reference study (for the techniques, not to copy): Terraglass, Teacup Worlds — https://store.steampowered.com/app/5440970/Terraglass/ .
What makes its look: B1 glow on every real light · B2 dark creases (ambient occlusion) · B3 grass "fur" (single-block tufts at
mixed heights) · B4 a slightly different shade per block · B5 soft blur in the distance (miniature feel) · B6 see-through water
with foam and a visible floor · B7 drifting particles (fireflies, snow, embers) · B8 warm lights against cool dusk shadow ·
B10 chunky props with simple shapes.

---

## §1 Versions — suggested order

| Version | Header | Contents | Effort |
|---|---|---|---|
| **V0.21.0** | "Look Update" | Part A (effects pipeline + On/Off) and Part B (Settings with left tabs). Map gets glow + corner shading + distance blur first, so the change is visible right away. | Big |
| **V0.21.1** | — | Part C: map roads revamp + road checker tool | Medium |
| **V0.21.2** | — | Part D: map art pass (grass fur, see-through water, fireflies, colour variation) | Medium |
| **V0.22.0** | "Workshop Update" | Part E: garage revamp — finer-block props, lighting, clutter, the computer as the future hub | Big |
| after | — | District race scenes (ROADMAP E4.1 / Q222), built with all of the above from day one | Big |

Why this order: the effects and the Settings switch come first because every later part uses them (and phones need the Off
switch before heavier effects ship). Roads before the map art pass, because the art pass places grass, lamps and clutter
around the roads.

---

## §2 Part A — effects pipeline ("Enhanced graphics") — V0.21.0

| # | Work | Where | Done when | Effort |
|---|---|---|---|---|
| L1 | **Vendor the post-processing add-ons** from `node_modules/three/examples/jsm` (same r170 as `vendor/three.module.js`): `EffectComposer`, `RenderPass`, `OutputPass`, `ShaderPass`, `UnrealBloomPass`, `BokehPass` (or a tilt-shift `ShaderPass`), optionally `GTAOPass`, plus the shader files they import (`CopyShader`, `LuminosityHighPassShader`, `OutputShader`, `BokehShader` …). Copy into `vendor/addons/postprocessing/` and `vendor/addons/shaders/`, fix their `three` import paths, add loose types to `src/types/shims.d.ts`. Check `tools/build.mjs` inlines them into the single-file build. | `vendor/addons/`, `src/types/shims.d.ts`, `tools/build.mjs` | `npm run typecheck` clean; the build includes the files; nothing looks different yet | Small |
| L2 | **One composer in `World`** (`src/render/scene.ts`) that each mode (garage, map, race, typing, drift) renders through when effects are on; plain `renderer.render` when off. Fold the existing speed-blur pass (`speedBlur.ts`) into the same chain so there's only one full-screen pass per effect. Resize with the window and `fitUI`. | `src/render/scene.ts`, `src/render/speedBlur.ts` | Effects off = pixel-identical to today; effects on = same picture until L3–L5 add passes | Medium |
| L3 | **Glow / bloom (B1)** on real lights only: lit windows, street lamps, neon, the lighthouse, lava-like flare, garage lamps and neon sign, car lights. Make light materials (`mats.light`, `mats.lightV`, garage `LIT` bucket) brighter than 1.0 (toneMapped off, colour × 2–3) and set the bloom threshold just above 1.0 so **only** lights glow — never paint, never sky. Strength / radius tuned per mode (map strongest, race lightest so it never hides the cars). | `src/render/voxel.ts` (materials), `src/render/garage.ts`, `src/render/cityMap.ts`, scene | Neon Highrise and lit windows glow on the map; garage lamps glow; nothing that isn't a light glows (check with screenshots: day race, dusk map, garage) | Medium |
| L4 | **Corner shading / ambient occlusion (B2)**, two kinds: **(a) baked into the block meshes** — `greedyGeometry` (`src/render/voxel.ts`) gets classic voxel vertex AO (each face corner darkened by how many of its 3 neighbours are solid; only merge faces whose 4 corner values match). Used by the map island, trees, every grid-built prop (and the garage once Part E moves its props to grids). Free at run time. **(b) screen-space GTAO pass** only for what isn't grid-built (box-built garage room, race street) and only on "Full" graphics. | `src/render/voxel.ts`, scene | Creases, roof undersides, tree bases, building bases visibly darker on the map; mesh count / build time on the map within +30 % (measure with L8) | Medium |
| L5 | **Distance blur / tilt-shift (B5)** on the **map** (and the garage idle view if it looks good): a cheap tilt-shift pass — sharp band across the middle of the screen, blurring toward top and bottom — gives the miniature look without a full depth-of-field cost. Off in races (you need to see far). | new `src/render/tiltShift.ts` (ShaderPass), map + garage | Map reads as a miniature; tags and the district you zoom into stay sharp | Small |
| L6 | **Particles (B7)**: one small instanced-voxel particle system: fireflies drifting over the map's meadows at dusk (steady glow, slow drift — **no blinking**, owner rule), chimney smoke from village houses, embers over the Oil Fields flare stack, dust motes in the garage's light beams. Capped counts; Light graphics halves them. | new `src/render/particles.ts` (reuse ideas from `fx.ts` Rain) | Visible and calm; frame time unchanged within 1 ms on PC | Small |
| L7 | **Per-block colour variation (B4)**: a little more hue/brightness jitter per block in the shared block shader (`src/render/blockShade.ts`), strongest on natural materials (grass, dirt, rock, wood), weakest on paint and glass — cars stay clean. | `src/render/blockShade.ts` | Grass, rock and wood look hand-painted; car paint unchanged (Body Shop screenshots match) | Small |
| L8 | **Speed check tool** `tools/perf.mjs` (owner rule: "if a step is slow, fix the tool"): opens the test build on PC and a phone size, measures average and worst frame time for 5 s on the garage, the map (whole + zoomed), a race and a Typing Race, with effects On and Off; prints a table. | `tools/perf.mjs`, `package.json` script `perf` | One command shows the cost of every effect; numbers recorded in DECISIONS | Small |
| L9 | **Budgets**: PC (owner's) ≥ 60 fps everywhere with effects On. Phones: effects default **Off** (Q232); if turned on, bloom at half resolution, no GTAO, tilt-shift only. The map's first build time must not grow more than 30 %. | — | L8 table meets the budgets | — |

## §3 Part B — Settings revamp — V0.21.0

| # | Work | Where | Done when | Effort |
|---|---|---|---|---|
| L10 | **Left-border tabs**: the Settings panel gets a column of header tabs on its **left edge**, sticking out of the border like file tabs — Gameplay · Visuals · Audio · Controls. Bevel+ (S75): raised blocks; the open tab sunk in, joined to the panel, with the yellow accent; Silkscreen font for the tab labels, 11 px+. One tab's settings show at a time (no long scroll). Remember the last tab (`ui.stab`). Phones: the same column, icon + short label, sized by `--ui-s`. | `src/ui/panels/settings.ts`, `src/ui/themeBevel.ts`, `src/ui/panels/shared.ts` | Matches the theme; `npm run layout` clean on all 4 sizes for **every** tab (add each tab to `tests/layout.mjs` SCREENS) | Medium |
| L11 | **What goes where** — **Gameplay**: Drive mode (Classic / Pedal), Pedal side (phones), Perfect-shift buzz (phones), Drift button look (dev), the "play full screen" phone tip. **Visuals**: **Enhanced graphics On / Off** (O2, the master switch), then (when On) Glow · Corner shading · Distance blur · Particles each On/Off; Graphics quality (Auto / Full / Light); Speed blur; Race camera; Near side. **Audio**: Sound volume, Engine volume. **Controls**: the three key sets (Drag Race, Typing Race, Drift) as today. | same | Every existing setting still works and is saved; nothing lost | Small |
| L12 | **Save fields**: `settings.fx` ('on' / 'off'; default On for PC Full, Off for phones / Light — Q232) and `settings.fxParts` (per-effect overrides). Old saves get the defaults. World reads them on start and when changed (no reload). | `src/save/save.ts`, `src/main.ts` (`setSetting`), scene | Switching On/Off changes the picture at once in the garage, map and races | Small |
| L13 | Sim check that every Settings row maps to a saved key and a tab; smoke opens each tab. | `tests/sim.ts`, `tests/smoke.mjs` | Checks pass | Small |

## §4 Part C — map roads revamp — V0.21.1

Problems seen on the V0.20.0 map: roads joined at a shared end point overlap and make blunt, angular corners; some roads run
straight into a district centre or a building at 90°; the Downtown → garage road arrives head-on at both ends; road edges are
stair-stepped where the curve crosses the block grid; centre dashes break up at joins; bridge approaches are abrupt.

| # | Work | Where | Done when | Effort |
|---|---|---|---|---|
| L14 | **A road network, not loose curves**: replace `ROADS` (lists of points) with **nodes** (junctions — each with a position, a kind: T-junction, crossroads, roundabout, dead end / car park) and **edges** (curves between two nodes that leave and arrive at the node's set heading). Curves are joined smoothly (matching direction at the joins), so no blunt corners. | `src/render/cityMap.ts` (or a new `src/data/cityRoads.ts` for the network) | Every road meets another at a proper junction shape | Medium |
| L15 | **Downtown ↔ garage** (the owner's worst case): a gentle S-curve that crosses the river square-on over the bridge, then sweeps into a **roundabout at the garage** (garage driveway off the roundabout) and into a **roundabout or a T at the edge of Downtown**, where it meets Downtown's own street grid (a grid is fine *inside* a town). The garage gets a curved driveway and forecourt, not a road hitting its wall. | same | Screenshot: no 90° hits; the road reads as a main road between two places | Small |
| L16 | **Clean edges**: draw roads from a distance-to-curve field: asphalt inside the width, a 1-block **kerb** (light grey) at the edge, **pavement** inside towns, grass verge outside them; edge lines on the bigger roads; centre dashes laid along the curve's length and **left out inside junctions**. Antialias the stair-steps by letting the kerb follow the true curve. | same | Edges look like smooth curves from the map's normal view | Medium |
| L17 | **Heights**: a smooth height profile along each road with a maximum slope (≈ 1 block up per 8 along); cuttings with stone retaining walls where a road goes through a hill, low embankments where it crosses a dip; bridges get approach ramps, railings and pillars; the railway gets level crossings (barrier arms) where it meets a road. | same | No steps or cliffs on roads; bridges look built | Medium |
| L18 | **Keep clear**: districts, villages and clutter are placed after the roads with a clearance gap; nothing stands on a road or in a junction. | same | The checker (L19) finds 0 problems | Small |
| L19 | **Road checker tool** `tools/map-check.mjs`: builds the map in Node (the builder is pure apart from Three's maths) and reports sharp bends (> 35° change within a short distance), roads overlapping away from a junction, dead ends that aren't marked as ends, anything built on a road, slopes too steep. Run it after every map change. | `tools/map-check.mjs`, `package.json` script `map-check` | 0 problems on the new network | Small |
| L20 | Junction props: street lamps at junctions, a few road signs and zebra crossings in towns (all original). | same | Small details, no clutter on the asphalt | Small |

## §5 Part D — map art pass — V0.21.2

| # | Work | Where | Done when | Effort |
|---|---|---|---|---|
| L21 | **Grass fur (B3)**: on grass, 1-block tufts on ~25 % of cells at mixed heights (1–2 blocks) in 3–4 greens, thinning near roads and towns; meadows get more flowers in clumps rather than single dots. | `src/render/cityMap.ts` | Close-ups look like Terraglass-style fur, not flat green | Small |
| L22 | **See-through water (B6)**: the shallow water near the coast and the river becomes a separate translucent mesh over a sand/rock floor (depth gradient: clear at the shore → deep blue), a slow foam band along the shore (moves gently, no blinking), lily pads in the river; the sea plane darkens with distance. Waterfall where the river leaves the mountain. | `src/render/cityMap.ts`, sea plane | You can see the floor near the shore; the coast has foam | Medium |
| L23 | **Fireflies + chimney smoke + flare embers** on the map (from L6). | same | Calm, steady glow | Small |
| L24 | Re-tune the map's light with glow on: fewer but brighter lamps, neon a touch softer, warm windows; keep "always dusk". | same | Screenshot review with the owner | Small |
| L25 | Map build time: if L4 (baked AO) + L21 push the first build too long, **save the built map** (geometry arrays in IndexedDB keyed by version + lock state) so later opens are instant. | `src/render/cityMap.ts` | Second open < 0.5 s | Medium |

## §6 Part E — garage revamp ("Workshop Update") — V0.22.0

| # | Work | Where | Done when | Effort |
|---|---|---|---|---|
| L26 | **Block-size policy** (O4 / Q234): the room shell (floor, walls, loft, door) and the cars stay at the **car block** (1). Props get **detail blocks of ½** (Q234). One object is always one block size — never mixed within an object. Same shading (block shader + AO + per-block colour) at both sizes, same palette families, so they connect. Write the policy into `docs/DECISIONS.md` and the comments of `src/render/garage.ts`. | docs, `src/render/garage.ts` | Written down; reviewed with screenshots | Small |
| L27 | **Props as block grids**: move the garage props from the box kit (`Kit.b / gl / lit`) to small `VoxGrid` models built per piece (greedy-meshed with baked AO from L4), at ½ blocks: tool bench, pegboard + tools, tyre stacks + rims, oil drums, shelving + parts boxes, the lift, compressor, the Garage Terminal desk + computer, loft lounge (sofa, TV, plants), posters (original art), whiteboard, coffee corner. Keep every placement in `src/data/garageLayout.ts` (one line per piece). | `src/render/garage.ts`, new `src/render/garageProps.ts`, `src/data/garageLayout.ts` | Every current piece rebuilt; the room reads the same, richer up close | Big |
| L28 | **Lighting**: warm lamp pools under the hanging lamps, cool daylight from the roll-up door, a neon "VOX" sign on the back wall with glow (L3), lit computer screen, AO in corners and under shelves (L4); dust motes in the door's light (L6). | same | The garage feels lit by its lamps, not flat | Medium |
| L29 | **Clutter pass**: rags, oil stains, coiled hoses and cables, toolboxes, spare parts, a fan, plants — small, at ½ blocks, kept off the car's turntable area and out of camera views' way. | same | Dense like the map, never covering the car | Medium |
| L30 | **The computer as the hub** (owner D4, first step): the Garage Terminal screen shows a live mini menu (Catalog, Profile, Garage …) in glowing pixels; clicking the computer in the room opens the Menu. Later: every menu lives on the computer. | `src/render/garage.ts`, `src/ui/garage.ts` | Clicking the computer opens the Menu; screen glows | Medium |
| L31 | Check every garage camera (home, Catalog, My cars, Upgrades, Profile loft, angles A–D in `src/render/scene.ts`) and the phone sizes; `npm run layout`, `npm run shot -- --preset pc` and `--preset phone`. | — | All views look right; layout clean | Small |

## §7 Style rules for everything above (cohesion)

| # | Rule |
|---|---|
| R1 | Block sizes: car block = 1 (cars, garage shell, race street); detail block = ½ (garage props, new small world items); the city map is a miniature (1.6 blocks per design unit, 1.25 on phones). Never mix sizes inside one object. |
| R2 | Shading: every block surface uses the shared block shader (`blockShade.ts`) + AO (baked or GTAO) + per-block colour variation (cars excepted). |
| R3 | Glow only on real lights (lamps, windows, neon, screens, car lights). Light colours: warm `#ffd890`, lamp `#ffe2a0`, neon set `#ff3fb4 #3fe6ff #b45cff #ffd23f`, red aviation `#ff4040`. |
| R4 | No blinking or pulsing (owner rule): particles drift and fade slowly; neon is steady; foam moves gently. |
| R5 | Palettes: reuse the existing material colours in `garage.ts` (STEEL, WOOD, RED, CHROME …) and the map's ground/stone/water colours; new items pick from these families. |
| R6 | Original work only: no copied art, logos or models (Terraglass and asset packs are references). |
| R7 | Every new effect has an Off path (O2) and a Light-graphics version. |

## §8 Checks for every step

`npm run typecheck` · `npm test` · `npm run smoke` · `npm run layout` (after UI work) · `npm run shot` (1–2 sheets per feature,
including a phone size) · `npm run perf` (L8, after any effect) · `npm run map-check` (L19, after any map change) ·
`npm run collide` only if cars or parts change. Run heavy checks one at a time (owner's PC). Each version gets its
changelog entry (Added / Changed / Fixed / Removed) and DECISIONS rows; ship only when the owner says.

## §9 Open questions (answer in the new chat)

| Q | Question | Suggested |
|---|---|---|
| Q229 | A "model on a stand" frame for the map (soil layers, wooden base)? (asked 2026-10-22, not answered) | No — keep the full-screen city |
| Q230 | The new effects in races too (not only map + garage)? | Yes, lighter: glow on car lights and the start tree; no tilt-shift |
| Q231 | Settings tab names: Gameplay · Visuals · Audio · Controls — or also an Account tab (username, leaderboard) later? | These four now; Account later |
| Q232 | Phones: effects Off by default (players can turn them On)? | Yes |
| Q233 | Tilt-shift blur on the garage too, or only the map? | Map only at first; try the garage in V0.22.0 |
| Q234 | Detail block size for garage props: ½ of a car block? | ½ |
| Q235 | Garage revamp: keep today's piece positions (`garageLayout.ts`) and only rebuild the pieces, or also rearrange the room? | Keep positions; rearrange later with the decor shop |
| Q236 | Roundabouts on the map (garage, Downtown edge) — or plain T-junctions? | Roundabouts at the garage and Downtown; T-junctions elsewhere |

## §10 Files you'll touch (map of the code)

| Area | Files |
|---|---|
| Effects pipeline | `src/render/scene.ts` (World, modes, resize) · `src/render/speedBlur.ts` · `src/render/voxel.ts` (materials, greedy mesher → AO) · `src/render/blockShade.ts` (block shader) · `vendor/addons/` · `src/types/shims.d.ts` · `tools/build.mjs` |
| Settings | `src/ui/panels/settings.ts` · `src/ui/themeBevel.ts` · `src/ui/styles.ts` · `src/save/save.ts` (Settings, DEFAULT_SETTINGS) · `src/main.ts` (setSetting) · `tests/layout.mjs` |
| City map | `src/render/cityMap.ts` (island builder, roads, districts, camera, train/boats) · `src/ui/cityMapUi.ts` · `src/data/districts.ts` |
| Garage | `src/render/garage.ts` (room + pieces) · `src/data/garageLayout.ts` (placements) · `src/render/scene.ts` (camera views) · `src/ui/garage.ts` |
| Tools | `tools/shot.mjs` · `tests/layout.mjs` · `tests/smoke.mjs` · new `tools/perf.mjs` · new `tools/map-check.mjs` |
