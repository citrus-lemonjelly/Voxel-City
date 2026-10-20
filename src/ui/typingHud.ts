// Typing Race screens (owner 2026-10-19): progress bar, name tags over the road, the passage panel (typed letters dimmed,
// current letter yellow, a typo red), live WPM / accuracy / place / time, static start lamps (A22–A23: no blinking), and
// the results list.
const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ORD = ['1st', '2nd', '3rd', '4th', '5th'];

export interface TypingHudOpts { text: string; names: string[]; you: number; caption: string }

export class TypingHud {
  el: HTMLElement;
  private chars: HTMLElement[] = [];
  private tags: HTMLElement[] = [];
  private marks: HTMLElement[] = [];
  private lamps: HTMLElement[] = [];
  private stat: Record<string, HTMLElement> = {};
  private lastPos = -1; private lastTypo = false;
  constructor(root: HTMLElement, private o: TypingHudOpts) {
    root.innerHTML = '';
    // the passage, one span per letter, grouped by word so lines only break between words
    // (the space after each word sits outside the word's no-wrap span, so the line can break there)
    let i = 0;
    const passage = o.text.split(' ').map((w, wi, all) => `<span class="tw">${[...w].map(c => `<span data-i="${i++}">${esc(c)}</span>`).join('')}</span>${wi < all.length - 1 ? `<span data-i="${i++}"> </span>` : ''}`).join('');
    this.el = h(`<div id="typing">
      <div class="ty-prog"><i></i>${o.names.map((_, k) => `<u class="${k === o.you ? 'me' : ''}"></u>`).join('')}<b class="ty-flag"></b></div>
      ${o.names.map((n, k) => `<div class="ty-tag ${k === o.you ? 'me' : ''}">${esc(n)}<span></span></div>`).join('')}
      <div class="ty-lights blk"><i></i><i></i><i></i></div><div class="ty-go hd"></div>
      <div class="ty-cap">${esc(o.caption)}</div>
      <div class="ty-panel blk"><div class="ty-text">${passage}</div>
        <div class="ty-stats"><div class="stat"><b data-s="wpm">—</b><span>WPM</span></div><div class="stat"><b data-s="acc">—</b><span>Accuracy</span></div>
          <div class="stat"><b data-s="place">—</b><span>Place</span></div><div class="stat"><b data-s="time">0:00</b><span>Time</span></div>
          <div class="stat ty-hint"><b data-s="hint">Get ready…</b><span>Wrong key = red letter · type the right one to go on · Esc leaves</span></div></div></div>
    </div>`);
    root.appendChild(this.el);
    this.chars = [...this.el.querySelectorAll<HTMLElement>('.ty-text [data-i]')];
    this.tags = [...this.el.querySelectorAll<HTMLElement>('.ty-tag')];
    this.marks = [...this.el.querySelectorAll<HTMLElement>('.ty-prog u')];
    this.lamps = [...this.el.querySelectorAll<HTMLElement>('.ty-lights i')];
    this.el.querySelectorAll<HTMLElement>('[data-s]').forEach(e => (this.stat[e.dataset.s!] = e));
    this.setText(0, false);
  }
  /** Start lamps: `lit` red lamps (0–3); go = all green and "GO". */
  setCountdown(lit: number, go: boolean, gone = false) {
    this.lamps.forEach((l, i) => (l.className = go ? 'go' : i < lit ? 'on' : ''));
    const g = this.el.querySelector<HTMLElement>('.ty-go')!;
    g.textContent = go ? 'GO' : lit ? String(4 - lit) : '';
    this.el.querySelector<HTMLElement>('.ty-lights')!.style.display = gone ? 'none' : '';
    g.style.display = gone ? 'none' : '';
    if (go && this.stat.hint.textContent === 'Get ready…') this.stat.hint.textContent = 'Type!';
  }
  setText(pos: number, typo: boolean) {
    if (pos === this.lastPos && typo === this.lastTypo) return;
    for (let i = Math.max(0, Math.min(pos, this.lastPos) - 1); i <= Math.max(pos, this.lastPos) + 1 && i < this.chars.length; i++)
      this.chars[i].className = i < pos ? 'done' : i === pos ? (typo ? 'bad' : 'cur') : '';
    this.lastPos = pos; this.lastTypo = typo;
    this.stat.hint.textContent = typo ? 'Fix the red letter' : pos ? 'Keep going' : this.stat.hint.textContent;
  }
  setStats(wpm: number | null, acc: number | null, place: number | null, t: number) {
    this.stat.wpm.textContent = wpm === null ? '—' : String(Math.round(wpm));
    this.stat.acc.textContent = acc === null ? '—' : `${Math.floor(acc * 100)}%`;
    this.stat.place.textContent = place === null ? '—' : ORD[place - 1];
    const s = Math.max(0, t); this.stat.time.textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }
  /** Tags sit just behind each car (screen px); wpm = each racer's live speed. Progress 0–1 for the top bar. */
  place(tagPx: { x: number; y: number }[], wpm: (number | null)[], progress: number[]) {
    tagPx.forEach((p, i) => {
      const t = this.tags[i]; if (!t) return;
      t.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-100%, -50%)`;
      (t.lastElementChild as HTMLElement).textContent = wpm[i] === null ? '' : ` · ${Math.round(wpm[i]!)} wpm`;
    });
    progress.forEach((p, i) => { if (this.marks[i]) this.marks[i].style.left = `calc(${(Math.min(1, p) * 100).toFixed(2)}% - 6px)`; });
  }
}

export interface TypingResult {
  rows: { place: number; name: string; car: string; wpm: number; acc?: number; you?: boolean }[];
  place: number; wpm: number; acc: number; earnings: [string, number][]; total: number; newBest: boolean; caption: string; best: number; avg: number;
}
export function renderTypingResults(root: HTMLElement, d: TypingResult, on: { again(): void; garage(): void }) {
  root.innerHTML = '';
  const el = h(`<div id="typing-res" class="blk">
    <div class="hd ty-rcap">${esc(d.caption)}</div>
    <h2 class="hd ty-rhead ${d.place === 1 ? 'win' : ''}">${d.place === 1 ? '1st place!' : `${ORD[d.place - 1] ?? '5th'} place`}</h2>
    <div class="ty-rows">${d.rows.map(r => `<div class="ty-row ${r.you ? 'me' : ''}"><span class="pl hd">${ORD[r.place - 1]}</span><span><b>${esc(r.name)}</b> · <span class="dim">${esc(r.car)}</span></span><span><b>${Math.round(r.wpm)}</b> wpm</span><span>${r.acc === undefined ? '' : `${Math.floor(r.acc * 100)}%`}</span></div>`).join('')}</div>
    <div class="ty-earn">${d.earnings.map(([k, v]) => `<span>${esc(k)} <b>+${v.toLocaleString()} VX</b></span>`).join('')}<span class="tot">Total <b>+${d.total.toLocaleString()} VX</b></span></div>
    <div class="g-note">${d.newBest ? `New best: ${Math.round(d.wpm)} wpm! · ` : `Best ${Math.round(d.best)} wpm · `}your average (last 10 races) ${Math.round(d.avg)} wpm</div>
    <div class="ty-btns"><button class="btn ghost" id="tyGarage">Garage</button><button class="btn race" id="tyAgain">Race again ▸</button></div>
  </div>`);
  root.appendChild(el);
  el.querySelector('#tyAgain')!.addEventListener('click', on.again);
  el.querySelector('#tyGarage')!.addEventListener('click', on.garage);
}
