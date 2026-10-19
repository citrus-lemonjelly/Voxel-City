// Voxel City — Step 1 vertical slice: Garage Terminal → race → results → race again.
import { World } from './render/scene';
import { prewarmVehicles } from './render/stage';
import { STOCK_LOOK, CarLook } from './render/carBuilder';
import { CSS } from './ui/styles';
import { renderResults, ResultData } from './ui/screens';
import { renderGarage, garageInCatalog, garageOpenStrip, factoryTwin } from './ui/garage';
import { Hud } from './ui/hud';
import { VERSION, CHANGELOG } from './data/changelog';
import { watchForUpdates, reloadInto, RemoteBuild } from './game/updates';
import { loadSave, writeSave, SaveV1, addCar, switchCar, RaceDist } from './save/save';
import { STAGES, START_STAGE } from './data/stages';
import { ECONOMY, DIFFICULTY, racePay, Difficulty, partPrice, cosmeticPrice } from './data/economy';
import { ENGINE, TRANSMISSION, Tier } from './data/parts';
import { CARS, carBody, carName, carPaint } from './data/cars';
import { makeRival, Rival } from './game/rivals';
import { PART_BY_ID, lookParts, ownsPart, isFactory, randomParts } from './data/visualParts';
import { stripRung, STRIP, Rung, levelReward, decalName } from './game/strip';
import { Race, Racer, Controller } from './game/race';
import { AIController, makeRng } from './game/ai';
import { carStats } from './game/stats';
import { DEV, devOppSkill, initDevConsole } from './ui/devConsole';
import { freshSave } from './save/save';

const params = new URLSearchParams(location.search);
const AUTOPLAY = params.has('autoplay');          // test hook: the player car drives itself
const MAX_DT = +(params.get('maxdt') || 0.25);     // test hook: let slow (software-rendered) frames advance the clock fully
let NO_RENDER = params.has('norender');           // test hook: skip 3D drawing during races (input-timing tests)
let paused = false;                               // preview hook: freeze physics while posing cars

document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
document.body.innerHTML = '<div id="stage"></div><div id="ui" class="overlay"></div>';
const stageEl = document.getElementById('stage')!, ui = document.getElementById('ui')!;
const world = new World(stageEl);
let save: SaveV1 = loadSave();
// URL overrides for previews/tests (?camset=close&time=night&near=barrier)
if (params.get('camset')) save.settings.camera = params.get('camset') as any;
if (params.get('time')) save.settings.time = params.get('time') as any;
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
const rivalKey = () => `${save.carId}:${save.equipped.engine}:${save.equipped.trans}:${save.raceDist}:${save.raceDiff}`;
function rollRival(force = false) {
  if (!force && oppKey === rivalKey() && opp) return;
  const seed = params.get('rseed') ? +params.get('rseed')! : undefined;                 // test hook: fixed rival
  opp = makeRival(save.carId, save.equipped.engine, save.equipped.trans, stage, seed, save.raceDist, DIFFICULTY[save.raceDiff].gap); oppKey = rivalKey();
}
rollRival();
/** The car in use, as the player has painted and optioned it (Q79). */
const playerLook = (): CarLook => {
  const c = save.cars[save.carId];
  return { ...STOCK_LOOK, body: carBody(save.carId).profile ?? 'civix', paint: c?.paint || carPaint(save.carId), opts: { ...(c?.opts || {}) }, parts: lookParts(c?.parts) };
};
// rivals wear random visual parts (owner Q118), rolled from their seed so a rival looks the same all race
const oppLook = (): CarLook => ({ ...STOCK_LOOK, body: carBody(opp.carId).profile ?? 'civix', paint: opp.paint, parts: randomParts(makeRng((opp as any).seed ^ 0x5eed)) });

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
const DOWN_KEYS = ['ShiftLeft', 'ShiftRight', 'ArrowDown'];
function downPress() { if (playerRacer?.launched) input.downQueued = true; hud?.setDownPressed(true); }
function downRelease() { hud?.setDownPressed(false); }
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
  else if (DOWN_KEYS.includes(e.code) && screen === 'race') { e.preventDefault(); if (!e.repeat) downPress(); }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') { e.preventDefault(); release(); }
  else if (DOWN_KEYS.includes(e.code)) downRelease();
});
class PlayerController implements Controller {
  held() { return input.held; }
  shift() { const q = input.shiftQueued; input.shiftQueued = false; return q; }
  downshift() { const q = input.downQueued; input.downQueued = false; return q; }
}

// ---------------- screens ----------------
type Screen = 'garage' | 'race' | 'results';
let screen: Screen = 'garage';
let race: Race | null = null, hud: Hud | null = null, oppRacer: Racer | null = null, finishedAt = 0;

function showGarage(toast?: string) {
  screen = 'garage'; world.mode = 'garage'; setTimeout(showUpdate, 0); rollRival(); if (!garageInCatalog()) world.setGarageCar(playerLook());
  renderGarage(ui, save, opp, stage, { onBuyOrEquip: buyOrEquip, onRace: () => startRace(), onStrip: startStrip, stripNext, onClaim: claimLevel, onSetting: setSetting,
    onPreview: look => world.setGarageCar(look ?? playerLook()), onView: v => world.setGarageView(v),
    onBuyCar: buyCar, onUseCar: useCar, onCarStyle: carStyle, onBuyPart: buyPart, onFitPart: (id: string) => fitPart(id), onDistance: setDistance, onDifficulty: setDifficulty, thumb: (look, view) => world.thumbnail(look, undefined, undefined, view), playerLook,
    onNotesSeen: () => { save.seenVersion = VERSION; writeSave(save); } }, toast);
}

/** Catalog (Q79): buy a car (it comes with the paint/options picked and goes straight into use). */
function buyCar(id: string, paint: string, opts: Record<string, string>) {
  const def = CARS[id]; if (!def || save.cars[id]) return;
  const crowns = def.currency === 'crowns', have = crowns ? save.crowns : save.voxels;
  if (!DEV.unlimited && have < def.price) return showGarage(`Need ${(def.price - have).toLocaleString()} more ${crowns ? 'Crowns' : 'VX'} for the ${carName(id)}`);
  if (!DEV.unlimited) { if (crowns) save.crowns -= def.price; else save.voxels -= def.price; }
  addCar(save, id, paint, opts); switchCar(save, id); writeSave(save);
  showGarage(`Bought the ${carName(id)} — now in use`);
}
function useCar(id: string) {
  if (!save.cars[id] || save.carId === id) return;
  switchCar(save, id); writeSave(save);
  showGarage(`Now driving the ${carName(id)}`);
}
/** Visual parts (owner 2026-10-19): buy once for every car; fit to the car in use. Factory parts are free. */
function buyPart(id: string) {
  const p = PART_BY_ID[id]; if (!p) return;
  if (p.won && !ownsPart(id, save.partsOwned, save.decals)) return showGarage(`${p.name} is won on the Strip, not sold`);
  if (!ownsPart(id, save.partsOwned, save.decals)) {
    const c = cosmeticPrice(id), crowns = c.currency === 'crowns', have = crowns ? save.crowns : save.voxels;
    if (!DEV.unlimited && have < c.price) return showGarage(`Need ${(c.price - have).toLocaleString()} more ${crowns ? 'Crowns' : 'VX'} for ${p.name}`);
    if (!DEV.unlimited) { if (crowns) save.crowns -= c.price; else save.voxels -= c.price; }
    save.partsOwned.push(id);
  }
  fitPart(id, `Bought ${p.name} — fitted`);
}
function fitPart(id: string, msg?: string) {
  const p = PART_BY_ID[id], c = save.cars[save.carId]; if (!p || !c) return;
  if (isFactory(p) || factoryTwin(save.carId, p.slot)?.id === id) delete c.parts[p.slot]; else if (ownsPart(id, save.partsOwned, save.decals)) c.parts[p.slot] = id; else return;
  writeSave(save); world.setGarageCar(playerLook()); showGarage(msg ?? `Fitted ${p.name}`);
}
/** Paint / body options on an owned car save straight away (visual only). */
function carStyle(id: string, paint: string, opts: Record<string, string>) {
  const c = save.cars[id]; if (!c) return;
  c.paint = paint; c.opts = { ...opts }; writeSave(save);
  showGarage();
}

/** Street Race length (owner Q100). */
function setDistance(d: RaceDist) { save.raceDist = d; writeSave(save); showGarage(); }
function setDifficulty(d: Difficulty) { save.raceDiff = d; writeSave(save); showGarage(); }

function setSetting(key: string, value: string) {
  (save.settings as any)[key] = value; writeSave(save);
  if (key === 'camera') world.setCameraPreset(value as any);
  if (key === 'blur') world.setBlur(value as any);
  showGarage();
}

function buyOrEquip(kind: 'engine' | 'trans', tier: Tier) {
  if (CARS[save.carId].unique) return showGarage('Boss cars come as they are — they can\'t be upgraded');
  const lg = CARS[save.carId].league, def = (kind === 'engine' ? ENGINE[lg] : TRANSMISSION[lg])[tier - 1];
  let msg: string | undefined;
  if (!save.owned[kind].includes(tier)) {
    if (!DEV.unlimited && save.voxels < def.price) return showGarage(`Need ${(def.price - save.voxels).toLocaleString()} more VX for ${def.label}`);
    if (!DEV.unlimited) save.voxels -= def.price;                 // test console: unlimited = free purchases
    save.owned[kind] = [...save.owned[kind], tier].sort() as Tier[];
    msg = `Bought ${def.label}`;
  }
  save.equipped[kind] = tier; writeSave(save);
  showGarage(msg ?? `Equipped ${def.label}`);
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
  playerRacer = race.add('player', carStats(save.carId, save.equipped.engine, save.equipped.trans, stage), AUTOPLAY || (DEV.enabled && DEV.autoDrive) ? new AIController(1, [0.15, 0.15], 3) : new PlayerController());
  oppRacer = race.add(opp.id, carStats(opp.carId, opp.engineTier as Tier, opp.transTier as Tier, stage), new AIController(devOppSkill() ?? opp.skill, opp.reaction, opp.seed));
  world.setupRace(stage, dist, playerLook(), oppLook(), { time: save.settings.time, near: save.settings.nearSide });
  // the "Space or click" hint shows for the player's first 3 races (owner Q29)
  hud = new Hud(ui, race, playerRacer, oppRacer, { oppName: opp.name, paddle: (params.get('pskin') as string) || save.paddles.equipped, paint: playerLook().paint, showKeyHint: save.races < 3, paddleShape: (params.get('pshape') as any) || save.paddles.shape, pedal: (params.get('pedal') as any) || save.pedals.equipped });
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
  if (rung && won) save.strip[rung.league] = Math.max(save.strip[rung.league] ?? 0, rung.n);
  if (perfects) earnings.push([`Perfect shifts ×${perfects}`, perfects * pay.perfectShift]);
  if (me.launchGrade === 'Perfect') earnings.push(['Perfect launch', pay.perfectLaunch]);
  if (newBest) earnings.push(['New best time', pay.newBest]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
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
  const dt = Math.min(MAX_DT, (now - last) / 1000); last = now;
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
    if (race.done && !paused) { finishedAt ||= now; if (now - finishedAt > 1200) finishRace(); }
  }
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
(window as any).__vc = { get screen() { return screen; }, get opp() { return opp; }, cars: CARS, levelReward, partPrice, cosmeticPrice, get race() { return race; }, get save() { return save; }, get hud() { return hud; }, press, release, downPress, downRelease,
  /** preview hook: rebuild the race HUD with another paddle shape/skin (review renders) */
  hudPreview: (shape: string, skin: string, pedalStyle?: string) => { if (race && playerRacer && oppRacer) { hud = new Hud(ui, race, playerRacer, oppRacer, { oppName: opp.name, paddle: skin, paint: playerLook().paint, showKeyHint: true, paddleShape: shape as any, pedal: (pedalStyle || params.get('pedal') || 'alloy') as any }); hud.update(); } }, startRace, showGarage, buyOrEquip, pose, setCam: (m: string) => (world.camMode = m as any), setSetting, world, setNoRender: (b: boolean) => (NO_RENDER = b), setPaused: (b: boolean) => (paused = b) };
// test console (owner Q58): ?dev once turns it on for this browser; ` opens it
const dev = initDevConsole({
  save: () => save, write: () => writeSave(save),
  refresh: (msg?: string) => { if (screen === 'garage') showGarage(msg); },
  resetSave: () => { save = freshSave(); writeSave(save); },
  race: () => race, screen: () => screen,
}, params.has('dev'));
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
showGarage(updatedFrom ? `Updated to V${VERSION} — ${CHANGELOG[0].title}. See Patch notes (bottom-left).` : undefined);
prewarmVehicles(world.mats);
requestAnimationFrame(frame);
