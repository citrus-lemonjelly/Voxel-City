// Visual parts (owner 2026-10-19): bought once, fit every car (Q110), change the look only (A24). Prices live in
// data/economy.ts (COSMETIC_PRICES). Each part sets one slot; 'stock' = the car's own factory part (free, always owned).
// v1 slots (owner Q112): Spoiler, Exhaust, Hood, Wheels, Paint finish. The other tabs are listed as coming soon.
export type PartSlot = 'spoiler' | 'exhaust' | 'hood' | 'wheels' | 'finish';
export type Rarity = 'common' | 'rare' | 'epic';
export interface VisualPart { id: string; slot: PartSlot; name: string; rarity: Rarity; value: string; blurb: string }

export const PART_SLOTS: { id: PartSlot; label: string }[] = [
  { id: 'spoiler', label: 'Spoiler' }, { id: 'exhaust', label: 'Exhaust' }, { id: 'hood', label: 'Hood' },
  { id: 'wheels', label: 'Wheels' }, { id: 'finish', label: 'Paint finish' },
];
/** Tabs shown greyed out until their parts exist (PART_SLOTS.md planned slots). */
export const SOON_SLOTS = ['Front bumper', 'Grille', 'Headlights', 'Taillights', 'Rear diffuser', 'Side skirts', 'Mirrors', 'Decals', 'Underglow', 'Window tint'];

const P = (slot: PartSlot, value: string, name: string, rarity: Rarity, blurb: string): VisualPart => ({ id: `${slot}.${value}`, slot, value, name, rarity, blurb });
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

  P('hood', 'stock', 'Factory', 'common', 'The car\'s own hood.'),
  P('hood', 'vents', 'Vented', 'common', 'Two rows of heat vents.'),
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

  P('finish', 'gloss', 'Gloss', 'common', 'Factory clear-coat shine.'),
  P('finish', 'matte', 'Matte', 'rare', 'Flat, no shine.'),
  P('finish', 'metallic', 'Metallic', 'rare', 'Metal flake that catches the light.'),
  P('finish', 'pearl', 'Pearl', 'epic', 'A colour-shifting pearl sheen.'),
];
export const PART_BY_ID: Record<string, VisualPart> = Object.fromEntries(VISUAL_PARTS.map(p => [p.id, p]));
export const partsFor = (slot: PartSlot) => VISUAL_PARTS.filter(p => p.slot === slot);
/** What each slot is set to when nothing is fitted. */
export const STOCK_PART: Record<PartSlot, string> = { spoiler: 'spoiler.stock', exhaust: 'exhaust.stock', hood: 'hood.stock', wheels: 'wheels.stock', finish: 'finish.gloss' };

/** A car's fitted part ids → the slot values a CarLook carries. */
export function lookParts(fitted: Record<string, string> = {}): Partial<Record<PartSlot, string>> {
  const out: Partial<Record<PartSlot, string>> = {};
  for (const [slot, id] of Object.entries(fitted)) { const p = PART_BY_ID[id]; if (p && p.value !== 'stock' && p.value !== 'gloss') out[slot as PartSlot] = p.value; }
  return out;
}
/** Thumbnail camera for each slot's cards. */
export const SLOT_VIEW: Record<PartSlot, 'front' | 'rear' | 'tail' | 'hood' | 'wheel'> = { spoiler: 'rear', exhaust: 'tail', hood: 'hood', wheels: 'wheel', finish: 'front' };
