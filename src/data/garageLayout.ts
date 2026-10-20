// ============================================================================================================
// GARAGE ROOM LAYOUT — the 3D room behind the menus (owner 2026-10-20, Q155–Q162; built in src/render/garage.ts).
// Units are blocks (1 block ≈ 6.9 cm, the cars' block size). The car's turntable sits at x 0, z 0.
// The menu cameras all look in from the front-left, so only the BACK wall (z = back) and the RIGHT wall (x = right)
// are ever on screen: the room is built like a stage set — floor, those two walls, a loft, and the pieces below.
//
// Each piece is placed by its back-left corner, standing against a wall:
//   rot 0 = against the back wall, facing the camera (+z)    rot 1 = against the right wall, facing −x
//   rot 2 = facing −z (e.g. a chair pulled up to a desk)       rot 3 = facing +x
// y = height of the floor it stands on (0 = garage floor, ROOM.deck = loft floor, or a wall height for wall items).
// Moving or swapping a piece = edit one line here (later: decor bought with Crowns, decision E3).
// ============================================================================================================

export const GARAGE_ROOM = {
  back: -150, right: 230, left: -320, front: 260, height: 120,
  /** loft: along the back wall from `left` to loftX1; deck surface height */
  loftX1: 40, loftDepth: 66, deck: 36.6,
  /** roll-up door in the right wall (owner Q157: street outside, can be closed) */
  door: { z0: -120, z1: -40, h: 62 },
  /** steel stairs up to the loft, against the back wall: bottom step at stairsX, top at loftX1 */
  stairsX: 104, stairsW: 16,
  /** two-post lift with a stripped body shell (owner Q158 B), shell along z */
  lift: { x: 180, z: 2, y: 16 },
};

export interface GaragePiece { piece: string; x: number; z: number; y?: number; rot?: 0 | 1 | 2 | 3; v?: string }

const D = GARAGE_ROOM.deck, B = GARAGE_ROOM.back, R = GARAGE_ROOM.right;

export const GARAGE_LAYOUT: GaragePiece[] = [
  // ---- office nook (under the loft): the Garage Terminal desk (G7), whiteboard, coffee corner ----
  { piece: 'filing', x: -84, z: B },
  { piece: 'counter', x: -70, z: B },
  { piece: 'desk', x: -46, z: B },
  { piece: 'chair', x: -21, z: B + 30, rot: 2 },
  { piece: 'whiteboard', x: 2, z: B, y: 13 },
  { piece: 'clock', x: -31, z: B, y: 25 },
  { piece: 'bin', x: -8, z: B + 2 },
  // storage under the far end of the loft (mostly seen in the wider views)
  { piece: 'shelving', x: -150, z: B },
  { piece: 'shelving', x: -195, z: B },
  { piece: 'tyres', x: -110, z: B + 2, v: '3' },

  // ---- loft (upstairs): the lounge ----
  { piece: 'rug', x: -70, z: B + 16, y: D },
  { piece: 'couch', x: -62, z: B + 4, y: D },
  { piece: 'coffeeTable', x: -54, z: B + 24, y: D },
  { piece: 'floorLamp', x: -70, z: B + 5, y: D },
  { piece: 'fridge', x: -16, z: B, y: D },
  { piece: 'bookshelf', x: -4, z: B, y: D },
  { piece: 'plant', x: 30, z: B + 54, y: D },
  { piece: 'tvUnit', x: -118, z: B, y: D },
  { piece: 'bookshelf', x: -134, z: B, y: D },
  { piece: 'plant', x: -88, z: B + 2, y: D },
  { piece: 'poster', x: -56, z: B, y: D + 16, v: 'car' },
  { piece: 'poster', x: -34, z: B, y: D + 16, v: 'checker' },
  { piece: 'window', x: -114, z: B, y: D + 30 },
  { piece: 'poster', x: 14, z: B, y: D + 12, v: 'league' },
  { piece: 'jacket', x: 8, z: B + GARAGE_ROOM.loftDepth - 1.7, y: D },
  { piece: 'helmet', x: -1, z: B + 0.5, y: D + 24 },

  // ---- mechanic area (back wall, right of the stairs) ----
  { piece: 'pegboard', x: 128, z: B, y: 15 },
  { piece: 'workbench', x: 130, z: B },
  { piece: 'shopLight', x: 136, z: B + 8, y: 50 },
  { piece: 'toolbox', x: 203, z: B },
  { piece: 'fireExt', x: 112, z: B, y: 9 },
  { piece: 'broom', x: 120, z: B + 1 },

  // ---- right wall: drums by the door, tyres + rims after it, the lift bay, compressor ----
  { piece: 'drum', x: R, z: -136, rot: 1, v: 'green' },
  { piece: 'drum', x: R - 11, z: -134, rot: 1, v: 'orange' },
  { piece: 'tyres', x: R, z: -34, rot: 1, v: '4' },
  { piece: 'tyres', x: R, z: -18, rot: 1, v: '2' },
  { piece: 'rims', x: R, z: -36, y: 26, rot: 1 },
  { piece: 'compressor', x: R, z: 72, rot: 1 },
  { piece: 'bin', x: R - 1, z: 92, rot: 1 },

  // ---- shop floor around the lift ----
  { piece: 'engineStand', x: 150, z: 14 },
  { piece: 'jack', x: 162, z: 66, rot: 1 },
  { piece: 'creeper', x: 128, z: 60 },
  { piece: 'oilStain', x: 186, z: 22 },
  { piece: 'oilStain', x: 140, z: -60 },
];
