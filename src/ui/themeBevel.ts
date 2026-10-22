// "Bevel+" look (owner 2026-10-21; S75) — the game's only look since V0.13.0, layered on top of styles.ts (layout).
// Every panel and button is a lit voxel block (light top-left edge, dark bottom-right, like the cars and paddles),
// pressed/selected = sunk in, trays = sunken wells. Yellow only means "act" (Race, the chosen option, panel titles).
// Titles and big numbers in the Silkscreen pixel font (built in, data/fontSilkscreen.ts); the rest system-ui, 11 px+.
// Garage layout: Menu · Notes · Cam in the bottom-left; Menu opens the side rail (tabs + the 2×2 mini square) and picking a
// tab, clicking outside or Esc closes it; the Garage sub-tabs sit beside Menu · Notes · Cam; Race bottom-right.
// Markup for it (Menu button, league chip, panel title icons) is in garage.ts. All rules are scoped under html.ui-bevel so
// they win over the base layout rules without !important.
import { SILKSCREEN_WOFF2 } from '../data/fontSilkscreen';

// surfaces — the five block states every control uses
const PANEL = 'background:#262a35;box-shadow:inset 3px 3px 0 #3f4555,inset -3px -3px 0 #15171d,0 0 0 2px #0b0c10,5px 5px 0 2px #0b0c1099';
const RAISED = 'background:#323745;color:#e9ecf2;box-shadow:inset 2px 2px 0 #474e60,inset -2px -2px 0 #1b1e26,0 0 0 2px #0b0c10';
const SUNK = 'background:#2a2e39;box-shadow:inset 2px 2px 0 #15171d,inset -2px -2px 0 #474e60,0 0 0 2px #0b0c10';
const PICKED = 'background:#2a2e39;box-shadow:inset 2px 2px 0 #15171d,inset -2px -2px 0 #474e60,0 0 0 2px #f2c230';
const YELLOW = 'background:#f2c230;color:#14161c;box-shadow:inset 2px 2px 0 #ffe27a,inset -2px -2px 0 #b8901c,0 0 0 2px #0b0c10';
const WELL = 'background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d';
const PX = 'font-family:Silkscreen,"Courier New",monospace;font-weight:400';
/** Exported for other screens that draw blocks in code (race HUD dash plate). */
export const BEVEL = { face: '#262a35', light: '#3f4555', dark: '#15171d', edge: '#0b0c10' };

const B = (sels: string, body: string) => sels.split(',').map(s => `html.ui-bevel ${s.trim()}`).join(',') + `{${body}}`;
const RAIL = 112;   // how far left-side screens slide right while the rail is open

export const BEVEL_CSS = [
  `@font-face{font-family:Silkscreen;font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${SILKSCREEN_WOFF2}) format('woff2')}`,
  // ---- type: pixel font for titles and big numbers; small labels in the clean font at 11 px+ (the Typing Race passage
  //      keeps its even-width typewriter font on purpose, so letters line up while you type) ----
  B('.hd', `${PX};letter-spacing:.04em`),
  B('.voxels,.crowns,.g-stats b,.stat b,.tier b,.g-grid b,.g-go,.gr-dbtn b,.g-sub-name,.g-subtab,.earn .total,.ty-stats .stat b,#gearbox b,#grade,.dl-rw,.dl-st,.pt-plate input', PX),
  B('.pt-group', 'font:700 11px system-ui;letter-spacing:.1em;color:#7d8290'),
  B('.upg-hd h3', 'font-size:11px;width:auto;min-width:104px'),      // Upgrades rows (Tuning Update): "Transmission" fits
  B('.pt-rar', 'font-size:11px'),
  B('.gr-tabs button', 'font:700 12px system-ui;letter-spacing:.02em'),
  B('.cal-day', 'font:700 11px system-ui;font-variant-numeric:tabular-nums'),
  B('.g-note', 'font-size:12px'),
  // ---- surfaces ----
  B('.blk,.strip-wrap,.cat-under', PANEL),
  B('.btn', `${YELLOW};${PX};letter-spacing:.06em`),
  B('.btn:hover', 'background:#f7d04a'),
  B('.btn:active', 'transform:translateY(2px);box-shadow:inset 2px 2px 0 #b8901c,inset -2px -2px 0 #ffe27a,0 0 0 2px #0b0c10'),
  B('.btn.ghost,.keycap.ghost,.ty-tag', RAISED),
  B('.seg button,.tier,.g-tab,.g-subtab,.g-mb,.g-notesbtn,.g-cambtn,.g-close,.cat-card,.sl-arrow,.sl-card,.pt-tab,.gr-dbtn,.gr-favonly,.cal-day,.gr-slot,.chip,.swatch', RAISED),
  B('.swatch', 'color:inherit'),
  B('.seg button:hover,.tier:hover,.g-tab:hover,.g-subtab:hover:not(:disabled),.g-mb:hover:not(:disabled),.g-notesbtn:hover,.g-cambtn:hover,.g-close:hover,.cat-card:hover,.sl-arrow:hover,.pt-tab:hover,.gr-dbtn:hover:not(:disabled),.gr-slot:hover:not(:disabled)', 'background:#3a4050'),
  B('.seg button:active,.g-tab:active,.g-mb:active,.g-notesbtn:active,.g-cambtn:active,.g-close:active,.pt-tab:active', SUNK),
  B('.seg button.on,.tier.equipped,.pt-tab.on,.g-subtab.drive,.gr-dbtn.drive,.keycap.wait', YELLOW),
  B('.g-tab.on,.g-mb.sel,.g-mb.on.g-menubtn,.g-notesbtn.on', `${SUNK};color:#f2c230`),
  B('.cat-card.on,.sl-card.next,.dl-task.done,.tier.owned,.cal-day.today,.pn-ver.big,.swatch.on', PICKED),
  B('.stat,.next,.pn-ver,.ctl,.gr-rec,.dl-task,.dl-bar,.g-avatar-box,.g-grid>div,.lab-sec', WELL),
  B('.pt-plate input', `${WELL};border:0;color:#e9ecf2`),
  B('.keycap', 'background:#e9ecf2;color:#14161c;box-shadow:inset -2px -3px 0 #9aa1ae,0 0 0 2px #0b0c10;font:800 12px system-ui'),
  B('.keycap:hover', 'background:#fff'),
  B('.gr-star', 'background:none;box-shadow:none'),
  // ---- screen title box (top-left on My cars / Catalog / Body Shop) and the car tray in Profile (owner 2026-10-21: the home
  //      screen's car card moved into Profile) ----
  B('.g-title', `position:absolute;left:28px;top:24px;padding:12px 16px;${PANEL}`),
  B('.g-title h1', 'font-size:28px;margin:6px 0'),
  B('.g-league', 'display:flex;align-items:center;gap:8px;font-size:12px;color:#9aa3b5'),
  B('.g-chipL', 'font:700 11px system-ui;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;color:#14161c;background:#f2c230;box-shadow:inset -2px -2px 0 #b8901c'),
  B('.g-pcar', `${WELL};display:flex;flex-direction:column;gap:4px;padding:9px 11px`),
  B('.g-pcar>.hd', 'font-size:20px'),
  B('.g-stats', 'display:flex;gap:14px;font-size:12px;color:var(--dim)'),
  B('.g-stats b', 'font-size:14px'),
  // ---- wallet (top-right): VX and Crowns as two blocks; best time lives in Profile and the race results ----
  B('.g-wallet', 'position:absolute;right:28px;top:24px;display:flex;align-items:center;gap:10px'),
  B('.g-wallet .voxels,.g-wallet .crowns', `${PANEL};padding:9px 12px;font-size:19px`),
  B('.g-rec', 'display:none'),
  // ---- panels: title strip with icon + block close button; section labels; 32 px rows ----
  B('.g-panel', 'padding:0 16px 16px;gap:10px'),
  B('.g-panel>h2.hd', 'display:flex;align-items:center;gap:8px;margin:0 -16px 2px;padding:12px 52px 11px 14px;font-size:16px;color:#f2c230;background:#1f232c;box-shadow:inset 0 -2px 0 #15171d,inset 3px 3px 0 #3f4555'),
  B('.g-panel>h2.hd svg', 'flex:none'),
  // small grey label at the end of a title ("Current V…", "League D parts · Civix")
  B('.g-panel>h2 .g-sub', 'position:static;transform:none;display:inline;margin-left:auto;padding:0;background:none;box-shadow:none;z-index:auto;font:700 11px system-ui;letter-spacing:0;text-transform:none;color:#9aa3b5;white-space:nowrap'),
  B('.g-close', 'right:10px;top:9px;width:28px;height:28px;font-size:12px'),
  B('.g-panel.g-notes', 'left:28px;right:auto;top:160px;bottom:106px;width:470px;gap:10px'),
  B('.settings::before', 'content:"Race";display:block;font:700 11px system-ui;letter-spacing:.1em;text-transform:uppercase;color:#7d8290;margin:2px 0'),
  B('.ctl', 'padding:8px 10px'),
  B('.ctl h3', 'font:700 11px system-ui;letter-spacing:.1em;color:#7d8290'),
  B('.setrow', 'min-height:32px;margin:0;font-size:12px;color:#cfd4de'),
  B('.seg', 'gap:4px'),
  B('.seg button', 'height:26px;padding:0 9px;font:600 12px system-ui'),
  // ---- bottom-left: Menu · Notes · Settings ----
  B('.g-util', `position:absolute;left:28px;bottom:22px;display:flex;gap:6px;padding:5px;${PANEL}`),
  B('.g-util>button', 'position:relative;width:56px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;cursor:pointer;padding:0;font:700 11px system-ui;color:#cfd3dc'),
  B('.g-util svg', 'width:20px;height:20px'),
  B('.g-util .g-new', 'top:-9px;right:auto;left:50%;transform:translateX(-50%)'),
  B('.g-util>.g-tab', 'gap:3px;padding:0;font:700 11px system-ui'),     // Settings, moved here from the rail
  B('.g-util>.g-tab svg', 'width:20px;height:20px'),
  B('.g-util>.g-tab.on::after', 'bottom:3px;width:24px;margin-left:-12px'),
  // ---- the side rail: tabs stacked up the left edge, the 2×2 mini square at its bottom; slides up out of Menu ----
  B('.g-bar', `position:absolute;left:28px;bottom:104px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:5px;z-index:7;${PANEL};transition:opacity .15s,transform .15s,visibility .15s`),
  B('#garage:not(.rail-open) .g-bar', 'opacity:0;visibility:hidden;transform:translateY(10px);pointer-events:none'),
  B('.g-tab', 'position:relative;border:0;cursor:pointer;width:84px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0 0 7px;font:700 11px system-ui;letter-spacing:.02em'),
  B('.g-tab svg', 'width:24px;height:24px'),
  B('.g-tab.on::after', 'content:"";position:absolute;bottom:4px;left:50%;width:30px;height:3px;margin-left:-15px;background:#f2c230'),
  B('.g-mini', 'display:grid;grid-template-columns:24px 24px;grid-template-rows:24px 24px;gap:5px;margin:4px 0 2px'),
  B('.g-mb', 'position:relative;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0'),
  B('.g-mini svg', 'width:16px;height:16px'),
  B('.g-mb.off', 'color:#7d8290'),
  B('.g-mb .g-dot', 'top:2px;right:2px;width:5px;height:5px'),
  // left-side screens slide right while the rail is open, so nothing is covered
  B('.cat-list,.pt-tabs,.g-panel.g-notes,.catalog-mode .pt-list,.cat-under', 'transition:left .15s'),
  B('.rail-open .cat-list,.rail-open .pt-tabs,.rail-open .g-panel.g-notes', `left:${28 + RAIL}px`),
  B('.rail-open.catalog-mode .pt-list', `left:${196 + RAIL}px`),
  B('.rail-open .cat-under', `left:${400 + RAIL}px`),
  B('.rail-open.catalog-mode .pt-list ~ .cat-under', `left:${528 + RAIL}px`),
  // ---- Garage sub-tabs (Drive · Body Shop · Upgrade · Sell): beside Menu · Notes · Cam (garage.ts moves them there) ----
  B('#garage>.g-sub', `position:absolute;left:238px;bottom:22px;transform:none;${PANEL}`),
  // PCs (owner 2026-10-22, V0.15.0): rail always shown, no Menu button; the sub-tabs, a little smaller than the corner buttons,
  // run along the bottom right beside Patch notes · Settings — on the home screen too. Phones keep the Menu layout as it was.
  'html.ui-bevel:not(.vc-phone) .g-menubtn{display:none}',
  'html.ui-bevel:not(.vc-phone) #garage>.g-sub{left:172px;padding:6px 7px}',
  'html.ui-bevel:not(.vc-phone) #garage>.g-sub .g-subtab{height:34px}',
  'html.ui-bevel.vc-phone .home-mode>.g-sub{display:none}',
  B('.g-sub-stem', 'display:none'),
  // ---- Race (bottom-right): one yellow block, a wheel and a gear that turn while the mouse is over it ----
  // Race + the small camera icon to its left share one corner box (garage.ts); the camera cycles the angles A–D
  B('.g-raceside', 'position:absolute;right:28px;bottom:22px;display:flex;align-items:center;gap:10px;z-index:2'),
  B('.g-raceside>.g-cambtn', 'position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;padding:0'),
  B('.g-raceside>.g-cambtn svg', 'width:22px;height:22px'),
  B('.g-raceside>.g-cambtn span', 'display:none'),
  B('.g-racebtn', 'position:relative;padding:0;border:0;background:none;cursor:pointer;filter:drop-shadow(5px 5px 0 #0b0c1099)'),
  B('.g-racebtn .rb-face', `display:flex;align-items:center;gap:12px;height:62px;padding:0 16px 3px;background:var(--accent);color:#14161c;${PX};font-size:20px;letter-spacing:.08em;text-transform:uppercase;box-shadow:inset 3px 3px 0 #ffe27a,inset -3px -4px 0 #b8901c,0 0 0 2px #0b0c10`),
  B('.g-racebtn .rb-ic', 'display:flex'),
  B('.g-racebtn:hover .rb-face', 'background:#f7d04a'),
  B('.g-racebtn:active', 'transform:translateY(2px)'),
  B('.g-racebtn:active .rb-face', 'box-shadow:inset 3px 3px 0 #b8901c,inset -3px -3px 0 #ffe27a,0 0 0 2px #0b0c10'),
  B('.g-racebtn:focus-visible .rb-face', 'outline:3px solid #fff;outline-offset:-8px'),
  // ---- the Strip, compact (owner 2026-10-21, V0.14.0): a narrow centred strip of small cards — level + money only; the next
  //      level is the yellow card you tap to race; cleared levels get a green tick; boss levels a red edge ----
  B('.strip-wrap', 'left:50%;right:auto;transform:translateX(-50%);width:min(700px,calc(100% - 56px));bottom:104px;padding:7px 9px 8px;gap:5px'),
  B('.sl-head', 'gap:10px;align-items:center'),
  B('.sl-head h2', 'font-size:14px'),
  B('.sl-head span', 'font-size:11px'),
  B('.sl-head .g-close', 'top:-3px;right:-2px;width:24px;height:24px'),
  B('.sl-row', 'gap:5px'),
  B('.sl-arrow', 'width:22px;font-size:10px'),
  B('.strip-track', 'gap:5px;padding:2px 2px 4px'),
  B('.sl-card', 'width:100px;padding:5px 7px;gap:2px;white-space:nowrap;border:0;text-align:left;font:inherit;color:#e9ecf2'),
  B('.sl-card .hd', 'font-size:11px'),
  B('.sl-rw', 'display:flex;align-items:center;gap:4px;font:700 11px system-ui;color:#f2c230'),
  B('.sl-rw .cr', 'display:inline-flex;align-items:center;color:#e8c46a'),
  B('.sl-card.done .hd', 'color:#4ade80'),
  B('.sl-card.locked', 'opacity:.55'),
  B('.sl-card.boss', 'box-shadow:inset 2px 2px 0 #474e60,inset -2px -2px 0 #1b1e26,0 0 0 2px #c0392b'),
  B('.sl-card.next', `${YELLOW};cursor:pointer`),
  B('.sl-card.next.boss', 'box-shadow:inset 2px 2px 0 #ffe27a,inset -2px -2px 0 #b8901c,0 0 0 2px #c0392b'),
  B('.sl-card.next .hd,.sl-card.next .sl-rw,.sl-card.next .sl-rw .cr', 'color:#14161c'),
  B('.sl-go', 'font:700 11px system-ui;color:#14161c'),
  // ---- Typing Race panel grows to fit its text, so the stats row never gets cut off on short screens ----
  B('#typing .ty-panel', 'top:auto;max-height:calc(100% - 120px)'),
  // ---- race screen (owner Q175, V0.13.1): the start lights are sunken cells that light up as lit blocks (the progress bar is a
  //      plain dotted line since V0.15.0, styles.ts). The dash plate behind gauge + paddles + pedal is drawn in hud.ts with the same colours. ----
  B('#lights i', WELL),
  B('#lights i.red', 'background:#e0261c;box-shadow:inset 3px 3px 0 #ff6a5c,inset -3px -3px 0 #8e1610'),
  B('#lights i.amber', 'background:#f2a43a;box-shadow:inset 3px 3px 0 #ffd08a,inset -3px -3px 0 #a8661a'),
  B('#lights i.green', 'background:#4ade80;box-shadow:inset 3px 3px 0 #a6f5c2,inset -3px -3px 0 #23874a'),
  // ---- race menu cards ----
  B('.g-mode .hd', 'font-size:16px'),
  B('.g-go', 'color:#f2c230'),
  // ---- touch screens (owner E4, V0.13.1): a little bigger to tap. On phones the whole layer is also scaled to fit
  //      (styles.ts, V0.14.0), so these end up ~45 × 39 px on a sideways phone, and the side rail fits as on a PC. ----
  // ---- phones (owner E2, V0.15.0): the smallest labels a size up, on top of the bigger phone scale (main.ts FIT) ----
  ...['.setrow,.g-note,.seg button,.g-util>button,.g-tab,.sl-rw,.sl-card .hd,.g-grid span,.stat span,.g-league,.gr-rec,.pt-group,.cal-day,.g-mode-sub'].map(sel =>
    sel.split(',').map(x => `html.vc-phone.ui-bevel ${x}`).join(',') + '{font-size:12.5px}'),
  `@media (pointer:coarse){${[
    B('.g-util>button', 'width:64px;height:56px'),
    B('.g-tab', 'width:88px;height:56px'),
    B('.g-mini', 'grid-template-columns:26px 26px;grid-template-rows:26px 26px'),
    B('.g-bar', 'bottom:100px'),
    B('#garage>.g-sub', 'left:262px'),
    B('.g-raceside>.g-cambtn', 'width:48px;height:48px'),
    B('.g-subtab', 'height:38px'),
  ].join('')}}`,
].join('\n');
