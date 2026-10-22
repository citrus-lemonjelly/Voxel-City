// Typing league badge (V0.19.0, owner: "an upgrading icon on league upgrades"): a 16×16 pixel keycap, lit top-left and dark
// bottom-right like every Bevel+ block. Each league changes its colour and adds to it — Bronze 1 pip, Silver 2, Gold 3,
// Platinum a star, Diamond a gem, Neon a star with wings, Legend wings and a crown. Drawn as SVG squares (crisp at any size).
import { TYPING_LEAGUES } from '../data/economy';

// face, light edge, dark edge, symbol
const PAL: Record<string, [string, string, string, string]> = {
  wood: ['#9a6a3a', '#bf8a55', '#5e3c1e', '#4a2e16'], bronze: ['#c27a3a', '#e6a066', '#7d4a1f', '#58300f'],
  silver: ['#b8bfcc', '#e4e8ef', '#767d8c', '#454b59'], gold: ['#f2c230', '#ffe27a', '#b8901c', '#6e5000'],
  platinum: ['#8fd4d0', '#cdf3ef', '#4c9592', '#24524f'], diamond: ['#6fa8ff', '#b6d4ff', '#3a64b8', '#ffffff'],
  neon: ['#c94fdc', '#ee9cff', '#76288a', '#fff2a0'], legend: ['#e8553a', '#ff9e80', '#9c2a14', '#ffe27a'],
};
const EDGE = '#0b0c10', CROWN = '#f2c230', CROWN_D = '#b8901c';

/** SVG for typing league `i` (index into TYPING_LEAGUES), `px` screen pixels per voxel. */
export function typingBadge(i: number, px = 3, dim = false): string {
  const id = TYPING_LEAGUES[Math.max(0, Math.min(TYPING_LEAGUES.length - 1, i))].id, [face, light, dark, sym] = PAL[id];
  const r: string[] = [], sq = (x: number, y: number, w: number, h: number, c: string) => r.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  // keycap: outline, dark sides, lit top face
  sq(2, 3, 12, 12, EDGE); sq(3, 4, 10, 10, dark); sq(3, 4, 9, 8, face); sq(3, 4, 9, 1, light); sq(3, 4, 1, 8, light);
  const pips = (n: number) => { for (const x of [[6], [4, 8], [4, 7, 10]][n - 1]) sq(x, 7, 2, 2, sym); };
  const star = () => { sq(6, 5, 2, 6, sym); sq(4, 7, 6, 2, sym); };
  const gem = () => { sq(6, 5, 2, 1, sym); sq(5, 6, 4, 1, sym); sq(4, 7, 6, 2, sym); sq(5, 9, 4, 1, sym); sq(6, 10, 2, 1, sym); };
  const wings = () => { sq(1, 6, 1, 6, sym); sq(0, 7, 1, 4, sym); sq(14, 6, 1, 6, sym); sq(15, 7, 1, 4, sym); };
  const crown = () => { sq(4, 2, 8, 1, CROWN_D); sq(4, 0, 1, 2, CROWN); sq(7, 0, 2, 2, CROWN); sq(11, 0, 1, 2, CROWN); sq(5, 1, 6, 1, CROWN); };
  switch (id) {
    case 'bronze': pips(1); break;
    case 'silver': pips(2); break;
    case 'gold': pips(3); break;
    case 'platinum': star(); break;
    case 'diamond': gem(); break;
    case 'neon': star(); wings(); break;
    case 'legend': star(); wings(); crown(); break;
  }
  return `<svg class="tbadge${dim ? ' dim' : ''}" width="${16 * px}" height="${16 * px}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${r.join('')}</svg>`;
}
