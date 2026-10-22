// Voxel City — Step 1 vertical slice: Garage Terminal → race → results → race again.
import { World, Weather, FxCar } from './render/scene';
import { prewarmVehicles, TimeOfDay } from './render/stage';
import { STOCK_LOOK, CarLook } from './render/carBuilder';
import { CSS } from './ui/styles';
import { renderResults, ResultData, renderDriftResults, DriftResultData } from './ui/screens';
import { DriftRun, DriftControl, DriftAI, DriftRival, makeDriftRival, ghostAt } from './game/drift';
import { driftPath, DRIFT_BY_ID, DRIFT_COURSES } from './data/driftCourses';
import { DriftHud } from './ui/driftHud';
import { driftButtonSheet } from './ui/driftButton';
import { drawPedal } from './ui/hud';
import { PADDLES } from './data/cosmetics';
import { poseAt } from './render/driftView';
import { renderGarage, garageInCatalog, garageOpenStrip, resetGarageUI } from './ui/garage';
import { Hud } from './ui/hud';
import { VERSION, CHANGELOG } from './data/changelog';
import { watchForUpdates, reloadInto, RemoteBuild } from './game/updates';
import { loadSave, writeSave, SaveV1, addCar, RaceDist } from './save/save';
import { STAGES, START_STAGE, wetStage } from './data/stages';
import { ECONOMY, DIFFICULTY, racePay, Difficulty, partPrice, cosmeticPrice } from './data/economy';
import { Tier, LAUNCH } from './data/parts';
import { CARS, carBody, carName, carPaint, League } from './data/cars';
import { makeRival, Rival } from './game/rivals';
import { lookParts, randomParts } from './data/visualParts';
import { stripRung, STRIP, Rung, levelReward, decalName } from './game/strip';
import { Race, Racer, Controller } from './game/race';
import { AIController, makeRng } from './game/ai';
import { carStats } from './game/stats';
import { DEV, devOppSkill, devTime, initDevConsole } from './ui/devConsole';
import { freshSave, typingStats, playerName, typingLevelOf } from './save/save';
import { typingBadge } from './ui/typingBadge';
import { submitTypingRace, LB_MOCK } from './game/leaderboard';
import { TypingRun, TypingRival, makeTypingRace, makeLadderRace, rivalRef, typedBy, placeOf, wpmOf, glide } from './game/typing';
import { TypingHud, renderTypingResults } from './ui/typingHud';
import { openCarLab } from './ui/carLab';
import { keysOf, keyMatches, keyName, KEY_MODE_LABEL } from './game/keys';
import { TYPE_TRACK, laneZ } from './render/typingView';
import { typingPay, TYPING, perfectShiftPay, driftPay, TypingLevel, TYPING_LEVELS, TYPING_LADDER, typingXp, typingLeagueOf, typingRankCrowns } from './data/economy';
import { dailyEvent } from './game/daily';
import { partFits } from './render/bodies';
import { garageActions } from './game/garageActions';
import { BEVEL_CSS } from './ui/themeBevel';
import { renderEngine, volOf, startSound, setSoundLevel, raceSound, raceReset, engineStop, keyClick, nitroSound, uiTick, winSound, driftReset, driftSound, driftCue } from './game/sound';

const params = new URLSearchParams(location.search);
LB_MOCK.on = params.has('lbmock');                                   // test hook: a made-up Top 500 board
const AUTOPLAY = params.has('autoplay');          // test hook: the player car drives itself
const MAX_DT = +(params.get('maxdt') || 0.25);
const FAST = Math.max(1, +(params.get('fast') || 1));   // test hook: run the game clock N× faster (smoke tests)     // test hook: let slow (software-rendered) frames advance the clock fully
let NO_RENDER = params.has('norender');           // test hook: skip 3D drawing during races (input-timing tests)
let paused = false;                               // preview hook: freeze physics while posing cars

// layout (styles.ts) + the "Bevel+" look on top (themeBevel.ts, owner 2026-10-21, S75)
document.documentElement.classList.add('ui-bevel');
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS + BEVEL_CSS }));
document.body.innerHTML = '<div id="stage"></div><div id="ui" class="overlay"></div>';
/** Phones/tablets (owner 2026-10-21): thumb-sized race screen, sideways only (Q168). ?phone forces it on a PC for testing. */
const PHONE = params.has('phone') || matchMedia('(pointer: coarse)').matches;
document.documentElement.classList.toggle('vc-phone', PHONE);
/** Shrink-to-fit (owner 2026-10-21, V0.14.0): the menus, results and Typing Race screen are laid out for a window at least
 *  FIT.h tall and FIT.w wide; on anything smaller (a phone held sideways is ~390 px tall) the whole layer is scaled down to
 *  fit, so every screen shows in full. PCs stay at 1. styles: #garage / #results / #typing / #typing-res use --ui-s. */
//  Phones (owner E2, V0.15.0) lay out in a slightly smaller box (960 × 500), so everything — text too — is drawn ~12 % bigger.
//  Uses the visible area (visualViewport), so with the phone keyboard open the Typing Race fits above it.
const FIT = PHONE ? { w: 960, h: 500, min: 0.42 } : { w: 1060, h: 560, min: 0.42 };
function fitUI() {
  const vw = visualViewport?.width ?? innerWidth, vh = visualViewport?.height ?? innerHeight;
  const s = Math.max(FIT.min, Math.min(1, vh / FIT.h, vw / FIT.w)), r = document.documentElement.style;
  r.setProperty('--ui-s', String(s)); r.setProperty('--ui-w', vw / s + 'px'); r.setProperty('--ui-h', vh / s + 'px');
}
fitUI(); addEventListener('resize', fitUI); addEventListener('orientationchange', fitUI); visualViewport?.addEventListener('resize', fitUI);
document.body.insertAdjacentHTML('beforeend', `<div id="vc-rotate"><div class="blk"><svg width="128" height="64" viewBox="0 0 32 16" shape-rendering="crispEdges"><rect x="1" y="1" width="8" height="14" fill="#5a5f6d"/><rect x="2" y="3" width="6" height="10" fill="#14161c"/><rect x="11" y="7" width="5" height="2" fill="var(--accent)"/><rect x="15" y="5" width="1" height="6" fill="var(--accent)"/><rect x="16" y="6" width="1" height="4" fill="var(--accent)"/><rect x="17" y="7" width="1" height="2" fill="var(--accent)"/><rect x="19" y="4" width="12" height="8" fill="#eeeae0"/><rect x="21" y="5" width="8" height="6" fill="#14161c"/></svg><h2 class="hd">Turn your phone sideways</h2><p>Voxel City plays in landscape.</p></div></div>`);
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
/** Light graphics (owner E4, V0.15.0): phones by default; Settings ▸ Graphics can force Full or Light anywhere. */
const gfxLite = () => save.settings.gfx === 'light' || (save.settings.gfx !== 'full' && PHONE);
world.setLite(gfxLite());
// sound (owner C1, V0.16.0): browsers only allow it after a tap or key press; menu buttons tick
setSoundLevel(volOf(save.settings.sound, 75), volOf(save.settings.engineVol, 75));
addEventListener('pointerdown', startSound, true); addEventListener('keydown', startSound, true);
document.addEventListener('click', e => { if ((e.target as Element).closest?.('#garage button, #results button, #typing-res button')) uiTick(); }, true);
let engineOn = false;
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
const input = { held: false, shiftQueued: false, downQueued: false, nosQueued: false };
let playerRacer: Racer | null = null;
/** Pedal mode (owner 2026-10-21): gas is only gas, held the whole race; shift-up has its own key and launches on green. */
const pedalMode = () => save.settings.drive === 'pedal';
// Classic: Space = gas before the launch (owner: gas pedal for launch control), upshift after it
function press() { input.held = true; if (playerRacer?.launched && !pedalMode()) { input.shiftQueued = true; hud?.setPressed(true); } else hud?.setGas(true); }
function release() { input.held = false; hud?.setPressed(false); hud?.setGas(false); }
/** The "+" paddle only shifts — before the launch it does nothing in Classic (the gas pedal revs); in Pedal mode it drops the clutch. */
function paddlePress() { hud?.setPressed(true); if (playerRacer?.launched || pedalMode()) input.shiftQueued = true; }
function paddleRelease() { hud?.setPressed(false); }
// downshift (left "−" paddle): Shift or ↓ — owner request, for when an upshift came too early
// keys come from Settings ▸ Controls (owner 2026-10-19)
function downPress() { if (playerRacer?.launched) input.downQueued = true; hud?.setDownPressed(true); }
function downRelease() { hud?.setDownPressed(false); }
window.addEventListener('keydown', e => {
  if (screen === 'typing') return typingKey(e);                       // the Typing Race takes every key
  if (screen === 'drift') return driftKey(e, true);                   // Drift has its own key set (V0.18.0)
  const K = keysOf(save.settings).drag;
  if (keyMatches(e.code, K.gas)) { e.preventDefault(); if (!e.repeat) press(); }
  else if (keyMatches(e.code, K.up) && screen === 'race') { e.preventDefault(); if (!e.repeat) paddlePress(); }
  else if (keyMatches(e.code, K.down) && screen === 'race') { e.preventDefault(); if (!e.repeat) downPress(); }
  else if (keyMatches(e.code, K.nitrous) && screen === 'race') { e.preventDefault(); if (!e.repeat && playerRacer?.launched) input.nosQueued = true; }   // nitrous (V0.16.0)
});
window.addEventListener('keyup', e => {
  if (screen === 'typing') return;
  if (screen === 'drift') return driftKey(e, false);
  const K = keysOf(save.settings).drag;
  if (keyMatches(e.code, K.gas)) { e.preventDefault(); release(); }
  else if (keyMatches(e.code, K.up)) paddleRelease();
  else if (keyMatches(e.code, K.down)) downRelease();
});
class PlayerController implements Controller {
  constructor(public pedal = false) {}
  held() { return input.held; }
  shift() { const q = input.shiftQueued; input.shiftQueued = false; return q; }
  downshift() { const q = input.downQueued; input.downQueued = false; return q; }
  nitrous() { const q = input.nosQueued; input.nosQueued = false; return q; }
}

// ---------------- screens ----------------
type Screen = 'garage' | 'race' | 'results' | 'typing' | 'lab' | 'drift';
let screen: Screen = 'garage';
let race: Race | null = null, hud: Hud | null = null, oppRacer: Racer | null = null, finishedAt = 0;

function showGarage(toast?: string) {
  screen = 'garage'; world.mode = 'garage'; setTimeout(showUpdate, 0); rollRival(); if (!garageInCatalog()) world.setGarageCar(playerLook());
  renderGarage(ui, save, opp, stage, { onBuyOrEquip: buyOrEquip, onGearing: setGearing, onRatios: setRatios, onGearMode: setGearMode, onRace: () => startRace(), onStrip: startStrip, stripNext, onSetting: setSetting, onRepaint: repaint, onPlateText: setPlateText,
    onPreview: look => world.setGarageCar(look ?? playerLook()), onView: v => world.setGarageView(v), onFace: d => world.faceGarage(d),
    onBuyCar: buyCar, onUseCar: useCar, onCarStyle: carStyle, onBuyPart: buyPart, onFitPart: (id: string, carId: string) => fitPart(id, undefined, carId),
    onFav: (id: string) => { const f = save.favs ??= []; const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); writeSave(save); showGarage(); }, onDistance: setDistance, onDifficulty: setDifficulty, thumb: (look, view) => world.thumbnail(look, undefined, undefined, view), playerLook,
    onNotesSeen: () => { save.seenVersion = VERSION; writeSave(save); },
    onKeyBind: (mode, action, code) => {
      const k = (save.settings.keys ??= {});
      if (!code) { delete (k as any)[mode]; writeSave(save); return showGarage(`${KEY_MODE_LABEL[mode]} keys reset`); }
      const cur = keysOf(save.settings)[mode] as Record<string, string>, other = Object.keys(cur).find(a => a !== action && keyMatches(code, cur[a]));
      const next = { ...cur, [action]: code } as any; if (other) next[other] = cur[action];      // taken? swap the two
      (k as any)[mode] = next; writeSave(save); showGarage(`${keyName(code)} set${other ? ` (swapped with ${keyName(cur[action])})` : ''}`);
    }, onTyping: (ladder?: boolean) => startTyping(ladder), onDrift: () => startDrift(), onDriftCourse: (id: string) => { save.driftCourse = id; writeSave(save); showGarage(); },
    onClaimDaily: claimDailyTask, onClaimCal: claimCal, onSellCar: sellCar, onBuySlot: buySlot }, toast);
}
// buying, selling, claiming, fitting, painting, equipping: src/game/garageActions.ts
const { buyCar, sellCar, buySlot, claimDailyTask, claimCal, useCar, buyPart, repaint, setPlateText, fitPart, carStyle, setDistance, setDifficulty, buyOrEquip, setGearing, setRatios, setGearMode } =
  garageActions({ save: () => save, world, show: msg => showGarage(msg), lookFor, playerLook });

/** Weather (owner Q190 B): random — rain in about one race in four; ?weather=rain / clear forces it. Rain = less grip (wetStage). */
function raceWeather(): Weather { const w = params.get('weather'); return w === 'rain' || w === 'clear' ? w : Math.random() < 0.25 ? 'rain' : 'clear'; }
const fxOf = (r: Racer): FxCar => ({ launched: r.launched, launchTimer: r.launchTimer, spin: r.launchGrade === 'Wheelspin' && r.launchTimer < LAUNCH.spinSeconds && !r.gripBack,
  nitro: r.nitro > 0, v: r.v, finished: r.finish !== undefined, ev: r.lastEvent });
/** Photo finish (owner C3, V0.16.0): when both cars are in the last 30 m and less than 0.12 s apart, the clock runs at a third. */
function photoFinish(): number {
  if (!race || !playerRacer || !oppRacer || playerRacer.finish !== undefined || oppRacer.finish !== undefined) return 1;
  const L = race.distanceM, a = playerRacer, b = oppRacer, v = Math.max(5, (a.v + b.v) / 2);
  return a.x > L - 30 && b.x > L - 30 && Math.abs(a.x - b.x) / v < 0.12 ? 0.33 : 1;
}
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
  if (key === 'gfx') world.setLite(gfxLite());
  if (key === 'sound' || key === 'engineVol') setSoundLevel(volOf(save.settings.sound, 75), volOf(save.settings.engineVol, 75));
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
/** A cleared Strip level's one-time reward (owner: L1 100 VX, every 10th level +5 Crowns, decals, boss cars). Since V0.14.0 it
 *  is added automatically when the level is cleared (owner 2026-10-21) — no Claim button. Grants the Crowns / decal / car and
 *  marks the level claimed; the caller adds the VX (the race results add it with the race pay). */
function grantLevel(lg: League, n: number) {
  const r = levelReward(lg, n);
  save.crowns += r.crowns; save.stripClaimed[lg] = [...(save.stripClaimed[lg] ?? []), n];
  if (r.decal && !save.decals.includes(r.decal)) save.decals.push(r.decal);
  if (r.car) addCar(save, r.car);
  return r;
}
const rewardExtras = (r: ReturnType<typeof levelReward>) => `${r.crowns ? ` · +${r.crowns} Crowns` : ''}${r.decal ? ` · ${decalName(r.decal)} decal` : ''}${r.car ? ` · ${carName(r.car)} (League ${CARS[r.car].league}) — it's in your Catalog` : ''}`;
/** Strip rewards that are more than money (owner E5, V0.15.0): a pop-up over the race results, so a new car or decal is
 *  never missed. A car shows its picture (it is already in your garage by now). */
function rewardPop(r: ReturnType<typeof levelReward>) {
  const car = r.car ? `<img class="rp-car" src="${world.thumbnail(lookFor(r.car))}" alt=""><b class="hd">${carName(r.car)}</b><span>League ${CARS[r.car].league} car · it's in My cars now</span>` : '';
  const decal = r.decal ? `<b class="hd">${decalName(r.decal)} decal</b><span>Fit it in the Body Shop ▸ Decals</span>` : '';
  ui.insertAdjacentHTML('beforeend', `<div class="reward-pop blk" role="dialog" aria-label="Strip reward"><div class="rp-title hd">Strip reward</div>${car}${decal}<button class="btn" id="rpOk">Nice!</button></div>`);
  ui.querySelector('#rpOk')!.addEventListener('click', () => ui.querySelector('.reward-pop')?.remove());
}
/** Saves from before V0.14.0 may hold cleared levels that were never claimed: add those rewards once, on load. */
(function claimPendingStrip() {
  let vx = 0, n = 0;
  for (const lg of Object.keys(save.strip) as League[]) for (let k = 1; k <= (save.strip[lg] ?? 0); k++)
    if (!(save.stripClaimed[lg] ?? []).includes(k)) { const r = grantLevel(lg, k); vx += r.vx + r.cash; n++; }
  if (n) { save.voxels += vx; writeSave(save); }
})();
function startStrip() { const r = stripNext(); if (!r) return showGarage('This league\'s Strip is complete'); startRace('strip', r); }

function startRace(kind: 'street' | 'strip' = 'street', stripR?: Rung) {
  raceReset(carBody(save.carId).type, carBody(opp.carId).type);
  screen = 'race'; document.getElementById('vc-update')?.remove();   // never interrupt a race — the notice comes back after it
  rung = kind === 'strip' ? (stripR ?? stripNext()) : null;
  if (rung) opp = rung.rival; else rollRival();
  input.held = false; input.shiftQueued = false; input.downQueued = false; input.nosQueued = false;
  const dist = rung ? rung.dist : save.raceDist;
  race = new Race(dist);
  const weather = raceWeather(), track = weather === 'rain' ? wetStage(stage) : stage;   // rain: less grip for both cars (Q190)
  playerRacer = race.add('player', carStats(save.carId, save.equipped, track), AUTOPLAY || (DEV.enabled && DEV.autoDrive) ? new AIController(1, [0.15, 0.15], 3) : new PlayerController(pedalMode()));
  oppRacer = race.add(opp.id, carStats(opp.carId, opp.tune, track), new AIController(devOppSkill() ?? opp.skill, opp.reaction, opp.seed));
  world.setupRace(stage, dist, playerLook(), oppLook(), { time: raceTime(), near: save.settings.nearSide, weather });
  // the "Space or click" hint shows for the player's first 3 races (owner Q29)
  const DK = keysOf(save.settings).drag;
  hud = new Hud(ui, race, playerRacer, oppRacer, { keys: { gas: keyName(DK.gas), up: keyName(DK.up), down: keyName(DK.down), nitrous: keyName(DK.nitrous) }, drive: pedalMode() ? 'pedal' : 'classic', phone: PHONE, wet: weather === 'rain', icons: { me: world.thumbnail(playerLook(), 124, 56, 'strip', 'clear'), them: world.thumbnail(oppLook(), 124, 56, 'strip', 'clear') }, swap: save.settings.pedalSide === 'left', oppName: opp.name, paddle: (params.get('pskin') as string) || save.paddles.equipped, paint: playerLook().paint, showKeyHint: save.races < 3 && !PHONE, paddleShape: (params.get('pshape') as any) || save.paddles.shape, pedal: (params.get('pedal') as any) || save.pedals.equipped });
  const btn = hud.shiftBtn;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); paddlePress(); });
  btn.addEventListener('pointerup', paddleRelease); btn.addEventListener('pointercancel', paddleRelease);
  const gas = hud.gasBtn;
  gas.addEventListener('pointerdown', e => { e.preventDefault(); gas.setPointerCapture(e.pointerId); if (!playerRacer?.launched || pedalMode()) { input.held = true; hud?.setGas(true); } });
  gas.addEventListener('pointerup', release); gas.addEventListener('pointercancel', release);
  hud.nosBtn?.addEventListener('pointerdown', e => { e.preventDefault(); if (playerRacer?.launched) input.nosQueued = true; });   // tap the badge (phones)
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
  winSound(won);
  const perfects = me.shifts.filter(s => s.grade === 'Perfect').length;
  const dist = race.distanceM as RaceDist, prevBest = save.best[dist];
  const newBest = prevBest === null || me.finish! < prevBest;
  // pay: league × difficulty (Strip races pay like a Medium Street Race) — all numbers in data/economy.ts
  const diff: Difficulty = rung ? 'medium' : save.raceDiff, pay = racePay(CARS[save.carId].league, diff, won, race.distanceM);
  const earnings: [string, number][] = [[won ? (rung ? `Strip level ${rung.n} win` : `${stage.races[diff]} win`) : 'Finish', pay.result]];
  const doneRung = rung;
  if (rung && won && rung.n > (save.strip[rung.league] ?? 0)) dailyEvent(save, 'stripClear');
  if (rung && won) save.strip[rung.league] = Math.max(save.strip[rung.league] ?? 0, rung.n);
  // the level's reward is added right away (owner 2026-10-21): its VX shows in the results with the race pay
  const lr = rung && won && !(save.stripClaimed[rung.league] ?? []).includes(rung.n) ? grantLevel(rung.league, rung.n) : null;
  if (lr && rung) earnings.push([`Level ${rung.n} reward`, lr.vx + lr.cash]);
  // dailies (owner Q150)
  dailyEvent(save, 'race'); dailyEvent(save, 'perfectShift', perfects);
  if (me.launchGrade === 'Perfect') dailyEvent(save, 'perfectLaunch');
  if (won && !rung) { dailyEvent(save, 'streetWin'); if (diff === 'hard') dailyEvent(save, 'hardWin'); }
  if (perfects) earnings.push([`Perfect shifts ×${perfects}`, perfects * perfectShiftPay(pay.perfectShift, me.stats.trans.ratios.length - 1)]);
  if (me.launchGrade === 'Perfect') earnings.push(['Perfect launch', pay.perfectLaunch]);
  if (newBest) earnings.push(['New best time', pay.newBest]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  const rec = (save.cars[save.carId].stats ??= { races: 0, wins: 0, best: {} });       // per-car record (owner Q138)
  rec.races++; if (won) rec.wins++; if (rec.best[dist] == null || me.finish! < rec.best[dist]!) rec.best[dist] = me.finish!;
  save.voxels += total; save.races += 1; save.perfectShifts += perfects; if (won) save.wins += 1; if (newBest) { save.best[dist] = me.finish!; if (dist === 800) save.bestTime = me.finish!; }
  writeSave(save);
  const note = doneRung ? `The Strip · League ${doneRung.league} · Level ${doneRung.n} of ${STRIP.rungs}${doneRung.boss ? ' · Boss' : ''} · ${won ? `cleared${lr ? ` — reward added${rewardExtras(lr)}` : ''}` : 'same rival next time'}` : undefined;
  const data: ResultData = { won, myTime: me.finish!, oppTime: them.finish!, oppName: opp.name, launch: me.launchGrade || 'Bog', shifts: me.shifts.map(s => s.grade), earnings, total, newBest, note };
  rollRival(true);                                                                   // next street race: a new rival
  setTimeout(showUpdate, 0);
  renderResults(ui, data, { again: doneRung ? () => { garageOpenStrip(); showGarage(); } : () => startRace(), garage: () => showGarage() }, doneRung ? 'The Strip ▸' : 'Race again');
  if (lr && (lr.car || lr.decal)) rewardPop(lr);                       // owner E5: a new car or decal gets its own pop-up
  (window as any).__vc.lastResult = data;
}

/** Phones (owner E4): a short buzz on each Perfect shift. Phones without vibration (iPhone Safari) just skip it. */
let buzzedAt = -1;
function buzzCheck(r: Racer) {
  const ev = r.lastEvent;
  if (!ev || ev.t === buzzedAt || ev.text !== 'Perfect') return;
  buzzedAt = ev.t;
  if (save.settings.buzz !== 'off') (navigator as any).vibrate?.(35);
}

// ---------------- main loop: fixed-step physics, render every frame ----------------
const STEP = 1 / 120;
let acc = 0, last = performance.now();
function frame(now: number) {
  const dt = Math.min(MAX_DT, (now - last) / 1000) * FAST; last = now;
  if (screen === 'race' && race && playerRacer && oppRacer) {
    raceSound(playerRacer, oppRacer, race, input.held); engineOn = true;
    acc += dt * photoFinish();
    while (acc >= STEP) {
      if (!paused) { playerRacer.px = playerRacer.x; oppRacer.px = oppRacer.x; race.step(STEP); }
      acc -= STEP;
    }
    // draw where the cars are *between* the last two physics steps, so motion is even at any frame rate
    const al = paused ? 1 : acc / STEP;
    const lerp = (r: Racer) => (r.px ?? r.x) + (r.x - (r.px ?? r.x)) * al;
    world.updateRace(lerp(playerRacer), lerp(oppRacer), playerRacer.v, oppRacer.v, dt, race.t);
    world.raceEffects([fxOf(playerRacer), fxOf(oppRacer)], dt);
    hud?.update();
    buzzCheck(playerRacer);
    world.setTree(Math.min(3, Math.floor(race.t)), race.green);
    if (race.done && !paused) { finishedAt ||= now; if ((now - finishedAt) * FAST > 1200) finishRace(); }
  }
  if (screen === 'drift' && dr) driftFrame(dt, now);
  if (screen !== 'race' && screen !== 'drift' && engineOn) { engineStop(); engineOn = false; }
  if (screen === 'typing') typingFrame(dt, now);
  else if (tyKb) { tyKb.remove(); tyKb = null; }                   // phone keyboard box only lives during the Typing Race
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
(window as any).__vc = { get screen() { return screen; }, /** test hook: back to the plain garage home screen, no reload (layout check) */ homeUI: () => { resetGarageUI(); showGarage(); }, /** test hook: render an engine voice offline (tools/engine-sound.mjs) */ renderEngine, rewardPop: (n: number) => rewardPop(levelReward(CARS[save.carId].league, n)), get typing() { return ty; }, startTyping, startDrift, get drift() { return dr; }, /** dev: the drift button designs */ driftButtons: () => ui.appendChild(driftButtonSheet(cell => drawPedal(save.pedals.equipped, PADDLES.stock, cell))), openLab, version: VERSION, get opp() { return opp; }, cars: CARS, levelReward, partPrice, cosmeticPrice, get race() { return race; }, get save() { return save; }, get hud() { return hud; }, press, release, downPress, downRelease,
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
let ty: { run: TypingRun; rivals: TypingRival[]; hud: TypingHud; start: number; vis: number[]; vel: number[]; doneAt: number; diff: TypingLevel; seed: number; /** Rival Ladder rung (0-based), -1 = a normal race */ ladder: number; boss: string } | null = null;
const typingClock = (now = performance.now()) => ty ? (now - ty.start) / 1000 * FAST - COUNT : 0;   // seconds since GO
function startTyping(ladder = false) {
  screen = 'typing'; document.getElementById('vc-update')?.remove();
  const seed = params.get('tseed') ? +params.get('tseed')! : ((Date.now() & 0x7fffffff) || 1);
  const stats = typingStats(save), league = CARS[save.carId].league, me = playerName(save), lv = typingLevelOf(save);
  const rung = Math.min(stats.ladder ?? 0, TYPING_LADDER.rungs.length - 1);
  const lr = ladder ? makeLadderRace(seed, rung, league, me) : null;
  const { text, rivals } = lr ?? makeTypingRace(seed, rivalRef(stats, lv), lv, league, me), diff = lr ? lr.level : lv;
  // lanes: you in the middle, the four rivals around you
  const lanes: (TypingRival | null)[] = [rivals[0], rivals[1], null, rivals[2], rivals[3]];
  const looks = lanes.map(r => r ? { ...STOCK_LOOK, body: carBody(r.carId).profile ?? 'civix', paint: r.paint, parts: rivalParts(r.carId, r.seed) } : playerLook());
  world.setupTyping(looks);
  const hudEl = ui; const names = lanes.map(r => r ? r.name : me);
  const caption = lr ? `Rival Ladder · rung ${rung + 1}/${TYPING_LADDER.rungs.length} · vs ${lr.boss} · ${lr.wpm} wpm · ${TYPING_LEVELS[diff].label} text` : `Typing Race · ${stage.name} · League ${league} · ${TYPING_LEVELS[diff].label}`;
  ty = { run: new TypingRun(text), rivals, start: performance.now(), vis: [0, 0, 0, 0, 0], vel: [0, 0, 0, 0, 0], doneAt: 0, diff, seed, ladder: lr ? rung : -1, boss: lr?.boss ?? '',
    hud: new TypingHud(hudEl, { text, names, you: TYPE_LANE, caption, nitros: TYPING.nitros, youBadge: typingBadge(typingLeagueOf(stats.xp ?? 0).i, 1),
      nitroKey: PHONE ? 'button top-right' : keyName(keysOf(save.settings).typing.nitro), leaveKey: PHONE ? 'the Leave button' : keyName(keysOf(save.settings).typing.leave) }) };
  (ty as any).lanes = lanes;
  if (PHONE) { const root = hudEl.querySelector<HTMLElement>('#typing'); if (root) phoneTyping(root); }
}
function typingKey(e: KeyboardEvent) {
  if (!ty) return;
  const K = keysOf(save.settings).typing;
  if (keyMatches(e.code, K.leave)) { e.preventDefault(); return leaveTyping(); }
  if (keyMatches(e.code, K.nitro)) { e.preventDefault(); return typingNitro(); }   // owner: Enter, so Space can't fire it by accident
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  if (tyKb && e.target === tyKb) return;                             // phone keyboard: letters arrive through its text box (no double count)
  e.preventDefault();                                                // no page scroll on space, no quick-find on ' or /
  typedChar(e.key);
}
function leaveTyping() { ty = null; showGarage('Left the Typing Race'); }
function typingNitro() {
  if (!ty) return;
  const t = typingClock();
  if (t >= 0 && ty.run.nitro(t) === 'nitro') { nitroSound(); ty.hud.setText(ty.run.pos, ty.run.typo); ty.hud.setNitro(ty.run.nitros); ty.hud.flash('NITRO!'); if (ty.run.done && !ty.doneAt) ty.doneAt = performance.now(); }
}
function typedChar(ch: string) {
  if (!ty) return;
  const t = typingClock();
  if (t < 0 || ty.run.done) return;                                  // keys before GO don't count
  const res = ty.run.key(ch, t);
  if (res !== 'ignored') keyClick(res === 'ok');
  ty.hud.setText(ty.run.pos, ty.run.typo);
  if (ty.run.done && !ty.doneAt) ty.doneAt = performance.now();
}

/** Phones (owner E1, V0.15.0): a hidden text box opens the phone's keyboard during the Typing Race and every letter typed into
 *  it counts like a key press. Tapping the race brings the keyboard back; Nitro and Leave are buttons (no Enter / Esc on a
 *  phone keyboard, though Enter still fires nitro where the keyboard has one). The box is removed when the race screen goes. */
let tyKb: HTMLTextAreaElement | null = null, tyKbPrev = '';
function phoneTyping(root: HTMLElement) {
  const kb = document.createElement('textarea');
  kb.id = 'ty-kb'; kb.spellcheck = false; kb.setAttribute('aria-label', 'Type here');
  for (const [k, v] of [['autocomplete', 'off'], ['autocorrect', 'off'], ['autocapitalize', 'off'], ['enterkeyhint', 'send']]) kb.setAttribute(k, v);
  document.body.appendChild(kb); tyKb = kb; tyKbPrev = '';
  // read what was added since last time; if the keyboard rewrote the word (autocorrect), ignore it rather than type it twice
  kb.addEventListener('input', () => {
    const v = kb.value, add = v.startsWith(tyKbPrev) ? v.slice(tyKbPrev.length) : '';
    tyKbPrev = v;
    for (const ch of add) ch === '\n' ? typingNitro() : typedChar(ch);
    if (v.length > 40 || v.includes('\n')) { kb.value = ''; tyKbPrev = ''; }
  });
  root.insertAdjacentHTML('beforeend', `<div class="ty-phone"><button class="btn ghost" id="tyNitroBtn">Nitro</button><button class="btn ghost" id="tyLeaveBtn">Leave</button></div><button class="ty-tap btn" id="tyTap">Tap to type</button>`);
  const focus = () => kb.focus({ preventScroll: true });
  root.querySelector('#tyNitroBtn')!.addEventListener('click', () => { typingNitro(); focus(); });
  root.querySelector('#tyLeaveBtn')!.addEventListener('click', () => leaveTyping());
  root.querySelector('#tyTap')!.addEventListener('click', focus);
  kb.addEventListener('focus', () => root.classList.add('kb-on'));
  kb.addEventListener('blur', () => root.classList.remove('kb-on'));
  focus();                                                           // still inside the tap that started the race, so the keyboard opens
}
document.addEventListener('pointerdown', e => { if (tyKb && screen === 'typing' && !(e.target as Element).closest?.('button')) tyKb.focus({ preventScroll: true }); });
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
  const { run, rivals, diff, ladder, boss } = ty, lanes = (ty as any).lanes as (TypingRival | null)[];
  screen = 'results';
  const stats = typingStats(save), league = CARS[save.carId].league;
  const place = placeOf(run.finish, rivals), wpm = run.wpm(run.finish ?? typingClock()), acc = run.accuracy;
  const newBest = wpm > stats.best;
  const pay = typingPay(league, diff, place, newBest, acc);
  // Rival Ladder (V0.19.0): winning the rung you're on clears it — a one-off bonus and the next rival unlocks
  const cleared = ladder >= 0 && place === 1 && ladder >= (stats.ladder ?? 0);
  const earnings: [string, number][] = [[place === 1 ? (ladder >= 0 ? `Beat ${boss}` : 'Typing Race win') : `${['1st', '2nd', '3rd', '4th', '5th'][place - 1]} place`, pay.result]];
  if (cleared) earnings.push([`Ladder rung ${ladder + 1} cleared`, Math.round(typingPay(league, diff, 1, false, 0).result * TYPING_LADDER.clearBonus)]);
  if (pay.newBest) earnings.push(['New best WPM', pay.newBest]);
  if (pay.accuracy) earnings.push([`Accuracy ${Math.round(TYPING.accuracyAt * 100)}%+`, pay.accuracy]);
  // typing XP (V0.19.0) → your typing league
  const xp = typingXp(diff, run.pos, place, acc, cleared), was = typingLeagueOf(stats.xp ?? 0);
  stats.xp = (stats.xp ?? 0) + xp;
  const tl = typingLeagueOf(stats.xp), rankCrowns = typingRankCrowns(was.rank, tl.rank);   // owner Q213: Crowns for each new division / league
  save.crowns += rankCrowns;
  if (cleared) stats.ladder = ladder + 1;
  if (place === 1) (stats.winsBy ??= {})[diff] = (stats.winsBy[diff] ?? 0) + 1;
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  save.voxels += total; stats.races++; if (place === 1) stats.wins++; if (newBest) stats.best = wpm;
  dailyEvent(save, 'race'); if (place === 1) dailyEvent(save, 'typingWin'); if (acc >= TYPING.accuracyAt) dailyEvent(save, 'typingAcc');
  stats.recent = [...stats.recent, wpm].slice(-TYPING.recentRaces); stats.keys += run.keys; stats.errors += run.errors;
  stats.recentBy = { ...(stats.recentBy || {}), [diff]: [...(stats.recentBy?.[diff] ?? []), wpm].slice(-TYPING.recentRaces) };
  writeSave(save);
  if (!AUTOPLAY) void submitTypingRace(playerName(save), xp, run.pos, run.finish ?? typingClock(), acc);   // online top 500 (Q215); offline until set up
  const rows = [
    { place, name: playerName(save), car: carName(save.carId), wpm, acc, you: true, fin: run.finish! },
    ...rivals.map(r => ({ place: 0, name: r.name, car: carName(r.carId), wpm: r.wpm, fin: r.finish })),
  ].sort((a, b) => a.fin - b.fin).map((r, i) => ({ ...r, place: i + 1 }));
  void lanes;
  const R = TYPING_LADDER.rungs, next = stats.ladder ?? 0;
  const ladderNote = ladder < 0 ? '' : cleared ? (next >= R.length ? 'Every Ladder rung cleared!' : `Rung ${ladder + 1} cleared · next: rung ${next + 1}, ${R[next].wpm} wpm, ${TYPING_LEVELS[R[next].text].label} text`) : place === 1 ? 'Rung already cleared' : `Beat ${boss} (${R[ladder].wpm} wpm) to clear rung ${ladder + 1}`;
  const data = { rows, place, wpm, acc, earnings, total, newBest, caption: ladder >= 0 ? `Rival Ladder · rung ${ladder + 1} · ${TYPING_LEVELS[diff].label} text` : `Typing Race · ${stage.name} · ${TYPING_LEVELS[diff].label}`, best: stats.best,
    avg: rivalRef(stats, diff), avgLabel: diff === 'expert' ? 'your recent Expert best' : `your ${TYPING_LEVELS[diff].label} average`,
    xp, xpTotal: stats.xp, league: tl.i, rankName: tl.name, leagueUp: tl.i > was.i, rankUp: tl.rank > was.rank, crowns: rankCrowns, ladderNote };
  (window as any).__vc.lastTyping = data;
  ty = null;
  setTimeout(showUpdate, 0);
  renderTypingResults(ui, data, { again: () => startTyping(ladder >= 0), garage: () => showGarage() });
}

// ---------------- Drift (owner, V0.18.0, ROADMAP E4.6) ----------------
// A winding night road in a district; the car drives itself, you tap Drift at each turn and work the gas to hold the revs in the
// band. Your score against a ghost rival (an AI run replayed). Physics + scoring in game/drift.ts, the scene in render/driftView.ts.
const dIn = { gas: false, tap: false };
let dr: { run: DriftRun; hud: DriftHud; rival: DriftRival; course: string; wet: boolean; doneAt: number; diff: Difficulty } | null = null;
class DriftPlayer implements DriftControl {
  gas() { return dIn.gas; }
  drift() { const q = dIn.tap; dIn.tap = false; return q; }
}
function driftKey(e: KeyboardEvent, down: boolean) {
  const K = keysOf(save.settings).drift;
  if (keyMatches(e.code, K.gas)) { e.preventDefault(); if (!e.repeat) { dIn.gas = down; dr?.hud.setGas(down); } }
  else if (keyMatches(e.code, K.drift)) { e.preventDefault(); if (down && !e.repeat) dIn.tap = true; dr?.hud.setDrift(down); }
  else if (down && keyMatches(e.code, K.leave)) { e.preventDefault(); leaveDrift(); }
}
const driftCourse = () => DRIFT_BY_ID[save.driftCourse ?? ''] ? save.driftCourse! : DRIFT_COURSES[0].id;
/** Rain on 40 % of drift runs (owner); ?weather=rain / clear forces it. */
function driftWeather() { const w = params.get('weather'); return w === 'rain' ? true : w === 'clear' ? false : Math.random() < 0.4; }
function startDrift() {
  if (!DEV.enabled) return showGarage();                              // dev mode only for now (V0.18.2, ROADMAP E4.6)
  screen = 'drift'; document.getElementById('vc-update')?.remove();
  const course = params.get('course') && DRIFT_BY_ID[params.get('course')!] ? params.get('course')! : driftCourse(), path = driftPath(course, Math.floor(Math.random() * 1000), CARS[save.carId].league), wet = driftWeather(), track = wet ? wetStage(stage) : stage, diff = save.raceDiff;
  const seed = params.get('rseed') ? +params.get('rseed')! : ((Date.now() & 0x7fffffff) || 1);
  const rival = makeDriftRival(save.carId, save.equipped, path, diff, track, seed);
  const rivalLook: CarLook = { ...STOCK_LOOK, body: carBody(rival.carId).profile ?? 'civix', paint: rival.paint, parts: rivalParts(rival.carId, rival.seed) };
  Object.assign(dIn, { gas: false, tap: false }); acc = 0;
  const run = new DriftRun(path, carStats(save.carId, save.equipped, track), AUTOPLAY || (DEV.enabled && DEV.autoDrive) ? new DriftAI(0.95, 5) : new DriftPlayer());
  world.setupDrift(path, playerLook(), rivalLook, wet);
  driftReset(carBody(save.carId).type);
  const K = keysOf(save.settings).drift;
  const hud = new DriftHud(ui, run, { rivalName: rival.name, rivalScore: t => ghostAt(rival.trace, t).score, rivalS: t => ghostAt(rival.trace, t).s,
    keys: { gas: keyName(K.gas), drift: keyName(K.drift) }, phone: PHONE, swap: save.settings.pedalSide === 'left', button: params.get('dbtn') || save.settings.dbtn || 'brake', pedal: (params.get('pedal') as any) || save.pedals.equipped,
    paddle: save.paddles.equipped, paddleShape: save.paddles.shape, paint: playerLook().paint,
    icons: { me: world.thumbnail(playerLook(), 124, 56, 'strip', 'clear'), them: world.thumbnail(rivalLook, 124, 56, 'strip', 'clear') }, wet, showKeyHint: (save.driftRuns ?? 0) < 3 && !PHONE, onCue: driftCue });
  const hold = (el: HTMLElement, down: () => void, up: () => void) => { el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); }); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); };
  hold(hud.gasBtn, () => { dIn.gas = true; hud.setGas(true); }, () => { dIn.gas = false; hud.setGas(false); });
  hold(hud.driftBtn, () => { dIn.tap = true; hud.setDrift(true); }, () => hud.setDrift(false));
  dr = { run, hud, rival, course, wet, doneAt: 0, diff };
}
function driftFrame(dt: number, now: number) {
  const D = dr!, { run, rival } = D;
  acc += dt;
  while (acc >= STEP) { if (!paused) run.step(STEP); acc -= STEP; }
  const sI = run.ps + (run.s - run.ps) * (paused ? 1 : acc / STEP), me = poseAt(run.path, sI, run.dir * run.angle, run.dir * run.lateral);
  const g = ghostAt(rival.trace, run.time), sliding = run.drifting ? Math.min(1, run.angle / run.maxAngle) : run.spinT > 0 ? 1 : 0;
  world.drift?.update(me, run.v, sliding, poseAt(run.path, g.s, g.angle, g.lat), dt, sI);
  D.hud.update();
  driftSound(run.rpm, run.stats.redline, run.gasOn, sliding, run.green, run.t, run.lastEvent); engineOn = true;
  if (run.finish !== undefined && !paused) { D.doneAt ||= now; if ((now - D.doneAt) * FAST > 1800) finishDrift(); }
}
function finishDrift() {
  if (!dr) return;
  const { run, rival, course, diff } = dr;
  screen = 'results';
  const score = Math.round(run.score), won = score > rival.score, pay = driftPay(CARS[save.carId].league, diff, won);
  const best = (save.driftBest ??= {}), newBest = score > 0 && score > (best[course] ?? 0);
  const earnings: [string, number][] = [[won ? `Drift win · ${DIFFICULTY[diff].label}` : 'Finish', pay.result]];
  if (run.perfectEntries) earnings.push([`Perfect entries ×${run.perfectEntries}`, run.perfectEntries * pay.perfectEntry]);
  if (!run.spins && run.clean) earnings.push(['Clean run (no spins)', pay.clean]);
  if (newBest) earnings.push(['New best score', pay.newBest]);
  const total = earnings.reduce((a, [, v]) => a + v, 0);
  save.voxels += total; save.driftRuns = (save.driftRuns ?? 0) + 1; if (newBest) best[course] = score;
  dailyEvent(save, 'race');
  writeSave(save);
  const data: DriftResultData = { won, score, rival: Math.round(rival.score), rivalName: rival.name, course: DRIFT_BY_ID[course].name, turns: run.outcomes, perfect: run.perfectEntries, spins: run.spins, bestChain: run.bestChain, earnings, total, newBest, best: best[course] ?? score };
  (window as any).__vc.lastDrift = data;
  dr = null;
  setTimeout(showUpdate, 0);
  renderDriftResults(ui, data, { again: () => startDrift(), garage: () => showGarage() });
}
function leaveDrift() { dr = null; showGarage('Left the drift run'); }

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
