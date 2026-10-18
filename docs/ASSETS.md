# Owner-supplied voxel assets → game models

Owner direction (2026-10-17): voxel files of things the owner likes are supplied as design references to build from
or redesign, instead of describing them in words.
**Owner Q60 (2026-10-18): every asset pack is a reference or a baseline — we build our own versions (or expand/modify a
baseline into our own); nothing ships as supplied.** Full review with preview sheets: `docs/reference/assets/`.

## Pipeline
1. Drop the `.vox` (MagicaVoxel) or a `.zip` of them into `assets/`.
2. Convert: `python3 tools/vox2json.py "assets/…/Thing.vox" src/data/vox/thing.json`
   (compact: palette + base64 bytes; files without a palette use MagicaVoxel's default palette).
3. Decide the scale against the car: **1 block ≈ 6.9 cm** (the Civix is 58 blocks ≈ 4 m).
   - Already car scale (e.g. the reference car pack) → use as-is.
   - Smaller than real (e.g. the trees: 2.2–2.6 m) → use as-is for small versions, and rebuild bigger by
     turning every source voxel into a k×k×k cube of car-sized blocks with rounded cluster edges (see `trees.ts`).
4. Colours: map the file's colours to our palette, keeping a share of the originals where the owner wants them.
5. Build with `greedyGeometry` (merges flat same-colour faces) and cache one mesh per variant.

## Assets received
| File | Contents | Used as |
|---|---|---|
| `assets/Voxel Car Sample For Design Reference.zip` | 3 MagicaVoxel cars (Berline, Flame, Van), 56–62 × 27–28 × 19–24 | Car density / proportion reference (A10, S17) |
| `assets/VOX Trees.zip` | 2 trees, 21×32×21 and 24×38×24, default palette greens | Saplings as supplied; street/park remixes ×2–×4 (S19) |
| `assets/Voxel Cars and Roads.zip` (monogon) | Taxi, 6 road/crossing tiles, 3 signs, traffic lights | **Closest match to our block size** (k≈1). Baseline for street props, markings, signs, traffic lights; taxi as a sedan reference. Licence CC BY-ND 4.0 — reference only. |
| `assets/PathAndTerrain-vox.zip` (Kytric) | 371 tiles: road, rail, terrain, rocks, trees, mountains | CC0 (free to remix). Diorama scale (k≈3–4.5): rocks/ground clutter, terrain colours for later stages, far backdrops. |
| `assets/High voxel cars.zip` (voxelempire77, **free version: no modification**) | 155 vehicles (60 shapes) | Silhouette reference only: muscle #53–56, hot rods #33/#35, sedans #18–21, pickups #83–86/#108–112; traffic ideas; "Oil" tankers #63/#65 for VOX Oil. |
| `assets/Voxel Buildings.zip` (Creators SIN) | 13 buildings | Too coarse (k≈7–9). Reference for outlines, setbacks, corner blocks, signage; spire tower as a landmark idea. |
| `assets/Voxel Cyberpunk City.zip` (monogon) | 13 FBX + 4K textures (painted voxels, not real ones) | Design brief for the future neon stage only (modular blocks, sign shapes, window patterns, colour mood). CC BY-ND 4.0. |
| `assets/Voxel Cyberpunk Isometric.zip` (monogon) | 13 flat images | Mood board for the neon stage. |
| `assets/Voxel House Interior.zip` (monogon) | 18 walls/doors/furniture | Reference for the walkable garage (later milestone). |
