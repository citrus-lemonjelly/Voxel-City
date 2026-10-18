// Cosmetic items (visual only — decision A24).
// Paddle shifters are a SHAPE + a SKIN (owner Q39): shapes and skins are owned separately; Stock carbon comes with
// both shapes free, and any skin you own works on every shape you own. Prices/unlocks here are for the shop later.
export type PaddleShape = 'arc' | 'tab';
export interface PaddleShapeDef { id: PaddleShape; name: string; price: number | null }
export const PADDLE_SHAPES: Record<PaddleShape, PaddleShapeDef> = {
  arc: { id: 'arc', name: 'Arc', price: null },   // curved blade that follows the gauge rim
  tab: { id: 'tab', name: 'Tab', price: null },   // squared paddle peeking out from behind the dial
};

/** How a skin is obtained: bought with voxels, or earned. */
export type Unlock = { kind: 'buy'; price: number } | { kind: 'league'; league: 'D' | 'C' | 'B' | 'A' | 'S' } | { kind: 'perfectShifts'; count: number } | { kind: 'wins'; count: number } | { kind: 'standard' };
export interface PaddleSkin {
  id: string; name: string;
  face: [string, string];   // two-tone carbon/checker face
  light: string; dark: string; plus: string; plusShade: string; stripe?: string;
  /** Use the car's paint for the face (stripe skin). */
  paintMatch?: boolean;
  /** The "+" turns this colour (steady) while the needle is in the shift zone — Perfect Shift perk (owner Q41).
   *  Still visual-only: the gear number gives every player the same cue. */
  zonePlus?: string;
  unlock: Unlock;
}
export const PADDLES: Record<string, PaddleSkin> = {
  stock: { id: 'stock', name: 'Stock carbon', face: ['#30333d', '#2a2d36'], light: '#4a4f5c', dark: '#16181e', plus: '#eeeae0', plusShade: '#9aa0ad', unlock: { kind: 'standard' } },
  vox: { id: 'vox', name: 'VOX OIL', face: ['#f2c230', '#f2c230'], light: '#ffe27a', dark: '#b8901c', plus: '#1a1a1e', plusShade: '#5a4a1a', stripe: '#1a1a1e', unlock: { kind: 'buy', price: 1500 } },
  chrome: { id: 'chrome', name: 'Chrome', face: ['#c4ccd2', '#b4bcc4'], light: '#f4f8fb', dark: '#6f7780', plus: '#2b2e38', plusShade: '#8a929b', unlock: { kind: 'buy', price: 2500 } },
  stripes: { id: 'stripes', name: 'Racing stripes', face: ['#d23a2a', '#d23a2a'], light: '#ffffff55', dark: '#00000055', plus: '#eeeae0', plusShade: '#00000066', stripe: '#eeeae0', paintMatch: true, unlock: { kind: 'buy', price: 2000 } },
  league_d: { id: 'league_d', name: 'Bronze', face: ['#9a6434', '#8f5c30'], light: '#d29a62', dark: '#4e3018', plus: '#f4e2c8', plusShade: '#5e3c1e', unlock: { kind: 'league', league: 'D' } },
  league_c: { id: 'league_c', name: 'Silver', face: ['#a9afb8', '#9fa5ae'], light: '#e4e8ee', dark: '#5c626b', plus: '#22252c', plusShade: '#7c838d', unlock: { kind: 'league', league: 'C' } },
  league_b: { id: 'league_b', name: 'Gold', face: ['#d7a92c', '#cc9f26'], light: '#ffe08a', dark: '#7a5c12', plus: '#2a2208', plusShade: '#8a6c1c', unlock: { kind: 'league', league: 'B' } },
  league_a: { id: 'league_a', name: 'Platinum', face: ['#cfd8de', '#c4ced6'], light: '#ffffff', dark: '#76838e', plus: '#3a4a5a', plusShade: '#9fb0be', unlock: { kind: 'league', league: 'A' } },
  league_s: { id: 'league_s', name: 'Obsidian', face: ['#1a1520', '#16121b'], light: '#5a3f7a', dark: '#07050a', plus: '#c9a7ff', plusShade: '#3a2a52', unlock: { kind: 'league', league: 'S' } },
  // owner Q48: no stripes or other lines — only the "+" lights up (steady green) in the shift zone
  perfect: { id: 'perfect', name: 'Perfect Shift', face: ['#22262e', '#1d2028'], light: '#3c4350', dark: '#101216', plus: '#eeeae0', plusShade: '#9aa0ad', zonePlus: '#4ade80', unlock: { kind: 'perfectShifts', count: 100 } },
};
export const STANDARD_PADDLE = 'stock';

// Gas pedals (launch control, owner Q55): Drilled alloy is standard; the others are bought or earned. Prices/unlocks are
// placeholders for the shop pass.
export type PedalStyle = 'alloy' | 'rubber' | 'skin';
export interface PedalDef { id: PedalStyle; name: string; unlock: Unlock }
export const PEDALS: Record<PedalStyle, PedalDef> = {
  alloy: { id: 'alloy', name: 'Drilled alloy', unlock: { kind: 'standard' } },
  rubber: { id: 'rubber', name: 'Ribbed rubber', unlock: { kind: 'buy', price: 1200 } },
  skin: { id: 'skin', name: 'Skin-matched', unlock: { kind: 'wins', count: 25 } },     // takes the equipped paddle skin
};
export const STANDARD_PEDAL: PedalStyle = 'alloy';
export const STANDARD_SHAPES: PaddleShape[] = ['arc', 'tab'];
