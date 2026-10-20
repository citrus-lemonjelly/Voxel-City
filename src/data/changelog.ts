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
