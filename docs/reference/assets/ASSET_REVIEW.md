# Voxel City: review of the new asset packs (2026-10-18)

Analysis only. Nothing in `/home/claude/voxel-city` was changed and nothing was integrated into the game.
Packs were unzipped into separate folders under `scratchpad/assets_review/<pack>/`. Scripts are in `_tools/` and ran with `python3 -I`. Nothing from the zips was executed.

**Our reference scale:** the Civix is 58 × 28 × 21 blocks (L × W × H). 1 block ≈ 6.9 cm, or about 14.5 blocks per metre.
**k** = how many of our blocks one source voxel must become for the model to be real-size next to our car.
- k > 1: the pack is coarser (chunkier) than our cars.
- k < 1: the pack is finer than our cars.
- Our rule is "one block = same size everywhere", so only k ≈ 1 can be used as-is. Anything else has to be remixed, as the VOX Trees were, or rebuilt.

## Contact sheets

| Sheet | What it shows |
|---|---|
| `sheets/High_voxel_cars.png` | 60 unique shapes from 155 OBJ files (colour variants grouped), 1 voxel = 1 block, with our car box |
| `sheets/Voxel_Cars_and_Roads.png` | All 15 models, 1 voxel = 1 block, with our car box |
| `sheets/PathAndTerrain-vox.png` | 64 of 371 models: every prop, plus 1–4 per tile family (the rest are recolours of the same 32×32 shapes) |
| `sheets/Voxel_Buildings.png` | All 13 `.vox` files as supplied, with our car box |
| `sheets/Voxel_Cyberpunk_City_day.png` / `_night.png` | All 13 FBX files, textured, at true size in cm. The night sheet uses the pack's own emissive maps. |
| `sheets/Voxel_Cyberpunk_Isometric.png` | All 13 sprite strips at native size |
| `sheets/Voxel_House_Interior.png` | All 18 models, 1 voxel = 1 block, with our car box |
| `sheets/Scale_check_all_packs.png` | One model from each pack drawn at its matching k beside our car. This is the key sheet for judging scale. |

## 1. Inventory

| Pack | Formats | Models | Voxel sizes (L×H×W) | Palette | Author / licence |
|---|---|---|---|---|---|
| **High voxel cars** | 155 MagicaVoxel `.obj` + `.mtl` + 256×1 palette `.png`, 1 preview PNG, `read_me.txt` | 155 vehicles, 60 unique geometries. Files are named `alll cars3-N.obj`. | Most at 0.1 voxel units: cars 72–92 × 30–46 × 36–44; trucks, buses and trailers up to 126 × 59 × 44. 10 files (#23–27, #33–37) are exported at twice the voxel size (46–47 long). | 13–15 colours per vehicle. Saturated toy colours (yellow, blue, red, orange, purple), black glass, white roofs. Some liveries: police, "911" ambulance, "Oil" tanker, racing stripes. | voxelempire77, custom licence (quoted below). **Restrictive.** |
| **PathAndTerrain-vox** | 371 `.vox`, 1 shared palette PNG, `info.txt` | 372 models (1 file holds 2). 30 families: Asphalt, Roads, Paths, Tracks (rail), terrain tiles (City, Desert, Dirt, Forest, Water and their transitions), Mountains, Trees, Bushes, Stones, Cactus, Bones, Wood, TrackEquip, 1 building | Tiles are 32×1–5×32 (large curves 58–64). Mountains 20–32 tall. Trees 4×5×4 to 12×26×12. Stones 5×2×4 to 16×8×16. Bushes 3–6. | 1–17 colours per file. Flat earthy colours. | Kytric, **CC0** (no restrictions) |
| **Voxel Buildings** | 13 `.vox`, 13 MagicaVoxel OBJ exports, 13 Blender re-exports (`.obj`/`.fbx`/`.blend`), `preview.jpg` | 13: 9 mid-rises or offices, 1 tower with spire (6), 1 large block with red sign (11, the "CINEMA" building), 2 small houses with red roofs (12, 13). The cafe and shop awnings appear in the preview. | 36 × 26–103 × 36 lots (11.vox is 72×54×72; the houses are 18×15×18). Each file includes its green lot base. | 4–6 colours: white and greys, lawn green, red roof, blue awning | "Creators SIN". No licence file. The preview shows a CC0 "0" badge, so **probably CC0. Check the source page.** |
| **Voxel Cars and Roads** (free sample) | 15 MagicaVoxel OBJ + palette PNGs | 1 taxi, 6 road tiles (2 crossings, 4 streets), 3 signs (one-way arrow, no-entry, stop), 4 traffic-light lamp modules, 1 flat 10×10 plate | Taxi 52×24×28. Road tiles 80×2×80. Signs 18×52×5. Lamp modules 8×8×4. | 1–18 colours, muted and dark: dark teal asphalt, mustard kerb lines, tan taxi | monogon (Max Parata), the same author as our CarCollection reference pack. Store page: **CC BY-ND 4.0**. The author has commented that edits are fine as long as you don't redistribute. Commercial use is fine. Credit is requested. |
| **Voxel Cyberpunk City** (free sample, 60 MB) | 13 binary FBX (7.4, units in cm) + 12 PNG textures (4096², about 59 MB) | Building_3 (tower), BuildingBlock 1/2/18/19/24 (ground-floor modules), Advertising 5/6/7 (signs), SateliteDish, Road_Chunk_5, Sidewalk_Chunk_2, Sidewalk_Tile_1 | **Not voxel geometry.** These are low-poly boxes with the voxel look painted into 4K textures. Sizes: 4.0×16.2×2.0 m (tower), 4–6 × 2.5 × 2.0–2.4 m (blocks), 2×2 m (road), 4×4 m (sidewalk). Painted voxel ≈ 10 cm. | Dusty mauve brick, slate blue-grey, with neon green, magenta and cyan on signs. Separate baked **emissive maps** light the windows and signs. Note: 4 "CompositeBuildings" textures (about 29 MB) are not used by any FBX in this sample. | monogon, **CC BY-ND 4.0** (store page). Commercial use is fine. Credit is requested. |
| **Voxel Cyberpunk Isometric** (free sample) | 13 PNG sprite strips. No 3D data. | The same 13 models as the City sample, each pre-rendered in 4 rotations | Images 164×89 to 1380×277 px | Same as City | monogon. Probably the same terms, not checked. |
| **Voxel House Interior** (free sample) | 18 MagicaVoxel OBJ + palette PNGs | Wall panels (plain, damaged plaster, sage wainscot), windows, door, plank floor, bookshelves (×2), TV cabinet, armchair, stool, plant, lamp, picture frame, light switch | Walls 55 tall × up to 107 long. Floor 100×5×100. Door 32×44×3. Armchair 15×21×18. | 4–16 colours: warm woods, sage green, plaster | monogon. The store page shows no licence text. Probably CC BY-ND like the others; check. |

### Licence quotes and flags

- **High voxel cars** (`read_me.txt`):
  - *Paid version:* "You can use these assets in commercial projects. You can modify the assets. You can not redistribute or resale, even if modified."
  - *Free version:* "Modification of the assets is not allowed. Redistribution or resale, even in a modified form, is not permitted."
  - **Flag:** if the owner has the free version, remixing these into our density is not allowed. Even with the paid version, nothing can be redistributed. The 155-model count suggests the full pack, but the owner should confirm which version he downloaded. **Safe use: proportion and silhouette reference only.**
- **monogon packs** (Cars and Roads, Cyberpunk City, and probably Isometric and Interior):
  - The page licence is "Creative Commons Attribution_NoDerivatives v4.0 International".
  - Author on the Voxel Roads page: "You can edit them as you want as long as you don't redistribute them". Use inside a finished game is OK.
  - **Flag:** ND plus "credit appreciated". If any edited monogon model ships, get the author's OK in writing and credit "Max Parata (monogon)". This matches how A10 already treats his car pack (design reference; we build originals).
- **PathAndTerrain:** CC0, free to remix.
- **Voxel Buildings:** CC0 badge in the preview only. Confirm before shipping a remix.

(Not legal advice. These are the terms as written in the files and on the store pages.)

## 2. Scale and style compared with our cars

| Pack | Source voxels vs our car | k (our blocks per source voxel) | Style match |
|---|---|---|---|
| **Voxel Cars and Roads** | Taxi is 52 long, ours is 58. A road tile is 80 voxels (5.5 m at k=1). | **≈ 1.0–1.1.** Usable at our block size. Signs are a bit tall (3.6 m at k=1). | **Best match.** Same author and density as our A10 reference cars: flat colours, dark glass. The palette is darker and more muted than ours. |
| **Voxel Cyberpunk City** | Painted voxel ≈ 10 cm. Props look finer (≈ 5 cm, estimated from geometry steps). | **≈ 1.45** for buildings and roads. Close to ours, but not equal, and not a whole number. | Chunky, moody kit. The textured "fake voxels" differ from our real per-block geometry and block shader. Scale is inconsistent inside the pack: if the units are cm, the street blocks read right (2.5 m storey, ~2 m door) but the tower's floor bands are only ~1.5 m. |
| **High voxel cars** | Cars are 72–92 long, ours is 58 | **≈ 0.68** to match the Civix length (≈ 0.76 for real sizes). **Finer** than ours. | Toy proportions: H/L ≈ 0.40–0.50 (ours is 0.36), much wider and taller, huge wheels. Wheels are merged into the body mesh, so they don't fit our separate-wheel / part-slot rule (A11, A17). Shrinking by 0.68 (not a whole number) would lose most detail. |
| **Voxel House Interior** | Door 44 tall, armchair 21 tall | **≈ 0.67** (finer) | Same monogon style. Warm, clean, good detail. |
| **PathAndTerrain** | Road tile 32 wide, tree 26 tall | **≈ 3–4.5** (roads ~3.5, trees ~4.5, rail ~1.5; not consistent within the pack) | Tiny diorama scale. Flat colours suit our look once remixed. |
| **Voxel Buildings** | A storey is ~5–6 voxels, ours is ~46 blocks | **≈ 7–9** | Clean white "SimCity mini" style. At k=8 each source voxel would be a 55 cm cube, so façades would look blobby and empty. Too coarse to use directly. |
| **Voxel Cyberpunk Isometric** | 2D only | n/a | Pixel-art sprites. Can't be used in a 3D voxel world. |

## 3. Quality and performance if used directly

| Pack | Triangles per model as supplied | Other load | Performance risk |
|---|---|---|---|
| High voxel cars | 592–4,796 (MagicaVoxel-optimised mesh) | One 256×1 palette PNG per model (would convert to vertex colours) | Low per model. Not the issue: the problems are licence and fit. |
| Voxel Cars and Roads | 12–4,384 (the taxi is 4,384, not optimised; our greedy mesher would cut that a lot) | none | Low |
| PathAndTerrain | Tiny: tiles are 1–5 voxels thick, ~hundreds of triangles after greedy meshing | none | Low |
| Voxel Buildings | 204–1,500 (OBJ exports). `.vox` 1.9k–130k voxels. | none | Low as meshes. A k-remix with rounded edges adds triangles, but stays moderate. |
| Voxel Cyberpunk City | 12–1,772 | **8 × 4K textures used** (4 diffuse + 4 emissive, ~30 MB PNG, roughly 0.5–0.7 GB of GPU memory uncompressed with mipmaps). The full folder is 60 MB. | **High** for our single-file `VoxelCity.html` build (P6): base64 textures alone would make the file 40 MB or more. It also bypasses our block shader. |
| Voxel House Interior | 104–4,152 | none | Low |

Quality notes:
- **High voxel cars:** clean, varied, readable vehicles. There are no low sports cars or hypercars.
- **Voxel Cars and Roads:** a small sample, but the tile markings (crosswalk stripes, kerb edges, cracks) are exactly the ground detail we lack.
- **PathAndTerrain:** a very complete tile system (inner/outer corners, rounded and edgy variants, transitions). The individual pieces are simple.
- **Voxel Buildings:** strong massing (setbacks, ledges, rooftop AC units, tower with spire). The façades are nearly blank.
- **Voxel Cyberpunk City:** good modular logic (ground-floor blocks 4–6 m wide, roller shutters, recessed doors, wall-mounted signs). The night emissive is bright white or neon at full strength, so it would need toning down to our Low glow (A22, A27). Nothing blinks; the emissive maps are static.

## 4. Use ideas mapped to the upcoming work

| Upcoming work | Best source | Concrete ideas | What does not fit |
|---|---|---|---|
| **(1) Car roster: Bodies then Specs** | High voxel cars (reference only). Cars and Roads taxi. | Silhouette and proportion studies:<br>• **muscle coupe:** #53–56 (striped), hot rods #33/#35<br>• **sedan:** #18–21, #8–12<br>• **SUV / van:** #13–17, #103, #28–32<br>• **pickups:** #83–86, #108–112<br>• **taxi:** the Cars and Roads taxi is at our exact density (52×24×28), useful as a sedan/taxi Body reference. Background traffic and set dressing also come from HVC: police #135/#139, ambulance #133, fire truck #138, double-decker bus #137, dump trucks #58/#60, semis #140–150. **"Oil" tankers #63/#65 match the VOX OIL Corpo theme** (W3, Oil Fields). | No tuner or hypercar shapes in any pack. HVC proportions are too tall and wide for A30. Bodies are single meshes with no part slots. Licence blocks remixing on the free version. |
| **(2) Street props and ground polish** | Cars and Roads. PathAndTerrain. | Cars and Roads is near 1:1:<br>• crosswalk and street tile marking patterns<br>• kerb-edge lines and asphalt cracks<br>• traffic-light lamp modules (8×8×4)<br>• stop / no-entry / one-way sign faces<br>• all recoloured to our palette<br>PathAndTerrain (CC0):<br>• rounded-corner road and kerb outlines as intersection templates<br>• stones remixed at k=2–3 as kerb rubble and planter rocks<br>• the stone-brick `city-building` block as a low-wall texture idea | The Cars and Roads asphalt colour (dark teal) and mustard lines are off-palette. PathAndTerrain bushes and trees are too small to help. We already have the VOX Trees remix. |
| **(3) Building variety** | Voxel Buildings (massing). Cyberpunk City (modules). | Use as **massing references**: setback offices (2–5, 9), corner L-shapes (1, 10), the cinema block with marquee sign (11, a corner-building and signage idea), and cafe and shop awnings from the preview. Cyberpunk BuildingBlocks show a good ground-floor module system: shopfront, roller shutter, recessed door, 4–6 m modules. Rebuild these with our existing segment generators. | Voxel Buildings are ~8× too coarse and have blank façades: no fire escapes or upper-floor detail to borrow. |
| **(4) Landmarks** | Voxel Buildings 6.vox (tower with spire) | A stepped Art-Deco tower with spire, as a skyline landmark or a VOX OIL HQ concept, rebuilt at our density | Needs full re-detailing. |
| **(5) Neon / cyberpunk stage (later)** | Voxel Cyberpunk City (+ Isometric as a mood board) | Hold. Use the colour mood (mauve brick, slate, neon accents), sign shapes (Advertising 5–7), rooftop dishes and lit-window patterns as a design brief. Rebuild in our block unit with real per-block emissive blocks at Low glow. | Texture-based (not real voxels). ~10 cm block (k ≈ 1.45, not a whole number). 60 MB of 4K textures. ND licence. Can't be shipped as-is. |
| **Garage interior (M3, not current)** | Voxel House Interior | Wall panels with wainscot, plank floor, door, shelves, TV cabinet, armchair, plant: the walkable garage / Terminal room kit | Finer density (k ≈ 0.67). Rebuild at our block size. |
| **Other stages** | PathAndTerrain | Desert and dirt tile palettes for **Oil Fields** and **Gravelback Pass** ground. Mountain pieces remixed big as far-background ridges (owner call: a coarser distant backdrop bends the one-block rule). Rail tracks for a Harbor Strip or Oil Fields spur. | Not for Downtown Grid. |

## 5. Ranked recommendation

| Rank | Pack | Verdict | Use for |
|---|---|---|---|
| 1 | **Voxel Cars and Roads** | **Use first.** Same density and author as our car reference. | Road markings, crosswalks, kerb lines, traffic lights and signs for street and ground polish (2). Taxi as a sedan/taxi Body reference (1). Recolour to our palette. Credit monogon. |
| 2 | **PathAndTerrain-vox** | **Use: remix freely (CC0).** | Stones and rocks (k=2–3) as ground clutter. Corner and kerb outlines for intersections. Desert/dirt palettes and mountain backdrops for later stages. |
| 3 | **High voxel cars** | **Reference only.** | Roster silhouettes for muscle, sedan, SUV and pickup (1). Background traffic and service-vehicle ideas, VOX OIL tanker. Confirm the paid vs free licence before any remix. |
| 4 | **Voxel Buildings** | **Reference only.** | Massing, setbacks, corner blocks, cinema marquee, awnings (3). Tower with spire as a landmark concept (4). |
| 5 | **Voxel Cyberpunk City** | **Hold for the neon stage** (reference / design brief) | Module system, sign shapes, lit-window patterns, colour mood (5). Not shippable as-is (textures, 1.45 scale, ND). |
| 6 | **Voxel House Interior** | **Hold for the M3 walkable garage** | Interior kit reference |
| 7 | **Voxel Cyberpunk Isometric** | **Mood board only** | 2D sprites of the same Cyberpunk models; no 3D use. |

## Method notes

- `.vox` files were read with a parser written for this review (`_tools/voxlib.py`, based on `tools/vox2json.py`, plus scene-graph support).
- MagicaVoxel OBJ exports were voxelised from their axis-aligned faces. The voxel unit was inferred from the coordinate steps; 0.1 voxel units were checked against face-edge lengths.
- FBX files were parsed with a small binary-FBX reader (`_tools/fbxlib.py`) and drawn with a z-buffer renderer (`_tools/fbx_render.py`).
- The painted voxel size (≈ 10 cm) comes from texel density: 1.24 cm per texel on buildings, 0.36 cm per texel on roads. The smallest painted squares are about 8 and 27 texels.
- PathAndTerrain is sampled (64 of 371). The other files are recolours or rotations of the shown tile shapes.
- `docs/DECISIONS.md` and `docs/ASSETS.md` mention `tools/obj2vox.py`, but **that file is not in the repo's `tools/` folder** (only `vox2json.py` and `build.mjs`).
