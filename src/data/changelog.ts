// ============================================================================================================
// VOXEL CITY PATCH NOTES — the in-game "paper" button (bottom-left of the garage) reads this list, and the build writes
// docs/CHANGELOG.md from it. Newest version FIRST. The top entry's version is the game's version (shown on the button
// and stamped into the build).
//
// Version numbers: MAJOR.MINOR.PATCH (shown as V0.1.1)
//   PATCH (0.1.1 → 0.1.2): fixes, tweaks, balance changes and small additions.
//   MINOR (0.1.x → 0.2.0): a big feature round (a new game mode, the district map, a new system).
//   MAJOR (0.x → 1.0.0): the first public release.
// Every build that gets published gets a new version, even if it is only a fix.
// ============================================================================================================

export interface ChangelogEntry {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  /** one-line headline for the version */
  title: string;
  /** big updates (owner 2026-10-19): a header named after the biggest feature, e.g. "Garage Update" */
  header?: string;
  added?: string[];
  changed?: string[];
  fixed?: string[];
  removed?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.18.0', date: '2026-10-22', title: 'Drift: drag, slide, drag', header: 'Drift Update',
    added: [
      'Drift — a new mode in the Race menu. Launch and shift up like a drag race, drift through 3–5 turns, then drag to the finish again.',
      'In a turn: tap Drift as you reach it, then work the gas to keep the needle inside the green rev band on the gauge. Too many revs and you spin; too few and the car straightens up.',
      'Points for angle, for holding a drift to the end of its turn and for staying in the band (Perfect in the middle). Clean drifts in a row raise a chain multiplier up to ×3; esses link straight into the next turn.',
      'A Perfect launch and Perfect shifts score points too.',
      'Four night districts, each with its own winding road and a new layout every run: Downtown, Harbour, The Ridge and Neon Row. It rains on 4 runs in 10.',
      'A ghost rival drives the same road; beat its score to win. Easy, Medium and Hard set how close it gets.',
      'Drift button beside the gas pedal, in four looks to try: Handbrake, Pedal, Puck and Key (Settings ▸ Keybinds ▸ Drift).',
      'Drift parts in Upgrades: Drift tyres (a wider rev band), Differential (steadier revs in a slide) and Steering lock (more angle before a spin). They only change Drift.',
      'Drift pays about the same VX a minute as Street Races, plus Perfect entry, clean run and new best score bonuses.',
    ],
    changed: [
      'Settings has header bars: Display, Audio (sound and engine volume) and Keybinds (Drag Race, Typing Race and Drift keys).',
    ],
    fixed: [
      'The test console\'s day skip could land on the same date around a clock change.',
    ],
  },
  {
    version: '0.17.1', date: '2026-10-22', title: 'Fairer pay, a 1200 m track and a deeper muscle-car rumble',
    added: [
      'A 1200 m track: pick it beside 600 / 700 / 800 m. It pays ×1.4 and keeps its own best time.',
      'Gear setup switch (with Transmission T5): Preset gearing (Short / Balanced / Long) OR Custom ratios — one or the other, never both.',
      'Gear ratio bars can be dragged left and right, as well as the − / + buttons.',
    ],
    changed: [
      'Race pay is lower: Hard pays ×1.3 (was ×1.8), every win pays a quarter less, and shorter tracks pay less (600 m ×0.8, 700 m ×0.9). A maxed hypercar on Hard now earns about 45k a race instead of 120k+.',
      'Perfect-shift pay is shared over your shifts: a 7- or 8-speed earns the same Perfect-shift total as a 5-speed, not almost double.',
      'League S upgrades cost a bit more (×1.25).',
      'Typing Race pay moved up a little so it still earns the same per minute as a Street Race.',
      'Muscle cars have a new V8 voice: a low, even rumble with a gentle lope at idle — no high whine, no crackle.',
      'All other engines are smoother and lower (no wobble, no buzzing top end).',
    ],
    fixed: [
      'A small pop when an engine sound started.',
    ],
  },
  {
    version: '0.17.0', date: '2026-10-22', title: 'Tune every gear', header: 'Gearbox Update',
    added: [
      'Gear ratio tuning: own Transmission T5 and a Gear ratios drop-down opens under the Transmission row. Tune each gear on its own — − for a taller gear (more speed), + for a shorter one (more pull) — and see each gear\'s top speed.',
      'Each gear can move up to 25% from stock and always stays taller than the gear before it. Reset puts the stock ratios back. Saved per car.',
      'Test run uses your tuned ratios, so you can tune and test straight away.',
    ],
  },
  {
    version: '0.16.2', date: '2026-10-22', title: 'Hypercar gearing and a cleaner engine sound',
    changed: [
      'League S gearboxes are taller with progressive spacing: a maxed hypercar now uses its 8 gears across the whole run (8th comes at about 7.5 s, not 4) and stops sitting on the rev limiter — it is quicker too.',
      'League A gearboxes use progressive spacing (bigger steps in the low gears, closer at the top).',
    ],
    fixed: [
      'The muscle car engine sounded like a blown speaker: it played notes too low for speakers (down to 6 Hz). Engine notes now stay above 45 Hz, the muscle car keeps its deep rumble, and a limiter stops any sound from clipping.',
      'A maxed hypercar shifted from 2nd to 8th in under 3 seconds.',
    ],
  },
  {
    version: '0.16.1', date: '2026-10-22', title: 'Fair end game and more gears',
    changed: [
      'League A cars now have up to 7 gears and League S cars up to 8 (stock 6- and 7-speeds), with closer ratios and quicker shifts.',
      'Nitrous description says when to use it: once the tyres grip (3rd gear on) — fired at the launch it only spins the wheels.',
    ],
    fixed: [
      'Rivals were matched as if you launched the instant the light went green, so even a perfect driver (all Perfect shifts, maxed car) kept losing, worst in the short League S races. Rivals are now matched to a realistic reaction — a perfect run wins again.',
      'Rivals no longer leave the line before their own reaction time.',
      'Your perfect-run reference no longer assumes perfect nitrous: using it well now puts you further ahead instead of being expected.',
      'The last Strip boss in each league now loses to a perfect run by a clearer margin.',
    ],
  },
  {
    version: '0.16.0', date: '2026-10-22', title: 'Sound, smoke, rain and nitrous', header: 'Feel Update',
    added: [
      'Sound: engine notes that rise with the revs, shift clunks, launch screech, a chime on Perfect shifts, countdown beeps, Typing Race key clicks and a win / lose jingle. Each kind of car sounds different — a muscle car rumbles, a tuner rasps, a hypercar screams.',
      'Settings ▸ Sound volume and Engine volume (Off, 25, 50, 75, 100).',
      'Nitrous: a new upgrade (T2–T5). One shot per race — press 1, or tap the bottle badge by the gauge. Stronger and longer at higher tiers. Some rivals carry it too.',
      'Voxel effects: tyre smoke on the launch and in wheelspin, a backfire flame on Perfect shifts, a blue flame while nitrous burns, dust at the finish.',
      'Rain in about one race in four: falling rain, a wet shiny road, spray from the wheels — and less grip for both cars, so go easy on the launch.',
      'Night and dusk rain: street lights and headlights reflect in long streaks on the wet road.',
      'Shift light: the rim of the rev gauge glows green while the revs are in the shift zone.',
      'A camera kick on the launch, a wider view while nitrous burns, and a slow-motion photo finish when the race is too close to call.',
      'Upgrades ▸ Test run: race your set-up on an empty strip and see 0–60, 600 m and 800 m on each gearing — after a change it shows how much quicker you got.',
    ],
    changed: [
      'The Upgrades panel is compact: part names down the left, T1–T5 beside them. Point at a tier to see what it does and what it costs.',
      'The race progress bar uses the same track and chequered flag as the Typing Race.',
      'League D upgrades cost about a third less and League S upgrades a little more, so every league takes its intended time.',
      'Small labels (like the New badge) are a bit bigger.',
    ],
  },
  {
    version: '0.15.0', date: '2026-10-22', title: 'Type on your phone', header: 'Phone Typing Update',
    added: [
      'Typing Race on phones: the phone keyboard opens when the race starts, and the screen fits above it. Tap the race to bring the keyboard back.',
      'Phones: Nitro and Leave buttons in the Typing Race (phone keyboards have no Esc key).',
      'Add Voxel City to your phone\'s home screen: it opens full screen and sideways, with its own voxel car icon. Settings shows how on phones.',
      'Settings ▸ Graphics: Auto, Full or Light. Light (the default on phones) draws fewer pixels, smaller shadows and no speed blur, so races run smoother.',
      'A pop-up on the race results when a Strip level gives you a new car or decal.',
    ],
    changed: [
      'Race screen: the progress bar is now a dotted line across the top centre, with your car and your rival drawn from above in their own paint.',
      'The start lights fade away a second after green, so the top of the race screen stays clear.',
      'PC: Profile, Garage, Catalog and the small buttons sit up the left side again, always shown (phones keep the Menu button).',
      'The Garage buttons (Drive, Body Shop, Upgrade, Sell) run along the bottom beside Settings, on the home screen too, for the car you drive.',
      'Phones: everything is drawn a little bigger, and the smallest labels a size up.',
    ],
    removed: [
      'The "X is 0.2 s ahead" line and the panel behind the race progress bar.',
      'The Menu button on PC (the side buttons are always shown there).',
    ],
  },
  {
    version: '0.14.0', date: '2026-10-21', title: 'Every screen fits your phone', header: 'Phone Update',
    added: [
      'Every menu, result and Typing Race screen now fits small screens and phones: it shrinks to fit, and long panels scroll inside.',
      'Strip rewards are added automatically when you clear a level (they show on the race results).',
    ],
    changed: [
      'Open screens (My cars, Catalog, Body Shop, Settings…) now sit on top of the other buttons instead of under them.',
      'The Settings button sits beside Patch notes; the camera is a small icon beside the Race button.',
      'The car card in the top-left corner moved into Profile (league, name, hp, shifts, shift time, redline), so the garage screen is clearer.',
      'The Strip is much smaller: each level shows only its number and the money it pays. Tap the yellow card to race the next level.',
      'Phone buttons are a more comfortable size (they shrink with the screen).',
      'The Typing Race text panel grows to fit, so the stats row is never cut off.',
    ],
    removed: [
      'Claim buttons in the Strip (rewards are automatic now).',
      'Distance and rival details on Strip cards (you meet your rival on the start line).',
      'Settings and the camera button from the side menu (they have their own spots now).',
    ],
  },
  {
    version: '0.13.1', date: '2026-10-21', title: 'The race screen gets the new look',
    added: [
      'Clicking anywhere outside the side bar, or pressing Esc, closes it (the click still does what you meant).',
      'Phones: the menu opens as a row of big buttons just above the Menu button, so it fits on a sideways screen.',
    ],
    changed: [
      'Race screen: the dash plate behind the gauge, paddles and pedal is now a lit block like the menus, and so are the race strip and the start lights.',
      'Phones and tablets: the Menu, Patch notes, camera and side bar buttons are bigger and easier to tap.',
      'Behind the scenes: the menu styles were tidied into one place, so future changes are quicker.',
    ],
    removed: [
      'The old menu look (it could only be reached with a test address).',
    ],
  },
  {
    version: '0.13.0', date: '2026-10-21', title: 'A new coat for every menu', header: 'Style Update',
    added: [
      'A Menu button in the bottom-left corner: it opens a side bar with Profile, Garage, Catalog, Settings and the four small buttons, and closes again when you pick one.',
      'A yellow dot on the Menu button when a Daily task or calendar day is ready to claim.',
      'Panel titles now have their own icon and a title strip with the close button.',
    ],
    changed: [
      'New look for every menu: panels and buttons are lit blocks like the cars, pressed and chosen buttons sink in, and yellow now only marks what you can act on.',
      'Titles and big numbers use a pixel font (built into the game, works offline); the rest uses a cleaner, easier-to-read font.',
      'The car card shows the league as a yellow tag and three key stats; the wallet shows VX and Crowns as two separate blocks.',
      'Patch notes and the camera button sit beside the Menu button; the Garage tabs (Drive, Body Shop, Upgrade, Sell) sit beside them.',
      'Screens on the left slide aside while the side bar is open, so nothing is covered.',
      'Small labels are bigger (11 px and up).',
    ],
    fixed: [
      'Small labels at the end of some panel titles (like "Current V…") were hidden; they show now.',
    ],
    removed: [
      'The best time in the wallet corner (it is still in Profile and on the race results).',
    ],
  },
  {
    version: '0.12.0', date: '2026-10-21', title: 'Hold the gas yourself', header: 'Pedal Update',
    added: [
      'Pedal mode (Settings ▸ Controls ▸ Drive mode): the gas pedal stays all race. Hold it to pull, let go to coast. Tap shift up on green to launch.',
      'Shift up has its own key in Pedal mode (↑ by default, change it in Controls).',
      'Pedal mode: lift off the gas for a moment during wheelspin to get the grip back.',
      'Phone race screen: gauge in the middle, a small − + paddle pair in one bottom corner and the gas pedal in the other, with big thumb areas.',
      'Pedal side setting for phones: gas on the right (default) or on the left.',
      'Phones buzz briefly on a Perfect shift (can be turned off in Controls; iPhones don\'t support it).',
      'Phones show "Turn your phone sideways" when held upright.',
    ],
    changed: [
      'The Race button is smaller and blocky, with a wheel and a gear that turn when you point at it.',
      'Classic controls stay the default and work exactly as before.',
    ],
  },
  {
    version: '0.11.0', date: '2026-10-21', title: 'Tyres, weight, turbo and gearing', header: 'Tuning Update',
    added: [
      'Three new upgrades for every car, T1–T5 in each league: Tyres (more grip and an easier perfect launch), Weight (a lighter car) and Turbo (more power high in the revs, a little less down low, and a little extra weight).',
      'Gearing for every car, free to change in Upgrades: Short (harder launch, runs out of revs sooner), Balanced (factory) or Long (softer launch, more top speed). Stock cars like Short; fully upgraded cars often need Long so they don\'t hit the rev limiter before the line.',
      'Boss cars can change their gearing too (their parts still come as they are).',
    ],
    changed: [
      'Rivals now carry all five parts, each at a random tier near your own level, and a random gearing, so no two rivals are set up the same.',
      'The Strip\'s top rungs expect a fully upgraded car on the right gearing for the race length.',
      'Upgrades in Leagues C and B are a little gentler so a fully upgraded car never beats a stock car of the next league.',
      'Boss cars of Leagues D and B got a little more power so they keep their head start in the next league.',
      'The Garage list shows how many upgrade steps a car has (for example Upgrades 6/20).',
      'Selling a car pays back half of every part bought for it, not just the engine and gearbox.',
    ],
  },
  {
    version: '0.10.1', date: '2026-10-20', title: 'One way to Upgrades',
    changed: [
      'Upgrades open from the Garage: press Garage, then Upgrade, for the car you picked.',
    ],
    removed: [
      'The separate Upgrades button on the bottom bar (it did the same thing as Garage ▸ Upgrade).',
    ],
  },
  {
    version: '0.10.0', date: '2026-10-20', title: 'A real garage behind the menus', header: 'Garage Room Update',
    added: [
      'The menus now sit in a full 3D garage: your car on a showcase turntable with a lit ring, a loft upstairs, an office nook with the Garage Terminal, and a mechanic bay.',
      'Loft lounge: couch, TV, bookshelves, posters, a mini fridge, plants, and a racing jacket over the railing.',
      'Mechanic bay: a two-post lift with a stripped body shell in primer, a red toolbox, pegboard of tools, workbench, tyre stacks, rims on the wall, an engine on a stand, oil drums and a compressor.',
      'A roll-up door with the street outside (parked car, lamp post, a diner across the road).',
      'Garage door button in the small button block beside Profile (the spare slot): open or close the roll-up door.',
      'Camera button beside Patch notes: four garage camera angles — A High, B Low, C Hero, D Wide (the new default, shows the loft).',
      'Upgrades turns the camera toward the mechanic bay; Profile turns it toward the loft.',
      'Test console: race time of day — Random, or force Day / Dusk / Night.',
    ],
    changed: [
      'The plain grey checker floor and block wall are gone; the turntable has a new look.',
      'Every race now picks its time of day at random (day, dusk or night).',
      'Behind the scenes: each garage panel now has its own file, so new features are quicker to add and fix.',
    ],
    removed: [
      'Time of day is no longer in Settings (it moved to the test console).',
    ],
  },
  {
    version: '0.9.1', date: '2026-10-19', title: 'Mini buttons beside Profile and a quicker Garage',
    added: [
      'A small 2×2 button block beside Profile: Spin, Daily, Calendar and a spare slot for later. A yellow dot means something is ready to claim.',
      'The login calendar has its own button and panel.',
    ],
    changed: [
      'Opening the Garage shows Drive / Body Shop / Upgrade / Sell straight away for the car you are driving. Click another car to switch.',
      'Spin moved from its own big button into the new button block.',
    ],
  },
  {
    version: '0.9.0', date: '2026-10-19', title: 'Daily tasks, a login calendar, selling cars and garage slots', header: 'Economy Update',
    added: [
      'Daily tasks: three a day (new ones at midnight). Each pays Voxels and 2 Crowns, plus 3 Crowns for finishing all three.',
      'Login calendar: claim one day each day; missed days don\'t reset. Crowns on days 7, 14 and 21, and a calendar-only paint (Champion teal) on day 28.',
      'Sell cars in the Garage for half their price plus half of the upgrades you bought for them (click Sell, then Confirm).',
      'Garage slots: 6 free, then 50 Crowns each. Boss cars don\'t take a slot and have their own Boss cars tab.',
    ],
    changed: [
      'Visual parts now cost more in higher leagues and are bought once per league (for every car in that league). Parts you already own still fit every car.',
      'Typing Races pay more in higher leagues, so they earn about the same per minute as Street Races.',
      'Strip boss cash lowered (1,000 VX × boss number × league, was 2,500) so leagues last longer.',
    ],
  },
  {
    version: '0.8.2', date: '2026-10-19', title: 'Faster publishing and an economy checker (behind the scenes)',
    added: [
      'Behind the scenes: one-click "Ship It" that checks the game, runs the smoke test and publishes it to the website.',
      'Behind the scenes: an economy checker that shows money per minute for each race type and how long each league takes.',
    ],
    fixed: [
      'Behind the scenes: the code check runs cleanly again on the PC.',
    ],
  },
  {
    version: '0.8.0', date: '2026-10-19', title: 'Grilles, window tint, front plate text and a tidier Body Shop', header: 'Tint & Grille Update',
    added: [
      'Grille parts: Slats, Mesh, Chrome bars, Framed and Shaved (styles that do not fit a car are hidden).',
      'Window tint: Light, Dark, Limo, Blue mirror and Gold mirror.',
      'Your plate text now shows on the front plate too (front plates are 2 blocks tall).',
      'The car turns on the turntable to show the part you are looking at (rear for tail lights and plates, nose for headlights and grilles, side for wheels). Drag it to look around yourself.',
    ],
    changed: [
      'Body Shop tabs are grouped: Paint · Wheels · Aero · Lights · Details.',
      'Paint is a compact swatch grid like the Catalog: standard paints, then premium. Yellow = selected, white = on the car.',
      'The Spin button icon is full size, like the other buttons.',
      'Garage: Drive / Body Shop / Upgrade are now small sub-tabs that pop up above the Garage button for the car you pick.',
    ],
    fixed: [
      'Fitted quad / round tail lights no longer hang off the side of cars with narrow tall lamps (Supermini and others). The collision check now also catches blocks hanging off the nose or tail.',
    ],
  },
  {
    version: '0.7.0', date: '2026-10-19', title: 'Body Shop: paint, plates, lights, mirrors, roof parts and more', header: 'Body Shop Update',
    added: [
      'Parts is now the Body Shop (Garage → pick a car → Body Shop).',
      'Paint tab: your first paint is picked free when you buy a car. A repaint costs VX (more in higher leagues). 8 premium paints are bought once with Crowns, then free on every car.',
      'License plates: 5 pre-made designs (City, Classic, Euro, Race, Gold) and your own text on the rear plate — up to 7 letters/numbers, 10 Crowns per change.',
      'Roof parts: roof scoop, twin roof scoops and a roof rack.',
      'Side exhaust: pipes under the doors, just ahead of the rear wheels (side skirts stop short of them).',
      '5 new wheels: Deep dish, Blade, Rally disc, Bronze seven and Wire spoke (Crowns).',
      'Headlights (9 styles, including pop-ups on low-nosed cars only), Taillights (6 styles, including Smoked) and Mirrors (Body colour, Black, Chrome, Carbon or Shaved).',
      'Spin toggle beside Profile turns the garage turntable on or off, and you can drag a car with the mouse to turn it.',
    ],
    changed: [
      'The Catalog only picks paint for cars you are buying; owned cars are repainted in the Body Shop.',
      'Styles that do not fit a car are hidden for it, and rival cars only wear parts that fit them.',
      'Cars build about 4× faster (Garage cards and race loading).',
    ],
    fixed: [
      'Collision check on every car and part: tail pipes no longer cut through diffusers or the plate, ducktails sit above full-width tail lights, GT wing legs no longer go through the rear glass, and fitted headlights no longer overlap grilles.',
    ],
  },
  {
    version: '0.6.1', date: '2026-10-19', title: 'Controls + per-car records',
    added: [
      'Settings ▸ Controls: change your keys, with a Drag Race set (gas / shift up, shift down) and a Typing Race set (nitro, leave the race). Click a key, then press the new one; a key already in use swaps places. Reset puts the defaults back.',
      'Garage: each car now shows its own races, wins and best 600 / 700 / 800 m times (counted from this update).',
    ],
    changed: [
      'Typing Race nitro is now Enter (it can be changed in Settings ▸ Controls), so a Space can never fire it by accident. Enter on a space finishes the next word.',
      'Drag Race key hints show the keys you picked.',
    ],
  },
  {
    version: '0.6.0', date: '2026-10-19', header: 'Garage Update', title: 'Garage polish, Car Lab and faster tools',
    added: [
      'Car Lab (developers only: test console ▸ Car Lab): design a car with sliders for every body setting, start from any car, try paint and decals, and export the settings to send in.',
      'Big updates now get a header in the patch notes (this one: Garage Update).',
      'Developer tools: one-command release check (version must go up), a quick smoke test of every screen, and a review-shot tool.',
    ],
    changed: [
      'Garage: the camera pulls back so the whole car fits between your car list and the stats box.',
      'Garage: Drive / Parts / Upgrade connect to the picked car with a blocky connector in the game\'s panel style.',
    ],
  },
  {
    version: '0.5.0', date: '2026-10-19', title: 'Garage',
    added: [
      'Garage tab: all your cars in a list on the left, the picked car on the turntable, and a stats box beside it.',
      'Pick a car and three buttons pop out beside its card: Drive (race in it), Parts (its looks) and Upgrade (engine and gearbox). Parts and Upgrade work on that car even if you are driving another one.',
      'Stat bars show the car\'s stock value in grey, what your upgrades add in green, and any trade-off in red (e.g. shorter gears cost a little top speed).',
      'Favourites: tap ★ on a car to pin it to the top; "Favourites only" shows just those.',
    ],
    changed: [
      'The Parts tab moved into the Garage (per car). The bottom bar is now Profile · Garage · Upgrades · Catalog · Settings.',
      'Upgrades on the bottom bar still work on the car you are driving.',
    ],
  },
  {
    version: '0.4.0', date: '2026-10-19', title: 'Nitro + passages by difficulty',
    added: [
      'Nitro in the Typing Race: two nitro bars per race. Press Space in the middle of a word to use one: the rest of the word finishes at once and your car surges ahead with a steady blue-and-orange flame. It also clears a red letter. Nitro letters don\'t count against your accuracy.',
      'With no nitro left, Space in the middle of a word is a normal typo. Space between words still just types the space.',
      'Easy, Medium and Hard now have their own passages: Easy = 20 short passages with simple words; Medium = the 44 everyday passages; Hard = 20 longer passages with names, numbers, times, quotes and harder punctuation.',
    ],
    changed: [
      'Rivals are matched to your average for that difficulty (Hard text is slower for everyone). Until you have 3 races at a difficulty, it starts from your overall average, adjusted for the text.',
      'The race menu and results show your average for the difficulty you picked.',
    ],
  },
  {
    version: '0.3.1', date: '2026-10-19', title: 'Typing Race: cars glide',
    changed: [
      'Typing Race cars now have momentum: when you stop typing (or hit a typo) your car glides on and eases to a stop instead of stopping dead. Rivals move the same way. A car never drives past the letters typed.',
      'After the last letter, the results wait a moment longer so your car can roll over the finish line.',
    ],
  },
  {
    version: '0.3.0', date: '2026-10-19', title: 'Typing Race',
    added: [
      'Typing Race (Race ▸ Typing Race): a Nitro Type-style race seen from straight above. Five cars in five lanes on a voxel street; the camera follows your car.',
      'Type the passage to drive: every correct key moves you forward. A wrong key turns that letter red and holds you until you type the right one; your car rolls to a stop meanwhile.',
      'Start lamps light one by one, then GO (steady lamps, no blinking). Live WPM, accuracy, place and time while you type; each car has a name tag with its live WPM; a progress bar shows the whole race.',
      'Rivals type at speeds matched to your average WPM (your last 10 Typing Races), using the Easy / Medium / Hard picker: typing at your average just wins on Medium.',
      'Pay by place (League D Medium win 1,000 VX, scaled by your car\'s league and the difficulty), plus bonuses for a new best WPM and 98%+ accuracy.',
      '44 original passages about the city, its cars and its people.',
      'Profile shows your best WPM, average WPM and Typing Race wins.',
      'Esc leaves a Typing Race.',
    ],
    changed: [
      'Typing speed is all that matters in a Typing Race. The car you drive is for looks (your paint, decals and parts show from above).',
    ],
  },
  {
    version: '0.2.1', date: '2026-10-19', title: 'Update notice',
    added: [
      'Update notice: when a newer version is published on the website, the garage (or results screen) shows "Update ready" with Refresh now / Later. Refresh saves and reloads into the new version as a new session; your progress is kept. It never pops up during a race.',
      'After an update, the first garage visit says "Updated to V…" and the Patch notes button shows NEW.',
      'Every build now writes version.json next to the game, which the website version checks every 2 minutes and whenever you come back to the tab.',
    ],
    fixed: [
      'Opening the website straight after an upload could keep showing the old version from the browser\'s cache. Refresh now loads a fresh copy.',
    ],
  },
  {
    version: '0.2.0', date: '2026-10-19', title: 'Parts v2: Decals, Underglow, Body kit',
    added: [
      'Decals tab: Side stripe, Checker band, Race number, Racing stripes and Flames. Stripe colours pick white or black to stand out on your paint.',
      'Boss decals: the decal from every Strip boss (Rook, Brass, Viper, Nova, Apex · I – VI) now shows in Decals once won, and fits for free. Emblem on both doors and the hood.',
      'Underglow tab: Ice blue, Neon green, Violet, Red, Hot pink, White and a blue / pink Two-tone. Steady glow, never blinks or pulses.',
      'Body kit tabs: Front bumper (Front lip, Aero bumper, Track splitter), Side skirts (Black, Body-colour, Carbon) and Rear diffuser (Street, Race).',
      'Rivals now wear random visual parts (spoilers, wheels, decals, underglow …). Looks only, no effect on speed.',
      'New part-card close-ups for the side, nose, sills and underside.',
    ],
    changed: [
      'Parts no longer sells what your car already has: a part that matches the car\'s factory part is folded into its Factory card (e.g. "Factory · GT wing" on the Tuner coupe).',
      'Vented hood is subtler: slim dark slots set into the hood, kept inside the front fenders on every car.',
      'Carbon hood covers only the hood panel, not the raised fenders over the wheels.',
    ],
    fixed: [
      'Hood vents clipped through the wheel arches / fenders on some cars.',
    ],
  },
  {
    version: '0.1.2', date: '2026-10-19', title: 'Race button fix',
    changed: [
      'The Race button now closes whatever is open (Profile, Upgrades, Parts, Catalog, Settings, the Strip or Patch notes) and opens the race menu on its own.',
    ],
    fixed: [
      'Opening the race menu while another panel (e.g. Parts) was open showed both at once, with the race menu behind.',
    ],
  },
  {
    version: '0.1.1', date: '2026-10-19', title: 'Patch notes + web build',
    added: [
      'Patch notes: the paper button at the bottom-left of the garage lists every version\'s additions, changes, fixes and removals.',
      'The button shows NEW until you have read the latest notes.',
      'Web build: the game now builds an index.html next to VoxelCity.html, so the GitHub Pages link opens the game directly.',
    ],
    fixed: [
      'GitHub Pages link opened an empty page (the site had no index.html).',
    ],
  },
  {
    version: '0.1.0', date: '2026-10-19', title: 'First playable builds (Oct 16 – 19)',
    added: [
      'Drag racing: hold to rev, launch on green, timed up-shifts with Perfect / Good / Early / Late grades, downshift paddle with over-rev.',
      'Race HUD: tachometer, gear, speed, Perfect Shift paddle and gas pedal (on-screen or SPACE / SHIFT).',
      'Downtown street scene at real scale: buildings, props, trees, side streets, day / dusk / night, speed blur, start-line camera glide.',
      'Garage: car on a turntable, wallet, and Profile · Upgrades · Parts · Catalog · Settings.',
      'Panda Civix starter car plus 13 more cars across Leagues D (hatchbacks), C (muscle), B (street racers), A (tuners / GTs) and S (hypercars).',
      'Each car has its own acceleration, shift speed, grip, top speed, launch window and shift window; some are better at short dashes, others over 800 m.',
      'Catalog: 3D car stills, stats bars, prices, buy with Voxels (VX) or Crowns; paint and body options saved per car.',
      'Crowns currency; the Performance hatch is Crowns-only.',
      'Engine and transmission upgrades T1 – T5 per league, saved per car.',
      'Street Races with scene names and Easy / Medium / Hard difficulty (harder = closer races, bigger payouts).',
      'Race lengths: 600 m, 700 m and 800 m, with a best time for each.',
      'Random rivals: a new rival every race, matched to your car and upgrades; a perfect run always wins.',
      'The Strip: 60 levels per league, each harder than the last, ending in a maxed, near-perfect rival.',
      'Strip screen with sliding level cards and claimable rewards: VX every level, 5 Crowns + cash + a universal decal on every 10th (boss) level, and a unique boss car on level 60.',
      'Visual parts (bought once, fit every car): Spoilers, Exhausts, Hoods, Wheels and Paint finishes (gloss, matte, metallic, pearl), with close-up 3D cards.',
      'Economy in one file (car prices, payouts, part prices, Strip rewards) so numbers are easy to change.',
      'Local test console (add ?dev to the address, then press `).',
    ],
    changed: [
      'Money slowed down so each league takes time: about 30 Medium wins buy a league\'s cheapest car.',
    ],
    fixed: [
      'Results screen showed only a GARAGE button (the button covered the whole panel).',
      'Pop-up messages could block the Buy button.',
    ],
    removed: [
      'Strip reset option (the Strip is a one-way side quest).',
    ],
  },
];

/** The game's current version (newest patch notes entry). */
export const VERSION = CHANGELOG[0].version;
