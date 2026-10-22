// Shared pieces of the garage screen (split out 2026-10-20 so each panel has its own file in src/ui/panels/):
// the UI state that survives re-renders, the handlers main.ts passes in, the block icons, and small helpers
// (car looks, prices) used by several panels.
import { SaveV1, RaceDist } from '../../save/save';
import { Tier, AnyKind, Gearing } from '../../data/parts';
import { CARS, carBody, carPaint } from '../../data/cars';
import { Difficulty } from '../../data/economy';
import { lookParts, PartSlot } from '../../data/visualParts';
import { CarLook, STOCK_LOOK } from '../../render/carBuilder';
import { GarageView } from '../../render/scene';
import type { DynoRow } from '../../game/dyno';

export const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
export const fmtTime = (s: number) => s.toFixed(3) + ' s';

export interface GarageHandlers {
  onBuyOrEquip(kind: AnyKind, tier: Tier, carId: string): void;
  /** Upgrades: Short / Balanced / Long gearing for a car (free) */
  onGearing(g: Gearing, carId: string): void;
  /** Gear ratio tuning (V0.17.0): a car's own T5 ratios, or null for stock */
  onRatios(ratios: number[] | null, carId: string): void;
  /** Gear setup (V0.17.1): preset gearing or custom ratios */
  onGearMode(mode: 'preset' | 'custom', carId: string): void;
  /** Garage (owner 2026-10-19): ★ a car */
  onFav(id: string): void;
  onRace(): void;
  /** The Strip: race the next rung; and what that rung is (null = this league's Strip is done). */
  onStrip(): void;
  stripNext(): import('../../game/strip').Rung | null;
  onSetting(key: string, value: string): void;
  /** show a car on the turntable (Catalog preview) or put the player's car back (null) */
  onPreview(look: CarLook | null): void;
  onView(v: GarageView): void;
  /** Body Shop: turn the car on the turntable to show a part (null = free spin again) */
  onFace(dir: [number, number] | null): void;
  /** Catalog (Q79): buy a car with the paint/options picked; use an owned car; save paint/options on an owned car. */
  onBuyCar(id: string, paint: string, opts: Record<string, string>): void;
  onUseCar(id: string): void;
  onCarStyle(id: string, paint: string, opts: Record<string, string>): void;
  /** Street Race length (600 / 700 / 800 m). */
  onDistance(d: RaceDist): void;
  /** Street Race difficulty (Easy / Medium / Hard). */
  onDifficulty(d: Difficulty): void;
  /** 3D still of a car (Catalog cards, Q78; Parts cards aim at the part, Q113). */
  thumb(look: CarLook, view?: import('../../data/visualParts').ThumbView): string;
  /** Visual parts: buy (then fit) / fit an owned part on the car in use. */
  onBuyPart(id: string, carId: string): void;
  /** Body Shop paint (owner 2026-10-19): repaint for VX, or buy / use a premium paint */
  onRepaint(carId: string, paint: string, premium?: string): void;
  /** your own plate text: Crowns per change */
  onPlateText(carId: string, text: string): void;
  onFitPart(id: string, carId: string): void;
  /** the car in use as it looks now (Parts preview starts from it) */
  playerLook(): CarLook;
  /** Typing Race (owner 2026-10-19). */
  onTyping(): void;
  /** Drift (owner, V0.18.0): start a run / pick the course */
  onDrift(): void;
  onDriftCourse(id: string): void;
  /** Settings ▸ Controls: bind a key (code) to an action, or reset a mode (code = null). */
  onKeyBind(mode: 'drag' | 'typing' | 'drift', action: string, code: string | null): void;
  /** Patch notes opened: remember the version so the NEW tag goes away. */
  onNotesSeen(): void;
  /** Daily (owner Q150–Q151): claim a task (i), the all-three bonus (-1), or today's calendar day. */
  onClaimDaily(i: number): void;
  onClaimCal(): void;
  /** Garage (owner Q152–Q153): sell a car; buy one more car slot with Crowns. */
  onSellCar(id: string): void;
  onBuySlot(): void;
}
/** A panel's event wiring: called on every render with the new screen element; redraw() renders the garage again. */
export type Wire = (el: HTMLElement, save: SaveV1, on: GarageHandlers, redraw: () => void) => void;

export type Panel = 'profile' | 'garage' | 'upgrades' | 'parts' | 'catalog' | 'daily' | 'calendar' | 'settings' | 'strip' | 'notes' | null;
/** UI state that survives re-renders (buying a part re-draws the screen). */
// work = the car Parts / Upgrades act on (the one in use, or the one picked in the Garage); back = panel to return to
/** Last test run in Upgrades (C11): which car + set-up it was for, its rows, and the run before it (for the before → after). */
export const dynoState: { car: string; key: string; rows: DynoRow[]; prev?: { key: string; rows: DynoRow[] } } = { car: '', key: '', rows: [] };
export const ui = { kmode: 'drag' as 'drag' | 'typing' | 'drift', capture: '' as string, kmsg: '', panel: null as Panel, back: null as Panel, work: '', gsel: '', dial: false, favOnly: false, gtab: 'cars' as 'cars' | 'boss', sellArm: '', raceMenu: false, part: { slot: 'paint' as PartSlot | 'paint', sel: '' }, cat: { id: 'panda_civix', paint: '', opts: {} as Record<string, string> } };
/** Scroll positions kept between re-renders (strip: -1 = not set yet; stripFocus = centre on your level next time). */
export const scroll = { cat: 0, part: 0, gar: 0, strip: -1, stripFocus: false };
export function resetGarageUI() { ui.panel = null; ui.back = null; ui.dial = false; ui.raceMenu = false; }
export const garageInCatalog = () => ui.panel === 'catalog' || ui.panel === 'parts' || ui.panel === 'garage' || !!ui.back;
/** Open the Strip screen on the next garage render (results → "The Strip"). */
export function garageOpenStrip() { ui.panel = 'strip'; ui.raceMenu = false; scroll.stripFocus = true; }

// ---- block icons (12 × 12; 1 = light, 2 = accent) ----
const ICONS: Record<string, string[]> = {
  spin: ['000111110000', '001100011000', '011000001100', '110000000110', '110000000110', '110000002222', '110000000220', '011000000000', '001100011000', '000111110000', '000000000000', '000000000000'],   // turntable arrow
  profile: ['000111111000', '001111111100', '011111111110', '011111111110', '112222222211', '112222222211', '111111111111', '111111111111', '011111111110', '001111111100', '001100001100', '011100001110'],   // racing helmet
  upgrades: ['000000001100', '000000011110', '000000110110', '000001100110', '000011111100', '000111111000', '001111100000', '011111000000', '111110000000', '111100000000', '011000000000', '000000000000'],  // wrench
  catalog: ['000000000000', '000000000000', '000011111000', '000111111100', '001122122110', '011111111111', '111111111111', '111111111111', '011101111011', '001000000100', '000000000000', '000000000000'],   // car
  settings: ['000011110000', '001011110100', '011111111110', '001111111100', '111110011111', '111100001111', '111100001111', '111110011111', '001111111100', '011111111110', '001011110100', '000011110000'], // gear
};
ICONS.camera = ['000000000000', '001110000000', '111111111111', '100000000001', '100022220001', '100200002001', '100200002001', '100022220001', '100000000001', '111111111111', '000000000000', '000000000000'];   // camera with a yellow lens
ICONS.doorOpen = ['111111111111', '122222222221', '111111111111', '100000000001', '100000000001', '100000000001', '100000000001', '100000000001', '100000000001', '100000000001', '100000000001', '100000000001'];   // roll-up door, rolled up
ICONS.doorShut = ['111111111111', '122222222221', '111111111111', '100000000001', '111111111111', '100000000001', '111111111111', '100000000001', '111111111111', '100000000001', '111111111111', '100000000001'];   // roll-up door, down
ICONS.parts = ['000011110000', '001122221100', '011200002110', '012000000210', '120001100021', '120011110021', '120011110021', '120001100021', '012000000210', '011200002110', '001122221100', '000011110000'];   // wheel rim
// garage: roof and a roller door
ICONS.garage = ['000001100000', '000111111000', '011111111110', '111111111111', '110000000011', '110222222011', '110000000011', '110222222011', '110000000011', '110222222011', '110000000011', '110000000011'];
// checklist (Daily tasks)
ICONS.tasks = ['011111111110', '010000000010', '012010000010', '010201111010', '010000000010', '012010000010', '010201111010', '010000000010', '012010000010', '010201111010', '010000000010', '011111111110'];
// calendar page with rings
ICONS.daily = ['001100001100', '111111111111', '111111111111', '100000000001', '102202202201', '100000000001', '102202202201', '100000000001', '102202200001', '100000000001', '111111111111', '000000000000'];
ICONS.crown = ['000000000000', '010001000100', '011001100110', '011101110110', '011111111110', '011111111110', '012112112110', '011111111110', '011111111110', '000000000000', '000000000000', '000000000000'];
ICONS.notes = ['011111112000', '011111112200', '011111112220', '011111111110', '011111111110', '011000000110', '011111111110', '011000001110', '011111111110', '011000000110', '011111111110', '011111111110'];   // paper with a folded corner
export const icon = (k: string, px = 3) => `<svg width="${12 * px}" height="${12 * px}" viewBox="0 0 12 12" shape-rendering="crispEdges">${ICONS[k].map((row, y) => [...row].map((b, x) => b === '0' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${b === '2' ? 'var(--accent)' : 'currentColor'}"/>`).join('')).join('')}</svg>`;

export const PAINTS: [string, string][] = [['#d23a2a', 'Race red'], ['#f2a43a', 'Sunset orange'], ['#f2c230', 'VOX yellow'], ['#2f9a5a', 'Racing green'], ['#1f8a8a', 'Teal'], ['#3b6fa8', 'Aegean blue'], ['#1f4fa8', 'Rally blue'], ['#6a3ad2', 'Violet'], ['#b83a7a', 'Magenta'], ['#eeeae0', 'Chalk white'], ['#8e9bb3', 'Steel grey'], ['#5a5e66', 'Gunmetal'], ['#1a1a1e', 'Midnight']];
export const TYPE_SUB: Record<string, string> = { panda_civix: 'Hot hatch', city: 'City car', supermini: 'Supermini', classic: 'Classic hatch', premium: 'Premium hatch', sporthatch: 'Sport fastback', perfhatch: 'Performance hatch', sedan: 'Sport sedan', compact: 'Sport coupe', muscle: 'Muscle coupe', pony: 'Pony car', rally: 'Rally sedan', tuner: 'Tuner coupe', hyper: 'Hypercar' };
/** Body profile a car is drawn with ('civix' = the original builder). */
export const profileOf = (id: string) => carBody(id).profile ?? 'civix';
/** The car as the Catalog shows it: an owned car in its saved paint/options, otherwise factory. */
export const lookOf = (save: SaveV1, id: string, paint?: string, opts?: Record<string, string>): CarLook => {
  const c = save.cars[id];
  return { ...STOCK_LOOK, body: profileOf(id), paint: paint || c?.paint || carPaint(id), opts: { ...(opts ?? c?.opts ?? {}) }, parts: lookParts(c?.parts), plateText: c?.plateText };
};
export const catLook = (save: SaveV1) => lookOf(save, ui.cat.id, ui.cat.paint, ui.cat.opts);
/** Select a car in the Catalog (owned cars start from their saved paint/options). */
export const pickCar = (save: SaveV1, id: string) => { const c = save.cars[id]; ui.cat = { id, paint: c?.paint || '', opts: { ...(c?.opts || {}) } }; };
const price = (n: number) => n.toLocaleString() + ' VX';
export const crownIcon = () => `<i class="crown-ic">${icon('crown', 1.4)}</i>`;
/** A car's price in its own currency (Voxels, or Crowns for Crowns-only cars). */
export const carPrice = (id: string) => CARS[id].currency === 'crowns' ? `${crownIcon()}${CARS[id].price.toLocaleString()} Crowns` : price(CARS[id].price);
export const wallet = (save: SaveV1, id: string) => CARS[id].currency === 'crowns' ? save.crowns : save.voxels;
export const CHARACTER: Record<string, string> = { dash: 'Best at short dashes', long: 'Best over the full 800 m', balanced: 'All-rounder' };
