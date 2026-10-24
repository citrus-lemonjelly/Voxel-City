// Usernames (owner 2026-10-22, V0.19.0): every racer has an online-style handle — "orangecanoe224", "TurboToast",
// "lazy_piston" — made from clean word lists, never real names or rank titles. Seeded, so a seed always gives the same
// name (the Rival Ladder's rivals keep theirs). Players pick their own in Profile; `cleanUsername` checks it.
import { makeRng } from './ai';

const ADJ = ['orange', 'lazy', 'crispy', 'sleepy', 'rapid', 'mellow', 'salty', 'cosmic', 'fuzzy', 'neon', 'quiet', 'lucky', 'frozen',
  'sunny', 'rusty', 'tiny', 'mighty', 'silver', 'golden', 'misty', 'spicy', 'jolly', 'brave', 'swift', 'chill', 'wild', 'purple',
  'minty', 'toasty', 'velvet', 'sly', 'bouncy', 'dusty', 'epic', 'hyper', 'lunar', 'polar', 'retro', 'solar', 'sonic', 'stormy',
  'turbo', 'ultra', 'zesty', 'glossy', 'crimson', 'amber', 'cobalt', 'electric', 'grumpy', 'happy', 'humble', 'jumbo', 'noble',
  'pixel', 'quick', 'shiny', 'sneaky', 'sparkly', 'steady', 'sticky', 'super', 'tidy', 'vivid', 'wobbly', 'wavy', 'blocky', 'cozy'];
const NOUN = ['canoe', 'toast', 'piston', 'otter', 'badger', 'pickle', 'waffle', 'comet', 'falcon', 'noodle', 'gecko', 'muffin',
  'rocket', 'panda', 'walrus', 'taco', 'pebble', 'hornet', 'kettle', 'lantern', 'mango', 'nugget', 'parrot', 'pretzel', 'quokka',
  'radish', 'sprocket', 'turnip', 'yeti', 'zebra', 'bagel', 'biscuit', 'cactus', 'donut', 'ferret', 'hamster', 'igloo', 'koala',
  'llama', 'moose', 'narwhal', 'owl', 'penguin', 'raccoon', 'sardine', 'tortoise', 'wombat', 'spark', 'gear', 'clutch', 'wrench',
  'bolt', 'tire', 'muffler', 'spoiler', 'axle', 'keys', 'typer', 'caps', 'qwerty', 'pancake', 'dumpling', 'meteor', 'pigeon',
  'beetle', 'cricket', 'goose', 'lobster', 'squid', 'turbine', 'piano', 'banjo', 'cobra', 'fox', 'lynx', 'mole', 'puffin', 'toad'];
const SHORT = ['vee', 'zed', 'kay', 'jax', 'rio', 'max', 'neo', 'ash', 'sky', 'ace', 'bo', 'dex', 'fin', 'gus', 'ivy', 'kit', 'lou',
  'mo', 'pip', 'roo', 'taz', 'uma', 'viv', 'wes'];
const VERB = ['drives', 'types', 'drifts', 'races', 'zooms', 'revs', 'shifts', 'cruises', 'boosts', 'rolls'];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const USERNAME = { min: 3, max: 16 };

/** One username from a random source (0–1). Always 3–16 letters, digits, _ or . */
export function makeUsername(rng: () => number): string {
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length) % a.length];
  const num = (lo: number, hi: number) => String(lo + Math.floor(rng() * (hi - lo + 1)));
  for (let tries = 0; tries < 20; tries++) {
    const a = pick(ADJ), n = pick(NOUN), style = rng();
    const name =
      style < 0.30 ? a + n + num(1, 999) :                       // orangecanoe224
      style < 0.48 ? cap(a) + cap(n) :                           // TurboToast
      style < 0.60 ? `${a}_${n}` :                               // lazy_piston
      style < 0.70 ? `${pick(SHORT)}.${pick(VERB)}` :            // vee.drifts
      style < 0.80 ? n + num(0, 99).padStart(2, '0') :           // gecko07
      style < 0.88 ? cap(n) + cap(pick(VERB)) :                  // OtterRevs
      style < 0.94 ? pick(SHORT) + num(10, 99) :                 // jax88
                     `the_${a}_${n}`;                            // the_sleepy_gear
    if (name.length >= USERNAME.min && name.length <= USERNAME.max && !isBlockedName(name)) return name;
  }
  return pick(SHORT) + num(100, 999);
}
/** A rival's username from its seed (V0.19.0, owner Q212: every rival has one) — the same seed always gives the same name. */
export const rivalName = (seed: number) => makeUsername(makeRng(((seed ^ 0x2545f491) >>> 0) || 1));
/** `count` different usernames from one seed, none equal to any in `avoid` (case-insensitive). */
export function usernames(seed: number, count: number, avoid: string[] = []): string[] {
  const rng = makeRng(seed), taken = new Set(avoid.map(s => s.toLowerCase())), out: string[] = [];
  while (out.length < count) { const u = makeUsername(rng); if (!taken.has(u.toLowerCase())) { taken.add(u.toLowerCase()); out.push(u); } }
  return out;
}
/** A player's own username: trimmed, spaces → _, only letters / digits / _ / . — or null with no usable name left. */
export function cleanUsername(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_.]/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, USERNAME.max);
  return s.length >= USERNAME.min ? s : null;
}

// Name filter (V0.19.0, owner Q214): rude words and slurs aren't allowed in a player's username. Number-for-letter swaps are
// undone first (sh1t → shit). Words in BLOCK are caught anywhere in the name; the short words in BLOCK_WORD only when they are
// a whole piece of the name (split at _ . and capitals, digits trimmed off the ends), so words like "glass" or "canal" pass.
const BLOCK = ['fuck', 'fuk', 'fck', 'shit', 'cunt', 'bitch', 'nigg', 'nigga', 'faggot', 'retard', 'whore', 'slut', 'porn', 'penis',
  'vagina', 'dildo', 'asshole', 'hitler', 'nazi', 'kike', 'rapist', 'raping', 'molest', 'paedo', 'cocksuck', 'jizz', 'wank',
  'bollock', 'chink', 'tranny', 'spunk', 'pussy', 'boob', 'orgasm', 'horny', 'cumshot', 'killyourself'];
const BLOCK_WORD = ['ass', 'arse', 'cum', 'sex', 'sexy', 'tit', 'tits', 'dick', 'cock', 'fag', 'hoe', 'rape', 'nig', 'coon', 'spic', 'kys', 'nude', 'anal', 'twat'];
const unleet = (s: string) => s.toLowerCase().replace(/[0@4]/g, c => (c === '0' ? 'o' : 'a')).replace(/1|!/g, 'i').replace(/3/g, 'e').replace(/5|\$/g, 's').replace(/7/g, 't').replace(/8/g, 'b');
/** True when a username contains a blocked word. */
export function isBlockedName(name: string): boolean {
  const flat = unleet(name).replace(/[^a-z]/g, '');
  if (BLOCK.some(w => flat.includes(w))) return true;
  const pieces = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s_.]+/).flatMap(p => [unleet(p), unleet(p.replace(/^\d+|\d+$/g, ''))]);
  return pieces.some(p => BLOCK_WORD.includes(p) || BLOCK_WORD.includes(p.replace(/s$/, '')));
}
