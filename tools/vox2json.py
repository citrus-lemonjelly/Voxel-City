"""MagicaVoxel .vox → compact voxel JSON for the game (y = up in our frame).
Output: {size:[x,y,z], palette:['#rrggbb',...], data: base64 of bytes x,y,z,paletteIndex per voxel}
Usage: python3 tools/vox2json.py in.vox out.json      (add --plain for [[x,y,z,'#hex'],...] instead)"""
import struct, sys, json
def default_palette():
    # MagicaVoxel's built-in palette (used when a file has no RGBA chunk): 6x6x6 cube, then red/green/blue/grey ramps
    v = [0xff, 0xcc, 0x99, 0x66, 0x33, 0x00]; pal = []
    for r in v:
        for g in v:
            for b in v:
                if (r, g, b) != (0, 0, 0): pal.append((r, g, b))
    ramp = [0xee, 0xdd, 0xbb, 0xaa, 0x88, 0x77, 0x55, 0x44, 0x22, 0x11]
    pal += [(x, 0, 0) for x in ramp] + [(0, x, 0) for x in ramp] + [(0, 0, x) for x in ramp] + [(x, x, x) for x in ramp]
    return pal + [(0, 0, 0)]
def read(path):
    d = open(path, 'rb').read()
    assert d[:4] == b'VOX ', 'not a .vox file'
    i, models, sizes, pal = 8, [], [], None
    def chunks(start, end):
        j = start
        while j < end:
            cid, n, m = d[j:j+4].decode(), *struct.unpack('<ii', d[j+4:j+12])
            yield cid, j + 12, n, m
            j += 12 + n + m
    for cid, off, n, m in chunks(8, len(d)):
        if cid != 'MAIN': continue
        for cid2, off2, n2, m2 in chunks(off + n, off + n + m):
            if cid2 == 'SIZE': sizes.append(struct.unpack('<iii', d[off2:off2+12]))
            elif cid2 == 'XYZI':
                cnt = struct.unpack('<i', d[off2:off2+4])[0]
                models.append([tuple(d[off2+4+k*4: off2+8+k*4]) for k in range(cnt)])
            elif cid2 == 'RGBA':
                pal = [tuple(d[off2+k*4: off2+k*4+3]) for k in range(256)]
    return sizes, models, pal
DEF = default_palette()
if __name__ == '__main__':
    sizes, models, pal = read(sys.argv[1])
    out = []
    for (sx, sy, sz), vox in zip(sizes, models):
        # MagicaVoxel is z-up; convert to y-up: (x, y, z) -> (x, z, y)
        vs = []
        for x, y, z, ci in vox:
            r, g, b = (pal or DEF)[ci - 1]
            vs.append([x, z, y, '#%02x%02x%02x' % (r, g, b)])
        out.append({'size': [sx, sz, sy], 'voxels': vs})
    if '--plain' not in sys.argv:
        import base64
        for m in out:
            pal = sorted({v[3] for v in m['voxels']}); pi = {c: i for i, c in enumerate(pal)}
            assert max(m['size']) < 256 and len(pal) < 256
            m['data'] = base64.b64encode(bytes(b for v in m['voxels'] for b in (v[0], v[1], v[2], pi[v[3]]))).decode()
            m['palette'] = pal; del m['voxels']
    json.dump(out if len(out) > 1 else out[0], open(sys.argv[2], 'w'))
