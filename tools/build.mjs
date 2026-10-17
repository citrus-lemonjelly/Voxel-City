// Single-file build (decision P6): bundles src/ + vendored three.js into build/VoxelCity.html.
// Double-click that file to play — no server or install needed.
// Usage: node tools/build.mjs   (uses esbuild from node_modules, or ESBUILD_PATH if set)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require(process.env.ESBUILD_PATH || 'esbuild'); }
catch { console.error('esbuild not found. Run `npm install` (or set ESBUILD_PATH).'); process.exit(1); }

const result = await esbuild.build({
  entryPoints: [resolve(root, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  alias: { three: resolve(root, 'vendor/three.module.js') },
  legalComments: 'none',
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voxel City</title>
<!-- Voxel City ${pkg.version} — built ${new Date().toISOString()} — three.js r170 (MIT) -->
</head>
<body>
<script>${js}</script>
</body>
</html>`;
mkdirSync(resolve(root, 'build'), { recursive: true });
writeFileSync(resolve(root, 'build/VoxelCity.html'), html);
console.log(`build/VoxelCity.html  ${(html.length / 1024).toFixed(0)} KB`);
