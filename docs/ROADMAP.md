# Voxel City — Roadmap, open questions and ideas

Compiled 2026-10-21 after V0.11.0 "Tuning Update" shipped. **Read this first next session.**
Effort labels: **Small** (under an hour), **Medium** (a session), **Big** (several sessions).
Question numbers (Q#) carry on from `docs/DECISIONS.md`.

---

## §A Where we are

| # | Item | Status |
|---|---|---|
| A1 | Live version | **V0.18.3** (2026-10-22). Since V0.11.0: Pedal mode, Bevel+ look, phone screens, sound, nitrous, effects + rain, Test run, A/S 7/8 gears, per-gear ratio tuning, 1200 m track, pay downtune, Drift (dev mode only from V0.18.2) |
| A2 | Milestone 1 — core slice | ✅ Done |
| A3 | Milestone 2 — collection and tuning | 🟡 Almost done: cars ✅ · visual parts ✅ · buying cars ✅ · upgrade types ✅ (nitrous ✅) · tuning ✅ (gearing, ratio tuning; Build & Tune next) |
| A4 | Milestone 3 — garage-home | 🟡 Started: 3D garage room (V0.10.0); not walkable yet |
| A5 | Milestone 4 — career and world | 🟡 Partly: the Strip, Street Race difficulties, dailies |
| A6 | Milestone 5 — crews and online | ⬜ Not started (needs a server) |
| A7 | Checks at ship time | Sim 91/91 · collisions clean · smoke 20/20 |

---

## §B Questions to answer (start here)

### B1 Garage room review (V0.10.x) — screenshots: `docs/reference/garage-review/garage-review-1.png`, `-2.png`

A yes / no / "change X" per row is enough.

| # | Look at | Shot | Claude's note |
|---|---|---|---|
| B1.1 | Overall look (showroom + workshop) | R1 | Reads well |
| B1.2 | Default camera D (Wide): shows the loft enough? | R1 | The car name box covers part of the loft shelves |
| B1.3 | Keep camera angles A / B / C? | R2–R4 | A and C look alike |
| B1.4 | **Lift with the primer shell** | R1, R5 | ⚠ You can barely see it: one blue post at the right edge |
| B1.5 | Upgrades view turns toward the mechanic bay | R5 | The panel covers the bay |
| B1.6 | Profile view turns toward the loft | R6 | Good |
| B1.7 | Roll-up door: start open or closed? | R1, R7 | Starts open now |
| B1.8 | Catalog keeps the old aim (car small at the back) | R8 | OK? |
| B1.9 | Random race time of day: does night come up too often? | — | Play ~5 races |
| B1.10 | Smoothness on your PC | — | Is the garage slower than before? |
| B1.11 | Anything missing? (Q159 trophy shelf is saved for later) | — | — |

### B2 Open questions

| Q | Question | Options | Claude's pick |
|---|---|---|---|
| **Q164** | Fix the hidden lift (B1.4 / B1.5) | **A)** Aim the Upgrades camera so the lift shows left of the panel · **B)** Move the lift closer to the car | A |
| **Q174** | Class limit: a maxed car never beats a stock car of the next league | **A)** Keep it (C upgrades are 38% strength, B 60%, as shipped) · **B)** Full strength everywhere; maxed cars can pass the next league's stock cars | A for now; re-check after Build & Tune (§C3) |
| **Q175** | Nitrous badge — mockup: `docs/reference/tuning-update/Q175_nitrous_badge.png` | **A)** Voxel circle + blue bottle, top-left of the rev gauge (reserved in S25) · **B)** Square block · or send a drawing | A |
| **Q176** | Nitrous strength (one shot per race, key **1**) | **A)** ~2 s at +15%, better at higher tiers · **B)** Fixed 1.5 s | A |
| **Q177** | Direction for balance | **A)** Just relax "maxed cars within 0.2 s" · **B)** "Build & Tune": every car has a niche + part trade-offs + saved set-ups + the Strip follows your car · **C)** B plus Spec Rating events now | B |
| **Q178** | Keep "you never need a second car in a league"? | **A)** Yes, every car can finish its league · **B)** No, some cars are just better | A |
| **Q179** | Saved set-ups per car | **A)** 2 · **B)** 3 · **C)** None (refit by hand) | B |
| **Q180** | Nitrous upgrade tiers | **A)** T1–T5 like other parts (bigger shot, longer burn) · **B)** One part, no tiers | A |
| **Q181** | Economy pass after nitrous | **A)** Tune to your targets (D 2–3 h, C 3–4 h, B/A/S 3–6 h) · **B)** Leave as is | A |

---

## §C Next versions (proposed order)

| Step | Version | What | Effort | Needs |
|---|---|---|---|---|
| C1 | **V0.11.1** | Garage fixes from §B1 (lift visible, camera tweaks, door default) | Small | §B1, Q164 |
| C2 | **V0.11.2 — Nitrous** | Drag-race nitrous on key **1**: one shot per race, voxel badge at the gauge (ready / firing / used), bottle adds a little weight; Nitrous row in Upgrades (T1–T5); rivals sometimes carry it | Medium | Q175, Q176, Q180 |
| C3 | **V0.12.0 "Build & Tune Update"** | See §D. Every car has a niche; part trade-offs at T4–T5; 3 saved set-ups per car switchable in the race menu; the Strip's top rungs follow your car's best build | Medium | Q177–Q179 |
| C4 | V0.12.1 — Economy pass | Re-time leagues with all parts + nitrous priced in (`npm run economy`) | Small | Q181 |
| C5 | — | **Close Milestone 2** in `docs/DECISIONS.md` | Small | — |
| C6 | V0.13.0 — first Milestone 4 piece | Pick one: District map (Big) · Spec Rating events + event rules (Big) · Car Tier-up (Medium) | — | Owner pick |

---

## §D "Build & Tune" design notes (for Q177)

Findings from the V0.11.0 sims:

| # | Finding | Why it matters |
|---|---|---|
| D1 | Every part always helps. Dropping any one part on a maxed Civix costs 0.25–1.26 s at 600 m (engine 1.26 · turbo 0.64 · tyres 0.60 · transmission 0.36 · weight 0.25) | "Buy everything" is always right; only gearing is a real choice today |
| D2 | Removing the per-car turbo tuning lets maxed cars spread 0.2–0.8 s, but **the same car wins both 600 and 800 m** in D (City car), C (Muscle) and A (Compact) | Relaxing alone creates a "must-buy car", not build variety |
| D3 | Street Races balance themselves (rivals match *your* perfect run) | Balance only matters for the Strip and for pacing |

Proposed pieces:

| # | Piece | How | Effort |
|---|---|---|---|
| D4 | Every car has a niche | Replace "maxed cars within 0.2 s" with: maxed cars within ~0.5 s, and each car is best (or close) at launch / 600 m / 800 m. Drop the per-car `turboGain` numbers | Small |
| D5 | Part trade-offs (T4–T5) | **Turbo:** bigger = later boost (lag) + weight; strong at 800 m, weaker off the line. **Tyres:** drag radials grip hard but add a little drag at speed. **Weight:** lighter = a little less grip (already in the physics; show it). **Engine T5:** narrower power band, so shifts must be cleaner. **Nitrous:** bottle weight | Medium |
| D6 | Saved set-ups | 3 per car with a name ("600 Launch", "800 Top end"); switch in the race menu. Re-fitting owned tiers is already free | Medium |
| D7 | The Strip follows your car | Top rungs are set by *your* car's best build at that length, so any car can finish its league's Strip | Small |
| D8 | Sim checks change | From "cars close together" to "every car has a niche" and "no single build wins every distance" | Small |
| D9 | Later: Spec Rating events | Each tier adds points; some events cap your rating ("Spec 450"), plus event rules ("No turbo", "Stock only", "600 m launch duel"). The strongest "build" system (like Forza) | Big (Milestone 4) |

---

## §E Ideas backlog

### E1 Racing and tuning
| # | Idea | Effort |
|---|---|---|
| E1.1 | Tune advice on the results screen ("Hit the limiter at 640 m — try Long gearing") | Small |
| E1.2 | "Dyno" button in Upgrades: a quick test pull showing 0–60 / 600 m / 800 m for the current set-up | Medium |
| E1.3 | Rivals pick themed builds (launch build, top-end build) so the trade-offs show | Small |
| E1.4 | "Before → After" numbers on each tier button (time saved at 800 m) | Small |
| E1.5 | 700 m / 600 m Street Race records shown per set-up | Small |
| E1.6 | Weighted race time of day (more day than night) | Small |

### E2 Garage room
| # | Idea | Effort |
|---|---|---|
| E2.1 | Other panels turn the camera too (Settings → desk, Daily → whiteboard) | Small |
| E2.2 | Garage at night after a night race | Small |
| E2.3 | Show the part you're buying on the lift (new tyres on the primer shell) | Medium |
| E2.4 | Narrower / see-through Upgrades panel so the bay shows | Small |
| E2.5 | Trophy shelf (Q159) — Strip boss trophies, league wins | Medium |
| E2.6 | Garage decor shop paid in Crowns (layout is already data) | Big |
| E2.7 | Walkable garage + avatar (Milestone 3; needs the Hollowcrown repo) | Big |

### E3 Body Shop and cars
| # | Idea | Effort |
|---|---|---|
| E3.1 | Body Shop "Undo" | Small |
| E3.2 | Saved looks per car | Medium |
| E3.3 | Rival plate text | Small |
| E3.4 | Car Tier-up: move a favourite car into higher leagues (Milestone 4) | Medium |

### E4 Modes and world
| # | Idea | Effort |
|---|---|---|
| E4.1 | **District map** (owner pick Q199, 2026-10-22): a 3D voxel city with 6 districts — **the Harbor, Downtown, Neon Highrise, Daluda Forest, Oil Fields, Rooftop Skyway** (S94) — each mode in its own district (Milestone 4). Plan drafted (Race opens the map, districts open by league, V0.19.0 = map + 3 districts); waiting on the owner's ChatGPT reference map and Q200–Q205 | Big |
| E4.2 | Strip completion rewards (Q104) | Small |
| E4.3 | Typing Race: more passages per tier, nitro upgrades, its own district | Medium |
| E4.4 | Crowns sources: weekly events, achievements | Medium |
| E4.5 | Accounts + server saves + owner admin console (Milestone 5; P8) | Big |
| E4.6 | **Drift mode — built in V0.18.0–V0.18.1, hidden behind dev mode since V0.18.2 (owner: "this needs a lot of work").** Work list in §E4.6 below. Test it with `?dev` → Race ▸ Drift | Big |

#### §E4.6 Drift — what it needs before it goes live again
What exists (S87–S92): drag → 3–5 turns → drag, automatic gears, tap Drift + hold the revs in the green band, 3-2-1 cue above the gauge, chain multiplier, four night districts (new layout each run, rain 40 %), ghost rival, drift parts, four Drift button looks, pay at Street Race parity. Tools: `npm run drift-lab`, `npm run drift-feel`, shot waits `drift · sliding · cue · cuego`.

| # | Work | Effort |
|---|---|---|
| D1 | **Feel pass with the owner playing it**: tap vs hold to drift, band width and rev speed, how the angle shows, when a spin happens; maybe counter-steer feel | Medium |
| D2 | **Visual drift**: car body roll and weight shift, front wheels counter-steering, skid marks left on the road, a wider camera swing in long drifts, smoke that reads at speed | Medium |
| D3 | **Scoring**: judge the line (clipping points on the inside, outer zones near the wall), proximity bonus, clearer score pop-ups; decide whether speed counts at all | Medium |
| D4 | **HUD**: GO! call-out on green, cue lights polish, the run's turns on the progress strip, results chips per turn | Small |
| D5 | **Scenes**: names settled (S94: Downtown, the Harbor, Daluda Forest, Neon Highrise), a landmark per district, more prop variety, a frame-rate check on slower PCs | Medium |
| D6 | **Ghost rival**: ghost look (trail / colour), names and cars that fit each district, tandem bonus for drifting beside it | Medium |
| D7 | **Sound**: a proper tyre squeal that follows the angle, a clutch-kick blip at the turn-in | Small |
| D8 | **Phones**: Drift button opposite the gas pedal for two thumbs; check every phone size | Medium |
| D9 | **Economy**: drift parts prices and Drift pay once it is played for real (`npm run economy`), dailies for Drift | Small |

### E5 Tools and code
| # | Idea | Effort |
|---|---|---|
| E5.1 | Split `main.ts` further (Typing Race, race setup) | Medium |
| E5.2 | Test console: "Max upgrades" and "Set gearing" buttons | Small |
| E5.3 | `npm run balance` tool: the build/gearing tables from this session as one command (times per car × build × distance) | Small |
| E5.4 | Smoke test: buy a part and change gearing in the Upgrades panel | Small |

---

### E6 New cars from the owner's reference sheet (owner 2026-10-24)
Sheet: `docs/reference/car-sheet/voxel-drag-car-reference-sheet.png` — 8 cars (muscle, modern tuner, classic drag car, Pro Stock,
pickup, diesel truck, front-engine dragster, custom). Build at **our** scale (Civix 58 blocks ≈ 4 m, same block size everywhere —
follow the drawings, not the sheet's "16–28 units"). Open: Q268 leagues · Q269 scale · Q270 dragster parts · Q271 start with cars 1–4.

| # | Idea | Effort |
|---|---|---|
| E6.1 | Build cars 1–4 (muscle, tuner, classic drag car, Pro Stock) from the sheet with the body builder, so Body Shop parts, paint and `npm run collide` keep working; each gets a Catalog entry and a place on the price ladder (`npm run balance -- ladder`) | Medium |
| E6.2 | `tools/mesh2vox`: an AI or hand-made **.glb** model → our blocks at car scale, colours snapped to our palette (free AI tools that take a drawing: Hunyuan3D, TRELLIS 2 — open source; Meshy / Tripo free tiers have credit / licence strings) | Medium |
| E6.3 | Truck bed + lifted stance in the body builder (unlocks the pickup and the diesel truck) | Medium |
| E6.4 | New parts from the sheet: supercharger, hood scoop, wheelie bar, exhaust stacks, number livery ("77") — they fit existing cars too | Medium |
| E6.5 | Front-engine dragster as its own "Top Fuel" event with its own rules (a hand-made voxel model, paint + decals only) | Big |
| E6.6 | Two-colour liveries (stripes in a second colour) for the Custom / your-ride look | Medium |

### E7 Build & Tune follow-ups (after V0.21.0)
| # | Idea | Effort |
|---|---|---|
| E7.1 | Set-up switch on the map's district panel (left out while the map is in revamp on the PC) | Small |
| E7.2 | Rating Cups: district events with a car-rating cap (e.g. 200 PP), once the map has room for event buttons | Medium |
| E7.3 | A title for finishing each league's Hard Strip (with achievements, C8) | Small |
| E7.4 | Car Lab on phones: bigger slider markers for thumbs | Small |
| E7.5 | "Copy set-up" (set-up 1 into 2, then change one thing) | Small |
| E7.6 | Car rating on the My cars list too | Small |
| E7.7 | Achievements + titles from the owner's edited table (`docs/achievements/`, Q250–Q255, plus the "Tuner" title at 50 tuned wins) | Medium |

## §F Reference files

| File | What |
|---|---|
| `docs/reference/garage-review/garage-review-1.png` / `-2.png` | Garage room review shots R1–R8 |
| `docs/reference/tuning-update/upgrades.png` | V0.11.0 Upgrades panel (stock / after buying) |
| `docs/reference/tuning-update/Q175_nitrous_badge.png` | Nitrous badge mockup (states + placement) |
| `docs/DECISIONS.md` S66 | Tuning Update numbers and reasoning |
| `docs/reference/car-sheet/voxel-drag-car-reference-sheet.png` | Owner's 8-car reference sheet (E6) |
| `docs/reference/build-tune/` | V0.21.0 review shots (Car Lab, Upgrades, Hard Strip, race plate, Catalog) |
