// Voxel City — Step 1 vertical slice: Garage Terminal → race → results → race again.
import { World } from './render/scene';
import { prewarmVehicles } from './render/stage';
import { STOCK_LOOK, CarLook } from './render/carBuilder';
import { CSS } from './ui/styles';
import { renderGarage, Hud, renderResults, ResultData } from './ui/screens';
import { loadSave, writeSave, SaveV1 } from './save/save';
import { STAGES, START_STAGE } from './data/stages';
import { OPPONENTS, ECONOMY } from './data/economy';
import { ENGINE, TRANSMISSION, Tier } from './data/parts';
import { CARS } from './data/cars';
import { Race, Racer, Controller } from './game/race';
import { AIController } from './game/ai';
import { carStats } from './game/stats';

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
const opp = OPPONENTS[0];
const playerLook = (): CarLook => ({ ...STOCK_LOOK, paint: CARS[save.carId].paint });
const oppLook: CarLook = { ...STOCK_LOOK, paint: opp.paint };

// ---------------- input: SPACE or the on-screen Shift button ----------------
const input = { held: false, shiftQueued: false };
let playerRacer: Racer | null = null;
function press() { input.held = true; if (playerRacer?.launched) input.shiftQueued = true; }
function release() { input.held = false; }
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
window.addEventListener('keyup', e => { if (e.code === 'Space') { e.preventDefault(); release(); } });
class PlayerController implements Controller {
  held() { return input.held; }
  shift() { const q = input.shiftQueued; input.shiftQueued = false; return q; }
}

// ---------------- screens ----------------
type Screen = 'garage' | 'race' | 'results';
let screen: Screen = 'garage';
let race: Race | null = null, hud: Hud | null = null, oppRacer: Racer | null = null, finishedAt = 0;

function showGarage(toast?: string) {
  screen = 'garage'; world.mode = 'garage'; world.setGarageCar(playerLook());
  renderGarage(ui, save, opp, stage, { onBuyOrEquip: buyOrEquip, onRace: startRace, onSetting: setSetting }, toast);
}

function setSetting(key: string, value: string) {
  (save.settings as any)[key] = value; writeSave(save);
  if (key === 'camera') world.setCameraPreset(value as any);
  if (key === 'blur') world.setBlur(value as any);
  showGarage();
}

function buyOrEquip(kind: 'engine' | 'trans', tier: Tier) {
  const def = (kind === 'engine' ? ENGINE.D : TRANSMISSION.D)[tier - 1];
  let msg: string | undefined;
  if (!save.owned[kind].includes(tier)) {
    if (save.voxels < def.price) return showGarage(`Need ${(def.price - save.voxels).toLocaleString()} more VX for ${def.label}`);
    save.voxels -= def.price; save.owned[kind] = [...save.owned[kind], tier].sort() as Tier[];
    msg = `Bought ${def.label}`;
  }
  save.equipped[kind] = tier; writeSave(save);
  showGarage(msg ?? `Equipped ${def.label}`);
}

function startRace() {
  screen = 'race';
  input.held = false; input.shiftQueued = false;
  race = new Race(stage.distanceM);
  const seed = (Date.now() & 0xffff) || 1;
  playerRacer = race.add('player', carStats(save.carId, save.equipped.engine, save.equipped.trans, stage), AUTOPLAY ? new AIController(1, [0.15, 0.15], 3) : new PlayerController());
  oppRacer = race.add(opp.id, carStats(opp.carId, opp.engineTier as Tier, opp.transTier as Tier, stage), new AIController(opp.skill, opp.reaction, seed));
  world.setupRace(stage, stage.distanceM, playerLook(), oppLook, { time: save.settings.time, near: save.settings.nearSide });
  hud = new Hud(ui, race, playerRacer, oppRacer);
  const btn = hud.shiftBtn;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(); });
  btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release);
  finishedAt = 0;
}

function finishRace() {
  if (!race || !playerRacer || !oppRacer) return;
  screen = 'results';
  const me = playerRacer, them = oppRacer;
  const won = me.finish! < them.finish!;
  const perfects = me.shifts.filter(s => s.grade === 'Perfect').length;
  const newBest = save.bestTime === null || me.finish! < save.bestTime;
  const earnings: [string, number][] = [[won ? 'Win' : 'Finish', won ? ECONOMY.winPayout : ECONOMY.lossPayout]];
  if (perfects) earnings.push([`Perfect shifts ×${perfects}`, perfects * ECONOMY.perfectShiftBonus]);
  if (me.launchGrade === 'Perfect') earnings.push(['Perfect launch', ECONOMY.perfectLaunchBonus]);
  if (newBest) earnings.push(['New best time', ECONOMY.newBestBonus]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  save.voxels += total; save.races += 1; if (won) save.wins += 1; if (newBest) save.bestTime = me.finish!;
  writeSave(save);
  const data: ResultData = { won, myTime: me.finish!, oppTime: them.finish!, oppName: opp.name, launch: me.launchGrade || 'Bog', shifts: me.shifts.map(s => s.grade), earnings, total, newBest };
  renderResults(ui, data, { again: startRace, garage: () => showGarage() });
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
  requestAnimationFrame(frame);
}
/** Preview hook: freeze the race and place both cars (metres from the start) to frame camera shots. */
function pose(playerM: number, oppM: number, speedMs = 30, t = 10) {
  if (!race || !playerRacer || !oppRacer) startRace();
  paused = true;
  race!.t = t; playerRacer!.x = playerRacer!.px = playerM; oppRacer!.x = oppRacer!.px = oppM; playerRacer!.v = oppRacer!.v = speedMs;
  playerRacer!.launched = oppRacer!.launched = t > 3;
}
(window as any).__vc = { get screen() { return screen; }, get race() { return race; }, get save() { return save; }, startRace, showGarage, buyOrEquip, pose, setCam: (m: string) => (world.camMode = m as any), setSetting, world, setNoRender: (b: boolean) => (NO_RENDER = b), setPaused: (b: boolean) => (paused = b) };
showGarage();
prewarmVehicles(world.mats);
requestAnimationFrame(frame);
