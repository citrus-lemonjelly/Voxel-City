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
  added?: string[];
  changed?: string[];
  fixed?: string[];
  removed?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
