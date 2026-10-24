// Garage actions (split out of main.ts, 2026-10-20): what happens when you buy, sell, claim, fit, repaint or equip
// something in the garage. Each one checks the price, changes the save, writes it, and shows the garage again with a
// short message. Prices live in src/data/economy.ts; the panels that call these live in src/ui/panels/.
import { SaveV1, writeSave, addCar, switchCar, removeCar, slotsUsed, slotsTotal, sellBlock, RaceDist, switchSetup, renameSetup, setupsOf } from '../save/save';
import { CARS, carName, carPaint } from '../data/cars';
import { GARAGE, sellValue, EcoLeague, cosmeticPrice, PAINT, PLATE_TEXT, repaintPrice, Difficulty } from '../data/economy';
import { Tier, AnyKind, PART_TABLE, Tune } from '../data/parts';
import { PART_BY_ID, ownsPart, isFactory } from '../data/visualParts';
import { claimDaily, claimCalendar, paintName } from './daily';
import { cleanPlate, DEFAULT_PLATE } from '../render/plate';
import { CarLook } from '../render/carBuilder';
import { World } from '../render/scene';
import { DEV } from '../ui/devConsole';
import { factoryTwin } from '../ui/panels/bodyShop';

export interface GarageActionContext {
  /** the current save (a function: the test console can swap in a fresh save) */
  save(): SaveV1;
  world: World;
  /** show the garage again, with an optional message */
  show(msg?: string): void;
  /** a car as it looks now (paint, parts, plate) */
  lookFor(id: string): CarLook;
  /** the car in use as it looks now */
  playerLook(): CarLook;
}

export function garageActions(ctx: GarageActionContext) {
  const { world, show, lookFor, playerLook } = ctx;

  /** Catalog (Q79): buy a car (it comes with the paint/options picked and goes straight into use). */
  function buyCar(id: string, paint: string, opts: Record<string, string>) {
    const save = ctx.save(), def = CARS[id]; if (!def || save.cars[id]) return;
    const crowns = def.currency === 'crowns', have = crowns ? save.crowns : save.voxels;
    if (!DEV.unlimited && have < def.price) return show(`Need ${(def.price - have).toLocaleString()} more ${crowns ? 'Crowns' : 'VX'} for the ${carName(id)}`);
    if (!def.unique && slotsUsed(save) >= slotsTotal(save)) return show(`Garage full (${slotsUsed(save)}/${slotsTotal(save)}) — sell a car or buy a slot (${GARAGE.slotCrowns} Crowns) in the Garage`);
    if (!DEV.unlimited) { if (crowns) save.crowns -= def.price; else save.voxels -= def.price; }
    addCar(save, id, paint, opts); switchCar(save, id); writeSave(save);
    show(`Bought the ${carName(id)} — now in use`);
  }
  /** Sell a car for half its price + half its upgrades (owner Q153). */
  function sellCar(id: string) {
    const save = ctx.save(), why = sellBlock(save, id); if (why) return show(why);
    const c = save.cars[id], v = sellValue(CARS[id].league as EcoLeague, CARS[id].price, c.owned);
    removeCar(save, id); save.voxels += v; writeSave(save); world.setGarageCar(playerLook());
    show(`Sold the ${carName(id)} for ${v.toLocaleString()} VX`);
  }
  /** One more garage slot for Crowns (owner Q152). */
  function buySlot() {
    const save = ctx.save();
    if (slotsTotal(save) >= GARAGE.maxSlots) return show('The garage is as big as it gets');
    if (!DEV.unlimited && save.crowns < GARAGE.slotCrowns) return show(`Need ${GARAGE.slotCrowns - save.crowns} more Crowns for a garage slot`);
    if (!DEV.unlimited) save.crowns -= GARAGE.slotCrowns;
    save.slotsBought = (save.slotsBought ?? 0) + 1; writeSave(save);
    show(`Garage slot bought — ${slotsTotal(save)} slots`);
  }
  /** Dailies (owner Q150): claim a finished task (i), or the all-three bonus (-1). */
  function claimDailyTask(i: number) {
    const save = ctx.save(), r = claimDaily(save, i, CARS[save.carId].league as EcoLeague); if (!r) return;
    writeSave(save); show(`Daily ${i < 0 ? 'bonus' : 'task'}: ${r.vx ? `+${r.vx.toLocaleString()} VX · ` : ''}+${r.crowns} Crowns`);
  }
  /** Login calendar (owner Q151): today's day. */
  function claimCal() {
    const save = ctx.save(), r = claimCalendar(save, CARS[save.carId].league as EcoLeague); if (!r) return;
    writeSave(save); show(`Calendar day ${r.day}: ${r.paint ? `${paintName(r.paint)} paint — in the Body Shop` : r.crowns ? `+${r.crowns} Crowns` : `+${r.vx.toLocaleString()} VX`}`);
  }
  function useCar(id: string) {
    const save = ctx.save(); if (!save.cars[id] || save.carId === id) return;
    switchCar(save, id); writeSave(save);
    show(`Now driving the ${carName(id)}`);
  }
  /** Visual parts (owner 2026-10-19): buy once for every car; fit to the car in use. Factory parts are free. */
  function buyPart(id: string, carId = ctx.save().carId) {
    const save = ctx.save(), p = PART_BY_ID[id]; if (!p) return;
    const lg = CARS[carId].league as EcoLeague;                                   // VX parts: priced and owned per league (Q156, Q158a)
    if (p.won && !ownsPart(id, save.partsOwned, save.decals, lg)) return show(`${p.name} is won on the Strip, not sold`);
    if (!ownsPart(id, save.partsOwned, save.decals, lg)) {
      const c = cosmeticPrice(id, lg), crowns = c.currency === 'crowns', have = crowns ? save.crowns : save.voxels;
      if (!DEV.unlimited && have < c.price) return show(`Need ${(c.price - have).toLocaleString()} more ${crowns ? 'Crowns' : 'VX'} for ${p.name}`);
      if (!DEV.unlimited) { if (crowns) save.crowns -= c.price; else save.voxels -= c.price; }
      save.partsOwned.push(crowns ? id : `${lg}:${id}`);
    }
    fitPart(id, `Bought ${p.name} — fitted`, carId);
  }
  /** Body Shop paint (owner 2026-10-19): standard repaint = VX (league-scaled); premium = Crowns once, then free on every car. */
  function repaint(carId: string, paint: string, premium?: string) {
    const save = ctx.save(), c = save.cars[carId]; if (!c || (c.paint || carPaint(carId)) === paint) return;
    const pr = premium ? PAINT.premium.find(p => p.id === premium) : undefined, owned = save.paintsOwned ?? (save.paintsOwned = []);
    let msg = '';
    if (pr) {
      if (!owned.includes(pr.id)) {
        if (pr.calendar) return show(`${pr.name} is won on day 28 of the login calendar`);
        if (!DEV.unlimited && save.crowns < pr.crowns) return show(`Need ${pr.crowns - save.crowns} more Crowns for ${pr.name}`);
        if (!DEV.unlimited) save.crowns -= pr.crowns;
        owned.push(pr.id); msg = `Bought ${pr.name} — yours on every car`;
      } else msg = `Painted ${pr.name}`;
    } else {
      const cost = repaintPrice(CARS[carId].league as any);
      if (!DEV.unlimited && save.voxels < cost) return show(`Need ${(cost - save.voxels).toLocaleString()} more VX to repaint`);
      if (!DEV.unlimited) save.voxels -= cost;
      msg = `Repainted ${carName(carId)}`;
    }
    c.paint = paint; writeSave(save); world.setGarageCar(lookFor(carId)); show(msg);
  }
  /** Your own plate text: Crowns for every change (owner 2026-10-19). */
  function setPlateText(carId: string, text: string) {
    const save = ctx.save(), c = save.cars[carId], t = cleanPlate(text, PLATE_TEXT.maxLength).trim(); if (!c) return;
    if (!t) return show('Type some letters or numbers first');
    if ((c.plateText || DEFAULT_PLATE) === t) return show('That is already on the plate');
    if (!DEV.unlimited && save.crowns < PLATE_TEXT.crowns) return show(`Need ${PLATE_TEXT.crowns - save.crowns} more Crowns`);
    if (!DEV.unlimited) save.crowns -= PLATE_TEXT.crowns;
    c.plateText = t; writeSave(save); world.setGarageCar(lookFor(carId)); show(`Plate now reads ${t}`);
  }
  function fitPart(id: string, msg?: string, carId = ctx.save().carId) {
    const save = ctx.save(), p = PART_BY_ID[id], c = save.cars[carId]; if (!p || !c) return;
    if (isFactory(p) || factoryTwin(carId, p.slot)?.id === id) delete c.parts[p.slot]; else if (ownsPart(id, save.partsOwned, save.decals, CARS[carId].league)) c.parts[p.slot] = id; else return;
    writeSave(save); world.setGarageCar(lookFor(carId)); show(msg ?? `Fitted ${p.name}${carId !== save.carId ? ` to ${carName(carId)}` : ''}`);
  }
  /** Paint / body options on an owned car save straight away (visual only). */
  function carStyle(id: string, paint: string, opts: Record<string, string>) {
    const save = ctx.save(), c = save.cars[id]; if (!c) return;
    c.paint = paint; c.opts = { ...opts }; writeSave(save);
    show();
  }
  /** Street Race length (owner Q100) and difficulty (Q106). */
  function setDistance(d: RaceDist) { const save = ctx.save(); save.raceDist = d; writeSave(save); show(); }
  function setDifficulty(d: Difficulty) { const save = ctx.save(); save.raceDiff = d; writeSave(save); show(); }
  /** Buy / fit a performance tier on a car (the one in use, or any owned car from the Garage). */
  function buyOrEquip(kind: AnyKind, tier: Tier, carId = ctx.save().carId) {
    const save = ctx.save(); if (!save.cars[carId]) return;
    if (CARS[carId].unique) return show('Boss cars come as they are — they can\'t be upgraded');
    const lg = CARS[carId].league, def = PART_TABLE[kind][lg][tier - 1];
    const T = carId === save.carId ? save : save.cars[carId];        // the car in use keeps its tiers at the top of the save
    let msg: string | undefined;
    if (!(T.owned[kind] ?? [1]).includes(tier)) {
      if (!DEV.unlimited && save.voxels < def.price) return show(`Need ${(def.price - save.voxels).toLocaleString()} more VX for ${def.label}`);
      if (!DEV.unlimited) save.voxels -= def.price;                 // test console: unlimited = free purchases
      T.owned[kind] = [...(T.owned[kind] ?? [1]), tier].sort() as Tier[];
      msg = `Bought ${def.label}`;
    }
    T.equipped[kind] = tier; writeSave(save);
    show(msg ?? `Equipped ${def.label}`);
  }
  /** Car Lab (Build & Tune Update): save tuning settings on a car — a key set to undefined goes back to factory; null resets every
   *  setting (final drive, tire pressure, nitrous mix, gear ratios). Free and quiet (no toast per slider move); boss cars too. */
  function setTune(patch: Partial<Tune> | null, carId = ctx.save().carId) {
    const save = ctx.save(); if (!save.cars[carId]) return;
    const e = (carId === save.carId ? save : save.cars[carId]).equipped as Partial<Tune> & Record<string, unknown>;
    for (const [k, v] of Object.entries(patch ?? { fd: undefined, tp: undefined, nm: undefined, ratios: undefined })) { if (v === undefined) delete e[k]; else e[k] = v; }
    writeSave(save); show(patch ? undefined : 'Factory settings');
  }

  /** Saved set-ups (owner Q179): switch a car to set-up i (free), or rename one. */
  function useSetup(i: number, carId = ctx.save().carId) {
    const save = ctx.save(); if (!save.cars[carId]) return;
    switchSetup(save, carId, i); writeSave(save); show(setupsOf(save, carId).names[i]);
  }
  function nameSetup(i: number, name: string, carId = ctx.save().carId) {
    const save = ctx.save(); if (!save.cars[carId]) return;
    renameSetup(save, carId, i, name); writeSave(save); show();
  }

  return { buyCar, sellCar, buySlot, claimDailyTask, claimCal, useCar, buyPart, repaint, setPlateText, fitPart, carStyle, setDistance, setDifficulty, buyOrEquip, setTune, useSetup, nameSetup };
}
