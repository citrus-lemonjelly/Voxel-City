"""Convert MagicaVoxel OBJ exports (palette-textured quads) back into a voxel grid.
Usage: python3 -I obj2vox.py <in.obj> <palette.png> <out.json>
Output JSON: {name, size:[X,Y,Z], palette:{idx:'#rrggbb'}, voxels:[[x,y,z,idx],...]} with y up, min corner at 0.
"""
import sys, json, math
from collections import Counter
from PIL import Image

obj, pal_png, out = sys.argv[1:4]
pal = Image.open(pal_png).convert('RGBA')
V, VT, VN = [], [], []
faces = []
for line in open(obj):
    p = line.split()
    if not p: continue
    if p[0] == 'v': V.append(tuple(round(float(t) * 20, 3) for t in p[1:4]))  # 0.05 units per voxel
    elif p[0] == 'vt': VT.append(tuple(map(float, p[1:3])))
    elif p[0] == 'vn': VN.append(tuple(map(float, p[1:4])))
    elif p[0] == 'f':
        idx = [tuple(int(t) if t else 0 for t in c.split('/')) for c in p[1:]]
        faces.append(idx)

cells = {}
for f in faces:
    pts = [V[i[0] - 1] for i in f]
    n = VN[f[0][2] - 1]
    u = sum(VT[i[1] - 1][0] for i in f) / len(f)
    ci = min(255, int(u * 256))
    mins = [min(p[k] for p in pts) for k in range(3)]
    maxs = [max(p[k] for p in pts) for k in range(3)]
    axis = [k for k in range(3) if abs(n[k]) > .5][0]
    plane = mins[axis]
    rng = []
    for k in range(3):
        if k == axis:
            rng.append([plane - 0.5 * n[k]])
        else:
            a, b = round(mins[k]), round(maxs[k])
            rng.append([c + 0.5 for c in range(a, b)])
    for x in rng[0]:
        for y in rng[1]:
            for z in rng[2]:
                cells[(math.floor(x), math.floor(y), math.floor(z))] = ci

# MagicaVoxel OBJ: y is up already. Normalise to min corner 0.
mn = [min(c[k] for c in cells) for k in range(3)]
vox = [[c[0] - mn[0], c[1] - mn[1], c[2] - mn[2], ci] for c, ci in cells.items()]
size = [max(v[k] for v in vox) + 1 for k in range(3)]
used = Counter(v[3] for v in vox)
palette = {str(i): '#%02x%02x%02x' % pal.getpixel((i, 0))[:3] for i in used}
json.dump({'name': obj.rsplit('/', 1)[-1][:-4], 'size': size, 'palette': palette, 'voxels': vox}, open(out, 'w'))
print(out, 'size', size, 'surface voxels', len(vox), 'colours', len(used))
for i, n in used.most_common():
    print('  ', i, palette[str(i)], n)
