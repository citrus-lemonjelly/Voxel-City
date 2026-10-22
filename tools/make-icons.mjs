// Home-screen icons (owner E3, V0.15.0): a 16 × 16 voxel picture — red block car on the yellow road line — saved as PNGs at the
// sizes phones ask for. Run once (or after changing the picture): node tools/make-icons.mjs → assets/icons/*.png
// tools/build.mjs copies them into build/icons/ next to build/manifest.webmanifest.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), out = resolve(root, 'assets/icons');
mkdirSync(out, { recursive: true });

// one letter per block: . background  y road  r body  d roof  w window  l headlight  k tyre  g hub
const ART = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....dddddd.....',
  '....dwwdwwwd....',
  '..rrrrrrrrrrrr..',
  '.rrrrrrrrrrrrrl.',
  '.rrrrrrrrrrrrrr.',
  '..kkk.....kkk...',
  '..kgk.....kgk...',
  'yyykkkyyyykkkyyy',
  '................',
  '................',
  '................',
];
const COL = { '.': '#14161c', y: '#f2c230', r: '#d23a2a', d: '#a82a1c', w: '#5aa9ff', l: '#ffe27a', k: '#0b0c10', g: '#8a919b' };
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${ART.flatMap((row, y) => [...row].map((c, x) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${COL[c]}"/>`)).join('')}</svg>`;
writeFileSync(resolve(out, 'icon.svg'), svg);

const b = await chromium.launch();
for (const [name, px] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  const pg = await b.newPage({ viewport: { width: px, height: px } });
  await pg.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body>`);
  writeFileSync(resolve(out, name), await pg.screenshot({ omitBackground: false }));
  await pg.close();
}
await b.close();
console.log('assets/icons: icon-512.png, icon-192.png, apple-touch-icon.png, icon.svg');
