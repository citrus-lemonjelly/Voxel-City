# Typing Race — design (built in V0.3.0)

Status: **built in V0.3.0** (owner answers Q122–Q129 all as suggested; nitro later as a spacebar mechanic). Decision S57. Mockup: `docs/reference/typing/Q122_typing_race_mockups.png`. Questions Q122–Q129 at the end.

Owner brief (2026-10-19): a second game mode that turns the camera, game design and feel into **Nitro Type-style visuals, just voxel**. In this mode you only see your car **from the top down**, as Nitro Type does.

## How a race works

| Step | What happens |
|---|---|
| 1. Pick | Race menu → **Typing Race** card (difficulty from the same Easy / Medium / Hard picker). Later it moves to its own district on the city map. |
| 2. Grid | Five cars line up in five lanes, seen from straight above: **you + 4 rivals**. The passage is shown below. |
| 3. Countdown | Three static start lamps light one by one, then GO (no blinking, A22–A23). |
| 4. Type | Every correct letter moves your car forward. The car's position = how much of the passage you have typed. |
| 5. Typos | A wrong key turns that letter **red**. You can't move on until you type the right letter, and your car slows while the red letter is up. No backspace needed (Nitro Type style). Accuracy is tracked. |
| 6. Finish | First to type the whole passage crosses the line. The rest finish at their own pace. |
| 7. Results | Places, WPM, accuracy, pay; a new best WPM and high accuracy pay bonuses. |

## Screen layout (mockup)

| Area | Contents |
|---|---|
| Top bar | Whole-race progress: one marker per racer, chequered finish on the right |
| Road (top ~60%) | Top-down voxel road: 5 lanes, dashed lane lines, red/white race curbs, sidewalk slabs, trees. Same block size as the cars. The view **follows your car**; the finish line rolls in at the end. Each car has a tag (name · WPM); yours is yellow. |
| Typing panel (bottom ~40%) | The passage in a big monospace font: typed letters dimmed, the current letter highlighted yellow, a typo red. Below: WPM, Accuracy, Place, Time, and a hint box. |

The cars are your real garage cars rendered from above, so paint, decals, underglow and parts all show (mockup panel Q122d).

## Rivals

Rolled at random like Street Races: names, cars from your league with random visual parts (Q118). Their **typing speed** is matched to yours: your average WPM over your last races, with a spread so races are close (Easy / Medium / Hard as in Street Races). Each rival types with small human-like rhythm changes and the odd typo, so the order changes during the race.

## Numbers (placeholders, all in `src/data/economy.ts` when built)

| Item | Proposal |
|---|---|
| Passage length | 150–250 characters (about 30–45 s at 60 WPM) |
| WPM | (correct characters ÷ 5) ÷ minutes |
| Pay | Places 1st–5th: 100% / 60% / 40% / 30% / 25% of the win (League D win 1,000 VX, × league scale) |
| Bonuses | New best WPM +25%; accuracy ≥ 98% +25% |
| Stats | Best WPM, average WPM (last 10), races, wins, accuracy → Profile |

## Nitro (V0.4.0)

Two bars per race. Space while the next letter is in the middle of a word uses one: the rest of the word (and its space) completes at once, a red letter is cleared, and a steady flame shows behind your car. Nitro letters don't count as key presses, so accuracy is untouched. With no bars left, a mid-word Space is a typo.

## Text

Easy, Medium and Hard each have their own passages (Easy 20 short / simple, Medium 44 everyday, Hard 20 with names, numbers, times and quotes). All passages are **original** (written for Voxel City: the city, cars, racing, everyday scenes). No book, song or article text. Starts with ~40 passages; later tiers add capitals, numbers and punctuation.

## Build plan (after approval)

1. Typing engine: passage, key handling, typo rule, WPM/accuracy, rival typists (seeded, testable like the AI drivers).
2. Top-down race view: orthographic camera over a voxel road made with the street kit; cars from the existing car builder.
3. Typing panel, countdown, results, pay, Profile stats.
4. Tests (typing maths, rival matching, pay) + browser test of a full race.

## Questions

See the reply / review sheet: Q122 camera, Q123 racers, Q124 does the car matter, Q125 rival matching, Q126 typo rule, Q127 passages, Q128 nitro, Q129 phones / tablets.
