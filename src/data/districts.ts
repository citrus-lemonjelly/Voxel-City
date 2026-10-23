// Districts (V0.20.0 "City Update", owner Q199–Q227): the city map's six districts, one per car league in order, and the
// Harbor as the end game after League S (Q202; its events come later). A district sets the rival level and the pay of the
// races held there (Q218): you can race in any open district at or below your car's league — a stronger car makes it easier.
// Districts open as you own a car of that league. Typing is not on the map (owner: it has its own TYPE button).
import { CARS, League, LEAGUES } from './cars';
import type { SaveV1 } from '../save/save';

export type DistrictId = 'downtown' | 'forest' | 'neon' | 'oil' | 'skyway' | 'harbor';
export interface District { id: DistrictId; name: string; league: League | null; blurb: string; races: { easy: string; medium: string; hard: string } }
/** In unlock order. `league` null = the end game (not open yet). */
export const DISTRICT_LIST: District[] = [
  { id: 'downtown', name: 'Downtown', league: 'D', blurb: 'Offices, brick walk-ups and the street where it all starts', races: { easy: 'Corner Store Run', medium: 'Downtown Dash', hard: 'Gridlock' } },
  { id: 'forest', name: 'Daluda Forest', league: 'C', blurb: 'A winding road through the pines under the mountain', races: { easy: 'Timber Trail', medium: 'Pine Pass Sprint', hard: 'Daluda Dash' } },
  { id: 'neon', name: 'Neon Highrise', league: 'B', blurb: 'Glowing towers that light up every street around them', races: { easy: 'Glow Strip', medium: 'Neon Nights', hard: 'Highrise Heat' } },
  { id: 'oil', name: 'Oil Fields', league: 'A', blurb: 'Pumpjacks and tanks out past the farms', races: { easy: 'Derrick Drag', medium: 'Pumpjack Pull', hard: 'Crude Rush' } },
  { id: 'skyway', name: 'Rooftop Skyway', league: 'S', blurb: 'A raised road weaving between the tallest towers', races: { easy: 'Roof Run', medium: 'Skyline Sprint', hard: 'Skyway Showdown' } },
  { id: 'harbor', name: 'The Harbor', league: null, blurb: 'The end game, after League S — coming soon', races: { easy: 'Dockside', medium: 'Crane Row', hard: 'Harbor Kings' } },
];
export const DISTRICT_BY_ID = Object.fromEntries(DISTRICT_LIST.map(d => [d.id, d])) as Record<DistrictId, District>;
const rank = (l: League) => LEAGUES.indexOf(l);

/** The highest league among the cars you own — it opens the districts up to it. */
export function progressLeague(save: SaveV1): League {
  let best: League = 'D';
  for (const id of Object.keys(save.cars)) { const c = CARS[id]; if (c && rank(c.league) > rank(best)) best = c.league; }
  return best;
}
/** How many districts are open, as the index of the last open one (0 = Downtown only). */
export const openUpTo = (save: SaveV1) => rank(progressLeague(save));
export const isOpen = (save: SaveV1, d: District) => d.league !== null && rank(d.league) <= rank(progressLeague(save));
/** Can the car in use race here? (its league must be at or above the district's) */
export const canRace = (save: SaveV1, d: District) => isOpen(save, d) && rank(CARS[save.carId].league) >= rank(d.league!);
/** The district you race in: the one you picked if your car can race there, else the highest one your car can. */
export function raceDistrict(save: SaveV1): District {
  const picked = save.district ? DISTRICT_BY_ID[save.district as DistrictId] : null;
  if (picked && canRace(save, picked)) return picked;
  return [...DISTRICT_LIST].reverse().find(d => canRace(save, d)) ?? DISTRICT_LIST[0];
}
/** The league your races are held at (rivals + pay): the race district's. */
export const raceLeague = (save: SaveV1): League => raceDistrict(save).league!;
