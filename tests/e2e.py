"""End-to-end check of build/VoxelCity.html in headless Chromium.
python3 tests/e2e.py [outdir]
1. Garage loads, screenshot.  2. Buy + equip Transmission T2.  3. Autoplay race → results.
4. Manual race driven through real keyboard events (Space) → results.  5. Reload → save persisted.
"""
import sys, os, time, json
from playwright.sync_api import sync_playwright

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'build', 'e2e')
os.makedirs(out, exist_ok=True)
url = 'file://' + os.path.join(root, 'build', 'VoxelCity.html')
results = {}
def ok(name, cond, detail=''):
    results[name] = bool(cond); print(('PASS ' if cond else 'FAIL ') + name, detail, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', headless=True,
                          args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'])
    ctx = b.new_context(viewport={'width': 1600, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)

    # 1. garage
    pg.goto(url); pg.wait_for_function("window.__vc && window.__vc.screen === 'garage'", timeout=60000); time.sleep(2)
    pg.screenshot(path=f'{out}/1-garage.png')
    ok('garage loads', pg.evaluate("window.__vc.screen") == 'garage')

    # 2. buy + equip T2 transmission via the real button
    pg.click('button.tier[data-kind="trans"][data-tier="2"]'); time.sleep(1.5)
    s = pg.evaluate("window.__vc.save")
    ok('buy T2 transmission', s['equipped']['trans'] == 2 and 2 in s['owned']['trans'] and s['voxels'] == 300, json.dumps(s))
    pg.screenshot(path=f'{out}/2-garage-after-buy.png')

    # 3. autoplay race (reload with ?autoplay so the player car drives itself)
    pg.goto(url + '?autoplay=1&maxdt=10'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=60000)
    pg.click('#raceBtn')
    pg.wait_for_function("window.__vc.race && window.__vc.race.t > 1.2", timeout=60000); pg.screenshot(path=f'{out}/3-countdown.png')
    pg.wait_for_function("window.__vc.race.raceTime > 6", timeout=120000); pg.screenshot(path=f'{out}/4-racing.png')
    pg.wait_for_function("window.__vc.race.racers[0].x > window.__vc.race.distanceM - 120", timeout=180000); pg.screenshot(path=f'{out}/5-finish-approach.png')
    pg.wait_for_function("window.__vc.screen === 'results'", timeout=180000); time.sleep(1)
    pg.screenshot(path=f'{out}/6-results.png')
    r = pg.evaluate("window.__vc.lastResult")
    pl = pg.evaluate("window.__vc.race.racers[0].shifts.length")
    ok('autoplay race completes', r is not None and 20 < r['myTime'] < 30, json.dumps(r))
    ok('T2 box = 4 shifts', pl == 4, str(pl))

    # 4. manual race: real Space key presses, timed off the live rpm
    pg.click('#again')
    pg.goto(url + '?norender=1'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=60000)
    pg.click('#raceBtn'); pg.wait_for_function("window.__vc.race && window.__vc.race.racers.length === 2", timeout=60000)
    held = False; t0 = time.time(); shifts_pressed = 0
    while time.time() - t0 < 240:
        st = pg.evaluate("(() => { const r = window.__vc.race, p = r.racers[0]; return { t: r.t, green: r.green, launched: p.launched, frac: p.rpm / p.stats.redline, zone: p.stats.trans.zoneCentre, gear: p.gear, done: r.done, shifting: p.shifting, screen: window.__vc.screen }; })()")
        if st['screen'] == 'results' or st['done']: break
        if not st['launched']:
            want = (st['frac'] < 0.62) if not st['green'] else False
            if want and not held: pg.keyboard.down('Space'); held = True
            elif not want and held: pg.keyboard.up('Space'); held = False
        elif st['shifting'] <= 0 and st['frac'] >= st['zone'] - 0.03:
            pg.keyboard.down('Space'); pg.keyboard.up('Space'); shifts_pressed += 1; time.sleep(0.15)
        time.sleep(0.02)
    pg.wait_for_function("window.__vc.screen === 'results'", timeout=120000); time.sleep(1)
    pg.screenshot(path=f'{out}/7-results-manual.png')
    m = pg.evaluate("(() => { const p = window.__vc.race.racers[0]; return { launch: p.launchGrade, shifts: p.shifts.map(s => s.grade), finish: p.finish }; })()")
    ok('manual race via Space key', m['finish'] and len(m['shifts']) >= 3, json.dumps(m))

    # 5. persistence across reload
    before = pg.evaluate("window.__vc.save")
    pg.reload(); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=60000)
    after = pg.evaluate("window.__vc.save")
    ok('save survives reload', after['races'] == before['races'] == 2 and after['voxels'] == before['voxels'] and after['equipped']['trans'] == 2, json.dumps(after))
    pg.screenshot(path=f'{out}/8-garage-after-races.png')
    ok('no page errors', not errs, json.dumps(errs[:5]))
    b.close()
print(json.dumps(results))
sys.exit(0 if all(results.values()) else 1)
