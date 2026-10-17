# Voxel City — Part-Slot Standard (v1)

Every car in Voxel City is built from the same set of **slots**. A slot is a place on the car where one swappable part lives. Because every car exposes the same slots, any part designed for a slot can be offered for any car (fitted per car), and players can mix freely.

Reference car: **Panda Civix v2.1** (`prototypes/step0b/civix2.html`, renders in `docs/reference/step0b/`).
Governing decisions: A17 (parts are modules), A24 (cosmetics are visual-only), A22/A27/A31 (glow), A23 (photosensitivity), A28/A33 (underglow), A15 (2× wheels).

---

## 1. Core rules

1. **Cosmetic only.** No slot part changes performance. Performance upgrades (Engine, Transmission, Tires, Body, Turbo, Nitrous) are separate data and are never visible unless the player also equips a matching look.
2. **Every car has every slot.** A car may leave a slot empty by default (e.g. no wing), but the anchor must exist so parts can be fitted.
3. **One density per part.** A part is built at car density (1×) or at 2× (half-size blocks). Never mixed inside one part.
4. **Glow is restricted.** Only these may emit light: headlights, taillights, underglow, and premium liveries (rare). Glow obeys the player's Glow intensity setting.
5. **Animation is restricted.** Only rare liveries and rare underglow items may animate. No hard flashing. Everything animated stops when *Freeze cosmetic animation* is on.
6. **Palette.** Parts draw from the fixed palette (A3). New colours are added deliberately, not per part.

---

## 2. Coordinate frame (all cars)

| Axis | Direction | Notes |
|---|---|---|
| x | Length; **front at x = 0**, rear at x = L−1 | Car faces −x |
| y | Up; **ground at y = 0** | Body starts at ride height |
| z | Width; 0 = left side, W−1 = right side | Camera-facing side in side views is z = W−1 |

Reference dimensions (Civix v2.1): L = 58, W = 28, roof y = 21 + ride offset 1, wheel radius 5.2 at wheel centres x = 12 and x = 46.
Cars of other sizes stay within ±15 % of these to keep one style (A30).

---

## 3. Slots

| # | Slot | Anchor (Civix v2.1) | Max bounds (x × y × z) | Density | Glow | Animate | Stock (Civix) | Variants proven |
|---|---|---|---|---|---|---|---|---|
| 1 | **Body** (base model) | Whole car | Car envelope | 1× | No | No | Panda Civix shell | — |
| 2 | **Headlights** ×2 (mirrored) | Front face, z 2–8 / W−9…W−3, y 4–8 | 2 × 5 × 8 each | 1× or 2× | Yes (light) | No | Stock rectangles | Projector, Slim LED, Round, Projector 2× |
| 3 | **Grille** | Front face, z 10…W−11, y 4–8 + lower intake y 2 | 2 × 6 × 8 | 1× or 2× | No | No | Slats | Mesh, Open + intercooler, Honeycomb 2× |
| 4 | **Hood** | Top surface x 2–15 | 14 × 3 × 20 | 1× | No | No | Flat | Scoop (tested in assets study) |
| 5 | **Mirrors** ×2 | x 17, y 12–13, z 1 / W−2 | 2 × 2 × 2 each | 1× | No | No | Body-colour | — |
| 6 | **Wing / spoiler** | Rear top, x L−6…L, y 12–17 (hatch end) or roof edge x 44–49 | 8 × 7 × W | 1× or 2× | No | No | None | Roof spoiler, Ducktail, GT 1×, GT 2× airfoil, Swan-neck 2× |
| 7 | **Taillights** ×2 (mirrored) or bar | Rear face, y 5–9 | 2 × 5 × 8 each | 1× | Yes (light) | No | Stock blocks | Light bar, Quad round, Smoked |
| 8 | **Rear diffuser / bumper** | Rear face, y 2–4 | 2 × 3 × W | 1× | No | No | Stock bumper | — (future) |
| 9 | **Exhaust** | Rear face, y 3–4, z W−7…W−5 | 3 × 3 × 4 | 1× or 2× | No | No | 1× square tips | 2× round |
| 10 | **Wheels** (tire + rim + brake) ×4 | Wheel centres, outer face at z −1 / W | 11 × 11 × 4 (in car blocks) | **2× only** | No | Spin only | Steel | 5-spoke, 6-spoke black + caliper, Turbofan |
| 11 | **Underglow** | Under the floor, y ≈ 1.6 above ground | Footprint of the car | Light source | Yes | Rare items only (breathe or slow blink) | None | Cyan, magenta, green, amber |
| 12 | **Livery** | All paint surfaces | — | Painted on body blocks | Premium only | Rare items only | Solid | Stripes, Flames, Two-tone, Tiger, Camo, Sunset, Checker, Circuit, Tron, Neon lines |
| 13 | **Finish** | All paint surfaces | — | Material | No | No | Gloss | Matte, Metallic, Pearl; Chrome + Chameleon pending finishes pass (A26) |

**Planned slots** (anchors to be added when first used): front lip / splitter, side skirts, roof (rack / scoop), window tint.

---

## 4. How a part is defined (data)

Parts are data, not code changes. A part definition looks like this:

```json
{
  "id": "headlights.projector_2x",
  "slot": "headlights",
  "name": "Projector 2×",
  "density": 2,
  "mirrored": true,
  "glow": "light",
  "animated": false,
  "rarity": "common",
  "price": { "currency": "voxels", "amount": 1200 },
  "voxels": "parts/headlights/projector_2x.json",
  "fits": ["*"]
}
```

- `voxels` points to a block list relative to the slot anchor, so the same part fits any car whose anchor is defined.
- `fits` is `"*"` for universal parts, or a list of car ids for car-specific parts.
- `glow`: `none` | `light` (head/tail lights) | `underglow` | `premium` (rare livery).
- `rarity` and `price` drive the store; Crowns-only items set `currency: "crowns"`.

A car definition declares its anchors:

```json
{
  "id": "panda_civix",
  "size": { "L": 58, "W": 28, "roof": 21, "ride": 1 },
  "wheels": { "radius": 5.2, "centres": [12, 46] },
  "anchors": {
    "headlights": { "x": -1, "y": 4, "z": [2, 19] },
    "grille": { "x": -1, "y": 4, "z": 10 },
    "wing": { "x": 52, "y": 12, "z": 1 },
    "taillights": { "x": 58, "y": 5, "z": [1, 20] },
    "exhaust": { "x": 58, "y": 3, "z": 21 }
  },
  "stock": { "headlights": "headlights.stock", "grille": "grille.slats", "wing": null, "taillights": "taillights.stock", "exhaust": "exhaust.x1", "wheels": "wheels.steel" }
}
```

---

## 5. Checklist for a new car

1. Body built at car density in pack style (edge highlights, light sill band, dark glass with streaks).
2. Within ±15 % of Civix dimensions; ride height and roof proportion close to the pack.
3. All 13 slot anchors defined; wheel arches sized for the 2× wheel set.
4. Every stock part chosen; at least one alternate per visible slot renders cleanly.
5. Livery masks checked on the new body (stripes, two-tone and one premium).
6. Rendered in the standard set: front ¾, side, rear ¾, race camera, hero (day + night).
7. No glow outside the allowed slots; no animation outside rare items.
