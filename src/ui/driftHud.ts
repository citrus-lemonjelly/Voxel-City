// Drift HUD (owner, V0.18.0): the Street Race HUD — lights, progress strip, gauge, gas pedal (no shift paddles: automatic gears,
// V0.18.1) — with the Drift
// button standing beside the gas pedal, the gauge showing the green rev band while you slide, and on top: your score + chain,
// the ghost rival's score, and the live points of the drift you're in. No turn markers (owner): the road and its chevrons tell you.
import { DriftRun, DRIFT, chainMult } from '../game/drift';
import { Hud } from './hud';
import type { PedalStyle, PaddleShape } from '../data/cosmetics';

export interface DriftHudOpts {
  rivalName: string; rivalScore: (t: number) => number; rivalS: (t: number) => number;
  keys: { gas: string; drift: string }; phone: boolean; swap: boolean; button: string; pedal: PedalStyle;
  paddle: string; paddleShape: PaddleShape; paint: string;
  icons?: { me: string; them: string }; wet: boolean; showKeyHint: boolean;
  /** a cue light came on (1–3) or went green (4) — for the beep */
  onCue?: (level: number) => void;
}

export class DriftHud {
  hud: Hud;
  get el() { return this.hud.el; }
  get gasBtn() { return this.hud.gasBtn; }
  get driftBtn() { return this.hud.driftBtn ?? this.hud.gasBtn; }
  get shiftBtn() { return this.hud.shiftBtn; }
  get downBtn() { return this.hud.downBtn; }
  /** the Street Race HUD reads a race and two racers: these stand-ins are copied from the drift run every frame */
  private race = { t: 0, green: false, raceTime: 0, distanceM: 1 };
  private me: any; private them: any = { x: 0 };
  private scoreEl: HTMLElement; private chainEl: HTMLElement; private rivalEl: HTMLElement; private runEl: HTMLElement;
  private last = { score: -1, chain: -1, cue: -1 };
  private cueEl: HTMLElement; private cueLights: HTMLElement[];

  constructor(root: HTMLElement, private run: DriftRun, private o: DriftHudOpts) {
    this.race.distanceM = run.path.length;
    this.me = { stats: { ...run.stats, nitro: { boost: 0, seconds: 0 } }, x: 0, v: 0, rpm: run.rpm, gear: 0, launched: false, shifting: 0, nitro: 0, nitroUsed: false };
    this.sync();
    this.hud = new Hud(root, this.race as any, this.me, this.them, {
      oppName: o.rivalName, paddle: o.paddle, paddleShape: o.paddleShape, paint: o.paint, pedal: o.pedal, showKeyHint: o.showKeyHint,
      keys: { gas: o.keys.gas, down: '' }, drive: 'pedal', noPaddles: true, icons: o.icons, wet: o.wet, phone: o.phone, swap: o.swap,
      drift: { button: o.button, key: o.keys.drift },
      // the gauge: the launch window, then the shift zone on the straights, the rev band while sliding
      zone: () => { if (!run.drifting) return null; const [lo, hi] = run.band(); return [lo, hi]; },
    });
    const hint = this.el.querySelector<HTMLElement>('#hint');
    if (hint) hint.innerHTML = `Gears are automatic. When the lights above the gauge turn green, tap <b>${o.keys.drift}</b> — then feather <b>${o.keys.gas}</b> to keep the revs in the green.${o.wet ? ' <b class="wet">Rain — less grip, the turns come slower.</b>' : ''}`;
    this.el.classList.add('dhud');
    this.el.insertAdjacentHTML('beforeend', `<div class="d-score blk"><span class="d-lbl">Score</span><b class="hd" id="dScore">0</b><span class="d-chain hd" id="dChain">×1</span></div>
      <div class="d-rival blk"><span class="d-lbl">${o.rivalName} · ghost</span><b class="hd" id="dRival">0</b></div><div class="d-run" id="dRun"></div>`);
    // drift cue (owner, V0.18.1): three small lights just above the gauge, counting down to each turn-in, green = tap Drift
    const cluster = this.el.querySelector<HTMLElement>('.cluster')!, gauge = cluster.querySelector<SVGElement>('.gauge');
    const gx = parseFloat(gauge?.style.left || '0') + 118;
    this.cueEl = Object.assign(document.createElement('div'), { className: 'd-cue blk', innerHTML: '<i></i><i></i><i></i>' });
    this.cueEl.style.left = `${gx}px`; cluster.appendChild(this.cueEl);
    this.cueLights = [...this.cueEl.querySelectorAll<HTMLElement>('i')];
    this.scoreEl = this.el.querySelector('#dScore')!; this.chainEl = this.el.querySelector('#dChain')!; this.rivalEl = this.el.querySelector('#dRival')!; this.runEl = this.el.querySelector('#dRun')!;
  }
  private sync() {
    const r = this.run, m = this.me;
    Object.assign(this.race, { t: r.t, green: r.green, raceTime: r.time });
    Object.assign(m, { x: r.s, v: r.v, rpm: r.rpm, gear: r.gear, launched: r.launched, launchGrade: r.launchGrade, shifting: r.shifting, lastEvent: r.lastEvent });
    this.them.x = this.o.rivalS(r.time);
  }
  setGas(down: boolean) { this.hud.setGas(down); }
  setDrift(down: boolean) { this.hud.setDrift(down); }
  setPressed(down: boolean) { this.hud.setPressed(down); }
  setDownPressed(down: boolean) { this.hud.setDownPressed(down); }

  update() {
    this.sync(); this.hud.update();
    const r = this.run, sc = Math.round(r.score);
    if (sc !== this.last.score) { this.scoreEl.textContent = sc.toLocaleString(); this.last.score = sc; }
    if (r.chain !== this.last.chain) { this.chainEl.textContent = `×${chainMult(r.chain).toFixed(2).replace(/\.?0+$/, '')}`; this.chainEl.classList.toggle('hot', r.chain > 0); this.last.chain = r.chain; }
    this.rivalEl.textContent = Math.round(this.o.rivalScore(r.time)).toLocaleString();
    const cue = r.cue();
    if (cue !== this.last.cue) {
      this.cueEl.classList.toggle('on', cue > 0);
      this.cueLights.forEach((l, i) => { l.className = cue === 4 ? 'go' : i < cue ? 'lit' : ''; });
      if (cue > 0) this.o.onCue?.(cue);
      this.last.cue = cue;
    }
    // the drift you're in: points so far, angle, a word on the revs; then the banked points for a moment
    const ev = r.lastEvent;
    if (ev && ev.pts && r.t - ev.t < 1.1) { this.runEl.innerHTML = `<b class="hd banked">+${ev.pts.toLocaleString()}</b>`; this.runEl.className = 'd-run on banked'; }
    else if (r.drifting) {
      const hi = r.band()[1];
      this.runEl.innerHTML = `<b class="hd">+${Math.round(r.runPts * (r.entry ? DRIFT.entryMult[r.entry] : 1) * chainMult(r.chain)).toLocaleString()}</b><span>${Math.round(r.angle)}° · ${r.zone === 'perfect' ? 'PERFECT' : r.zone === 'band' ? 'in the band' : r.rpm / r.stats.redline > hi ? 'too many revs!' : 'more gas!'}</span>`;
      this.runEl.className = `d-run on z-${r.zone}`;
    } else if (this.runEl.className !== 'd-run') { this.runEl.className = 'd-run'; this.runEl.innerHTML = ''; }
  }
}
