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
| P2 | Three.js + TypeScript + Vite | Agreed | 2026-10-16 | Chosen over Babylon.js, Godot, Unity. Reassess only if the walkable garage milestone becomes painful. **Note 2026-10-16:** Claude's workspace can't download Vite, so Step 1 builds with esbuild (the bundler Vite uses internally). A Vite config ships in the repo for when Node is installed locally; no code changes needed. |
| P3 | No engine editor; all content is data-driven (JSON/TS definitions) | Agreed | 2026-10-16 | Owner has no scene-editing, coding, or art background. Claude Code builds everything; content must be editable as plain data. |
| P4 | Voxel assets defined in code/data first; MagicaVoxel (.vox) import optional later | Preference | 2026-10-16 | Avoids an art pipeline for Milestone 1. |
| P5 | Backend (accounts, ghosts, crews) deferred to Milestone 4–5; localStorage persistence until then | Agreed | 2026-10-16 | |
| P6 | Builds are delivered as source + a single-file `build/VoxelCity.html` the owner can double-click; no local Node required | Agreed | 2026-10-16 | Dev and testing happen in Claude's workspace. Owner may install Node later for a live dev server; optional. |
| P7 | Desktop input only: keyboard + mouse; every race action also has an on-screen clickable | Agreed | 2026-10-16 | |
| P8 | **Player accounts + profiles** (roadmap): every player gets an account that stores their save (voxels, cars, parts, cosmetics, settings, stats) server-side. The owner's account has an **admin role** with a console: grant unlimited money/voxels, unlock any car/part/cosmetic, set league, jump to any screen or stage, toggle test features. | Roadmap | 2026-10-18 | Owner request. Belongs with the backend (P5, Milestone 4–5). Admin rights must be checked by the server against the account's role — never a hidden switch in the public game files, where anyone could find it. Until the backend exists, a local-only dev console (owner's builds) can cover testing; to be discussed. |

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
| U2 | Milestone 1 upgrades: Transmission + Engine | Agreed | 2026-10-16 | Step 1 implements **T1–T5** for both (per U3's per-league 1–5 scale) rather than 3 tiers. |
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
| A31 | Three rare animated premium liveries kept: **Circuit Scroll**, **Flame Flicker**, **Rainbow Tron** | Agreed | 2026-10-16 | Rainbow Tron: Low glow, 8 s colour cycle. Flame Flicker: **original version kept** (no glow, 10 shape changes/s) — owner did not want it toned down. Circuit Scroll: original pattern at **half speed (1 sweep/s) and half brightness** — owner pick, pending final look. All respect A27 settings. |
| A27 | Player settings: **Glow intensity** (Off / Low / Full, default Low) and **Freeze cosmetic animation** (accessibility). Glow level is the player's choice in settings, not a hard cap. | Agreed | 2026-10-16 | |
| A28 | Underglow is a single static colour by default. Rare underglow items may use **breathe** (3 s soft fade) or **slow blink** (1.5 s on / off with fades), assigned per item. | Agreed | 2026-10-16 | Both respect A23 limits and A27 freeze. |
| A29 | Night scenes are lit (lamp posts, moonlight), never pitch dark; garage has its own lighting | Agreed | 2026-10-16 | Night ambient + moonlight raised in the prototype. |
| A33 | Underglow is purely cosmetic: no gameplay information or advantage (no RPM/redline-reactive underglow) | Agreed | 2026-10-16 | Redline-reactive underglow rejected. Extends A24. |
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

## Step 1 implementation notes (2026-10-17) — for review

| # | Item | Value | Notes |
|---|---|---|---|
| S1 | Race distance | 800 m | Chosen so a stock Civix with perfect driving finishes in ~24.6 s (R4 target ~25 s). |
| S2 | Stock Civix performance | 118 hp, 1,020 kg, 7,200 rpm redline, 5-speed (4 shifts) | `src/data/cars.ts`. |
| S3 | Transmission tiers | T1–T2 5-speed (4 shifts), T3–T5 6-speed (5 shifts); shift time 0.50 → 0.18 s; green zone 10 % → 6 %; Perfect boost 5 % → 13 % | Implements R5. |
| S4 | Engine tiers | +0 / 8 / 16 / 25 / 35 % power | Fully upgraded ≈ 22.2 s. |
| S5 | Shift grading | Perfect = in zone (shift 45 % faster + brief boost); Good = near zone; Early/Late = 25 % slower shift | `SHIFT_TIME_MULT` in `src/game/race.ts`. |
| S6 | Launch | Hold to rev; release after GO; Perfect zone 55–72 % of redline; Bog / Wheelspin penalties | `LAUNCH` in `src/data/parts.ts`. |
| S7 | First rival | "Rico", stock Civix, skill 0.55 (~25 s) | Beatable with clean driving. |
| S8 | Economy | Start 1,000 VX; win 450, loss 150, +25 per Perfect shift, +40 Perfect launch, +100 new best | Engine T2 600 → T5 3,600; Trans T2 700 → T5 3,900. |
| S9 | Race camera | Rear-chase that pulls back to keep a trailing rival in frame | Rival lane appears on the left. |
| S10 | Units | mph on screen | |
| S9b | Race camera (revised) | CSR-style side view from the near side of the street. Settings offers **Dynamic** (C: dMin 300, elev 0.17) and **Dynamic close** (C2: dMin 240, elev 0.34 — lowered from the 0.42 preview). Yaw swings with who's leading. | Owner picked C + C2, 2026-10-17. Old rear-chase kept only as a debug mode. |
| S11 | World resolution | Everything is built in the cars' block unit (1 block = 1/58 of a Civix). Large surfaces share one block shader: per-block colour noise, lit tops, darker bases. | Owner: world must match the cars' resolution. |
| S12 | Street layout | Road, kerb parking lane (z 86–114), far sidewalk, then a varied frontage built from segments: shops, brick walk-ups with fire escapes, glass offices, warehouses, diner, side streets with crosswalks and signals, park with fountain, VOX OIL station + VOX MART + tanker, parking lot, construction site with crane, alleys. Parked Civixes in random paint/parts; ~1 in 5 is a VOX company car. | Seeded per chunk, so every race is the same street (proposal). |
| S13 | Time of day | Day / Dusk / Night presets: banded gradient sky, block clouds, blocky sun (dusk) and moon + stars (night), warm light pools under lamps, signs and headlights; lit windows. Night stays readable. | Settings preview for now; stages will own their time later. |
| S15 | Race smoothness | Whole street built at race load (no mid-race generation); camera locked to the player's car; cars drawn between physics steps; face-culled car meshes (~4× fewer triangles); flat ground doesn't cast shadows; shadow edges snapped; wheel motion disc at speed. | Owner played: "miles smoother", 2026-10-17. |
| S16 | Speed blur | World-only motion blur scaled by speed and depth; race cars stay sharp. Settings: Off / **Low (default)** / Full. | Owner approved Low as default, 2026-10-17. |
| S17 | World scale | Cars are real-car size (Civix 58×28×22 = reference pack 56–62×27–28×19–24; 1 block ≈ 6.9 cm). City rebuilt at real proportions (option C, ×2.2 from the old street plan): storeys, doors, awnings, lamps, trees, signs grow; thin details stay 1 block; human-sized props use real sizes; lanes 3.6 m (rival lane z 52); parking lane 2.4 m; tanker ~11 m. | Owner chose C, 2026-10-17. Default race camera **Dynamic** (Q14); near side **Mixed** for now (Q12); rival partly hidden when level is OK — alternative angle to be shown (Q15). |
| S18 | Race camera angle | Dynamic uses the **Raised** angle (elev 0.32). Start-line glide: countdown opens on the Swung angle (lower, swung round) and rises to Raised by green; the future roll-up to the line plays over the same move. | Owner, 2026-10-17 (Q15). |
| S19 | Trees | Street and park trees are remixes of the owner's VOX Trees: 10 variants (saplings as supplied, young ×2, street ×3, park ×4), mostly our greens with a few sun-lit patches of the original bright greens, softened toward ours (fewest on park trees, owner Q18); quarter-turn rotations. Saplings in planters. Pipeline in `docs/ASSETS.md`. | Owner Q17a–c, Q18, 2026-10-17. Glide approved as is (Q19). |
| S20 | Race HUD | Bottom-centre cluster on a see-through dash plate (stepped corners, covers gauge + paddle + hint), scaled 0.85 × window height. Gauge: 3D metal bezel with rim thickness, drop shadow, recessed face and glass sheen; block-dash rev ring (white → green shift zone → red), "-" ticks between ring and 0–8 rev numbers, golden needle, gear + mph in 5×7 block numerals (gear turns green in the zone). Race strip top-left ("Rico is X s behind you / ahead"). "Space or click" hint for the first 3 races. Nitrous hidden until it exists; countdown left for the owner's ideas (Q24). No blinking or pulsing. | Owner Q22–Q38, 2026-10-17. |
| S21 | Paddle shifter | Paddle = **shape + skin**. Shapes: Arc (curved, follows the rim) and Tab (squared), both tucked behind the dial and both standard; skins owned separately and fit every shape. Stock carbon standard. Catalogue: VOX OIL, Chrome, Racing stripes (paint-matched) to buy; Bronze/Silver/Gold/Platinum/Obsidian earned by league; Perfect Shift earned at 100 lifetime perfect shifts — only its "+" lights up, steady green in the shift zone, with no stripes or other lines (Q48; visual only, the gear number gives everyone the same cue). Press = paddle slides 3 px toward the dial and darkens; the whole right side of the plate is the press target. | Owner Q36, Q39–Q41, 2026-10-17. Shop UI later. |
| S22 | Near-side ground | Near pavement widened (two offset slab rows) to a low wall: dusty muted brick panels between stone pillars with a stone coping; small lamps in the coping light the pavement at night (tall bollard lights removed). Grass behind the wall muted; front hedges and loose orange boxes removed. | Owner Q44, 2026-10-17. Owner has further ideas — revisit after the HUD is complete (Q46). |
| S23 | Car data | Each car = a **Body** (brand, model, body type — hatch/sedan/muscle/tuner/hyper — proportions, stock parts, factory paint) + a **Spec** (league, mass, hp, redline, gearing, grip, optional variant name, part overrides, paint override). One body can carry several specs, e.g. an advanced version of the same body with small tweaks in a higher league. Cars are designed as bodies first, then placed in leagues. Upgrades stay per-league tier scales (U3). | Owner Q47, 2026-10-17. |
| S24 | Downshift | Left "−" paddle mirrors the "+" (same shape/skin). Shift key (either) or ↓ or click the left half of the plate. Takes 0.35 × shift time. **No safety net** (owner): a downshift at too high a speed over-revs — the engine sits on the limiter making no power and engine braking slows the car until revs drop ("OVER-REV"). One grade per gear; redoing a gear replaces its grade; Perfect boost/bonus can't be farmed. Below 55% of redline in 2nd+ the engine is out of its power band (lugging), so a badly early upshift is worth fixing. Results screen does not list downshifts. AI never downshifts. | Owner Q52–Q54 + "no safety, realistic", 2026-10-18. |
| S25 | Gas pedal + one plate | Gas pedal (launch control) in a bay of the same dash plate, right of the "+" paddle; hold = rev, release on green = launch (Space does the same). Before the launch the "+" paddle does nothing. After the launch the pedal rests released for 0.5 s, drops away over 0.9 s, then the bay folds in over 0.7 s (owner Q56: slow enough that nobody mistakes it for a button to spam). One plate behind everything: stepped top-left corner, stepped curve on the top-right. Labels replace the old hints — "SHIFT DOWN" [SHIFT], "SHIFT UP" [SPACE], "GAS" [SPACE] with key pictures — shown for the first 3 races (Q57). Pedals: **Drilled alloy standard**; Ribbed rubber (buy) and Skin-matched (earn) for the shop (Q55). **Reserved:** nitrous badge (small voxel circle with a blue voxel nitrous bottle) at the gauge's top-left, overlapping the downshift paddle — owner drawing to come. | Owner Q55–Q57, 2026-10-18. |
| S26 | Test console | Local test console (owner Q58): open the game once with `?dev` in the address, then the ` key (or the DEV tag) opens it. Voxels (+1k/+10k/+100k, set 0, Unlimited = free purchases), unlock all parts/cosmetics or re-lock to stock, equip any paddle skin/shape/pedal, set races/wins/perfect shifts, auto-drive, opponent normal/perfect/sloppy, a live debug readout, reset save, turn dev mode off. Changes only this browser's local save; the real admin role comes with accounts (P8). | Owner Q58, 2026-10-18. |
| S14 | Near side | Kept low (≤ 4 blocks) so it never covers the cars' wheels or the HUD. Options: Curb (red/white race curb, bollards, cones, hedges), Barrier (K-rail with VOX hazard bands), Mixed (barriers near start and finish, curb in between). | Pending owner pick. |

## Open (next discussion)

- U3: multiplier implementation of per-league tiers — owner: revisit during testing.
- (none for Step 0)
- Flames/complex patterns: hand-drawn masks vs procedural.

## Change log

- 2026-10-18 — Gas pedal round approved (S25: alloy standard, slower exit, labels first 3 races, nitrous spot reserved); local test console built (S26); asset packs reviewed — all are references/baselines only (owner Q60). Written to repo.
- 2026-10-18 — Downshift paddle (S24) approved, realistic over-rev; gas pedal + single plate + key labels (S25) for review; player accounts + owner admin console added to the roadmap (P8).
- 2026-10-17 — Perfect Shift paddle: "+" only, no lines (Q48). Car data split into Body + Spec (S23). Written to repo.
- 2026-10-17 — Race HUD (S20) and paddle shape + skin system (S21) approved and written to repo; near-side ground cleanup (S22) added for review. e2e now checks the paddle press target and paddle save.

- 2026-10-17 — Start-line camera glide + Raised angle (S18); tree remix from owner's VOX Trees (S19), brights toned down; asset pipeline doc. Written to repo.

- 2026-10-17 — Real-scale city (S17) approved; default camera Dynamic, near side Mixed. Written to repo.

- 2026-10-17 — Smoothness pass + speed blur: S15–S16 approved by owner. Camera, street and time of day accepted "for now" (polish later with the scene focus).
- 2026-10-17 — Step 1b (street + sky + settings): S9b, S11–S14 added for review.

- 2026-10-16 — Created. P1–P5, R3–R5, G1, E1 added from discussion.
- 2026-10-16 — Review items 1–10 resolved: P6–P7, R8–R13, G6, U1–U4, W2a–W2b.
- 2026-10-16 — Starter car set (U4 Panda Civix). Added A1–A2 art direction, G7 Garage Terminal, X1 screen-by-screen process. Step 1 plan approved by owner.
- 2026-10-17 — **Step 1 delivered**: playable slice (`build/VoxelCity.html`), source in `src/`, tests in `tests/`. Implementation values S1–S10 logged for review.
- 2026-10-16 — **Step 0 closed** (`docs/STEP0_CLOSEOUT.md`); part-slot standard written (`docs/PART_SLOTS.md`); Circuit Scroll approved. Step 1 started.
- 2026-10-16 — Circuit Scroll set to half speed / half brightness; reactive underglow rejected, underglow purely cosmetic (A33).
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
