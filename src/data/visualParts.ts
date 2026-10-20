// Visual parts (owner 2026-10-19): bought once, fit every car (Q110), change the look only (A24). Prices live in
// data/economy.ts (COSMETIC_PRICES). Each part sets one slot; 'stock' = the car's own factory part (free, always owned).
// v1 slots (owner Q112): Spoiler, Exhaust, Hood, Wheels, Paint finish. v2 (owner Q117): Decals, Underglow, then the body kit
// (Front bumper, Side skirts, Rear diffuser). The other tabs are listed as coming soon.
export type PartSlot = 'spoiler' | 'exhaust' | 'hood' | 'wheels' | 'finish' | 'decal' | 'underglow' | 'bumper' | 'skirts' | 'diffuser' | 'headlights' | 'taillights' | 'mirrors' | 'roof' | 'plate';
export type Rarity = 'common' | 'rare' | 'epic';
export interface VisualPart { id: string; slot: PartSlot; name: string; rarity: Rarity; value: string; blurb: string; /** won on the Strip, never sold */ won?: boolean; /** card camera, when the slot's default can't see this part */ view?: ThumbView }

// Body Shop tabs (owner 2026-10-19: Parts renamed Body Shop; Paint is its own tab, handled in the UI)
export const PART_SLOTS: { id: PartSlot; label: string }[] = [
  { id: 'finish', label: 'Paint finish' }, { id: 'decal', label: 'Decals' }, { id: 'wheels', label: 'Wheels' },
  { id: 'spoiler', label: 'Spoiler' }, { id: 'hood', label: 'Hood' }, { id: 'roof', label: 'Roof' }, { id: 'exhaust', label: 'Exhaust' },
  { id: 'bumper', label: 'Front bumper' }, { id: 'skirts', label: 'Side skirts' }, { id: 'diffuser', label: 'Rear diffuser' },
  { id: 'headlights', label: 'Headlights' }, { id: 'taillights', label: 'Taillights' }, { id: 'mirrors', label: 'Mirrors' },
  { id: 'plate', label: 'License plate' }, { id: 'underglow', label: 'Underglow' },
];
/** Tabs shown greyed out until their parts exist (PART_SLOTS.md planned slots). */
export const SOON_SLOTS = ['Grille', 'Window tint'];

const P = (slot: PartSlot, value: string, name: string, rarity: Rarity, blurb: string): VisualPart => ({ id: `${slot}.${value}`, slot, value, name, rarity, blurb });

/** Strip bosses (same names as game/strip.ts) — each boss level awards one universal decal (owner S47). */
export const BOSS_DECALS: { league: string; boss: string }[] = [
  { league: 'D', boss: 'Rook' }, { league: 'C', boss: 'Brass' }, { league: 'B', boss: 'Viper' }, { league: 'A', boss: 'Nova' }, { league: 'S', boss: 'Apex' },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/** Boss decal tier colours I – VI. */
export const DECAL_TIER = ['#c08a4a', '#c9ccd2', '#e8c46a', '#e0463a', '#4a9ae8', '#a26cff'];

export const VISUAL_PARTS: VisualPart[] = [
  P('spoiler', 'stock', 'Factory', 'common', 'The spoiler the car left the factory with.'),
  P('spoiler', 'none', 'Shaved', 'common', 'No spoiler — a clean tail.'),
  P('spoiler', 'lip', 'Lip spoiler', 'common', 'A small black lip on the boot edge.'),
  P('spoiler', 'ducktail', 'Ducktail', 'common', 'A body-colour flip-up on the tail.'),
  P('spoiler', 'roof', 'Roof spoiler', 'rare', 'Carries the roof line back over the rear glass.'),
  P('spoiler', 'gt', 'GT wing', 'rare', 'A tall black wing on two uprights.'),

  P('exhaust', 'stock', 'Factory', 'common', 'The car\'s own tail pipes.'),
  P('exhaust', 'dual', 'Twin right', 'common', 'Two pipes side by side on the right.'),
  P('exhaust', 'split', 'Split twin', 'common', 'One pipe each side.'),
  P('exhaust', 'single', 'Big bore', 'rare', 'One big pipe.'),
  P('exhaust', 'twinCentre', 'Centre twin', 'rare', 'Two pipes in the middle, through the diffuser.'),
  P('exhaust', 'quad', 'Quad', 'epic', 'Two pipes each side.'),
  P('exhaust', 'side', 'Side pipes', 'rare', 'Pipes exit under the doors, just ahead of the rear wheels.'),

  P('hood', 'stock', 'Factory', 'common', 'The car\'s own hood.'),
  P('hood', 'vents', 'Vented', 'common', 'Two rows of slim heat vents, inside the fenders.'),
  P('hood', 'bulge', 'Power bulge', 'rare', 'A raised centre panel.'),
  P('hood', 'scoop', 'Ram scoop', 'rare', 'A scoop with a black mouth.'),
  P('hood', 'carbon', 'Carbon', 'epic', 'A woven carbon-fibre hood panel.'),

  P('wheels', 'stock', 'Factory', 'common', 'The car\'s own wheels.'),
  P('wheels', 'steel', 'Steelies', 'common', 'Plain steel wheels.'),
  P('wheels', 'fivespoke', 'Five-spoke', 'common', 'Bright five-spoke alloys.'),
  P('wheels', 'dish', 'Dish', 'common', 'Flat silver dish with round holes.'),
  P('wheels', 'multi', 'Ten-spoke', 'rare', 'Thin silver spokes.'),
  P('wheels', 'mesh', 'Mesh', 'rare', 'Cross-laced mesh with a bright lip.'),
  P('wheels', 'twin5', 'Gunmetal twin-5', 'rare', 'Dark twin five-spoke.'),
  P('wheels', 'sixblack', 'Black six', 'rare', 'Black six-spoke with red calipers.'),
  P('wheels', 'turbofan', 'Turbofan', 'epic', 'White race turbofans.'),
  P('wheels', 'gold5', 'Gold rally', 'epic', 'Gold five-spoke rally wheels.'),
  P('wheels', 'deepdish', 'Deep dish', 'rare', 'Chrome lip, deep dish, small centre.'),
  P('wheels', 'blade', 'Blade', 'rare', 'Five curved, directional blades.'),
  P('wheels', 'rally8', 'Rally disc', 'common', 'White disc with eight holes.'),
  P('wheels', 'center7', 'Bronze seven', 'rare', 'Bronze seven-spoke racing wheel.'),
  P('wheels', 'wire', 'Wire spoke', 'epic', 'Chrome wire wheels.'),

  P('finish', 'gloss', 'Gloss', 'common', 'Factory clear-coat shine.'),
  P('finish', 'matte', 'Matte', 'rare', 'Flat, no shine.'),
  P('finish', 'metallic', 'Metallic', 'rare', 'Metal flake that catches the light.'),
  P('finish', 'pearl', 'Pearl', 'epic', 'A colour-shifting pearl sheen.'),

  // v2 (owner Q117) — decals sit on the paint; stripe colours pick white or black against your paint
  P('decal', 'stock', 'None', 'common', 'Clean paint, no decal.'),
  P('decal', 'side', 'Side stripe', 'common', 'A two-row stripe along both sides.'),
  P('decal', 'checker', 'Checker band', 'common', 'A chequered band along the sills.'),
  P('decal', 'number', 'Race number', 'common', 'A white roundel with a big 7 on each door.'),
  { ...P('decal', 'stripes', 'Racing stripes', 'rare', 'Twin stripes over the hood, roof and tail.'), view: 'front' },
  P('decal', 'flames', 'Flames', 'epic', 'Hot-rod flames licking back from the nose.'),
  ...BOSS_DECALS.flatMap(({ league, boss }) => ROMAN.map((r, i) => ({ ...P('decal', `boss_${league}_${i + 1}`, `${boss} ${r}`, 'epic' as Rarity, `${boss}'s emblem on the doors and hood — won on the League ${league} Strip.`), won: true }))),

  // steady glow under the car — never blinks or pulses (owner A22–A23, A33)
  P('underglow', 'stock', 'None', 'common', 'No underglow.'),
  P('underglow', 'ice', 'Ice blue', 'common', 'A cool blue glow under the car.'),
  P('underglow', 'green', 'Neon green', 'common', 'A bright green glow.'),
  P('underglow', 'violet', 'Violet', 'rare', 'A deep violet glow.'),
  P('underglow', 'red', 'Red', 'rare', 'A hot red glow.'),
  P('underglow', 'pink', 'Hot pink', 'rare', 'A loud pink glow.'),
  P('underglow', 'white', 'White', 'rare', 'A clean white glow.'),
  P('underglow', 'split', 'Two-tone', 'epic', 'Blue at the front, pink at the back.'),

  // roof (owner 2026-10-19)
  P('roof', 'stock', 'None', 'common', 'A clean roof.'),
  P('roof', 'scoop', 'Roof scoop', 'rare', 'A rally-style air scoop at the front of the roof.'),
  P('roof', 'twin', 'Twin roof scoops', 'rare', 'Two small scoops side by side.'),
  P('roof', 'rack', 'Roof rack', 'common', 'Two rails and two cross bars.'),
  // lights + mirrors (owner 2026-10-19) — not every style fits every car (the Body Shop only shows the ones that do)
  P('headlights', 'stock', 'Factory', 'common', 'The car\'s own headlights.'),
  P('headlights', 'rect', 'Square', 'common', 'Square lamps with amber corners.'),
  P('headlights', 'slim', 'Slim LED', 'common', 'A thin LED strip over a dark housing.'),
  P('headlights', 'round', 'Round', 'common', 'One big round lamp each side.'),
  P('headlights', 'quad', 'Quad round', 'rare', 'Two round lamps each side.'),
  P('headlights', 'split', 'Split LED', 'rare', 'LED brow over a square projector.'),
  P('headlights', 'notch', 'Angular', 'rare', 'Angular lamps with an LED brow.'),
  P('headlights', 'bar', 'Light bar', 'rare', 'One light bar across the whole nose.'),
  P('headlights', 'blade', 'Blade', 'epic', 'Thin blade lamps.'),
  P('headlights', 'popup', 'Pop-ups', 'epic', 'Flip-up lamps — only on low-nosed cars.'),
  P('taillights', 'stock', 'Factory', 'common', 'The car\'s own taillights.'),
  P('taillights', 'rect', 'Square', 'common', 'Square red lamps with reversing lights.'),
  P('taillights', 'smoked', 'Smoked', 'rare', 'Dark tinted lamps.'),
  P('taillights', 'bar', 'Full-width bar', 'rare', 'One red bar across the tail.'),
  P('taillights', 'quad', 'Quad round', 'rare', 'Two round lamps each side.'),
  P('taillights', 'blade', 'Blade', 'epic', 'A thin blade across the tail.'),
  P('taillights', 'tall', 'Tall', 'common', 'Tall upright lamps.'),
  P('mirrors', 'stock', 'Factory', 'common', 'The car\'s own mirrors.'),
  P('mirrors', 'body', 'Body colour', 'common', 'Painted to match.'),
  P('mirrors', 'black', 'Black', 'common', 'Gloss black caps.'),
  P('mirrors', 'chrome', 'Chrome', 'rare', 'Bright chrome caps.'),
  P('mirrors', 'carbon', 'Carbon', 'epic', 'Woven carbon caps.'),
  P('mirrors', 'none', 'Shaved', 'rare', 'No mirrors at all.'),
  // license plates (owner 2026-10-19): pre-made designs; your own text costs Crowns per change (economy.ts PLATE_TEXT)
  P('plate', 'stock', 'Factory', 'common', 'A plain white plate.'),
  P('plate', 'city', 'City plate', 'common', 'White with a blue city band.'),
  P('plate', 'classic', 'Classic', 'common', 'Black with white letters.'),
  P('plate', 'euro', 'Euro', 'common', 'White with a blue side strip.'),
  P('plate', 'racing', 'Race plate', 'rare', 'Yellow with black letters.'),
  P('plate', 'gold', 'Gold', 'epic', 'Black with gold letters and a gold edge.'),
  // body kit
  P('bumper', 'stock', 'Factory', 'common', 'The car\'s own front bumper.'),
  P('bumper', 'lip', 'Front lip', 'common', 'A black splitter lip under the bumper.'),
  P('bumper', 'aero', 'Aero bumper', 'rare', 'Splitter lip plus a canard on each corner.'),
  P('bumper', 'track', 'Track splitter', 'epic', 'A deep carbon splitter with end plates and twin canards.'),
  P('skirts', 'stock', 'Factory', 'common', 'The car\'s own sills.'),
  P('skirts', 'black', 'Black skirts', 'common', 'Black side skirts between the wheels.'),
  P('skirts', 'painted', 'Body-colour skirts', 'rare', 'Side skirts painted to match.'),
  P('skirts', 'carbon', 'Carbon skirts', 'epic', 'Woven carbon side skirts.'),
  P('diffuser', 'stock', 'Factory', 'common', 'The car\'s own rear bumper.'),
  P('diffuser', 'fins', 'Street diffuser', 'common', 'A finned panel under the rear bumper.'),
  P('diffuser', 'race', 'Race diffuser', 'rare', 'A deeper diffuser with fins sticking out behind.'),
];
export const PART_BY_ID: Record<string, VisualPart> = Object.fromEntries(VISUAL_PARTS.map(p => [p.id, p]));
export const partsFor = (slot: PartSlot) => VISUAL_PARTS.filter(p => p.slot === slot);
const SLOTS = PART_SLOTS.map(s => s.id);
/** What each slot is set to when nothing is fitted. */
export const STOCK_PART = Object.fromEntries(SLOTS.map(s => [s, s === 'finish' ? 'finish.gloss' : `${s}.stock`])) as Record<PartSlot, string>;
/** The factory (free) choice of a slot. */
export const isFactory = (p: VisualPart) => p.value === 'stock' || p.value === 'gloss';

/** Does the player own a part? Factory parts always; boss decals once won on the Strip (save.decals ids decal_D_1 …). */
export function ownsPart(id: string, partsOwned: string[], decals: string[] = []): boolean {
  const p = PART_BY_ID[id]; if (!p) return false;
  if (isFactory(p) || partsOwned.includes(id)) return true;
  return !!p.won && decals.includes('decal_' + p.value.slice(5));
}

/** A car's fitted part ids → the slot values a CarLook carries. */
export function lookParts(fitted: Record<string, string> = {}): Partial<Record<PartSlot, string>> {
  const out: Partial<Record<PartSlot, string>> = {};
  for (const [slot, id] of Object.entries(fitted)) { const p = PART_BY_ID[id]; if (p && !isFactory(p)) out[slot as PartSlot] = p.value; }
  return out;
}
/** Thumbnail camera for each slot's cards. */
export type ThumbView = 'front' | 'rear' | 'tail' | 'hood' | 'wheel' | 'side' | 'nose' | 'low' | 'sill' | 'top';
export const SLOT_VIEW: Record<PartSlot, ThumbView> = {
  spoiler: 'rear', exhaust: 'tail', hood: 'hood', wheels: 'wheel', finish: 'front', decal: 'side', underglow: 'low', bumper: 'nose', skirts: 'sill', diffuser: 'tail',
  headlights: 'nose', taillights: 'tail', mirrors: 'front', roof: 'rear', plate: 'tail',
};

/** Rivals wear random visual parts (owner Q118) — looks only. Boss decals stay with the player. */
export function randomParts(rng: () => number, chance = 0.45, fits: (slot: PartSlot, value: string) => boolean = () => true): Partial<Record<PartSlot, string>> {
  const out: Partial<Record<PartSlot, string>> = {};
  for (const slot of SLOTS) {
    const pool = partsFor(slot).filter(p => !isFactory(p) && !p.won && fits(slot, p.value));
    const roll = rng(), pick = pool[Math.floor(rng() * pool.length) % pool.length];
    if (pool.length && roll < (slot === 'underglow' ? chance * 0.5 : chance)) out[slot] = pick.value;
  }
  return out;
}
