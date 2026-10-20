// License plate designs, pixel font and text rules (Body Shop, owner 2026-10-19). No three.js here, so tests can use it.
export interface PlateDesign { bg: string; fg: string; band?: string; strip?: string; edge?: string }
export const PLATE_DESIGNS: Record<string, PlateDesign> = {
  stock: { bg: '#f2f2ea', fg: '#23252b' },
  city: { bg: '#f2f2ea', fg: '#1f4f9a', band: '#2a5fb0' },
  classic: { bg: '#17181c', fg: '#eeeae0' },
  euro: { bg: '#f2f2ea', fg: '#1a1a1e', strip: '#2a4fb0' },
  racing: { bg: '#f2c230', fg: '#141417' },
  gold: { bg: '#121214', fg: '#e6b422', edge: '#e6b422' },
};
export const DEFAULT_PLATE = 'VX CITY';
/** 3×5 pixel font: A–Z, 0–9, '-' and space. */
export const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '-': '000000111000000', ' ': '000000000000000',
};
/** Plate text the player typed, made legal: upper case, A–Z 0–9 space and '-', at most `max` characters. */
export const cleanPlate = (s: string, max = 7) => s.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').slice(0, max);

