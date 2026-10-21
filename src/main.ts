// Voxel City — Step 1 vertical slice: Garage Terminal → race → results → race again.
import { World } from './render/scene';
import { prewarmVehicles, TimeOfDay } from './render/stage';
import { STOCK_LOOK, CarLook } from './render/carBuilder';
import { CSS } from './ui/styles';
import { renderResults, ResultData } from './ui/screens';
import { renderGarage, garageInCatalog, garageOpenStrip } from './ui/garage';
import { Hud } from './ui/hud';
import { VERSION, CHANGELOG } from './data/changelog';
import { watchForUpdates, reloadInto, RemoteBuild } from './game/updates';
import { loadSave, writeSave, SaveV1, addCar, RaceDist } from './save/save';
import { STAGES, START_STAGE } from './data/stages';
import { ECONOMY, DIFFICULTY, racePay, Difficulty, partPrice, cosmeticPrice } from './data/economy';
import { Tier } from './data/parts';
import { CARS, carBody, carName, carPaint } from './data/cars';
import { makeRival, Rival } from './game/rivals';
import { lookParts, randomParts } from './data/visualParts';
import { stripRung, STRIP, Rung, levelReward, decalName } from './game/strip';
import { Race, Racer, Controller } from './game/race';
import { AIController, makeRng } from './game/ai';
import { carStats } from './game/stats';
import { DEV, devOppSkill, devTime, initDevConsole } from './ui/devConsole';
import { freshSave, typingStats } from './save/save';
import { TypingRun, TypingRival, makeTypingRace, averageFor, typedBy, placeOf, wpmOf, glide } from './game/typing';
import { TypingHud, renderTypingResults } from './ui/typingHud';
import { openCarLab } from './ui/carLab';
import { keysOf, keyMatches, keyName, DEFAULT_KEYS } from './game/keys';
import { TYPE_TRACK, laneZ } from './render/typingView';
import { typingPay, TYPING } from './data/economy';
import { dailyEvent } from './game/daily';
import { partFits } from './render/bodies';
import { garageActions } from './game/garageActions';

const params = new URLSearchParams(location.search);
const AUTOPLAY = params.has('autoplay');          // test hook: the player car drives itself
const MAX_DT = +(params.get('maxdt') || 0.25);
const FAST = Math.max(1, +(params.get('fast') || 1));   // test hook: run the game clock N× faster (smoke tests)     // test hook: let slow (software-rendered) frames advance the clock fully
let NO_RENDER = params.has('norender');           // test hook: skip 3D drawing during races (input-timing tests)
let paused = false;                               // preview hook: freeze physics while posing cars

document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
document.body.innerHTML = '<div id="stage"></div><div id="ui" class="overlay"></div>';
const stageEl = document.getElementById('stage')!, ui = document.getElementById('ui')!;
const world = new World(stageEl);
let save: SaveV1 = loadSave();
world.autoSpin = save.settings.spin !== 'off';
world.setGarageDoor(save.settings.door !== 'closed');
world.setGarageCam(save.settings.gcam ?? 'd');
// URL overrides for previews/tests (?camset=close&time=night&near=barrier)
if (params.get('camset')) save.settings.camera = params.get('camset') as any;
const urlTime = params.get('time') as TimeOfDay | null;
if (params.get('near')) save.settings.nearSide = params.get('near') as any;
if (params.get('blur')) save.settings.blur = params.get('blur') as any;
world.setCameraPreset(save.settings.camera);
world.setBlur(save.settings.blur);
if (params.get('cam')) world.camMode = params.get('cam') as any;
if (params.get('elev')) world.camFrame.elev = +params.get('elev')!;
if (params.get('lyaw')) world.camFrame.levelYaw = +params.get('lyaw')!;
if (params.get('dmin')) { world.camFrame.dMin = +params.get('dmin')!; world.camFrame.dMax = Math.max(world.camFrame.dMax, world.camFrame.dMin); }
const stage = STAGES[START_STAGE];
/** A new random rival for the car + upgrades in use (owner Q87); rolled again after every race or when the car/parts change. */
let opp: Rival, oppKey = '';
const rivalKey = () => `${save.carId}:${JSON.stringify(save.equipped)}:${save.raceDist}:${save.raceDiff}`;
function rollRival(force = false) {
  if (!force && oppKey === rivalKey() && opp) return;
  const seed = params.get('rseed') ? +params.get('rseed')! : undefined;                 // test hook: fixed rival
  opp = makeRival(save.carId, save.equipped, stage, seed, save.raceDist, DIFFICULTY[save.raceDiff].gap); oppKey = rivalKey();
}
rollRival();
/** The car in use, as the player has painted and optioned it (Q79). */
const lookFor = (id: string): CarLook => {
  const c = save.cars[id];
  return { ...STOCK_LOOK, body: carBody(id).profile ?? 'civix', paint: c?.paint || carPaint(id), opts: { ...(c?.opts || {}) }, parts: lookParts(c?.parts), plateText: c?.plateText };
};
const playerLook = (): CarLook => lookFor(save.carId);
// rivals wear random visual parts (owner Q118), rolled from their seed so a rival looks the same all race
const oppLook = (): CarLook => ({ ...STOCK_LOOK, body: carBody(opp.carId).profile ?? 'civix', paint: opp.paint, parts: rivalParts(opp.carId, (opp as any).seed) });
/** Rival cars wear random parts that fit their body. */
function rivalParts(carId: string, seed: number) { const body = carBody(carId).profile ?? 'civix'; return randomParts(makeRng(seed ^ 0x5eed), 0.45, (s, v) => partFits(body, s, v)); }

// ---------------- input: SPACE or the on-screen Shift button ----------------
const input = { held: false, shiftQueued: false, downQueued: false };
let playerRacer: Racer | null = null;
// Space = gas before the launch (owner: gas pedal for launch control), upshift after it
function press() { input.held = true; if (playerRacer?.launched) { input.shiftQueued = true; hud?.setPressed(true); } else hud?.setGas(true); }
function release() { input.held = false; hud?.setPressed(false); hud?.setGas(false); }
/** The "+" paddle only shifts — before the launch it does nothing (the gas pedal revs). */
function paddlePress() { hud?.setPressed(true); if (playerRacer?.launched) input.shiftQueued = true; }
function paddleRelease() { hud?.setPressed(false); }
// downshift (left "−" paddle): Shift or ↓ — owner request, for when an upshift came too early
// keys come from Settings ▸ Controls (owner 2026-10-19)
function downPress() { if (playerRacer?.launched) input.downQueued = true; hud?.setDownPressed(true); }
function downRelease() { hud?.setDownPressed(false); }
window.addEventListener('keydown', e => {
  if (screen === 'typing') return typingKey(e);                       // the Typing Race takes every key
  const K = keysOf(save.settings).drag;
  if (keyMatches(e.code, K.gas)) { e.preventDefault(); if (!e.repeat) press(); }
  else if (keyMatches(e.code, K.down) && screen === 'race') { e.preventDefault(); if (!e.repeat) downPress(); }
});
window.addEventListener('keyup', e => {
  if (screen === 'typing') return;
  const K = keysOf(save.settings).drag;
  if (keyMatches(e.code, K.gas)) { e.preventDefault(); release(); }
  else if (keyMatches(e.code, K.down)) downRelease();
});
class PlayerController implements Controller {
  held() { return input.held; }
  shift() { const q = input.shiftQueued; input.shiftQueued = false; return q; }
  downshift() { const q = input.downQueued; input.downQueued = false; return q; }
}

// ---------------- screens ----------------
type Screen = 'garage' | 'race' | 'results' | 'typing' | 'lab';
let screen: Screen = 'garage';
let race: Race | null = null, hud: Hud | null = null, oppRacer: Racer | null = null, finishedAt = 0;

function showGarage(toast?: string) {
  screen = 'garage'; world.mode = 'garage'; setTimeout(showUpdate, 0); rollRival(); if (!garageInCatalog()) world.setGarageCar(playerLook());
  renderGarage(ui, save, opp, stage, { onBuyOrEquip: buyOrEquip, onGearing: setGearing, onRace: () => startRace(), onStrip: startStrip, stripNext, onClaim: claimLevel, onSetting: setSetting, onRepaint: repaint, onPlateText: setPlateText,
    onPreview: look => world.setGarageCar(look ?? playerLook()), onView: v => world.setGarageView(v), onFace: d => world.faceGarage(d),
    onBuyCar: buyCar, onUseCar: useCar, onCarStyle: carStyle, onBuyPart: buyPart, onFitPart: (id: string, carId: string) => fitPart(id, undefined, carId),
    onFav: (id: string) => { const f = save.favs ??= []; const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); writeSave(save); showGarage(); }, onDistance: setDistance, onDifficulty: setDifficulty, thumb: (look, view) => world.thumbnail(look, undefined, undefined, view), playerLook,
    onNotesSeen: () => { save.seenVersion = VERSION; writeSave(save); },
    onKeyBind: (mode, action, code) => {
      const k = (save.settings.keys ??= {});
      if (!code) { delete (k as any)[mode]; writeSave(save); return showGarage(`${mode === 'drag' ? 'Drag Race' : 'Typing Race'} keys reset`); }
      const cur = keysOf(save.settings)[mode] as Record<string, string>, other = Object.keys(cur).find(a => a !== action && keyMatches(code, cur[a]));
      const next = { ...cur, [action]: code } as any; if (other) next[other] = cur[action];      // taken? swap the two
      (k as any)[mode] = next; writeSave(save); showGarage(`${keyName(code)} set${other ? ` (swapped with ${keyName(cur[action])})` : ''}`);
    }, onTyping: () => startTyping(),
    onClaimDaily: claimDailyTask, onClaimCal: claimCal, onSellCar: sellCar, onBuySlot: buySlot }, toast);
}
// buying, selling, claiming, fitting, painting, equipping: src/game/garageActions.ts
const { buyCar, sellCar, buySlot, claimDailyTask, claimCal, useCar, buyPart, repaint, setPlateText, fitPart, carStyle, setDistance, setDifficulty, buyOrEquip, setGearing } =
  garageActions({ save: () => save, world, show: msg => showGarage(msg), lookFor, playerLook });

/** Time of day for a race (owner 2026-10-20): random every race, unless ?time= or the test console forces one. */
function raceTime(): TimeOfDay {
  const forced = urlTime || devTime();
  if (forced) return forced;
  const all: TimeOfDay[] = ['day', 'dusk', 'night'];
  return all[Math.floor(Math.random() * all.length)];
}


function setSetting(key: string, value: string) {
  (save.settings as any)[key] = value; writeSave(save);
  if (key === 'camera') world.setCameraPreset(value as any);
  if (key === 'blur') world.setBlur(value as any);
  if (key === 'spin') world.autoSpin = value !== 'off';
  if (key === 'door') world.setGarageDoor(value !== 'closed');
  if (key === 'gcam') world.setGarageCam(value as any);
  showGarage();
}

/** The Strip (owner Q100): the next rung of the league of the car in use, or null when that league's Strip is done. */
let rung: Rung | null = null;
function stripNext(): Rung | null {
  const lg = CARS[save.carId].league, n = (save.strip[lg] ?? 0) + 1;
  return n > STRIP.rungs ? null : stripRung(lg, n, stage);
}
/** Claim a cleared Strip level's one-time reward (owner: L1 100 VX, every 10th level +5 Crowns). */
function claimLevel(n: number) {
  const lg = CARS[save.carId].league, got = save.stripClaimed[lg] ?? [];
  if (n > (save.strip[lg] ?? 0) || got.includes(n)) return;
  const r = levelReward(lg, n); save.voxels += r.vx + r.cash; save.crowns += r.crowns; save.stripClaimed[lg] = [...got, n];
  if (r.decal && !save.decals.includes(r.decal)) save.decals.push(r.decal);
  if (r.car) addCar(save, r.car);
  writeSave(save);
  showGarage(`Level ${n} reward: +${(r.vx + r.cash).toLocaleString()} VX${r.crowns ? ` · +${r.crowns} Crowns` : ''}${r.decal ? ` · ${decalName(r.decal)} decal` : ''}${r.car ? ` · ${carName(r.car)} (League ${CARS[r.car].league}) — it's in your Catalog` : ''}`);
}
function startStrip() { const r = stripNext(); if (!r) return showGarage('This league\'s Strip is complete'); startRace('strip', r); }

function startRace(kind: 'street' | 'strip' = 'street', stripR?: Rung) {
  screen = 'race'; document.getElementById('vc-update')?.remove();   // never interrupt a race — the notice comes back after it
  rung = kind === 'strip' ? (stripR ?? stripNext()) : null;
  if (rung) opp = rung.rival; else rollRival();
  input.held = false; input.shiftQueued = false; input.downQueued = false;
  const dist = rung ? rung.dist : save.raceDist;
  race = new Race(dist);
  playerRacer = race.add('player', carStats(save.carId, save.equipped, stage), AUTOPLAY || (DEV.enabled && DEV.autoDrive) ? new AIController(1, [0.15, 0.15], 3) : new PlayerController());
  oppRacer = race.add(opp.id, carStats(opp.carId, opp.tune, stage), new AIController(devOppSkill() ?? opp.skill, opp.reaction, opp.seed));
  world.setupRace(stage, dist, playerLook(), oppLook(), { time: raceTime(), near: save.settings.nearSide });
  // the "Space or click" hint shows for the player's first 3 races (owner Q29)
  const DK = keysOf(save.settings).drag;
  hud = new Hud(ui, race, playerRacer, oppRacer, { keys: { gas: keyName(DK.gas), down: keyName(DK.down) }, oppName: opp.name, paddle: (params.get('pskin') as string) || save.paddles.equipped, paint: playerLook().paint, showKeyHint: save.races < 3, paddleShape: (params.get('pshape') as any) || save.paddles.shape, pedal: (params.get('pedal') as any) || save.pedals.equipped });
  const btn = hud.shiftBtn;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); paddlePress(); });
  btn.addEventListener('pointerup', paddleRelease); btn.addEventListener('pointercancel', paddleRelease);
  const gas = hud.gasBtn;
  gas.addEventListener('pointerdown', e => { e.preventDefault(); gas.setPointerCapture(e.pointerId); if (!playerRacer?.launched) { input.held = true; hud?.setGas(true); } });
  gas.addEventListener('pointerup', release); gas.addEventListener('pointercancel', release);
  const dbtn = hud.downBtn;
  dbtn.addEventListener('pointerdown', e => { e.preventDefault(); dbtn.setPointerCapture(e.pointerId); downPress(); });
  dbtn.addEventListener('pointerup', downRelease); dbtn.addEventListener('pointercancel', downRelease);
  finishedAt = 0;
}

function finishRace() {
  if (!race || !playerRacer || !oppRacer) return;
  screen = 'results';
  const me = playerRacer, them = oppRacer;
  const won = me.finish! < them.finish!;
  const perfects = me.shifts.filter(s => s.grade === 'Perfect').length;
  const dist = race.distanceM as RaceDist, prevBest = save.best[dist];
  const newBest = prevBest === null || me.finish! < prevBest;
  // pay: league × difficulty (Strip races pay like a Medium Street Race) — all numbers in data/economy.ts
  const diff: Difficulty = rung ? 'medium' : save.raceDiff, pay = racePay(CARS[save.carId].league, diff, won);
  const earnings: [string, number][] = [[won ? (rung ? `Strip level ${rung.n} win` : `${stage.races[diff]} win`) : 'Finish', pay.result]];
  const doneRung = rung;
  if (rung && won && rung.n > (save.strip[rung.league] ?? 0)) dailyEvent(save, 'stripClear');
  if (rung && won) save.strip[rung.league] = Math.max(save.strip[rung.league] ?? 0, rung.n);
  // dailies (owner Q150)
  dailyEvent(save, 'race'); dailyEvent(save, 'perfectShift', perfects);
  if (me.launchGrade === 'Perfect') dailyEvent(save, 'perfectLaunch');
  if (won && !rung) { dailyEvent(save, 'streetWin'); if (diff === 'hard') dailyEvent(save, 'hardWin'); }
  if (perfects) earnings.push([`Perfect shifts ×${perfects}`, perfects * pay.perfectShift]);
  if (me.launchGrade === 'Perfect') earnings.push(['Perfect launch', pay.perfectLaunch]);
  if (newBest) earnings.push(['New best time', pay.newBest]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  const rec = (save.cars[save.carId].stats ??= { races: 0, wins: 0, best: {} });       // per-car record (owner Q138)
  rec.races++; if (won) rec.wins++; if (rec.best[dist] == null || me.finish! < rec.best[dist]!) rec.best[dist] = me.finish!;
  save.voxels += total; save.races += 1; save.perfectShifts += perfects; if (won) save.wins += 1; if (newBest) { save.best[dist] = me.finish!; if (dist === 800) save.bestTime = me.finish!; }
  writeSave(save);
  const lr = doneRung ? levelReward(doneRung.league, doneRung.n) : null;
  const note = doneRung ? `The Strip · League ${doneRung.league} · Level ${doneRung.n} of ${STRIP.rungs}${doneRung.boss ? ' · Boss' : ''} · ${won ? `cleared — claim your reward in the Strip` : 'same rival next time'}` : undefined;
  const data: ResultData = { won, myTime: me.finish!, oppTime: them.finish!, oppName: opp.name, launch: me.launchGrade || 'Bog', shifts: me.shifts.map(s => s.grade), earnings, total, newBest, note };
  rollRival(true);                                                                   // next street race: a new rival
  setTimeout(showUpdate, 0);
  renderResults(ui, data, { again: doneRung ? () => { garageOpenStrip(); showGarage(); } : () => startRace(), garage: () => showGarage() }, doneRung ? 'The Strip ▸' : 'Race again');
  (window as any).__vc.lastResult = data;
}

// ---------------- main loop: fixed-step physics, render every frame ----------------
const STEP = 1 / 120;
let acc = 0, last = performance.now();
function frame(now: number) {
  const dt = Math.min(MAX_DT, (now - last) / 1000) * FAST; last = now;
  if (screen === 'race' && race && playerRacer && oppRacer) {
    acc += dt;
    while (acc >= STEP) {
      if (!paused) { playerRacer.px = playerRacer.x; oppRacer.px = oppRacer.x; race.step(STEP); }
      acc -= STEP;
    }
    // draw where the cars are *between* the last two physics steps, so motion is even at any frame rate
    const al = paused ? 1 : acc / STEP;
    const lerp = (r: Racer) => (r.px ?? r.x) + (r.x - (r.px ?? r.x)) * al;
    world.updateRace(lerp(playerRacer), lerp(oppRacer), playerRacer.v, oppRacer.v, dt, race.t);
    hud?.update();
    world.setTree(Math.min(3, Math.floor(race.t)), race.green);
    if (race.done && !paused) { finishedAt ||= now; if ((now - finishedAt) * FAST > 1200) finishRace(); }
  }
  if (screen === 'typing') typingFrame(dt, now);
  if (!(NO_RENDER && screen === 'race')) world.render(dt);
  dev.tick();
  requestAnimationFrame(frame);
}
/** Preview hook: freeze the race and place both cars (metres from the start) to frame camera shots. */
function pose(playerM: number, oppM: number, speedMs = 30, t = 10) {
  if (!race || !playerRacer || !oppRacer) startRace();
  paused = true;
  race!.t = t; playerRacer!.x = playerRacer!.px = playerM; oppRacer!.x = oppRacer!.px = oppM; playerRacer!.v = oppRacer!.v = speedMs;
  playerRacer!.launched = oppRacer!.launched = t > 3;
}
(window as any).__vc = { get screen() { return screen; }, get typing() { return ty; }, startTyping, openLab, version: VERSION, get opp() { return opp; }, cars: CARS, levelReward, partPrice, cosmeticPrice, get race() { return race; }, get save() { return save; }, get hud() { return hud; }, press, release, downPress, downRelease,
  /** preview hook: rebuild the race HUD with another paddle shape/skin (review renders) */
  hudPreview: (shape: string, skin: string, pedalStyle?: string) => { if (race && playerRacer && oppRacer) { hud = new Hud(ui, race, playerRacer, oppRacer, { oppName: opp.name, paddle: skin, paint: playerLook().paint, showKeyHint: true, paddleShape: shape as any, pedal: (pedalStyle || params.get('pedal') || 'alloy') as any }); hud.update(); } }, startRace, showGarage, buyOrEquip, pose, setCam: (m: string) => (world.camMode = m as any), setSetting, world, setNoRender: (b: boolean) => (NO_RENDER = b), setPaused: (b: boolean) => (paused = b) };
// test console (owner Q58): ?dev once turns it on for this browser; ` opens it
const dev = initDevConsole({
  save: () => save, write: () => writeSave(save),
  refresh: (msg?: string) => { if (screen === 'garage') showGarage(msg); },
  openLab: () => openLab(),
  resetSave: () => { save = freshSave(); writeSave(save); },
  race: () => race, screen: () => screen,
}, params.has('dev'));
// ---------------- Typing Race (owner 2026-10-19, Q122–Q129) ----------------
// Five lanes seen from above, the camera follows your car. 3 s of start lamps, then type: each correct key moves you on,
// a wrong key turns the letter red until you type the right one. Rivals are seeded typists matched to your average.
const COUNT = 3, TYPE_LANE = 2;                                      // you race in the middle lane
let ty: { run: TypingRun; rivals: TypingRival[]; hud: TypingHud; start: number; vis: number[]; vel: number[]; doneAt: number; diff: Difficulty; seed: number } | null = null;
const typingClock = (now = performance.now()) => ty ? (now - ty.start) / 1000 * FAST - COUNT : 0;   // seconds since GO
function startTyping() {
  screen = 'typing'; document.getElementById('vc-update')?.remove();
  const seed = params.get('tseed') ? +params.get('tseed')! : ((Date.now() & 0x7fffffff) || 1);
  const stats = typingStats(save), diff = save.raceDiff, league = CARS[save.carId].league;
  const { text, rivals } = makeTypingRace(seed, averageFor(stats, diff), diff, league);
  // lanes: you in the middle, the four rivals around you
  const lanes: (TypingRival | null)[] = [rivals[0], rivals[1], null, rivals[2], rivals[3]];
  const looks = lanes.map(r => r ? { ...STOCK_LOOK, body: carBody(r.carId).profile ?? 'civix', paint: r.paint, parts: rivalParts(r.carId, r.seed) } : playerLook());
  world.setupTyping(looks);
  const hudEl = ui; const names = lanes.map(r => r ? r.name : 'YOU');
  ty = { run: new TypingRun(text), rivals, start: performance.now(), vis: [0, 0, 0, 0, 0], vel: [0, 0, 0, 0, 0], doneAt: 0, diff, seed,
    hud: new TypingHud(hudEl, { text, names, you: TYPE_LANE, caption: `Typing Race · ${stage.name} · League ${league} · ${DIFFICULTY[diff].label}`, nitros: TYPING.nitros,
      nitroKey: keyName(keysOf(save.settings).typing.nitro), leaveKey: keyName(keysOf(save.settings).typing.leave) }) };
  (ty as any).lanes = lanes;
}
function typingKey(e: KeyboardEvent) {
  if (!ty) return;
  const K = keysOf(save.settings).typing, t = typingClock();
  if (keyMatches(e.code, K.leave)) { e.preventDefault(); ty = null; return showGarage('Left the Typing Race'); }
  if (keyMatches(e.code, K.nitro)) {                                 // nitro (owner: Enter, so Space can't fire it by accident)
    e.preventDefault();
    if (t >= 0 && ty.run.nitro(t) === 'nitro') { ty.hud.setText(ty.run.pos, ty.run.typo); ty.hud.setNitro(ty.run.nitros); ty.hud.flash('NITRO!'); if (ty.run.done && !ty.doneAt) ty.doneAt = performance.now(); }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  e.preventDefault();                                                // no page scroll on space, no quick-find on ' or /
  if (t < 0 || ty.run.done) return;                                  // keys before GO don't count
  ty.run.key(e.key, t);
  ty.hud.setText(ty.run.pos, ty.run.typo);
  if (ty.run.done && !ty.doneAt) ty.doneAt = performance.now();
}
function typingFrame(dt: number, now: number) {
  if (!ty) return;
  const t = typingClock(now), run = ty.run, lanes = (ty as any).lanes as (TypingRival | null)[], len = run.text.length;
  const span = TYPE_TRACK.length + 26;
  if (t < 0) ty.hud.setCountdown(Math.min(3, Math.floor(t + COUNT) + 1), false); else ty.hud.setCountdown(3, true, t > 1.2);
  // where each car should be; cars ease towards it (yours glides to a stop while a letter is red)
  const target = lanes.map(r => (r ? Math.min(len, typedBy(r, Math.max(0, t))) : run.pos) / len * span);
  // every car glides: it trails its typed distance a little and eases to a stop when typing stops (owner Q131)
  ty.vis.forEach((x, i) => { [ty!.vis[i], ty!.vel[i]] = glide(x, ty!.vel[i], target[i], Math.min(dt, 0.25)); });
  world.typing?.update(ty.vis, TYPE_LANE);
  world.typing?.setBoost(TYPE_LANE, t - run.nitroAt < 0.9);          // nitro flame behind your car (steady, no flicker)
  // tags just behind each car, live WPM, progress bar
  const W = ui.clientWidth || innerWidth, H = ui.clientHeight || innerHeight;
  const boost = t - run.nitroAt < 0.9;
  const tags = lanes.map((_, i) => { const c = world.typing!.cars[i]; return world.typing!.toScreen(c.group.position.x + c.L + (i === TYPE_LANE && boost ? 36 : 4), laneZ(i), W, H); });   // tag slides back to show the flame
  const wpms = lanes.map(r => t <= 0.5 ? null : r ? wpmOf(Math.min(len, typedBy(r, t)), Math.min(t, r.finish)) : run.wpm(t));
  ty.hud.place(tags, wpms, target.map(d => d / span));
  const ahead = ty.rivals.filter(r => (typedBy(r, t) > run.pos) || (run.done && r.finish < run.finish!)).length;
  ty.hud.setStats(t > 0.5 ? run.wpm(t) : null, run.keys ? run.accuracy : null, t > 0 ? ahead + 1 : null, run.finish ?? Math.max(0, t));
  if (AUTOPLAY && t > 0 && !run.done && t * 6 > run.pos) { run.key(run.text[run.pos], t); ty.hud.setText(run.pos, run.typo); if (run.done) ty.doneAt = now; }   // test hook: ~72 wpm
  if (ty.doneAt && (now - ty.doneAt) * FAST > 2000) finishTyping();          // time for your car to glide over the line
}
function finishTyping() {
  if (!ty) return;
  const { run, rivals, diff } = ty, lanes = (ty as any).lanes as (TypingRival | null)[];
  screen = 'results';
  const stats = typingStats(save), league = CARS[save.carId].league;
  const place = placeOf(run.finish, rivals), wpm = run.wpm(run.finish ?? typingClock()), acc = run.accuracy;
  const newBest = wpm > stats.best;
  const pay = typingPay(league, diff, place, newBest, acc);
  const earnings: [string, number][] = [[place === 1 ? 'Typing Race win' : `${['1st', '2nd', '3rd', '4th', '5th'][place - 1]} place`, pay.result]];
  if (pay.newBest) earnings.push(['New best WPM', pay.newBest]);
  if (pay.accuracy) earnings.push([`Accuracy ${Math.round(TYPING.accuracyAt * 100)}%+`, pay.accuracy]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  save.voxels += total; stats.races++; if (place === 1) stats.wins++; if (newBest) stats.best = wpm;
  dailyEvent(save, 'race'); if (place === 1) dailyEvent(save, 'typingWin'); if (acc >= TYPING.accuracyAt) dailyEvent(save, 'typingAcc');
  stats.recent = [...stats.recent, wpm].slice(-TYPING.recentRaces); stats.keys += run.keys; stats.errors += run.errors;
  stats.recentBy = { ...(stats.recentBy || {}), [diff]: [...(stats.recentBy?.[diff] ?? []), wpm].slice(-TYPING.recentRaces) };
  writeSave(save);
  const rows = [
    { place, name: 'YOU', car: carName(save.carId), wpm, acc, you: true, fin: run.finish! },
    ...rivals.map(r => ({ place: 0, name: r.name, car: carName(r.carId), wpm: r.wpm, fin: r.finish })),
  ].sort((a, b) => a.fin - b.fin).map((r, i) => ({ ...r, place: i + 1 }));
  void lanes;
  const data = { rows, place, wpm, acc, earnings, total, newBest, caption: `Typing Race · ${stage.name} · ${DIFFICULTY[diff].label}`, best: stats.best, avg: averageFor(stats, diff) };
  (window as any).__vc.lastTyping = data;
  ty = null;
  setTimeout(showUpdate, 0);
  renderTypingResults(ui, data, { again: () => startTyping(), garage: () => showGarage() });
}

// ---------------- Car Lab (owner 2026-10-19): developers only — test console ▸ Car Lab, or ?lab with dev mode on ----------------
function openLab() {
  if (!DEV.enabled) return;
  screen = 'lab'; world.mode = 'garage'; world.setGarageView('mycars'); document.getElementById('vc-update')?.remove();
  openCarLab(ui, { preview: look => world.setGarageCar(look), close: () => showGarage('Closed Car Lab') });
}

// ---------------- update notice (owner V0.2.1) ----------------
// A newer build on the site → a notice in the garage / results (never mid-race). "Refresh now" saves and reloads into the
// new build, which is a new session; the progress is kept in the save.
let pendingUpdate: RemoteBuild | null = null, updateLater = false;
function showUpdate() {
  if (!pendingUpdate || updateLater || screen === 'race' || document.getElementById('vc-update')) return;
  const r = pendingUpdate, el = document.createElement('div');
  el.id = 'vc-update'; el.className = 'upd blk';
  el.innerHTML = `<div class="upd-txt"><b class="hd">Update ready · V${r.version}</b><span>${(r.title || 'A new version is out').replace(/</g, '&lt;')} — refresh to start a new session on it. Your progress is saved.</span></div>
    <button class="btn race" id="updGo">Refresh now</button><button class="btn ghost upd-later" id="updLater">Later</button>`;
  document.body.appendChild(el);
  el.querySelector('#updGo')!.addEventListener('click', () => { writeSave(save); reloadInto(r); });
  el.querySelector('#updLater')!.addEventListener('click', () => { updateLater = true; el.remove(); setTimeout(() => { updateLater = false; if (screen !== 'race') showUpdate(); }, 10 * 60_000); });
}
watchForUpdates(r => { pendingUpdate = r; showUpdate(); });
// first start on a new version: say so once (the patch notes button also shows NEW)
const updatedFrom = save.lastVersion && save.lastVersion !== VERSION ? save.lastVersion : null;
if (save.lastVersion !== VERSION) { save.lastVersion = VERSION; writeSave(save); }
showGarage(updatedFrom ? `Updated to V${VERSION} — ${CHANGELOG[0].header ?? CHANGELOG[0].title}. See Patch notes (bottom-left).` : undefined);
if (params.has('lab')) openLab();
prewarmVehicles(world.mats);
requestAnimationFrame(frame);
