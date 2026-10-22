# Voxel City — Roadmap, open questions and ideas

Compiled 2026-10-21 after V0.11.0 "Tuning Update" shipped. **Read this first next session.**
Effort labels: **Small** (under an hour), **Medium** (a session), **Big** (several sessions).
Question numbers (Q#) carry on from `docs/DECISIONS.md`.

---

## §A Where we are

| # | Item | Status |
|---|---|---|
| A1 | Live version | **V0.11.0 "Tuning Update"** (tyres, weight, turbo, Short / Balanced / Long gearing, random rival set-ups) |
| A2 | Milestone 1 — core slice | ✅ Done |
| A3 | Milestone 2 — collection and tuning | 🟡 Almost done: cars ✅ · visual parts ✅ · buying cars ✅ · upgrade types ✅ (nitrous next) · tuning ✅ (gearing; Build & Tune next) |
| A4 | Milestone 3 — garage-home | 🟡 Started: 3D garage room (V0.10.0); not walkable yet |
| A5 | Milestone 4 — career and world | 🟡 Partly: the Strip, Street Race difficulties, dailies |
| A6 | Milestone 5 — crews and online | ⬜ Not started (needs a server) |
| A7 | Checks at ship time | Sim 62/62 · collisions clean · smoke 17/17 |

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
| E4.1 | District map: 6 districts, each mode in its own district (Milestone 4) | Big |
| E4.2 | Strip completion rewards (Q104) | Small |
| E4.3 | Typing Race: more passages per tier, nitro upgrades, its own district | Medium |
| E4.4 | Crowns sources: weekly events, achievements | Medium |
| E4.5 | Accounts + server saves + owner admin console (Milestone 5; P8) | Big |
| E4.6 | **Drift mode — built in V0.18.0 (S87–S90); phone layout still to do**  (owner 2026-10-22, Q193): a winding road with curved turns in each district (the road ahead shifts); hold a Drift button beside the gas pedal to break the rear loose, then feather the gas to hold the revs inside a target band through the turn. Scored on angle × time in the band, not a finish line. One winding scene per district. Ideas: rev band like the shift window (green / Perfect), chained drifts multiply, Drift tyres + LSD parts, solo score runs first, a ghost rival later | Big |

### E5 Tools and code
| # | Idea | Effort |
|---|---|---|
| E5.1 | Split `main.ts` further (Typing Race, race setup) | Medium |
| E5.2 | Test console: "Max upgrades" and "Set gearing" buttons | Small |
| E5.3 | `npm run balance` tool: the build/gearing tables from this session as one command (times per car × build × distance) | Small |
| E5.4 | Smoke test: buy a part and change gearing in the Upgrades panel | Small |

---

## §F Reference files

| File | What |
|---|---|
| `docs/reference/garage-review/garage-review-1.png` / `-2.png` | Garage room review shots R1–R8 |
| `docs/reference/tuning-update/upgrades.png` | V0.11.0 Upgrades panel (stock / after buying) |
| `docs/reference/tuning-update/Q175_nitrous_badge.png` | Nitrous badge mockup (states + placement) |
| `docs/DECISIONS.md` S66 | Tuning Update numbers and reasoning |

---

## §G History (moved from CLAUDE.md "Where we left off", newest first)

- 2026-10-22 — V0.17.1 shipped (V8 voice S84, gear setup switch + 1200 m S85, pay downtune S86).
- 2026-10-22 — Live: **V0.17.0 "Gearbox Update"** (per-gear ratio tuning with Transmission T5, S83). Before it: V0.16.0 "Feel Update" (S79:
  sound `src/game/sound.ts`, nitrous, voxel effects + rain `src/render/fx.ts`, Upgrades ▸ Test run `src/game/dyno.ts`),
  V0.16.1 (end-game balance, A/S 7/8 gears, S81), V0.16.2 (gear spacing, S82), V0.15.0 "Phone Typing Update" (S78).
- 2026-10-21 — Live before this push: V0.11.0 "Tuning Update" (shipped from another session — tyres, weight, turbo, gearing; S66; read
  `docs/ROADMAP.md` for its open questions). This PC's unshipped work was merged on top and renumbered after it:
  V0.12.0 "Pedal Update" (Pedal mode S72, phone race screen S73, voxel Race button S74) · V0.13.0 "Style Update" (Bevel+ look,
  Menu + side rail, built-in pixel font, S75) · V0.13.1 (race screen look, menu closes on outside click, S76) · V0.14.0 "Phone
  Update" (every screen fits phones via fitUI / `--ui-s`, panels over buttons, Settings by Notes, camera by Race, car info in
  Profile, compact Strip with automatic rewards, S77). Check phones with the shot tool's `touch; size:844x390` (also 667x375, 932x430).
- Note: the two sessions' Q numbers overlap (both used Q164–Q181) and ROADMAP's planned version numbers (V0.11.1, V0.11.2,
  V0.12.0 "Build & Tune") are now taken — give those plans new numbers after V0.14.0.
