# Owner-supplied voxel assets → game models

Owner direction (2026-10-17): voxel files of things the owner likes are supplied as design references to build from
or redesign, instead of describing them in words.

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
