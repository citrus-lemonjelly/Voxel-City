// Stages. Step 1 ships Downtown Grid only (W2a). Modifiers stay neutral (W2b — optional, may be removed).
export interface StageDef {
  id: string;
  name: string;
  league: string;
  distanceM: number;          // race length
  modifiers: { gripMult: number; dragMult: number };
  sky: string;
  buildingColours: string[];
  timeOfDay: 'day' | 'dusk' | 'night';   // default; the player's Settings choice overrides it during previews
}

export const STAGES: Record<string, StageDef> = {
  downtown_grid: {
    id: 'downtown_grid',
    name: 'Downtown Grid',
    league: 'D',
    distanceM: 800,
    modifiers: { gripMult: 1, dragMult: 1 },
    sky: '#9fc7e8',
    buildingColours: ['#8e9bb3', '#a7a39a', '#7d8794', '#b8b2a6', '#6f7a8c', '#c7c0b2'],
    timeOfDay: 'day',
  },
};
export const START_STAGE = 'downtown_grid';
