"""End-to-end check of build/VoxelCity.html in headless Chromium.
python3 tests/e2e.py [outdir]
1. Garage loads, screenshot.  2. Buy + equip Transmission T2.  3. Autoplay race → results.
4. Paddle press target, then a manual race driven through real keyboard events (Space up, Shift down) → results.  5. Reload → save persisted.  6. Test console (?dev).
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
    pg = ctx.new_page(); pg.set_default_timeout(400000); errs = []  # software GL renders the full street slowly
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)

    # 1. garage
    pg.goto(url); pg.wait_for_function("window.__vc && window.__vc.screen === 'garage'", timeout=600000); time.sleep(2)
    pg.screenshot(path=f'{out}/1-garage.png')
    ok('garage loads', pg.evaluate("window.__vc.screen") == 'garage')

    # 2. buy + equip T2 transmission via the real button
    pg.click('[data-panel="upgrades"]'); time.sleep(0.5)                                   # Garage HUD: Upgrades panel
    v0, p2 = pg.evaluate("[window.__vc.save.voxels, window.__vc.partPrice('trans', 2, 'D')]")
    pg.click('button.tier[data-kind="trans"][data-tier="2"]'); time.sleep(1.5)
    s = pg.evaluate("window.__vc.save")
    ok('buy T2 transmission (price from the economy file)', s['equipped']['trans'] == 2 and 2 in s['owned']['trans'] and s['voxels'] == v0 - p2, json.dumps(s) + f' start {v0} price {p2}')
    pg.screenshot(path=f'{out}/2-garage-after-buy.png')

    # 3. autoplay race (reload with ?autoplay so the player car drives itself)
    pg.goto(url + '?autoplay=1&maxdt=10'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)
    pg.click('#raceBtn'); pg.click('#streetRace')
    pg.wait_for_function("window.__vc.race && window.__vc.race.t > 1.2", timeout=600000); pg.screenshot(path=f'{out}/3-countdown.png')
    pg.wait_for_function("window.__vc.race.raceTime > 6", timeout=600000); pg.screenshot(path=f'{out}/4-racing.png')
    pg.wait_for_function("window.__vc.race.racers[0].x > window.__vc.race.distanceM - 120", timeout=600000); pg.screenshot(path=f'{out}/5-finish-approach.png')
    pg.wait_for_function("window.__vc.screen === 'results'", timeout=600000); time.sleep(1)
    pg.screenshot(path=f'{out}/6-results.png')
    r = pg.evaluate("window.__vc.lastResult")
    pl = pg.evaluate("window.__vc.race.racers[0].shifts.length")
    ok('autoplay race completes', r is not None and 20 < r['myTime'] < 30, json.dumps(r))
    ok('T2 box = 4 shifts', pl == 4, str(pl))
    # results screen is readable: nothing covers the heading, the Garage button is button-sized (owner bug 2026-10-18)
    lay = pg.evaluate("""(() => { const h = document.querySelector('#results h1'), b = document.querySelector('#toGarage'); if (!h || !b) return null;
      const r = h.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), bb = b.getBoundingClientRect();
      return { headingOnTop: top === h || h.contains(top), btnH: bb.height, btnW: bb.width }; })()""")
    ok('results screen readable (heading visible, Garage button normal size)', lay and lay['headingOnTop'] and lay['btnH'] < 90 and lay['btnW'] < 300, json.dumps(lay))
    pg.click('#toGarage'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)

    # 4. manual race: real Space key presses, timed off the live rpm
    pg.goto(url + '?norender=1'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)
    pg.click('#raceBtn'); pg.click('#streetRace'); pg.wait_for_function("window.__vc.race && window.__vc.race.racers.length === 2", timeout=600000)
    # 4a. paddle: a real mouse press on the visible paddle hits the press target and shows the pressed state (HUD S20)
    box = pg.evaluate("(() => { const e = document.querySelector('.hud2 .paddle').getBoundingClientRect(); return { x: e.right - 12, y: e.top + e.height / 2 }; })()")
    tgt = pg.evaluate(f"document.elementFromPoint({box['x']}, {box['y']}).className")
    pg.mouse.move(box['x'], box['y']); pg.mouse.down(); time.sleep(0.2)
    down = pg.evaluate("document.querySelector('.hud2 .paddle').classList.contains('down')")
    pg.mouse.up(); time.sleep(0.2)
    up = not pg.evaluate("document.querySelector('.hud2 .paddle').classList.contains('down')")
    ok('paddle press target + pressed state', tgt == 'paddle-hit' and down and up, f'target={tgt} down={down} released={up}')
    # 4b. gas pedal (launch control): holding it revs the engine before the green; the pod leaves after the launch
    pb = pg.evaluate("(() => { const e = document.querySelector('.hud2 .pedal-pod').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + 60 }; })()")
    rpm0 = pg.evaluate("window.__vc.race.racers[0].rpm")
    pg.mouse.move(pb['x'], pb['y']); pg.mouse.down()
    try: pg.wait_for_function(f"window.__vc.race.racers[0].rpm > {rpm0 + 300}", timeout=60000)   # software GL runs few frames per second
    except Exception: pass
    rpm1 = pg.evaluate("window.__vc.race.racers[0].rpm"); held_look = pg.evaluate("document.querySelector('.hud2 .pedal').classList.contains('down')")
    pg.mouse.up()
    ok('gas pedal revs before the launch', rpm1 > rpm0 + 300 and held_look, f'rpm {rpm0:.0f} -> {rpm1:.0f}, pressed look {held_look}')
    held = False; t0 = time.time(); shifts_pressed = 0; downed = False; pod_gone = None
    while time.time() - t0 < 240:
        st = pg.evaluate("(() => { const r = window.__vc.race, p = r.racers[0]; return { t: r.t, green: r.green, launched: p.launched, frac: p.rpm / p.stats.redline, zone: p.stats.trans.zoneCentre, gear: p.gear, done: r.done, shifting: p.shifting, screen: window.__vc.screen }; })()")
        if st['screen'] == 'results' or st['done']: break
        if st['launched'] and pod_gone is None:
            time.sleep(0.1); pod_gone = pg.evaluate("document.querySelector('.hud2 .pedal-pod').classList.contains('gone')")
        if not st['launched']:
            want = (st['frac'] < 0.62) if not st['green'] else False
            if want and not held: pg.keyboard.down('Space'); held = True
            elif not want and held: pg.keyboard.up('Space'); held = False
        elif st['gear'] == 2 and not downed and st['shifting'] <= 0 and st['frac'] < 0.75:
            pg.keyboard.press('ShiftLeft'); downed = True; time.sleep(0.15)          # downshift paddle via the real key
        elif st['shifting'] <= 0 and st['frac'] >= st['zone'] - 0.03:
            pg.keyboard.down('Space'); pg.keyboard.up('Space'); shifts_pressed += 1; time.sleep(0.15)
        time.sleep(0.02)
    pg.wait_for_function("window.__vc.screen === 'results'", timeout=600000); time.sleep(1)
    pg.screenshot(path=f'{out}/7-results-manual.png')
    m = pg.evaluate("(() => { const p = window.__vc.race.racers[0]; return { launch: p.launchGrade, shifts: p.shifts.map(s => s.grade), finish: p.finish, downshifts: p.downshifts }; })()")
    ok('manual race via Space key', m['finish'] and len(m['shifts']) >= 3, json.dumps(m))
    ok('downshift via Shift key', m['downshifts'] == 1, json.dumps(m))
    ok('gas pedal leaves after the launch', pod_gone is True, str(pod_gone))

    # 5. persistence across reload
    before = pg.evaluate("window.__vc.save")
    pg.reload(); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)
    after = pg.evaluate("window.__vc.save")
    ok('save survives reload', after['races'] == before['races'] == 2 and after['voxels'] == before['voxels'] and after['equipped']['trans'] == 2, json.dumps(after))
    ok('paddle save: both shapes standard, perfect shifts counted', sorted(after['paddles']['shapes']) == ['arc', 'tab'] and after['paddles']['equipped'] == 'stock' and after['perfectShifts'] == before['perfectShifts'], json.dumps(after['paddles']) + f" perfectShifts={after['perfectShifts']}")
    pg.screenshot(path=f'{out}/8-garage-after-races.png')
    # 6. test console (owner Q58): ?dev turns it on, ` opens it; +10,000 VX and unlimited (free purchases) work
    pg.goto(url + '?dev&norender=1'); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)
    v0 = pg.evaluate("window.__vc.save.voxels")
    pg.keyboard.press('Backquote'); pg.click('.dev-panel [data-a="vx10k"]'); time.sleep(0.3)
    v1 = pg.evaluate("window.__vc.save.voxels")
    pg.click('.dev-panel [data-a="unl"]'); time.sleep(0.3)
    pg.screenshot(path=f'{out}/9-dev-console.png')
    pg.keyboard.press('Backquote'); time.sleep(0.3)                 # close the console so it doesn't cover the garage
    pg.click('[data-panel="upgrades"]'); time.sleep(0.5)
    pg.click('button.tier[data-kind="engine"][data-tier="5"]'); time.sleep(1)
    s6 = pg.evaluate("window.__vc.save")
    ok('test console: +10,000 VX and free purchases', v1 == v0 + 10000 and 5 in s6['owned']['engine'] and s6['voxels'] == v1, f'{v0} -> {v1} -> {s6["voxels"]}, engine {s6["owned"]["engine"]}')
    # 7. Catalog (owner Q76): pick a car, change paint, toggle pop-up lamps — no errors, Typing Race shows Coming soon
    pg.click('[data-panel="catalog"]'); time.sleep(0.5); pg.click('[data-car="tuner"]'); time.sleep(0.5)
    pg.click('[data-paint="#2f9a5a"]'); time.sleep(0.3); pg.click('[data-opt="popups"][data-val="up"]'); time.sleep(0.5)
    cat_ok = pg.evaluate("!!document.querySelector('.cat-card.on[data-car=\"tuner\"]') && !!document.querySelector('[data-opt=\"popups\"][data-val=\"up\"].on')")
    pg.screenshot(path=f'{out}/10-catalog.png')
    pg.click('#raceBtn'); time.sleep(0.3); soon = pg.evaluate("(document.querySelector('.g-soon')||{}).textContent")
    ok('catalog: select car, paint, pop-ups; typing race = coming soon', cat_ok and soon == 'Coming soon', f'{cat_ok} {soon}')
    pg.click('#raceBtn'); time.sleep(0.3)                             # close the race menu again
    thumbs = pg.evaluate("[...document.querySelectorAll('.cat-card img.cat-thumb')].filter(i => i.src.startsWith('data:image/png') && i.naturalWidth > 100).length")
    cards = pg.evaluate("document.querySelectorAll('.cat-card').length")
    ok('catalog cards: a 3D still, name and price for every car', cards == 14 and thumbs == 14, f'{cards} cards, {thumbs} thumbnails')
    # 8. Buying and using cars (owner Q79): unlimited off, real price comes off; the bought car keeps the paint/options picked
    pg.keyboard.press('Backquote'); pg.click('.dev-panel [data-a="unl"]'); time.sleep(0.3); pg.click('.dev-panel [data-a="vx100k"]'); time.sleep(0.3)
    for _ in range(5): pg.click('.dev-panel [data-a="vx100k"]'); time.sleep(0.2)
    pg.keyboard.press('Backquote'); time.sleep(0.3)
    tprice = pg.evaluate("window.__vc.cars.tuner.price")
    vb = pg.evaluate("window.__vc.save.voxels")
    pg.click('#buyCar'); time.sleep(1)
    s8 = pg.evaluate("window.__vc.save")
    t = s8['cars'].get('tuner', {})
    ok('buy a car: price paid, in use, paint/options kept, stock parts', s8['carId'] == 'tuner' and s8['voxels'] == vb - tprice and t.get('paint') == '#2f9a5a' and t.get('opts', {}).get('popups') == 'up' and s8['owned']['engine'] == [1] and 5 in s8['cars']['panda_civix']['owned']['engine'], json.dumps({k: s8[k] for k in ('carId', 'voxels', 'owned', 'cars')}) + f' before {vb}')
    pg.screenshot(path=f'{out}/11-bought.png')
    # Crowns-only car (owner 2026-10-18): can't buy with Voxels; +300 Crowns buys it and only Crowns are spent
    pg.click('[data-car="perfhatch"]'); time.sleep(0.5)
    cr0 = pg.evaluate("[document.querySelector('#buyCar').disabled, document.querySelector('#buyCar').textContent]")
    pg.keyboard.press('Backquote'); pg.click('.dev-panel [data-a="cr100"]'); pg.click('.dev-panel [data-a="cr100"]'); pg.click('.dev-panel [data-a="cr100"]'); time.sleep(0.3); pg.keyboard.press('Backquote'); time.sleep(0.3)
    vbc = pg.evaluate("[window.__vc.save.voxels, window.__vc.save.crowns]")
    pg.click('#buyCar'); time.sleep(1)
    sc = pg.evaluate("[window.__vc.save.voxels, window.__vc.save.crowns, window.__vc.save.carId]")
    ok('Crowns-only car: locked without Crowns, bought with Crowns only', cr0[0] and 'Crowns' in cr0[1] and sc[0] == vbc[0] and sc[1] == vbc[1] - 150 and sc[2] == 'perfhatch', json.dumps([cr0, vbc, sc]))
    pg.click('[data-car="panda_civix"]'); time.sleep(0.5); pg.click('#useCar'); time.sleep(0.8)
    civ = pg.evaluate("window.__vc.save")
    pg.click('[data-car="tuner"]'); time.sleep(0.5); pg.click('#useCar'); time.sleep(0.8)
    tun = pg.evaluate("window.__vc.save")
    ok('switching cars swaps each car\'s own parts', civ['carId'] == 'panda_civix' and 5 in civ['owned']['engine'] and tun['carId'] == 'tuner' and tun['owned']['engine'] == [1], f"civix {civ['owned']} / tuner {tun['owned']}")
    pg.reload(); pg.wait_for_function("window.__vc.screen === 'garage'", timeout=600000)
    title = pg.evaluate("document.querySelector('.g-title h1').textContent")
    pg.click('#raceBtn'); time.sleep(0.3)
    sc = pg.evaluate("[(document.querySelector('#stripOpen')||{}).textContent || '', [...document.querySelectorAll('[data-dist]')].map(b => b.textContent), document.querySelector('#streetRace').textContent]")
    dif = pg.evaluate("[...document.querySelectorAll('[data-diff]')].map(b => b.textContent)")
    ok('race menu: the Strip (league of your car, level 1), Easy / Medium / Hard, 600 / 700 / 800 m, no rival upgrades shown', 'League A' in sc[0] and 'Level 1 of 60' in sc[0] and sc[1] == ['600 m', '700 m', '800 m'] and dif == ['Easy', 'Medium', 'Hard'] and 'engine T' not in sc[2] and 'Downtown Dash' in sc[2], json.dumps([sc, dif]))
    # the Strip screen (owner: sliding level scroller like CSR; L1 100 VX, every 10th +5 Crowns, claimed once)
    pg.click('#stripOpen'); time.sleep(1)
    st = pg.evaluate("[document.querySelectorAll('.sl-card').length, (document.querySelector('.sl-card.next')||{}).dataset?.level, document.querySelector('[data-level=\"1\"]').textContent, document.querySelector('[data-level=\"10\"]').textContent]")
    pg.keyboard.press('Backquote'); pg.click('.dev-panel [data-a="strip10"]'); time.sleep(0.5); pg.keyboard.press('Backquote'); time.sleep(0.3)
    w0 = pg.evaluate("[window.__vc.save.voxels, window.__vc.save.crowns, document.querySelectorAll('[data-claim]').length]")
    pg.click('[data-claim="10"]'); time.sleep(0.5); pg.click('[data-claim="1"]'); time.sleep(0.5)
    w1 = pg.evaluate("[window.__vc.save.voxels, window.__vc.save.crowns, document.querySelectorAll('[data-claim]').length, window.__vc.save.stripClaimed, window.__vc.save.decals]")
    exp = pg.evaluate("(() => { const a = window.__vc.levelReward('A', 10), b = window.__vc.levelReward('A', 1); return a.vx + a.cash + b.vx + b.cash; })()")
    pg.screenshot(path=f'{out}/12-strip.png')
    ok('Strip screen: 60 level cards; claim boss L10 (+5 Crowns, cash, decal) and L1, once each', st[0] == 60 and st[1] == '1' and 'VX' in st[2] and '+5' in st[3] and 'Decal' in st[3] and w0[2] == 10 and w1[1] == w0[1] + 5 and w1[0] == w0[0] + exp and w1[2] == 8 and w1[4] == ['decal_A_1'], json.dumps([st[:2], w0, w1, exp]))
    pg.click('.strip-wrap .g-close'); time.sleep(0.3)
    # Parts screen (owner 2026-10-19): side tabs, 3D close-up cards, buy once → fitted; owned for every car
    pg.click('[data-panel="parts"]'); time.sleep(1); pg.click('[data-part="spoiler.gt"]'); time.sleep(0.5)
    pa = pg.evaluate("[document.querySelectorAll('.pt-tab').length, document.querySelectorAll('.pt-tab.soon').length, document.querySelectorAll('.pt-card img.cat-thumb').length, window.__vc.save.voxels, window.__vc.cosmeticPrice('spoiler.gt').price]")
    pg.click('#buyPart'); time.sleep(1)
    pb = pg.evaluate("[window.__vc.save.voxels, window.__vc.save.partsOwned, window.__vc.save.cars.tuner.parts]")
    ok('Parts: tabs + close-up cards; buying a GT wing fits it to this car and owns it for all cars', pa[0] == 15 and pa[1] == 10 and pa[2] == 6 and pb[0] == pa[3] - pa[4] and 'spoiler.gt' in pb[1] and pb[2].get('spoiler') == 'spoiler.gt', json.dumps([pa, pb]))
    pg.click('.cat-under .g-close'); time.sleep(0.3); pg.click('#raceBtn'); time.sleep(0.3)
    pg.click('#streetRace'); pg.wait_for_function("window.__vc.screen === 'race'", timeout=600000)
    rl = pg.evaluate("window.__vc.race.racers[0].stats.redline")
    rv = pg.evaluate("[window.__vc.opp.name, window.__vc.opp.carId, window.__vc.race.racers[1].stats.car.league, window.__vc.opp.expect - window.__vc.opp.yours]")
    ok('random rival from your league, close to your perfect run', rv[2] == 'A' and 0 < rv[3] < 0.4, json.dumps(rv))
    ok('race in the bought car (survives reload)', title == 'Tuner coupe' and rl == 8000, f'title {title!r}, redline {rl}')
    ok('no page errors', not errs, json.dumps(errs[:5]))
    b.close()
print(json.dumps(results))
sys.exit(0 if all(results.values()) else 1)
