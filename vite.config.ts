// Used once Node is installed locally (`npm install`, then `npm run dev`).
// The single-file build in build/VoxelCity.html is produced by tools/build.mjs (esbuild).
import { defineConfig } from 'vite';
export default defineConfig({ root: '.', server: { open: true } });
