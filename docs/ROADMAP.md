# Voxel City — Roadmap, open questions and ideas

Compiled 2026-10-21 after V0.11.0; **refreshed 2026-10-24 after V0.21.0 "Build & Tune Update" shipped.** Read this first next session.
Effort labels: **Small** (under an hour), **Medium** (a session), **Big** (several sessions).
Question numbers (Q#) carry on from `docs/DECISIONS.md` (next free: run `npm run sync`). The look / map / garage plan has its own
file: `docs/LOOK_ROADMAP.md` (L1–L31).

---

## §A Where we are

| # | Item | Status |
|---|---|---|
| A1 | Live version | **V0.21.0 "Build & Tune Update"** (2026-10-24, S106): price ladder, car rating (PP) + tuner points (TP), Car Lab tuning screen, 3 saved set-ups per car, Strip chapters + Hard Strip, seconds per tier in Upgrades. Before it: V0.20.0 City Update (city map, districts), V0.19.x Typing Update (+ online Top 500), V0.18.x Drift (dev only), V0.17.x Gearbox, V0.16.x Feel Update (sound, nitrous, effects, rain, Test run) |
| A2 | Milestone 1 — core slice | ✅ Done |
| A3 | Milestone 2 — collection and tuning | ✅ Done: cars ✅ · visual parts ✅ · buying cars ✅ · every upgrade type incl. nitrous ✅ · tuning: gearing → Car Lab, ratings, set-ups ✅ (V0.21.0) |
| A4 | Milestone 3 — garage-home | 🟡 Started: 3D garage room (V0.10.0), not walkable; garage revamp planned (LOOK_ROADMAP Part E, "Workshop Update") |
| A5 | Milestone 4 — career and world | 🟡 Well under way: city map + 5 districts (V0.20.0), the Strip per league with chapters + Hard Strip, Street Race difficulties, dailies + calendar. Next: district race scenes (Q222), the Harbor end game (Q219), Rating Cups (E7.2) |
| A6 | Milestone 5 — crews and online | 🟡 Started: Typing Top 500 online (Supabase, V0.19.1). Accounts / server saves / crews not started |
| A7 | Checks at the last ship (V0.21.0) | Sim 106/106 · collisions clean · smoke 23/23 · layout clean on PC + 3 phones · strip-check clean every league |
| A8 | Work in progress elsewhere | The **map revamp** (LOOK_ROADMAP Part C, roads) is being built on the owner's PC — it takes the next free version |

---

## §B Questions to answer (start here)

| Q | Question | Options | Claude's pick | Where |
|---|---|---|---|---|
| **Q164** | The lift in the garage hard to see from the Upgrades view | **A)** Aim the Upgrades camera so the lift shows · **B)** Move the lift · **C)** Fold into the garage revamp | C | LOOK Part E |
| **Q229–Q236** | Look Update: model-on-a-stand frame, effects in races, Settings tab names, phones Off by default, tilt-shift on the garage, detail block size, garage layout, roundabouts | see the table there | Claude's picks listed | `docs/LOOK_ROADMAP.md` §9 |
| **Q250–Q255** | Achievements + titles: how many, where they show, notes when earned, secret ones, Crowns per step, old saves | edit the table | B / B / yes / A / 5-10-25 / yes | `docs/achievements/Achievements_draft.xlsx` |
| **Q268** | New cars: which leagues? | — | Muscle + Classic drag → C · Tuner + Pro Stock → B · Pickup → C · Diesel → B · Dragster → special class | §E6 |
| **Q269** | New cars: follow the drawings' size (~58 blocks) or the sheet's numbers (16–28)? | — | The drawings (same block size everywhere) | §E6 |
| **Q270** | Dragster: Body Shop parts? | — | Paint + decals only | §E6 |
| **Q271** | Start with cars 1–4 from the sheet? | — | Yes; trucks after the truck bed (E6.3) | §E6 |

Answered since the last refresh (kept for the record): Q174 class limit **kept** (S106: C / B part strength 0.32 / 0.55) · Q175 / Q176 / Q180
nitrous built as picked (one shot on key 1, T1–T5, V0.16.0 S79) · Q177–Q179 Build & Tune, every car can finish its league, 3 set-ups
(S106) · Q181 economy pass done (S79, re-checked V0.21.0) · Q219 Harbor = end game later · Q222 district race scenes next (S104) ·
Q237–Q267 (S106). The V0.10.x garage review list (old §B1) moves into the garage revamp (LOOK Part E).

---

## §C Next versions (proposed order)

| Step | Version | What | Effort | Needs |
|---|---|---|---|---|
| C1 | next free (V0.22.0) | **Map revamp** + Look work from the owner's PC (`docs/LOOK_ROADMAP.md`: effects + On/Off, Settings left tabs, map roads, map art) | Big | Q229–Q236 |
| C2 | next | **Achievements + titles** (E7.7) + Hard Strip titles (E7.3) | Medium | Q250–Q255 (owner's table) |
| C3 | next | **New cars 1–4** from the owner's sheet (E6.1) + their parts (E6.4) | Medium | Q268–Q271 |
| C4 | after the map | Set-up switch on the district panel (E7.1) + **Rating Cups** (E7.2) | Medium | the new map's event buttons |
| C5 | — | Garage revamp "Workshop Update" (LOOK Part E) | Big | Q233–Q235 |
| C6 | — | District race scenes (Q222), then the Harbor end game (Q219) | Big | — |
| C7 | — | Trucks (E6.3) and the dragster event (E6.5); Drift back from dev mode (§E4.6) | Big | — |

---

## §D "Build & Tune" design notes — ✅ built in V0.21.0 (S106)

What was planned (Q177) and what shipped instead:

| # | Plan | Shipped |
|---|---|---|
| D4 | Every car has a niche | Changed by the owner (Q243): **price ladder** — pricier cars quicker stock and maxed; a good tune closes most of the gap |
| D5 | Part trade-offs at T4–T5 | Became the **Car Lab sliders** (final drive, nitrous mix, tire pressure, gear ratios), unlocked by part tiers like CSR |
| D6 | Saved set-ups | ✅ 3 per car (parts + Car Lab settings) |
| D7 | The Strip follows your car | ✅ the final rival is set so every car of the league, maxed + tuned, can win; + Hard Strip |
| D8 | Sim checks change | ✅ ladder, rating, final drive, Strip checks; `npm run balance`, `npm run strip-check` |
| D9 | Spec Rating events | → **Rating Cups** (E7.2), using the car rating (PP) |

---

## §E Ideas backlog

### E1 Racing and tuning
| # | Idea | Effort |
|---|---|---|
| E1.1 | Tune advice on the results screen ("Hit the limiter at 640 m — try Long gearing") | Small |
| E1.2 | ✅ Test run (V0.16.0; in Car Lab since V0.21.0, 0–60 / 600 / 800 / 1200 m) | — |
| E1.3 | Rivals pick themed builds (launch build, top-end build) so the trade-offs show | Small |
| E1.4 | ✅ Seconds per tier on the Upgrades buttons (V0.21.0) | — |
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
| E4.1 | ✅ built in V0.20.0 (City Update); revamp in progress (LOOK_ROADMAP). Original note: **District map** (owner pick Q199, 2026-10-22): a 3D voxel city with 6 districts — **the Harbor, Downtown, Neon Highrise, Daluda Forest, Oil Fields, Rooftop Skyway** (S94) — each mode in its own district (Milestone 4). Plan drafted (Race opens the map, districts open by league, V0.19.0 = map + 3 districts); waiting on the owner's ChatGPT reference map and Q200–Q205 | Big |
| E4.2 | ✅ Strip rewards: VX every level, Crowns + cash + decals at bosses, the boss car at L60 (V0.14.0); Hard Strip (V0.21.0) | — |
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
| E5.3 | ✅ `npm run balance` (V0.21.0) | — |
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
