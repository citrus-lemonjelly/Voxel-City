// Garage room — the 3D background behind the menus (owner 2026-10-20: a showcase spot for the car and a garage that
// looks lived in; Q155 clean showroom + workshop with warm touches upstairs, Q156 loft back-left, Q157 roll-up door
// with the street outside (can be closed), Q158 a stripped body shell on the lift).
// Everything is built from blocks at the cars' size (A2); the House Interior pack was reference only (Q162).
// Layout (what goes where) lives in src/data/garageLayout.ts; this file holds the room shell and how each piece looks.
import * as THREE from 'three';
import { blockify } from './blockShade';
import { textCells } from './blockFont';
import { Materials } from './voxel';
import { staticCar, STOCK_LOOK } from './carBuilder';
import { GARAGE_ROOM as R, GARAGE_LAYOUT, GaragePiece } from '../data/garageLayout';

interface Bx { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: string }
type Bucket = 'B' | 'GL' | 'LIT' | 'FLAT';

const STEEL = '#2c2f36', STEEL2 = '#3a3e47', WOOD = '#8a6a46', WOOD2 = '#76593a', WOODL = '#a07c52';
const RED = '#b8352a', REDD = '#8a2820', CHROME = '#c4c9d1', RUBBER = '#232528', CREAM = '#e3ddcd', WHITE = '#e9e9e4';
const SAFETY = '#c9a63a', ACCENT = '#f2c94c', PRIMER = '#8d9196', OXIDE = '#9a5238';

/** Collects boxes in a piece's own frame (x = left→right as you face it, z = 0 at the wall → front) and places them. */
class Kit {
  out: Record<Bucket, Bx[]> = { B: [], GL: [], LIT: [], FLAT: [] };
  doorSlats: Bx[] = []; doorGlass: Bx[] = [];
  private px = 0; private py = 0; private pz = 0; private rot = 0;
  private seed = 1;
  at(x: number, y: number, z: number, rot = 0) { this.px = x; this.py = y; this.pz = z; this.rot = rot; this.seed = Math.abs(Math.round(x * 31 + z * 17 + y * 7)) + 1; return this; }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return (this.seed - 1) / 2147483646; }
  private map(x: number, z: number): [number, number] {
    switch (this.rot) { case 1: return [-z, x]; case 2: return [-x, -z]; case 3: return [z, -x]; default: return [x, z]; }
  }
  box(to: Bucket | Bx[], x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) {
    const [ax, az] = this.map(x, z), [bx, bz] = this.map(x + sx, z + sz);
    const b = { x: this.px + Math.min(ax, bx), y: this.py + y, z: this.pz + Math.min(az, bz), sx: Math.abs(bx - ax), sy, sz: Math.abs(bz - az), c };
    (typeof to === 'string' ? this.out[to] : to).push(b);
  }
  b(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) { this.box('B', x, y, z, sx, sy, sz, c); }
  gl(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) { this.box('GL', x, y, z, sx, sy, sz, c); }
  lit(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) { this.box('LIT', x, y, z, sx, sy, sz, c); }
  flat(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) { this.box('FLAT', x, y, z, sx, sy, sz, c); }
  /** round-ish column (plus shape) standing up: diameter d, height h */
  round(x: number, y: number, z: number, d: number, h: number, c: string, to: Bucket = 'B') {
    const k = d * 0.22; this.box(to, x + k, y, z, d - 2 * k, h, d, c); this.box(to, x, y, z + k, d, h, d - 2 * k, c);
  }
  /** round-ish disc facing the front: diameter d, thickness t */
  disc(x: number, y: number, z: number, d: number, t: number, c: string) {
    const k = d * 0.22; this.b(x + k, y, z, d - 2 * k, d, t, c); this.b(x, y + k, z, d, d - 2 * k, t, c);
  }
  /** block-font text on the front face (reads left → right as you face the piece) */
  text(s: string, x: number, y: number, z: number, cell: number, c: string, to: Bucket = 'LIT') {
    for (const [col, r] of textCells(s).cells) this.box(to, x + col * cell, y + (4 - r) * cell, z, cell, cell, 0.4, c);
  }
}

// ---------------- pieces (own frame: back against the wall at z = 0, front at +z) ----------------
type PieceFn = (k: Kit, v?: string) => void;
const PIECES: Record<string, PieceFn> = {
  desk: k => {
    const w = 38, d = 14;
    k.b(0, 10.5, 0, w, 1, d, WOOD);
    k.b(w - 2, 0, 1, 1.2, 10.5, 1.2, STEEL); k.b(w - 2, 0, d - 2, 1.2, 10.5, 1.2, STEEL);
    k.b(0.5, 0, 0.5, 10, 10.5, d - 1, STEEL2);
    for (const y of [3.4, 6.8]) { k.b(1, y, d - 0.5, 8.5, 0.35, 0.2, '#24272d'); k.b(4, y + 1.2, d - 0.5, 2.5, 0.6, 0.5, CHROME); }
    // the Garage Terminal (G7): monitor with the game's yellow header bar
    k.b(w / 2 - 1, 11.5, 2, 2, 2.5, 2, STEEL); k.b(w / 2 - 4, 11.5, 1.2, 8, 0.5, 4, STEEL);
    k.b(w / 2 - 9, 14, 2.5, 18, 11, 1.2, '#1b1e23');
    k.lit(w / 2 - 8, 15, 3.7, 16, 9, 0.2, '#2f6f95');
    k.lit(w / 2 - 7, 22, 3.9, 7, 1, 0.1, ACCENT);
    for (let i = 0; i < 3; i++) k.lit(w / 2 - 7, 19.5 - i * 1.8, 3.9, 9 - i * 2, 0.7, 0.1, '#bfe4f5');
    k.b(w / 2 - 6, 11.5, 7.5, 12, 0.6, 3.5, '#2a2d33'); k.b(w / 2 + 8, 11.5, 8, 1.6, 0.6, 2.4, '#2a2d33');
    k.b(w - 7, 11.5, 8.5, 2.2, 2.6, 2.2, RED); k.b(3, 11.5, 5, 6, 0.3, 5, CREAM); k.b(3.5, 11.8, 5.5, 5, 0.3, 4, WHITE);
  },
  chair: k => {
    const c = '#2a2d33';
    k.b(1, 0, 5.5, 10, 0.8, 1, STEEL); k.b(5.5, 0, 1, 1, 0.8, 10, STEEL); k.b(5.5, 0.8, 5.5, 1, 5, 1, STEEL);
    k.b(1, 5.8, 1, 10, 1.6, 10, c); k.b(1, 7.4, 0, 10, 11, 1.6, c); k.b(0, 8.5, 2, 1, 0.8, 7, STEEL); k.b(11, 8.5, 2, 1, 0.8, 7, STEEL);
  },
  whiteboard: k => {
    const w = 30, h = 16;
    k.b(0, 0, 0, w, h, 0.5, '#9aa0a8'); k.b(0.6, 0.6, 0.5, w - 1.2, h - 1.2, 0.2, WHITE); k.b(0, -0.8, 0, w, 0.8, 1.6, '#9aa0a8');
    // race times + a lap sketch in marker
    const ink = ['#2a3a5a', '#2a3a5a', '#a33a2a', '#2a3a5a'];
    for (let r = 0; r < 4; r++) { k.b(2, h - 3.5 - r * 2.6, 0.72, 5, 0.6, 0.1, ink[r]); k.b(8, h - 3.5 - r * 2.6, 0.72, 4 + (r * 5) % 7, 0.6, 0.1, ink[r]); }
    k.b(20, 4, 0.72, 7, 0.6, 0.1, '#2f7a4a'); k.b(20, 10, 0.72, 7, 0.6, 0.1, '#2f7a4a'); k.b(19.4, 4, 0.72, 0.6, 6.6, 0.1, '#2f7a4a'); k.b(27, 4, 0.72, 0.6, 6.6, 0.1, '#2f7a4a');
    k.b(1.5, -0.6, 0.6, 3, 0.6, 0.6, '#a33a2a'); k.b(5, -0.6, 0.6, 3, 0.6, 0.6, '#2a3a5a');
  },
  clock: k => {
    k.disc(0, 0, 0, 8, 0.6, STEEL); k.disc(1, 1, 0.6, 6, 0.2, WHITE);
    k.b(3.7, 4, 0.85, 0.6, 2.6, 0.1, '#111'); k.b(4, 3.7, 0.85, 2.2, 0.6, 0.1, '#111');
  },
  counter: k => {
    const w = 18, d = 12;
    k.b(0, 0, 0, w, 9.5, d, '#3b404a'); k.b(w / 2 - 0.2, 0.5, d, 0.4, 8.5, 0.2, '#2c3038');
    k.b(w / 2 - 2, 7, d, 1.2, 0.6, 0.5, CHROME); k.b(w / 2 + 0.8, 7, d, 1.2, 0.6, 0.5, CHROME);
    k.b(-0.5, 9.5, 0, w + 1, 1, d + 0.5, '#d7d2c4');
    k.b(2, 10.5, 1, 6, 7, 6, '#1d2025'); k.lit(3, 15.5, 7.05, 1, 1, 0.1, '#ff5a3a'); k.gl(3, 10.5, 4.5, 4, 3, 2.5, '#3a2a20');
    k.b(10, 10.5, 6, 2, 2.4, 2, WHITE); k.b(13, 10.5, 7, 2, 2.4, 2, '#3f6e8c'); k.b(12, 10.5, 1.5, 4.5, 6, 4.5, '#5a7f9a');
  },
  filing: k => {
    k.b(0, 0, 0, 10, 14, 10, '#7c828c');
    for (const y of [4.6, 9.2]) k.b(0.3, y, 10, 9.4, 0.3, 0.2, '#5d636c');
    for (const y of [2.5, 7, 11.6]) k.b(3.5, y, 10, 3, 0.6, 0.5, CHROME);
    k.b(2, 14, 2, 5, 0.6, 6, CREAM); k.b(6.5, 14, 5, 2, 2.5, 2, '#3f8c5a');
  },
  shelving: k => {
    const w = 40, d = 12, h = 34;
    for (const [x, z] of [[0, 0], [w - 1.2, 0], [0, d - 1.2], [w - 1.2, d - 1.2]]) k.b(x, 0, z, 1.2, h, 1.2, STEEL);
    const card = ['#b48a5a', '#a57c4e', '#c29a68', '#9c7448'];
    for (const y of [1, 12, 23, 33.2]) {
      k.b(0, y, 0, w, 0.8, d, STEEL2);
      if (y > 33) break;
      let x = 1.5;
      while (x < w - 6) {
        const bw = 6 + Math.floor(k.rnd() * 6), bh = 4 + Math.floor(k.rnd() * 5);
        if (x + bw > w - 1.5) break;
        if (k.rnd() < 0.15) { x += bw; continue; }
        k.b(x, y + 0.8, 1.5, bw, bh, d - 3, card[Math.floor(k.rnd() * card.length)]); k.b(x, y + 0.8 + bh - 0.2, 1.5 + (d - 3) / 2 - 0.4, bw, 0.25, 0.8, '#d9c08f');
        x += bw + 1;
      }
    }
  },
  drum: (k, v) => {
    const c = v === 'orange' ? '#d9822b' : '#2f6b4a', dark = v === 'orange' ? '#a8601c' : '#245238';
    k.round(0, 0, 0, 10, 16, c);
    for (const y of [4, 11]) k.round(-0.2, y, -0.2, 10.4, 0.8, dark);
    k.round(2, 16, 2, 6, 0.4, dark); k.b(6, 16, 3, 1.5, 0.8, 1.5, '#222');
    k.b(3, 6.5, 10.05, 4, 3.5, 0.2, CREAM); k.b(3.5, 8.6, 10.2, 3, 0.6, 0.1, '#222'); k.b(3.5, 7.2, 10.2, 2, 0.6, 0.1, '#222');
  },
  tyres: (k, v) => {
    const n = +(v || 3);
    for (let i = 0; i < n; i++) {
      const y = i * 4.2, dx = (i % 2) * 0.6;
      k.round(dx, y, 0, 14, 4, RUBBER);
      k.b(dx + 1.2, y + 1.2, -0.05, 11.6, 0.4, 14.1, '#1a1b1e');
    }
    k.b(4.5, n * 4.2 - 0.05, 4.5, 5, 0.1, 5, '#0f1012');
  },
  rims: k => {
    const cols = [CHROME, '#c9a24a', '#2a2c30'];
    cols.forEach((c, i) => {
      const x = i * 13;
      k.b(x + 5.5, 12, 0, 1, 2, 1, STEEL);
      k.disc(x, 0, 0.4, 12, 1.4, c);
      k.b(x + 4.5, 4.5, 1.8, 3, 3, 0.5, '#3a3d44');
      k.b(x + 5.6, 1.5, 1.8, 0.8, 9, 0.3, '#3a3d44'); k.b(x + 1.5, 5.6, 1.8, 9, 0.8, 0.3, '#3a3d44');
    });
  },
  pegboard: k => {
    const w = 72, h = 28;
    k.b(0, 0, 0, w, h, 0.6, '#a88a5c');
    for (let x = 2; x < w; x += 3) for (let y = 2; y < h; y += 3) k.b(x, y, 0.6, 0.4, 0.4, 0.05, '#8a6f48');
    for (let i = 0; i < 7; i++) { k.b(3 + i * 2.2, h - 9 - i, 0.6, 0.9, 6 + i, 0.5, CHROME); k.b(2.7 + i * 2.2, h - 3.4, 0.6, 1.5, 1.2, 0.6, CHROME); }
    k.b(22, 8, 0.6, 1, 10, 0.6, WOOD2); k.b(20.5, 18, 0.6, 4, 2, 1, STEEL2);
    ['#c0392b', ACCENT, '#2f5f9e', '#222'].forEach((c, i) => { k.b(29 + i * 2.5, 15, 0.6, 1.3, 4, 0.9, c); k.b(29.35 + i * 2.5, 9, 0.6, 0.6, 6, 0.4, CHROME); });
    k.b(42, 7, 0.6, 1, 9, 0.6, RED); k.b(44.5, 7, 0.6, 1, 9, 0.6, RED); k.b(42.3, 16, 0.6, 3, 3, 0.6, STEEL2);
    k.b(50, 8, 0.6, 11, 1.4, 0.8, '#e07b28'); k.b(50, 18, 0.6, 11, 1.4, 0.8, '#e07b28'); k.b(50, 8, 0.6, 1.4, 11, 0.8, '#e07b28'); k.b(59.6, 8, 0.6, 1.4, 11, 0.8, '#e07b28');
    k.b(64, 6, 0.6, 5, 2, 1, '#3a5f9e'); k.b(66, 8, 0.6, 1, 10, 0.6, STEEL2); k.b(64, 18, 0.6, 5, 2, 1, '#3a5f9e');
    // shelf on top: paint and spray cans
    k.b(0, h, 0, w, 0.8, 4, WOOD2);
    ['#c0392b', '#e8e4d8', '#2f5f9e', '#e8c547', '#3f8c5a', '#222', '#c0392b'].forEach((c, i) => k.b(3 + i * 4 + (i > 3 ? 20 : 0), h + 0.8, 1, i > 3 ? 1.8 : 3, i > 3 ? 4.5 : 3.6, i > 3 ? 1.8 : 2.6, c));
  },
  workbench: k => {
    const w = 68, d = 15;
    k.b(0, 12, 0, w, 1.6, d, WOOD); k.b(0, 11, d - 1, w, 1, 1, WOOD2);
    for (const x of [1, w - 2.6]) for (const z of [1, d - 2.6]) k.b(x, 0, z, 1.6, 12, 1.6, STEEL);
    k.b(1, 3, 1, w - 2, 0.8, d - 2, STEEL2);
    k.b(4, 13.6, d - 6, 7, 3, 4, '#3a5f9e'); k.b(5, 16.6, d - 5, 5, 1.5, 2.5, STEEL); k.b(7, 15, d - 2, 1, 1, 3, CHROME);
    k.b(16, 13.6, 3, 10, 4, 6, '#2a2c30'); k.b(16.5, 17.6, 4, 9, 0.6, 4, '#3a3d44');
    k.round(40, 13.6, 4, 6, 5, '#8a8f98'); k.b(41.5, 18.6, 5.5, 3, 1, 3, '#5d626b');
    k.b(30, 13.6, 7, 6, 0.4, 5, CREAM); k.b(30.5, 14, 7.5, 5, 0.3, 4, WHITE);
    k.b(52, 13.6, 8, 2.2, 2.6, 2.2, WHITE); k.b(56, 13.6, 4, 3, 4, 3, RED); k.b(60, 13.6, 6, 5, 0.6, 4, '#c65a3a');
    k.b(4, 3.8, 3, 9, 6, 8, '#b48a5a'); k.b(15, 3.8, 3, 7, 4, 8, '#a57c4e'); k.round(46, 3.8, 3, 7, 7, '#3f6e8c');
  },
  shopLight: k => {
    const w = 56;
    k.b(-0.5, 0.8, -0.3, w + 1, 1.2, 3, '#d0d3d8'); k.lit(0, 0, 0, w, 0.8, 2.4, '#f4f6ff');
    k.b(3, 2, 1, 0.4, R.height - 52, 0.4, '#55585e'); k.b(w - 3.4, 2, 1, 0.4, R.height - 52, 0.4, '#55585e');
  },
  toolbox: k => {
    const w = 22, d = 13;
    for (const [x, z] of [[1, 1], [w - 3, 1], [1, d - 3], [w - 3, d - 3]]) k.b(x, 0, z, 2, 2, 2, RUBBER);
    k.b(0, 2, 0, w, 20, d, RED);
    for (const y of [5.5, 9, 12.5, 16, 19.5]) { k.b(0.5, y, d, w - 1, 0.3, 0.2, REDD); k.b(4, y - 1.6, d, w - 8, 0.6, 0.6, CHROME); }
    k.b(-1, 15, 3, 1, 1, 7, CHROME); k.b(-1, 15, 3, 1, 4, 1, CHROME); k.b(-1, 15, 9, 1, 4, 1, CHROME);
    k.b(1, 22, 0.5, w - 2, 8, d - 1, RED); k.b(0.5, 30, 0.2, w - 1, 1.2, d - 0.4, REDD);
    for (const y of [24.5, 27.5]) { k.b(1.5, y, d - 0.5, w - 3, 0.3, 0.2, REDD); k.b(5, y - 1.3, d - 0.5, w - 10, 0.5, 0.5, CHROME); }
    k.b(8, 31.2, 3, 7, 2.5, 5, '#2a2c30'); k.b(3, 31.2, 5, 4, 0.8, 4, '#d9d2c0');
  },
  fireExt: k => {
    k.b(0, 0, 0, 4, 1, 1.5, STEEL); k.round(0.5, 1, 0.4, 3, 9, RED); k.b(1.2, 10, 1.1, 1.6, 1.5, 1.6, '#222'); k.b(3.3, 3, 2.5, 0.6, 7, 0.6, '#222');
    k.b(0, 13, 0, 4, 4, 0.3, RED); k.b(1.5, 13.8, 0.3, 1, 2.4, 0.1, WHITE); k.b(0.8, 14.5, 0.3, 2.4, 1, 0.1, WHITE);
  },
  broom: k => {
    for (let i = 0; i < 6; i++) k.b(1.5 + i * 0.5, 2 + i * 4, 1 + i * 0.25, 0.8, 4.2, 0.8, WOOD);
    k.b(0, 0, 0, 5, 2, 2.5, SAFETY); k.b(0.3, -0.01, 0.2, 4.4, 0.6, 2.1, '#3a3426');
  },
  bin: k => { k.b(0, 0, 0, 7, 10, 7, '#3f6e5a'); k.b(-0.3, 10, -0.3, 7.6, 0.8, 7.6, '#35604d'); k.b(1.5, 10.8, 2, 3, 0.5, 2, CREAM); },
  compressor: k => {
    k.b(1, 0, 0, 3, 3, 1, RUBBER); k.b(1, 0, 9, 3, 3, 1, RUBBER); k.b(12, 0, 4, 2, 3, 2, RUBBER);
    k.b(0, 3, 1, 16, 8, 8, RED); k.b(-0.4, 3.5, 1.5, 0.4, 7, 7, REDD); k.b(16, 3.5, 1.5, 0.4, 7, 7, REDD);
    k.b(4, 11, 2.5, 6, 4, 5, '#2a2c30'); k.round(11, 11, 4, 2.4, 2.4, CHROME); k.b(11.5, 12, 6.4, 1.4, 1.4, 0.2, WHITE);
    k.b(2, 20, 0, 12, 12, 1, STEEL2); k.disc(2.5, 20.5, 1, 11, 1.6, '#e8c547'); k.b(6.5, 24.5, 2.65, 3, 3, 0.2, STEEL2);
    k.b(13, 6, 9, 1, 15, 1, '#e8c547');
  },
  engineStand: k => {
    k.b(0, 0, 6, 16, 1.5, 2, RED); k.b(7, 0, 0, 2, 1.5, 14, RED); k.b(7, 1.5, 6, 2, 11, 2, RED); k.b(7, 11, 8, 2, 2, 3, RED);
    for (const [x, z] of [[0, 6.5], [15, 6.5], [7.5, 0], [7.5, 13]]) k.b(x, -0.01, z, 1, 1, 1, RUBBER);
    k.b(3, 9.5, 10.5, 10, 8, 7, '#6b6f78'); k.b(3.5, 17.5, 11.5, 9, 1.6, 5, RED); k.b(5, 19.1, 12.5, 6, 1, 3, '#8a8f98');
    k.b(1.5, 10.5, 12.5, 1.5, 4.5, 4.5, '#222'); k.b(13, 12.5, 11.5, 1.2, 3, 5, '#7a5a3a'); k.b(4, 8.2, 11.5, 8, 1.3, 5, '#4d5159');
  },
  jack: k => {
    k.b(0, 1, 0, 6, 2.5, 13, RED); k.b(0.5, 0, 1, 1.5, 1.5, 1.5, RUBBER); k.b(4, 0, 1, 1.5, 1.5, 1.5, RUBBER); k.b(2, 0, 11, 2, 1.5, 1.5, RUBBER);
    k.b(1.5, 3.5, 0.5, 3, 1.2, 3, '#222');
    for (let i = 0; i < 5; i++) k.b(2.5, 3 + i * 1.6, 13 + i * 1.6, 1, 1.8, 1.8, i === 4 ? '#222' : STEEL2);
  },
  creeper: k => {
    k.b(0, 1.2, 0, 10, 0.8, 22, '#2f4f8a'); k.b(1, 2, 0.5, 8, 1.5, 4, '#1f2b44');
    for (const [x, z] of [[0.5, 1], [8, 1], [0.5, 19.5], [8, 19.5]]) k.b(x, 0, z, 1.5, 1.2, 1.5, RUBBER);
  },
  oilStain: k => {
    const c = '#383b41';
    k.flat(0, 0.05, 2, 14, 0.06, 8, c); k.flat(3, 0.05, 0, 8, 0.06, 13, c); k.flat(10, 0.05, 9, 7, 0.06, 6, c); k.flat(5, 0.06, 4, 5, 0.06, 4, '#303237');
  },
  // ---- loft ----
  rug: k => { k.flat(0, 0.02, 0, 44, 0.2, 30, '#5e2f2f'); k.flat(1.5, 0.04, 1.5, 41, 0.2, 27, '#7b3f3f'); k.flat(4, 0.06, 4, 36, 0.2, 22, '#8c4a42'); },
  couch: k => {
    const w = 36, d = 14, c = '#7a4a33', cu = '#8b5638';
    for (const x of [1, w - 2.5]) for (const z of [1, d - 2.5]) k.b(x, 0, z, 1.5, 1.2, 1.5, '#2a1d14');
    k.b(0, 1.2, 0, w, 4.5, d, c); k.b(3, 5.7, 3.5, w / 2 - 3.3, 2.4, d - 3.5, cu); k.b(w / 2 + 0.3, 5.7, 3.5, w / 2 - 3.3, 2.4, d - 3.5, cu);
    k.b(0, 5.7, 0, w, 9.5, 3.5, c); k.b(0, 5.7, 0, 3, 4.5, d, c); k.b(w - 3, 5.7, 0, 3, 4.5, d, c);
    k.b(4, 8.1, 3.5, 6, 5, 2, SAFETY); k.b(w - 11, 8.1, 3.5, 7, 4.5, 2, '#3f6e8c'); k.b(w - 14, 8.1, 5, 9, 0.8, 8, '#5d6b74');
  },
  coffeeTable: k => {
    const w = 20, d = 10;
    k.b(0, 4, 0, w, 1, d, WOOD); for (const x of [0.5, w - 1.7]) for (const z of [0.5, d - 1.7]) k.b(x, 0, z, 1.2, 4, 1.2, WOOD2);
    k.b(4, 5, 1.5, 8, 0.9, 8, '#d6b98a'); k.b(5, 5.9, 4.5, 6, 0.1, 1.2, RED); k.b(14, 5, 3, 2, 2.4, 2, WHITE); k.b(15, 5, 7, 3, 0.4, 1.2, '#222');
  },
  floorLamp: k => { k.b(0, 0, 0, 4, 0.8, 4, STEEL); k.b(1.6, 0.8, 1.6, 0.8, 19, 0.8, STEEL); k.b(-0.5, 19.5, -0.5, 5, 4, 5, CREAM); k.lit(0.5, 19.3, 0.5, 3, 0.3, 3, '#ffe2a8'); },
  fridge: k => {
    const w = 9, d = 9, h = 13;
    k.b(0, 0, 0, w, h, d, '#dcdcd6'); k.b(0, 8.5, d, w, 0.3, 0.2, '#b9b9b2'); k.b(w - 1.5, 3, d, 0.6, 4, 0.6, '#8a8a84');
    k.b(1.5, 9.5, d, 2, 2, 0.15, RED); k.b(4.5, 10, d, 2.5, 1.5, 0.15, '#3f6e8c'); k.b(2, 5, d, 3, 2, 0.15, ACCENT);
    k.round(2, h, 3, 2, 3, RED); k.round(5, h, 4, 2, 3, '#3f8c5a');
  },
  bookshelf: k => {
    const w = 12, d = 8, h = 24, books = ['#3f6e8c', '#8c3f3f', '#3f8c5a', '#c9a63a', '#6b4f8c', '#d6d0c0', '#2f4f6a'];
    k.b(0, 0, 0, w, h, 1, WOOD2); k.b(0, 0, 0, 1, h, d, WOOD); k.b(w - 1, 0, 0, 1, h, d, WOOD);
    for (const y of [0, 8, 16, h - 1]) k.b(0, y, 0, w, 1, d, WOOD);
    for (const y of [1, 9, 17]) {
      let x = 1.2;
      while (x < w - 2) { const bw = 0.9 + Math.floor(k.rnd() * 2) * 0.5, bh = 5 + k.rnd() * 1.8; if (k.rnd() < 0.12) { x += 1.5; continue; } k.b(x, y, 1.2, bw, bh, d - 2, books[Math.floor(k.rnd() * books.length)]); x += bw + 0.15; }
    }
  },
  tvUnit: k => {
    const w = 28, d = 8;
    k.b(0, 0.8, 0, w, 8.2, d, WOOD); for (const x of [0.5, w - 2]) k.b(x, 0, 0.5, 1.5, 0.8, d - 1, WOOD2);
    k.b(w / 3, 1.5, d, 0.3, 6.5, 0.2, WOOD2); k.b(2 * w / 3, 1.5, d, 0.3, 6.5, 0.2, WOOD2); k.b(w / 2 - 2.5, 2.5, d, 5, 2.5, 0.3, '#24272d');
    k.b(w / 2 - 2, 9, 2, 4, 1, 3, STEEL); k.b(1, 10, 2.5, w - 2, 15, 1.2, '#16191e');
    k.lit(2, 11, 3.7, w - 4, 13, 0.2, '#6aa6d6'); k.lit(2, 11, 3.8, w - 4, 4.5, 0.1, '#3b4552'); k.lit(2, 15.5, 3.8, w - 4, 0.5, 0.1, '#e8e4d8');
    k.lit(9, 13, 3.9, 7, 2.4, 0.1, '#e04a3a'); k.lit(17, 13.4, 3.9, 6, 2, 0.1, '#3a7ae0');
  },
  plant: k => {
    k.b(0, 0, 0, 6, 6, 6, '#d7d2c4'); k.b(0.5, 5.8, 0.5, 5, 0.3, 5, '#3a2e22');
    const g = ['#3f7a3a', '#2f6630', '#4f8f45'];
    for (let i = 0; i < 9; i++) { const y = 6 + i * 1.6, a = i * 2.4; k.b(2.5 + Math.cos(a) * 2.5 - 1, y, 2.5 + Math.sin(a) * 2.5 - 1, 2.6, 1.6, 2.6, g[i % 3]); }
    k.b(2.6, 6, 2.6, 0.8, 12, 0.8, '#3a5a2a');
  },
  poster: (k, v) => {
    const w = 16, h = 20;
    k.b(0, 0, 0, w, h, 0.4, '#1d2025');
    if (v === 'checker') {
      k.b(0.6, 0.6, 0.4, w - 1.2, h - 1.2, 0.2, WHITE);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) & 1) k.b(1.6 + c * 3.2, 4 + r * 3.2, 0.6, 3.2, 3.2, 0.1, '#1d2025');
      k.b(1.6, 1.6, 0.6, w - 3.2, 1.2, 0.1, RED); k.b(1.6, h - 3, 0.6, w - 3.2, 1.2, 0.1, RED);
    } else if (v === 'league') {
      ['#8e9bb3', '#3f8c5a', '#3b6fa8', '#c0392b', '#c9a63a'].forEach((c, i) => k.b(0.6, 0.6 + i * 3.76, 0.4, w - 1.2, 3.76, 0.2, c));
      k.text('DCBAS', 1.5, 2, 0.65, 0.6, WHITE, 'B');
    } else {
      k.b(0.6, 0.6, 0.4, w - 1.2, h - 1.2, 0.2, '#2a3550');
      k.b(2.5, 5, 0.6, w - 5, 3, 0.1, RED); k.b(5, 8, 0.6, w - 9, 2.4, 0.1, RED); k.b(5.8, 8.4, 0.62, 2.4, 1.6, 0.1, '#9fc3dc');
      k.b(3.5, 4, 0.65, 2.6, 2.6, 0.1, '#111'); k.b(w - 6.1, 4, 0.65, 2.6, 2.6, 0.1, '#111');
      k.b(2, h - 4, 0.6, w - 4, 1.4, 0.1, ACCENT); k.b(2, h - 6, 0.6, w - 8, 0.8, 0.1, WHITE);
    }
  },
  window: k => {
    const w = 30, h = 20;
    k.b(-1, -1, 0, w + 2, h + 2, 0.6, STEEL2); k.gl(0, 0, 0.3, w, h, 0.4, '#8fb3cf');
    k.b(w / 2 - 0.5, 0, 0.6, 1, h, 0.4, STEEL2); k.b(0, h / 2 - 0.5, 0.6, w, 1, 0.4, STEEL2); k.b(-1.5, -2, 0, w + 3, 1, 2, STEEL2);
  },
  jacket: k => {
    // a red racing jacket over the loft railing (rail at local z ≈ 1.7, top at deck + 15)
    k.b(0, 8, 0, 8, 7.5, 0.6, RED); k.b(0, 14.6, 0, 8, 1.6, 3.4, RED); k.b(0, 7, 2.6, 8, 8.4, 0.8, RED);
    k.b(3.6, 7.2, 3.4, 0.8, 7.6, 0.1, WHITE); k.b(0, 7, 3.4, 8, 0.8, 0.1, REDD);
  },
  helmet: k => {
    k.b(0, 0, 0, 7, 5, 7, ACCENT); k.b(0.5, 5, 0.5, 6, 1, 6, ACCENT); k.b(-0.1, 1.5, 6, 7.2, 2.2, 1.2, '#1d2a3a'); k.b(0, 0.6, 0, 7, 0.6, 7, '#2a2c30');
  },
};

// ---------------- the room ----------------
export interface GarageRoom { group: THREE.Group; setDoor(open: boolean): void }

export function buildGarageRoom(mats: Materials): GarageRoom {
  const k = new Kit(), g = new THREE.Group();
  const { back: BZ, right: RX, left: LX, front: FZ, height: H, deck: DY, loftX1, loftDepth } = R;
  const door = R.door, T = 6;   // wall thickness
  k.at(0, 0, 0);

  // floor: sealed concrete in 20-block slabs; yellow lines round the showcase and along the work bay
  for (let x = LX; x < RX; x += 20) for (let z = BZ; z < FZ; z += 20) {
    const t = ((Math.floor(x / 20) + Math.floor(z / 20)) & 1) ? '#4b4f58' : '#474b54';
    k.flat(x, -2, z, Math.min(20, RX - x), 2, Math.min(20, FZ - z), t);
  }
  const line = (x: number, z: number, sx: number, sz: number) => k.flat(x, 0, z, sx, 0.12, sz, SAFETY);
  line(-62, -62, 124, 1.5); line(-62, 60.5, 124, 1.5); line(-62, -62, 1.5, 124); line(60.5, -62, 1.5, 124);
  line(118, -134, 1.5, 230);

  // back wall (painted block, dark kick band + safety stripe) and right wall with the door opening
  const wallC = '#7a7f89', band = '#3b404a', course = '#6f747e';
  k.b(LX, 0, BZ - T, RX + T - LX, H, T, wallC);
  k.b(LX, 0, BZ, RX - LX, 14, 0.5, band); k.b(LX, 14, BZ, RX - LX, 1, 0.6, SAFETY);
  for (let y = 22; y < H; y += 8) k.b(LX, y, BZ, RX - LX, 0.4, 0.2, course);
  // left wall: only seen when the camera turns toward the loft (Profile)
  k.b(LX - T, 0, BZ - T, T, H, FZ - BZ + T, wallC); k.b(LX, 0, BZ, 0.5, 14, FZ - BZ, band); k.b(LX, 14, BZ, 0.6, 1, FZ - BZ, SAFETY);
  for (let y = 22; y < H; y += 8) k.b(LX, y, BZ, 0.2, 0.4, FZ - BZ, course);
  const rightWall = (z0: number, z1: number, y0: number, y1: number) => k.b(RX, y0, z0, T, y1 - y0, z1 - z0, wallC);
  rightWall(BZ - T, door.z0, 0, H); rightWall(door.z1, FZ, 0, H); rightWall(door.z0, door.z1, door.h, H);
  for (const [z0, z1] of [[BZ, door.z0 - 3], [door.z1 + 3, FZ]]) {
    k.b(RX - 0.5, 0, z0, 0.5, 14, z1 - z0, band); k.b(RX - 0.6, 14, z0, 0.6, 1, z1 - z0, SAFETY);
    for (let y = 22; y < H; y += 8) k.b(RX - 0.2, y, z0, 0.2, 0.4, z1 - z0, course);
  }
  // door frame, roll-up drum, the door itself (slats with a row of windows) — hidden when open
  k.b(RX - 2, 0, door.z0 - 3, 2, door.h + 3, 3, STEEL); k.b(RX - 2, 0, door.z1, 2, door.h + 3, 3, STEEL);
  k.b(RX - 2, door.h, door.z0 - 3, 2, 3, door.z1 - door.z0 + 6, STEEL);
  k.b(RX - 8, door.h + 3, door.z0 - 2, 8, 8, door.z1 - door.z0 + 4, '#4a4e57');
  for (let y = 0, i = 0; y < door.h; y += 4, i++) {
    const glass = y >= 40 && y < 44;
    if (glass) {
      for (let z = door.z0; z < door.z1; z += 16) { k.box(k.doorSlats, RX - 1.6, y, z, 1, 4, 3, '#b9bcc2'); k.box(k.doorGlass, RX - 1.4, y + 0.5, z + 3, 0.6, 3, 13, '#8fb3cf'); }
    } else k.box(k.doorSlats, RX - 1.6, y, door.z0, 1, Math.min(4, door.h - y), door.z1 - door.z0, i & 1 ? '#c3c6cc' : '#b9bcc2');
  }
  k.box(k.doorSlats, RX - 2.2, 0, door.z0, 0.8, 1.2, door.z1 - door.z0, RUBBER);
  k.box(k.doorSlats, RX - 2.4, 8, (door.z0 + door.z1) / 2 - 4, 0.8, 1.2, 8, CHROME);

  // the street outside the door (owner Q157): pavement, kerb, road, a parked car, a lamp, a diner across the road
  const SX = RX + T;
  k.flat(SX, -2, BZ - 120, 46, 3, 360, '#a9a69d');
  for (let z = BZ - 120; z < FZ; z += 12) k.flat(SX, 1, z, 46, 0.05, 0.4, '#9a978e');
  k.b(SX + 46, -2, BZ - 120, 2, 3.4, 360, '#b9b19a');
  k.flat(SX + 48, -2, BZ - 120, 120, 2, 360, '#3c3f45');
  for (let z = BZ - 120; z < FZ; z += 30) k.flat(SX + 107, 0, z, 2, 0.1, 14, '#d8d2b8');
  k.flat(SX + 168, -2, BZ - 120, 40, 3, 360, '#a9a69d');
  const BX = SX + 208;
  k.b(BX, 0, BZ - 120, 50, 170, 360, '#8f5545');
  for (let z = BZ - 110; z < FZ - 20; z += 44) {
    k.b(BX - 1, 0, z, 1, 34, 38, '#2c2f36'); k.gl(BX - 1.4, 3, z + 3, 0.6, 28, 32, '#3a5468');
    for (const y of [52, 86, 120]) { k.b(BX - 0.8, y - 1.5, z + 6, 0.8, 20, 26, '#d9cbb4'); k.gl(BX - 1.2, y, z + 8, 0.6, 17, 22, '#4f6f88'); }
  }
  k.b(BX - 6, 36, BZ - 112, 6, 2, 340, '#2c2f36');
  k.b(BX - 1.4, 39, -98, 0.6, 10, 48, '#2a2f3a');
  k.at(BX - 1.4, 0, -96, 1).text('DINER', 0, 40.5, 0, 1.6, '#ff6a4a');
  k.at(0, 0, 0);
  k.b(SX + 38, 0, -70, 2, 52, 2, STEEL); k.b(SX + 30, 50, -70, 10, 1.6, 2, STEEL); k.lit(SX + 29, 48.6, -71, 6, 1.4, 4, '#fff1c8');

  // the loft: deck on steel beams and posts, plank floor, railing, VOX CITY sign on the fascia
  const LZ = BZ + loftDepth;
  k.b(LX, DY - 3.6, BZ, loftX1 - LX, 3, loftDepth, STEEL2);
  for (let z = BZ, i = 0; z < LZ; z += 4, i++) {
    let x = LX;
    while (x < loftX1) { const len = Math.min(loftX1 - x, 18 + ((i * 7 + Math.floor(x)) % 13)); k.b(x, DY - 0.6, z, len, 0.6, Math.min(4, LZ - z), [WOOD, WOOD2, WOODL][(i + Math.floor(x / 7)) % 3]); x += len; }
  }
  k.b(LX, DY - 7, LZ - 2, loftX1 - LX, 7, 2.5, STEEL);
  k.text('VOX CITY', -40, DY - 6.4, LZ + 0.5, 1.15, ACCENT);
  for (const x of [-210, -90, 30]) k.b(x, 0, LZ - 4, 4, DY - 7, 4, STEEL);
  k.lit(-80, DY - 4, BZ + 30, 110, 0.4, 2, '#ffe2b0');
  for (let x = LX; x <= loftX1 - 1; x += 14) k.b(x, DY, LZ - 1, 1.2, 15, 1.2, STEEL);
  k.b(LX, DY + 14, LZ - 1.2, loftX1 - LX, 1.4, 1.6, STEEL); k.b(LX, DY + 7, LZ - 1, loftX1 - LX, 0.8, 1, STEEL);
  // side railing along the stair opening
  k.b(loftX1 - 1.2, DY, BZ + R.stairsW, 1.2, 15, 1.2, STEEL);
  k.b(loftX1 - 1.4, DY + 14, BZ + R.stairsW, 1.6, 1.4, loftDepth - R.stairsW, STEEL); k.b(loftX1 - 1.2, DY + 7, BZ + R.stairsW, 1, 0.8, loftDepth - R.stairsW, STEEL);

  // steel stairs against the back wall: open treads, a stepped stringer and handrail on the open side
  const steps = 9, rise = (DY - 0.6) / steps, run = (R.stairsX - loftX1) / steps, SZ = BZ + R.stairsW;
  for (let i = 0; i < steps; i++) {
    const x1 = R.stairsX - run * i, x0 = x1 - run, y = rise * (i + 1);
    k.b(x0, y - 1, BZ + 0.5, run + 0.5, 1, R.stairsW - 1.5, '#4a4e57');
    k.b(x0, y - 1 - rise * 0.9, SZ - 1.5, run + 0.5, rise * 0.9 + 1, 1.5, STEEL);
    k.b(x0, y - 1 - rise * 0.9, BZ, run + 0.5, rise * 0.9 + 1, 0.6, STEEL);
    if (i % 2 === 0) k.b(x1 - 1.2, y, SZ - 1.3, 1, 14, 1, STEEL);
    k.b(x0, y + 13.4, SZ - 1.5, run + 0.5, 1.2, 1.4, STEEL);
  }

  // two-post lift with a stripped body shell in primer (owner Q158 B); a drop light hangs off the shell
  const L = R.lift, LW = 28, LL = 58, mid = L.z + LL / 2;
  for (const px of [L.x - 8, L.x + LW + 2]) {
    k.b(px, 0, mid - 4, 6, 72, 8, '#3a5f9e'); k.b(px - 1, 0, mid - 5, 8, 1, 10, STEEL);
    for (let y = 1; y < 5; y += 2) k.b(px - 0.1, y, mid - 4.1, 6.2, 1, 8.2, y % 4 === 1 ? SAFETY : '#222');
  }
  k.b(L.x - 8, 70, mid - 3, LW + 16, 4, 6, '#3a5f9e');
  for (const dz of [-15, 11]) { k.b(L.x - 2, L.y - 2.5, mid + dz, 12, 1.6, 4, STEEL2); k.b(L.x + LW - 10, L.y - 2.5, mid + dz, 12, 1.6, 4, STEEL2); }
  for (const dz of [-14, 12]) for (const x of [L.x + 3, L.x + LW - 5]) k.b(x, L.y - 1, mid + dz, 2, 1, 2, RUBBER);
  const S = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) => k.b(L.x + x, L.y + y, L.z + z, sx, sy, sz, c);
  S(0, 0, 0, LW, 10, 5, PRIMER); S(0, 0, 17, LW, 10, 24, PRIMER); S(0, 0, 53, LW, 10, 5, PRIMER);
  S(0, 8, 5, LW, 2, 12, PRIMER); S(0, 8, 41, LW, 2, 12, PRIMER);
  S(1, 0, 5, LW - 2, 8, 12, '#2a2c30'); S(1, 0, 41, LW - 2, 8, 12, '#2a2c30');
  S(-0.2, 3, 22, 0.4, 6, 9, OXIDE); S(LW - 0.2, 4, 30, 0.4, 5, 8, OXIDE); S(4, 9.8, 3, 12, 0.4, 9, OXIDE);
  S(4, 10, 18, LW - 8, 6, 22, '#1f2227');
  for (const x of [2, LW - 4]) for (const z of [14, 28, 40]) S(x, 10, z, 2, 7, z === 28 ? 2 : 4, PRIMER);
  S(2, 17, 18, LW - 4, 2, 24, PRIMER); S(2, 10, 14, LW - 4, 1, 4, PRIMER);
  k.b(L.x + LW / 2, L.y - 9, L.z + 20, 0.3, 9, 0.3, '#222'); k.b(L.x + LW / 2 - 1, L.y - 12, L.z + 19, 2.4, 3, 2.4, '#3a3d44'); k.lit(L.x + LW / 2 - 0.5, L.y - 11.5, L.z + 19.5, 1.4, 2, 1.4, '#ffe9b8');

  // furniture and props from the layout
  for (const p of GARAGE_LAYOUT as GaragePiece[]) {
    const fn = PIECES[p.piece]; if (!fn) continue;
    k.at(p.x, p.y ?? 0, p.z, p.rot ?? 0); fn(k, p.v);
  }

  // ---- meshes: lit/glass/flat buckets, and the door on its own so it can open and close ----
  const mat = blockify(new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.9, envMapIntensity: 0.2 }));
  const matGlass = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.2, metalness: 0.1, envMapIntensity: 0.9 });
  const matLit = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  g.add(instanced(k.out.B, mat, true), instanced(k.out.FLAT, mat, false));
  if (k.out.GL.length) g.add(instanced(k.out.GL, matGlass, false));
  if (k.out.LIT.length) g.add(instanced(k.out.LIT, matLit, false));
  const doorG = new THREE.Group(); doorG.add(instanced(k.doorSlats, mat, true), instanced(k.doorGlass, matGlass, false)); g.add(doorG);

  // a parked car out on the street (front toward −z)
  const car = staticCar({ ...STOCK_LOOK, paint: '#3b6fa8' }, mats);
  car.rotation.y = Math.PI / 2; car.position.set(SX + 56, 0, -40); g.add(car);

  // daylight through the open door: a soft pool on the floor
  const day = new THREE.Mesh(new THREE.PlaneGeometry(90, 84), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4dc').multiplyScalar(0.12), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  day.rotation.x = -Math.PI / 2; day.position.set(RX - 45, 0.2, (door.z0 + door.z1) / 2); day.renderOrder = 2; g.add(day);

  // room lights: warm under and over the loft, cool over the bench, daylight from the door
  const pl = (c: string, i: number, d: number, x: number, y: number, z: number) => { const l = new THREE.PointLight(c, i, d, 0); l.position.set(x, y, z); g.add(l); return l; };
  pl('#ffd9a0', 0.55, 120, -30, 28, BZ + 34);
  pl('#ffd9a0', 0.5, 110, -60, DY + 24, BZ + 30);
  pl('#e6eeff', 0.45, 100, 165, 46, BZ + 22);
  const sun = pl('#fff2dc', 0.6, 140, RX + 30, 40, (door.z0 + door.z1) / 2);

  return {
    group: g,
    setDoor(open: boolean) { doorG.visible = !open; day.visible = open; sun.visible = open; },
  };
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
function instanced(blocks: Bx[], mat: THREE.Material, shadows: boolean) {
  const im = new THREE.InstancedMesh(BOX, mat, Math.max(1, blocks.length));
  const o = new THREE.Object3D(), c = new THREE.Color();
  blocks.forEach((b, i) => { o.position.set(b.x + b.sx / 2, b.y + b.sy / 2, b.z + b.sz / 2); o.scale.set(b.sx, b.sy, b.sz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.set(b.c)); });
  im.count = blocks.length; im.castShadow = shadows; im.receiveShadow = true;
  return im;
}
