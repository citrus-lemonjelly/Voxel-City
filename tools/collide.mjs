// node tools/collide.mjs [--strict]  — bundles tools/collide-entry.ts and runs it (see that file).
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const esbuild = require(process.env.ESBUILD_PATH || 'esbuild'), out = resolve(tmpdir(), 'vc-collide.mjs');
await esbuild.build({ entryPoints: [resolve(root, 'tools/collide-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, alias: { three: resolve(root, 'vendor/three.module.js') }, logLevel: 'error' });
await import(pathToFileURL(out).href);
