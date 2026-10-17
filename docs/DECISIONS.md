# Voxel City — Decisions Log

Carries forward the status taxonomy from `VOXEL_CITY_READOUT_V1.md`. Claude Code treats **Agreed** rows as binding. Anything not listed here keeps the status it has in the brief.

| Status | Meaning |
|---|---|
| Agreed | Explicitly chosen by the owner. Binding. |
| Preference | Owner leans this way; not final. |
| Proposal | Suggested; needs discussion or approval. |
| Open | Decision still to be made. |

## Platform and stack

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| P1 | Web-based game, desktop browser first | Agreed | 2026-10-16 | Mobile is out of scope. An exe wrapper (Tauri/Electron) may come later; never a rewrite. |
| P2 | Three.js + TypeScript + Vite | Agreed | 2026-10-16 | Chosen over Babylon.js, Godot, Unity. Reassess only if the walkable garage milestone becomes painful. |
| P3 | No engine editor; all content is data-driven (JSON/TS definitions) | Agreed | 2026-10-16 | Owner has no scene-editing, coding, or art background. Claude Code builds everything; content must be editable as plain data. |
| P4 | Voxel assets defined in code/data first; MagicaVoxel (.vox) import optional later | Preference | 2026-10-16 | Avoids an art pipeline for Milestone 1. |
| P5 | Backend (accounts, ghosts, crews) deferred to Milestone 4–5; localStorage persistence until then | Agreed | 2026-10-16 | |
| P6 | Builds are delivered as source + a single-file `build/VoxelCity.html` the owner can double-click; no local Node required | Agreed | 2026-10-16 | Dev and testing happen in Claude's workspace. Owner may install Node later for a live dev server; optional. |
| P7 | Desktop input only: keyboard + mouse; every race action also has an on-screen clickable | Agreed | 2026-10-16 | |

## Racing

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| R1 | CSR-style launch + shift timing is the core loop | Agreed | brief | From brief §2. |
| R2 | Typing race is a separate optional mode, not in Milestone 1 | Agreed | brief | |
| R3 | Nitrous out of Milestone 1; add later | Agreed | 2026-10-16 | |
| R4 | Baseline race: 4 shifts, ~25 s | Agreed | 2026-10-16 | Baseline for the starter car, not a global constant (see R5). |
| R5 | Transmission tier changes shift cadence | Agreed | 2026-10-16 | Better gearbox = more, quicker shifts with tighter windows and higher payoff. Worse gearbox = fewer, slower shifts. Shift count lives on the car/transmission definition. |
| R6 | AI-first; game must feel complete without multiplayer | Agreed | brief | |
| R7 | Multiplayer order: ghost races → crews/social → live head-to-head | Agreed | brief | |
| R8 | Shift input: one key (Space) or an on-screen Shift button | Agreed | 2026-10-16 | |
| R9 | Launch: hold Space to rev, release at the green light; RPM at release sets launch quality (bog / clean / wheelspin) | Agreed | 2026-10-16 | Gives the launch a feel that tires/grip can modify later. |
| R10 | Shift feedback: four bands — Perfect / Good / Early / Late — against a visible RPM needle with a highlighted shift zone | Agreed | 2026-10-16 | Zone width and shift animation speed come from the transmission tier (R5). |
| R11 | Camera: rear-chase, slightly offset so both cars are visible | Agreed (for now) | 2026-10-16 | Owner wants to try alternatives once it's playable. Camera must be swappable in data. |
| R12 | AI opponent: scripted shift times with small randomness; difficulty = how close to Perfect its shifts land | Agreed (for now) | 2026-10-16 | Tune once gameplay exists. |
| R13 | Results screen (CSR-style): finish time, win/loss margin, per-shift grades, launch grade, currency earned, one-click "Race again" | Agreed | 2026-10-16 | Player profiles will later surface on this screen. |

## Garage and collection

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| G1 | Milestone 1 garage is a static screen, not walkable | Agreed | 2026-10-16 | Walkable garage is Milestone 3. |
| G2 | Three showcase slots | Agreed | brief | |
| G3 | Parking bays are display slots only — they never cap how many cars you own. Non-displayed cars live in the collection UI. | Agreed | 2026-10-16 | Supersedes the brief's hybrid-storage preference. Bays are for favourites and rare collections. |
| G4 | Vehicle ownership stored separately from the 3D object | Agreed | brief | Brief §9. |
| G5 | Hollowcrown avatar reuse | Agreed (direction) | 2026-10-16 | Hollowcrown is the owner's own project (no licensing issue). Assets are voxel / Minecraft-esque — compatible with A1. Hand-coded Three.js models from the shared Hollowcrown project; reused unchanged and scaled (A7). Hollowcrown is fantasy-medieval, so Voxel City needs its own modern clothing set; cosmetics/clothes will be earned or purchasable items. Not in M1; Hollowcrown repo access needed at M3 to extract the avatar builder into a shared module. |
| G6 | Player profile (stats, signature car) shown on the results screen and elsewhere | Agreed (direction) | 2026-10-16 | Design later; the results screen must leave room for it. |
| G7 | The Garage Terminal: an in-garage computer that is the single interface for upgrades, tuning, dealership/auction, and later crew/market functions | Agreed (direction) | 2026-10-16 | Grows out of the brief's "workbench and tuning computer" (§3) and "dyno / build lab" (§4). In M1 the static garage screen's menus are framed as the Terminal's display; when the garage becomes walkable (M3) the player walks up to it. The Terminal exists at garage level 1 with all features; feature level-locks may be added later for progression. Segmenting functions into other garage objects (dyno, workbench) is a later option. |

## Upgrades roadmap

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| U1 | Full upgrade set: Engine, Transmission, Tires, Body (weight reduction), Turbo, Nitrous (if/when added) | Agreed | 2026-10-16 | Order of introduction below. |
| U2 | Milestone 1 upgrades: Transmission + Engine, 3 tiers each | Agreed | 2026-10-16 | |
| U3 | Upgrade model is CSR-style: any part category can be upgraded at any time, in any order, within the limits of the car's class. Player chooses how to spend. | Agreed | 2026-10-16 | Supersedes the earlier staged-introduction idea. M1 still ships only Transmission + Engine as the slice; all six categories open from M2. Class limits: a car's league is fixed by model — a maxed D car never beats a C car. Each league has its own part tier scale T1–T5 (separate per league, not one running scale). Proposed implementation: tier effects are multipliers on the car's base stats so one tier table serves all leagues; league difference lives in base stats. |
| U4 | Starter car: **Panda Civix** (D league, 90s FWD hatchback) | Agreed | 2026-10-16 | Fictional brands play on real marques; no real badges, logos, or exact model names. Brand roster (proposal): Panda, Nisshin, Toyoma, Kobalt, Fjord, Mazuda, Subarbu, Bayern Werke. Run final names past a trademark check before any commercial release. |

## Art direction

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| A1 | Voxel/blocky theme runs through the entire game: cars, stages, world, props, UI chrome, HUD elements, effects. Text is the only exception in most cases. | Agreed | 2026-10-16 | Nothing smooth or photoreal. Particles (smoke, sparks) are cubes. UI panels, buttons, gauges are built from blocks or block-styled 2D. |
| A2 | Car density: a car is ~32 blocks long with cartoon proportions (large wheels, tall body, short overhangs), in the style of the owner's reference packs. Stages, props, garage and Terminal use the same block unit. | Agreed | 2026-10-16 | Reference renders in `docs/reference/`. Decals are block patterns (stripes, flames, two-tone, numbers), not fine logos. Upgrades must remain visible at this scale (wing, wide tires, turbo, stance). |
| A7 | Two voxel densities: car/world density (A2) and character density (Hollowcrown avatars, ~2.5× finer, scaled to ~13 car-blocks tall). Consistent per category; never mixed within one object. | Agreed | 2026-10-16 | Convention used by Minecraft, Crossy Road etc. |
| A8 | **Tabled 2026-10-16** (owner: cars are the main attraction; revisit after car design is locked). Was: in-race driver: a 2–3 block "driver bust" at car density, generated automatically from the avatar's hair and skin colours, behind the windscreen. Full avatar appears only in the garage (M3+). | Agreed | 2026-10-16 | No hand-built second avatar. |
| A3 | Fixed palette, 32–64 colours to start | Agreed | 2026-10-16 | Every asset draws from it; expand deliberately. v0 in `docs/PALETTE_v0.md`. |
| A10 | Car style reference: owner's "CarCollection" sample (`assets/`): ~60 long × 28 wide × 20 tall, flat colours, light-edge trim highlights, dark windows with diagonal reflection streaks, body-only meshes with separate wheels | Preference | 2026-10-16 | Study in `docs/reference/assets-study/`. Owner is not fixed on a size — goal is clean visuals. **Adopted 2026-10-16** (supersedes A2's ~32). Pack is the free sample of monogon's "Voxel Cars collection" (itch.io, name-your-own-price). Page shows no licence text. Owner decision: design reference only — we build our own, original cars in this style (no voxel-for-voxel copies). |
| A12 | Windows: solid dark glass with diagonal reflection streak (pack style) | Agreed (for now) | 2026-10-16 | Revisit if drivers (A8) come back. |
| A13 | Camera framed per screen (gallery / showcase / Terminal detail / race); car size never changes | Agreed (direction) | 2026-10-16 | Example in `docs/reference/assets-study/camera-framing-example.png`. |
| A14 | Liveries library: liveries are data applied to any car, not baked into a model. Scope goes well beyond basic patterns — animated, neon and glowing liveries are core to the vision. | Agreed (direction) | 2026-10-16 | Flames were one example. Proposed structure: pattern × finish × effect (see discussion 2026-10-16). Common with Voxels, specialty with Crowns, seasonal/limited via W7. |
| A15 | Wheels (tire + rim + brake) built at 2× density (half-size blocks). Bends A7's one-density-per-object rule. | Agreed | 2026-10-16 | Rim study in `docs/reference/assets-study/rim-study.png`. Per-part density review (A16) before any further density exceptions are locked. |
| A17 | Design rule: every car part is a swappable, customisable module (headlights, taillights, grille, wing, exhaust, wheels/rims, hood, bumpers, etc.). Future cars must be designed with part slots in mind. | Agreed | 2026-10-16 | Prototype: `prototypes/step0b/civix2.html`. |
| A18 | Underglow / neon lights are a customisation option; distinct colours may be sold for Crowns later | Agreed | 2026-10-16 | Renders in `docs/reference/step0b/civix2-liveries.png`. |
| A19 | Livery tiers as proposed (Standard / Specialty / Neon-Glow / Animated / Reactive) | Agreed (until further review) | 2026-10-16 | |
| A20 | ~~Active (animated) liveries: in.~~ Superseded by A22–A23. Animated paint effects that glow, blink or pulse are out. Reactive ideas move to underglow (under test). | Revised | 2026-10-16 | GIF tests in `docs/reference/step0b/` kept for reference only. |
| A22 | **Paint does not glow by default.** Exception: rare premium liveries may glow, at a much lower intensity than the first tests. Everyday light comes from underglow and functional head/tail lights. | Agreed (revised 2026-10-16) | 2026-10-16 | Glow levels Off / Low / Med / Full rendered; Low proposed as the in-game maximum. |
| A31 | Three rare animated premium liveries kept: **Circuit Scroll**, **Flame Flicker**, **Rainbow Tron** | Agreed | 2026-10-16 | Rainbow Tron: Low glow, 8 s colour cycle. Flame Flicker: **original version kept** (no glow, 10 shape changes/s) — owner did not want it toned down. Circuit Scroll: sweep strength pending (subtle / mid / original). All respect A27 settings. |
| A27 | Player settings: **Glow intensity** (Off / Low / Full, default Low) and **Freeze cosmetic animation** (accessibility). Glow level is the player's choice in settings, not a hard cap. | Agreed | 2026-10-16 | |
| A28 | Underglow is a single static colour by default. Rare underglow items may use **breathe** (3 s soft fade) or **slow blink** (1.5 s on / off with fades), assigned per item. | Agreed | 2026-10-16 | Both respect A23 limits and A27 freeze. |
| A29 | Night scenes are lit (lamp posts, moonlight), never pitch dark; garage has its own lighting | Agreed | 2026-10-16 | Night ambient + moonlight raised in the prototype. |
| A32 | **Civix v2.1 locked** as the stock Panda Civix (ride height +1, roof 21, first option in every slot) | Agreed | 2026-10-16 | `docs/reference/step0b/civix21-stock.png`. |
| A30 | All cars share the pack's proportions; smaller/larger cars allowed only by a small margin to keep the style | Agreed | 2026-10-16 | Civix v2.1: ride height +1, roof 19 → 21. |
| A23 | **Photosensitivity rule:** nothing on a car blinks or pulses. Any animated effect keeps constant brightness and changes slowly. | Agreed | 2026-10-16 | Proposed guard rails: ≥ 4 s per colour cycle, no brightness swings, no flashes; plus an accessibility setting that freezes all cosmetic animation. |
| A24 | Cosmetic parts are pure customisation: visuals only, never performance | Agreed | 2026-10-16 | Performance upgrades are separate and invisible unless the player also buys a matching look. |
| A25 | Civix v2 stock set = first option in every slot (stock headlights, stock taillights, slats grille, no wing, 1× exhaust, steel rims) | Agreed | 2026-10-16 | |
| A26 | Finishes pass (chrome, chameleon) with proper reflections | Agreed | 2026-10-16 | Scheduled after the garage scene exists or as its own pass. |
| A21 | Every part option is tested and "felt" via renders before any design is locked | Agreed | 2026-10-16 | |
| A16 | Per-part density review: every car section/part assessed for which density it needs before a hard plan | Open | 2026-10-16 | Proposed table given 2026-10-16; awaiting owner review. |
| A11 | Cars are modular: body + separate wheels + upgrade parts placed at attachment points derived from the body (arches, hood, trunk, bumpers) | Agreed (direction) | 2026-10-16 | Proven on the reference body: every upgrade category except Transmission shows. |
| A9 | Car length is a single parameter; car and avatar densities are independent. Raising car length (e.g. 32 → 40) adds detail and the avatar scale factor follows automatically. | Agreed | 2026-10-16 | Shown in `docs/reference/step0/civix-scale-32-vs-40.png`. |
| A4 | Lighting: flat shading + soft shadows | Agreed | 2026-10-16 | |
| A5 | Font: pixel/blocky headings, clean sans-serif body and numbers | Agreed | 2026-10-16 | |
| A6 | Sky: flat gradient with voxel skyline for M1; voxel clouds later | Preference | 2026-10-16 | |

## Process

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| X3 | Every open question comes with its reference render/GIF attached and captioned with the question number | Agreed | 2026-10-16 | Owner request. |
| X2 | Standing workflow for every run: analyze → discuss → questions & suggestions → gate for review. Nothing proceeds past a gate until the owner reviews. | Agreed | 2026-10-16 | Applies without being restated. |
| X1 | Every screen (menu, garage, car gallery, upgrades, results, etc.) is designed one at a time: discuss → design → render → owner approval → next screen | Agreed | 2026-10-16 | Step 1 delivers functional placeholder screens; each is then redesigned under this process. |

## Economy

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| E1 | Earned currency is **Voxels** (code: `VX`); replaces "Scrap". M1 uses Voxels only. | Agreed | 2026-10-16 | Crowns and Rep deferred, not cancelled. |
| E2 | Performance upgrades never purchasable with premium currency | Agreed | brief | |
| E3 | Crowns buy: specialty paints, decals, wheel styles, garage presets, decor, Terminal skins. Common paints are bought with Voxels. Crowns never buy performance. Earned via league promotion, weekly events, achievements (~one cosmetic/week free). | Agreed | 2026-10-16 | |
| E4 | Pink-slip wager races | Benched | 2026-10-16 | Not planned; may be revisited. |
| E5 | Player marketplace, crew treasury | Proposal | brief | Deferred to post-M4. |

## World and story

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| W1 | Five leagues D/C/B/A/S | Agreed | 2026-10-16 | |
| W1a | Each league has an organisational hierarchy the player battles up to reach the league boss | Agreed (direction) | 2026-10-16 | Design TBD (M4). Ties to W3. |
| W2 | Six stages: Downtown Grid, Harbor Strip, **Gravelback Pass**, **Voltway**, Rooftop Skyway, Oil Fields | Agreed | 2026-10-16 | Gravelback Pass replaces Quarry Road; Voltway replaces Neon Tunnel. |
| W2c | League mapping: D Downtown Grid · C Harbor Strip · B Gravelback Pass · A Voltway · S Rooftop Skyway · Oil Fields endgame/Corpo events; all unlocked stages stay available for repeatable races | Preference | 2026-10-16 | |
| W2a | Milestone 1 stage: Downtown Grid | Agreed | 2026-10-16 | Neutral baseline. |
| W2b | Per-stage surface/stat modifiers | Optional | 2026-10-16 | Owner unsure; may be removed from the roadmap. Build stages so modifiers are a data field that can be left at neutral. |
| W3 | Antagonist: **VOX Oil Corpo** | Agreed | 2026-10-16 | Renamed from Voxtown Oil Corpo. |
| W5 | Cars per league: 3 as the starting point, one Japanese / American / European-flavoured brand each | Agreed | 2026-10-16 | Owner: don't bloat the roster before the art style is nailed down. |
| W6 | Acquisition at M2: dealership + one story-reward car per league; rare finds later | Agreed | 2026-10-16 | |
| W8 | Day / night racing | Agreed | 2026-10-16 | Night showcases lights, neon and underglow. |
| W7 | Seasons system: time-limited cars, parts and more | Agreed (direction) | 2026-10-16 | Post-M4. |
| W4 | Fictional voxel car brands | Preference | brief | |

## Milestone 1 scope (vertical slice)

One car (TBD, U4) · one static garage screen · Downtown Grid · hold-release launch + 4 shifts · Transmission + Engine, 3 tiers each · one scripted AI opponent · one earned currency · localStorage save · ~25 s race · CSR-style results screen · single-file build.

## Crews

| # | Decision | Status | Date | Notes |
|---|---|---|---|---|
| C1 | Crew system design deferred to M5; to be designed carefully as its own effort | Agreed | 2026-10-16 | Placeholder only: ~20 members, Leader / Officer / Member. |

## Open (next discussion)

- U3: multiplier implementation of per-league tiers — owner: revisit during testing.
- Circuit Scroll sweep strength: subtle / mid / original.
- Reactive rare item: redline-only underglow — yes or no.
- Flames/complex patterns: hand-drawn masks vs procedural.

## Change log

- 2026-10-16 — Created. P1–P5, R3–R5, G1, E1 added from discussion.
- 2026-10-16 — Review items 1–10 resolved: P6–P7, R8–R13, G6, U1–U4, W2a–W2b.
- 2026-10-16 — Starter car set (U4 Panda Civix). Added A1–A2 art direction, G7 Garage Terminal, X1 screen-by-screen process. Step 1 plan approved by owner.
- 2026-10-16 — Glow in settings (A27); original flames kept (A31); underglow breathe + slow blink both used (A28); Civix v2.1 locked (A32); X3 visuals with questions.
- 2026-10-16 — Circuit Scroll, Flame Flicker, Rainbow Tron kept as rare toned-down liveries (A31). Civix v2.1 rendered.
- 2026-10-16 — Premium-livery glow allowed at low intensity (A22 revised); settings A27; underglow A28; night lighting A29; proportions A30.
- 2026-10-16 — Owner rules: paint never glows, no blinking/pulsing (A22–A23); cosmetics are visual-only (A24); stock set (A25); finishes pass (A26). Size lineup rendered.
- 2026-10-16 — Civix v2 rebuilt at pack density as modular parts; part variants, liveries, finishes, underglow, day/night and animated tests rendered. A17–A21, W8 added.
- 2026-10-16 — A15 → 2× wheels agreed; A16 opened; A14 broadened (animated/neon/glow); licence note; X2 standing workflow.
- 2026-10-16 — A10 adopted, A12–A15 added; rim study and camera-framing example delivered.
- 2026-10-16 — Studied owner's reference pack (3 MagicaVoxel OBJ cars); built OBJ→voxel converter (`tools/obj2vox.py`); upgrade test on reference body. A10–A11 added, A8 tabled.
- 2026-10-16 — Step 0 art-style proof delivered: Panda Civix stock/upgraded/livery × three views, 32 vs 40 comparison, palette v0. A9 added.
- 2026-10-16 — Block scale, avatars, tiers, stage names, roster size settled: A2, A7–A8, G5, U3, W2, W5.
- 2026-10-16 — Items 11–21 reviewed: A3–A6, G3, G5, G7, U3, W1–W1a, W2–W2c, W3, W5–W7, E1 (Voxels), E3–E5, C1. Block-scale reference render delivered.
