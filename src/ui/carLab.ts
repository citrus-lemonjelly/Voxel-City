// Car Lab (owner 2026-10-19): a developer-only car designer. Opens from the test console (?dev → ` → Car Lab) or with
// ?lab when dev mode is on. Every body setting from render/bodies.ts as sliders / pickers, the voxel car rebuilt live on
// the turntable at game scale, start from any existing body, try paint / wheels / decals, and Export the settings as JSON
// (paste them into chat, or Import them back). Nothing here touches the save or the game balance.
import { BODY_PROFILES, BodyProfile } from '../render/bodies';
import { CarLook, STOCK_LOOK } from '../render/carBuilder';

export interface LabHooks { preview(look: CarLook): void; close(): void }
type Num = { k: string; label: string; min: number; max: number; step?: number; get(p: BodyProfile): number; set(p: BodyProfile, v: number): void };
const num = (k: keyof BodyProfile, label: string, min: number, max: number, step = 1): Num =>
  ({ k: k as string, label, min, max, step, get: p => (p[k] as number) ?? 0, set: (p, v) => { (p as any)[k] = v; } });
const sub = (k: 'head' | 'tail' | 'grille', f: 'y0' | 'y1' | 'z', label: string, min: number, max: number): Num =>
  ({ k: `${k}.${f}`, label, min, max, get: p => (p[k] as any)[f], set: (p, v) => { (p[k] as any) = { ...(p[k] as any), [f]: v }; } });
const NUMS: [string, Num[]][] = [
  ['Size', [num('L', 'Length', 40, 80), num('W', 'Width', 24, 32), num('ride', 'Ride height', 0, 3), num('yBot', 'Underside', 1, 4)]],
  ['Wheels', [
    { k: 'wf', label: 'Front wheel x', min: 5, max: 25, get: p => p.wheels[0], set: (p, v) => { p.wheels = [v, p.wheels[1]]; } },
    { k: 'wr', label: 'Rear wheel x', min: 30, max: 75, get: p => p.wheels[1], set: (p, v) => { p.wheels = [p.wheels[0], v]; } },
    num('wheelR', 'Wheel radius', 4, 6.5, 0.1), num('fenders', 'Fenders', 0, 3), num('flares', 'Flares', 0, 3)]],
  ['Glasshouse', [num('wsEnd', 'Windscreen ends', 10, 50), num('roofEnd', 'Roof ends', 20, 70), num('cPillar', 'Side glass ends', 20, 70), num('greenInset', 'Glass inset', 1, 5), num('roofInset', 'Roof inset', 1, 6), num('crease', 'Body line', 0, 5)]],
  ['Lights + grille', [sub('head', 'y0', 'Head lamp bottom', 2, 16), sub('head', 'y1', 'Head lamp top', 3, 18), sub('tail', 'y0', 'Tail lamp bottom', 2, 18), sub('tail', 'y1', 'Tail lamp top', 3, 20),
    sub('grille', 'y0', 'Grille bottom', 1, 14), sub('grille', 'y1', 'Grille top', 2, 16), sub('grille', 'z', 'Grille inset', 2, 14)]],
];
const PICKS: { k: string; label: string; opts: string[]; get(p: BodyProfile): string; set(p: BodyProfile, v: string): void }[] = [
  { k: 'rearGlass', label: 'Rear', opts: ['hatch', 'window'], get: p => p.rearGlass, set: (p, v) => { p.rearGlass = v as any; } },
  { k: 'head', label: 'Head lamps', opts: ['rect', 'slim', 'quad', 'round', 'wrap', 'split', 'bar', 'notch', 'popup', 'popupUp', 'blade'], get: p => p.head.style, set: (p, v) => { p.head = { ...p.head, style: v as any }; } },
  { k: 'tail', label: 'Tail lamps', opts: ['rect', 'bar', 'quad', 'blade', 'tall'], get: p => p.tail.style, set: (p, v) => { p.tail = { ...p.tail, style: v as any }; } },
  { k: 'grille', label: 'Grille', opts: ['slats', 'mesh', 'wide', 'kidney', 'frame', 'none'], get: p => p.grille.style, set: (p, v) => { p.grille = { ...p.grille, style: v as any }; } },
  { k: 'wing', label: 'Spoiler', opts: ['none', 'lip', 'ducktail', 'roof', 'gt'], get: p => p.wing ?? 'none', set: (p, v) => { p.wing = v as any; } },
  { k: 'exhaust', label: 'Exhaust', opts: ['dual', 'split', 'single', 'twinCentre', 'quad'], get: p => p.exhaust ?? (p.quadExhaust ? 'quad' : 'dual'), set: (p, v) => { p.exhaust = v as any; p.quadExhaust = false; } },
  { k: 'rim', label: 'Wheels', opts: ['steel', 'fivespoke', 'dish', 'multi', 'mesh', 'twin5', 'sixblack', 'turbofan', 'gold5'], get: p => p.rim, set: (p, v) => { p.rim = v; } },
];
const FLAGS: [keyof BodyProfile, string][] = [['mirrors', 'Mirrors'], ['fogs', 'Fog lamps'], ['splitter', 'Splitter'], ['cladding', 'Black cladding'], ['floatingRoof', 'Floating roof'], ['chromeBumpers', 'Chrome bumpers'], ['diffuser', 'Diffuser']];
const DECALS = ['stock', 'side', 'checker', 'number', 'stripes', 'flames'];

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const pts = (a: [number, number][]) => a.map(([x, y]) => `${x},${y}`).join('  ');
const parsePts = (s: string): [number, number][] | null => {
  const a = s.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(q => q.length === 2 && q.every(isFinite)) as [number, number][];
  return a.length >= 2 ? a.sort((p, q) => p[0] - q[0]) : null;
};

export function openCarLab(root: HTMLElement, hooks: LabHooks) {
  const bases = Object.keys(BODY_PROFILES).filter(k => k !== 'lab' && k !== 'tuner_up' && BODY_PROFILES[k]);
  let base = bases[0], P: BodyProfile = clone(BODY_PROFILES[base]), decal = 'stock', pending = false;
  const apply = () => {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; BODY_PROFILES.lab = { ...P, id: 'lab' }; hooks.preview({ ...STOCK_LOOK, body: 'lab', paint: P.paint, parts: decal === 'stock' ? {} : { decal } }); });
  };
  const render = () => {
    root.innerHTML = `<div id="carlab" class="blk">
      <div class="lab-h"><b class="hd">Car Lab</b><span>dev only · game scale · nothing is saved to the game</span><button class="g-close" id="labClose" aria-label="Close">✕</button></div>
      <div class="lab-sec"><label>Start from <select id="labBase">${bases.map(b => `<option value="${b}" ${b === base ? 'selected' : ''}>${BODY_PROFILES[b].name}</option>`).join('')}</select></label>
        <label>Paint <input type="color" id="labPaint" value="${P.paint}"></label><label>Decal <select id="labDecal">${DECALS.map(d => `<option ${d === decal ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
      ${NUMS.map(([title, ns]) => `<div class="lab-sec"><b>${title}</b>${ns.map(n => `<label class="lab-n"><span>${n.label}</span><input type="range" data-n="${n.k}" min="${n.min}" max="${n.max}" step="${n.step ?? 1}" value="${n.get(P)}"><em>${n.get(P)}</em></label>`).join('')}</div>`).join('')}
      <div class="lab-sec"><b>Body line (x,y points: hood → deck)</b><textarea id="labLower" rows="2">${pts(P.lower)}</textarea>
        <b>Roof line (x,y points: windscreen → tail)</b><textarea id="labGreen" rows="2">${pts(P.green)}</textarea></div>
      <div class="lab-sec"><b>Styles</b>${PICKS.map(k => `<label class="lab-p"><span>${k.label}</span><select data-p="${k.k}">${k.opts.map(o => `<option ${o === k.get(P) ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`).join('')}
        <div class="lab-flags">${FLAGS.map(([f, l]) => `<label><input type="checkbox" data-f="${f as string}" ${P[f] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div class="lab-sec"><b>Export / import</b><textarea id="labJson" rows="4" spellcheck="false"></textarea>
        <div class="lab-btns"><button class="btn race" id="labCopy">Copy settings</button><button class="btn ghost" id="labImport">Import pasted</button><button class="btn ghost" id="labReset">Reset to base</button></div>
        <span class="lab-msg"></span></div>
    </div>`;
    const el = root.firstElementChild as HTMLElement, msg = (t: string) => { el.querySelector('.lab-msg')!.textContent = t; };
    const json = el.querySelector<HTMLTextAreaElement>('#labJson')!;
    const sync = () => { json.value = JSON.stringify({ ...P, id: 'custom', name: `Custom (from ${BODY_PROFILES[base].name})` }); apply(); };
    el.querySelector('#labClose')!.addEventListener('click', () => { delete (BODY_PROFILES as any).lab; hooks.close(); });
    el.querySelector<HTMLSelectElement>('#labBase')!.addEventListener('change', e => { base = (e.target as HTMLSelectElement).value; P = clone(BODY_PROFILES[base]); render(); });
    el.querySelector<HTMLInputElement>('#labPaint')!.addEventListener('input', e => { P.paint = (e.target as HTMLInputElement).value; sync(); });
    el.querySelector<HTMLSelectElement>('#labDecal')!.addEventListener('change', e => { decal = (e.target as HTMLSelectElement).value; sync(); });
    el.querySelectorAll<HTMLInputElement>('[data-n]').forEach(inp => inp.addEventListener('input', () => {
      const n = NUMS.flatMap(([, ns]) => ns).find(q => q.k === inp.dataset.n)!; n.set(P, +inp.value); (inp.nextElementSibling as HTMLElement).textContent = inp.value; sync();
    }));
    el.querySelectorAll<HTMLSelectElement>('[data-p]').forEach(s => s.addEventListener('change', () => { PICKS.find(k => k.k === s.dataset.p)!.set(P, s.value); sync(); }));
    el.querySelectorAll<HTMLInputElement>('[data-f]').forEach(c => c.addEventListener('change', () => { (P as any)[c.dataset.f!] = c.checked; sync(); }));
    for (const [id, key] of [['#labLower', 'lower'], ['#labGreen', 'green']] as const) el.querySelector<HTMLTextAreaElement>(id)!.addEventListener('input', e => {
      const v = parsePts((e.target as HTMLTextAreaElement).value); if (v) { (P as any)[key] = v; sync(); msg(''); } else msg('Points look like: 0,8 3,10 13,11 …');
    });
    el.querySelector('#labCopy')!.addEventListener('click', async () => { try { await navigator.clipboard.writeText(json.value); msg('Copied — paste it into the chat to add this car.'); } catch { json.select(); msg('Select-all + copy the box above.'); } });
    el.querySelector('#labImport')!.addEventListener('click', () => { try { const o = JSON.parse(json.value); if (!o.lower || !o.green || !o.wheels) throw 0; P = { ...clone(BODY_PROFILES[base]), ...o }; render(); msg('Imported.'); } catch { msg('That isn\'t a Car Lab export.'); } });
    el.querySelector('#labReset')!.addEventListener('click', () => { P = clone(BODY_PROFILES[base]); render(); });
    sync();
  };
  render();
}
