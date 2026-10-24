// Made-up Typing Race passages (owner 2026-10-22, V0.19.0, idea B6): original sentence templates about the city, filled in
// with names, places, numbers and prices from small word lists, so a race's text never has to repeat. Seeded: the same
// seed gives the same passage. Each level keeps the handwritten set's rules (data/passages.ts): Easy short simple words,
// Medium everyday sentences, Hard numbers / times / quotes, Expert adds symbols — @ # $ % & * ( ) / : ; — and sums that add up.
// Straight quotes only, so every character is on a normal keyboard.
import { makeRng } from './ai';
import { NAMES } from './rivals';

export type TextLevel = 'easy' | 'medium' | 'hard' | 'expert';
/** Passage length per level (characters) — the same ranges as the handwritten passages. */
export const TEXT_LEN: Record<TextLevel, [number, number]> = { easy: [100, 160], medium: [150, 232], hard: [170, 260], expert: [150, 240] };   // Expert: symbols type slower, so a little shorter

const DISTRICTS = ['the Harbor', 'Downtown', 'Neon Highrise', 'Daluda Forest', 'the Oil Fields', 'Rooftop Skyway'];
const EASY = {
  color: ['red', 'blue', 'green', 'gray', 'black', 'white', 'gold', 'pink', 'tan'],
  car: ['car', 'van', 'truck', 'bus', 'cab', 'jeep'],
  place: ['park', 'shop', 'track', 'dock', 'lot', 'bridge', 'cafe', 'beach'],
  who: ['cat', 'dog', 'kid', 'man', 'girl', 'boy', 'bird', 'cook'],
  when: ['at dawn', 'at noon', 'at night', 'on a hot day', 'in the rain', 'after work'],
  verb: ['rolls', 'speeds', 'turns', 'stops', 'drives', 'zips'],
};
const CARS = ['hatchback', 'coupe', 'pickup', 'wagon', 'roadster', 'sedan', 'delivery van', 'muscle car'];
const PLACES = ['harbour wall', 'old cinema', 'night market', 'tram depot', 'fuel station', 'river bridge', 'bakery', 'car wash'];

type Fill = (r: R) => string;
interface R { pick<T>(a: T[]): T; int(lo: number, hi: number): number; name(): string; }

const T: Record<TextLevel, Fill[]> = {
  easy: [
    r => `The ${r.pick(EASY.color)} ${r.pick(EASY.car)} ${r.pick(EASY.verb)} past the ${r.pick(EASY.place)}.`,
    r => `A ${r.pick(EASY.who)} sat by the ${r.pick(EASY.place)} ${r.pick(EASY.when)}.`,
    r => `We drove to the ${r.pick(EASY.place)} ${r.pick(EASY.when)} and got a cold drink.`,
    r => `My ${r.pick(EASY.car)} is old, but it still runs well.`,
    () => 'Green means go and red means stop.',
    () => 'The lights go on, one by one, and then we go.',
    () => 'Keep your eyes on the road and your hands on the wheel.',
    r => `${r.name()} has a ${r.pick(EASY.color)} ${r.pick(EASY.car)} with big wheels.`,
    r => `The ${r.pick(EASY.place)} is quiet ${r.pick(EASY.when)}.`,
    r => `It was a short race, and the ${r.pick(EASY.color)} car won.`,
    () => 'Fill the tank and check the tires before you go.',
    r => `The ${r.pick(EASY.who)} waved at every car that went by.`,
    r => `There is a ${r.pick(EASY.color)} ${r.pick(EASY.car)} at the ${r.pick(EASY.place)}.`,
    r => `Turn left at the ${r.pick(EASY.place)}, then go straight on.`,
    r => `We wash the ${r.pick(EASY.car)} ${r.pick(EASY.when)} and it shines.`,
    r => `The road to the ${r.pick(EASY.place)} is long and flat.`,
    () => 'Take it slow on the wet road.',
    r => `${r.name()} and ${r.name()} race to the shop and back each day.`,
  ],
  medium: [
    r => `${r.name()} spent all weekend in the garage, fitting new wheels to an old ${r.pick(CARS)}.`,
    r => `The streets of ${r.pick(DISTRICTS)} are quiet before sunrise, but by noon the traffic barely moves.`,
    r => `Every driver in ${r.pick(DISTRICTS)} knows the fastest way home, and nobody agrees on which one it is.`,
    () => 'A good launch is half the race, so hold the revs steady and wait for the green light.',
    () => 'The mechanic listened to the engine for a moment, nodded, and reached for a smaller spanner.',
    () => 'Rain turned the road dark and shiny, and the tires hissed as the cars rolled to the line.',
    () => 'Win or lose, the crews meet at the diner after the races to share chips and stories.',
    r => `${r.name()} keeps a notebook in the glovebox and writes down every race and every mistake.`,
    r => `The ${r.pick(CARS)} was slow and loud, but it started every morning, even in the middle of winter.`,
    () => 'Typing fast is like driving fast. Stay relaxed, look ahead, and keep a steady rhythm.',
    r => `On summer nights the car park by the ${r.pick(PLACES)} fills with music, friends and shining paint.`,
    r => `Nobody expected the rookie from ${r.pick(DISTRICTS)} to win, least of all the rookie.`,
    r => `The bus driver on route ${r.int(2, 19)} knows every pothole and steers around them without thinking.`,
    () => 'Spare parts pile up in every garage, because someday they might be useful.',
    () => 'Shift too early and the engine bogs down, shift too late and it screams.',
    r => `The sun set behind the towers of ${r.pick(DISTRICTS)}, and the street lights came on one by one.`,
    r => `${r.name()} tapped the dashboard twice for luck, took a slow breath, and watched the lights.`,
    () => 'There are seven bridges across the river, and the newest one glows green at night.',
    r => `The ${r.pick(PLACES)} is the best place in town to hear engines warming up before a race.`,
  ],
  hard: [
    r => `At ${time(r)}, ${r.name()} rolled the ${r.pick(CARS)} onto the scales: ${thou(r.int(890, 1490))} kg, exactly.`,
    r => `"Don't chase the redline," ${r.name()} said. "Find the torque, and shift on the beat."`,
    r => { const h = r.int(17, 20), m = r.pick([0, 15, 30, 45]); return `Heats start at ${hm(h, m)}; finals at ${hm(h + 2, m)}. Drivers must sign in by ${hm(h - 1, m)}.`; },
    r => `${r.name()}'s best run in ${r.pick(DISTRICTS)} was ${dec(r, 10, 15, 3)} seconds, set in ${r.int(1994, 2025)} and never beaten.`,
    r => { const p = r.int(26, 33); return `The tire pressures read ${p} psi in the fronts and ${p + r.int(1, 3)} in the rears.`; },
    r => `Route ${r.int(2, 19)} runs ${r.int(8, 31)} km from ${r.pick(DISTRICTS)} to the airport, with ${r.int(12, 40)} stops and ${r.int(6, 22)} traffic lights.`,
    r => { const w = r.int(10, 25); return `Weather update: light rain until ${time(r)}, then clearing; winds at ${w}-${w + 10} km/h.`; },
    r => `Can a ${r.int(95, 160)} hp hatchback beat a ${r.int(300, 520)} hp coupe? Over 400 m, rarely. In the rain? Often!`,
    r => `The tire shop on Quay Street has been open since ${r.int(1958, 1999)}, and it still only takes cash.`,
    r => { const a = r.int(11, 13), x = r.int(100, 899), y = x + r.int(1, 9); return `${r.name()} finished at ${a}.${x}; ${r.name()} at ${a}.${y}. Neither believed it until the replay.`; },
    r => { const l = r.int(30, 52) * 100; return `Launch at ${thou(l)} rpm, shift at ${thou(l + r.int(15, 30) * 100)}, and keep the nitro for the last ${r.int(10, 30) * 10} metres.`; },
    r => `Mrs. Okafor has complained ${r.int(5, 29)} times this year about the noise on Elm Road.`,
    r => `Lap record at the old airfield: ${dec(r, 52, 61, 1)} s (${r.int(1996, 2024)}). Nobody has gone faster since.`,
    r => `By ${hm(r.int(22, 23), r.int(0, 11) * 5)} the car park in ${r.pick(DISTRICTS)} had emptied, apart from one stubborn rattle.`,
  ],
  expert: [
    r => { const p = r.int(48, 160); return `Order #${r.int(1000, 9999)}: 4 x slicks @ $${p}.00 each (fitted & balanced) - total $${thou(p * 4)}.00.`; },
    r => `Plate ${plate(r)} was clocked at ${r.int(81, 140)} km/h on the ${r.pick(DISTRICTS)} ring road (limit: 50 km/h).`,
    r => `Final drive ${dec(r, 3, 4, 2)}:1, 1st gear ${dec(r, 2, 3, 2)}:1, and ${r.int(5, 25)}% more boost than last week (don't tell race control!).`,
    r => `Send your entry to pitlane@voxelcity.net by ${time(r)} on ${r.pick(['Friday', 'Saturday', 'Sunday'])} - late entries pay a $${r.int(2, 9) * 5} fee.`,
    r => { const pot = r.int(10, 60) * 100, a = pot * 0.6, b = pot - a; return `${r.name()} & ${r.name()} split the $${thou(pot)} prize 60/40: $${thou(a)} and $${thou(b)}.`; },
    r => { const hp = r.int(9, 30) * 10, kg = Math.round(hp * r.int(30, 90) / 10); return `Tip #${r.int(10, 99)}: weight/power beats power alone; ${thou(kg)} kg / ${hp} hp = ${(kg / hp).toFixed(1)} kg per hp.`; },
    r => `Crew chat (#${r.pick(['NightRun', 'PitLane', 'GearHeads', 'SkywayCrew'])}): "Meet at ${r.pick(DISTRICTS)} @ ${time(r)}; bring jacks, 2 spares & *lots* of coffee."`,
    r => `0-100 km/h in ${dec(r, 3, 7, 1)} s, 1/4 mile in ${dec(r, 10, 15, 2)} s, top speed ${r.int(210, 330)} km/h (with the ${r.int(8, 30)}% tune).`,
    r => { const l = r.int(30, 60), pl = r.int(150, 199) / 100; return `Fuel: ${l} L @ $${pl.toFixed(2)}/L = $${(l * pl).toFixed(2)}; tires: $${r.int(3, 9)}40; parts (see list): $${r.int(1, 9)}10.`; },
    () => 'Rule 7(b): no nitrous on public roads; rule 7(c): no racing between 00:00 & 06:00 (*any* road).',
    r => { const hp0 = r.int(12, 30) * 10, hp = hp0 + r.int(2, 12) * 10; return `The dyno sheet said ${hp} hp / ${r.int(18, 60) * 10} Nm at ${thou(r.int(50, 75) * 100)} rpm - ${Math.round((hp / hp0 - 1) * 100)}% up on the stock ${hp0} hp.`; },
    r => { const l = [0, 0, 0].map(() => r.int(5200, 6100) / 100), avg = (l[0] + l[1] + l[2]) / 3; return `Lap times: ${l.map(x => x.toFixed(2)).join('s, ')}s; average ${avg.toFixed(2)}s (best: ${Math.min(...l).toFixed(2)}s).`; },
    r => `Garage note (${r.int(1, 28)}/${r.int(1, 12)}): torque wrench @ ${r.int(80, 140)} Nm; check bolts #3, #7 & #12; *don't* forget the oil cap!`,
  ],
};

const hm = (h: number, m: number) => `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const time = (r: R) => hm(r.int(6, 23), r.int(0, 11) * 5);
const thou = (n: number) => Math.round(n).toLocaleString('en-US');
const dec = (r: R, lo: number, hi: number, places: number) => (lo + r.int(0, (hi - lo) * 10 ** places) / 10 ** places).toFixed(places);
const plate = (r: R) => `${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}-${r.int(1000, 9999)}`;

/** A new passage for `level` from `seed`: whole sentences, no template twice, length inside TEXT_LEN[level]. */
export function makePassage(level: TextLevel, seed: number): string {
  const rng = makeRng(seed), [lo, hi] = TEXT_LEN[level];
  const r: R = {
    pick: a => a[Math.floor(rng() * a.length) % a.length],
    int: (a, b) => a + Math.floor(rng() * (b - a + 1)),
    name: () => NAMES[Math.floor(rng() * NAMES.length) % NAMES.length],
  };
  for (let tries = 0; tries < 60; tries++) {
    const order = T[level].map((f, i) => [rng(), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => T[level][i]);
    let text = '';
    for (const f of order) {
      const next = text ? `${text} ${f(r)}` : f(r);
      if (next.length > hi) continue;                          // too long: try a shorter sentence
      text = next;
      if (text.length >= lo && rng() < 0.5) break;             // long enough: sometimes stop, sometimes add one more
    }
    if (text.length >= lo) return text;
  }
  return T[level][0](r);                                        // (never reached with these lists)
}
