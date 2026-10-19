// Placeholder UI styling for Step 1. Each screen gets its own design pass later (decision X1).
// Blocky chrome (A1): square corners, stepped block borders, pixel-ish headings; clean body text (A5).
export const CSS = `
:root{--bg:#14161c;--panel:#1d2029;--panel2:#252935;--edge:#3a3f4d;--text:#e9ecf2;--dim:#9aa3b5;--accent:#f2c230;--good:#4ade80;--bad:#ef5350;--amber:#f2a43a;--blue:#5aa9ff}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;user-select:none}
#stage{position:fixed;inset:0}
.hd{font-family:"Courier New",ui-monospace,monospace;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.blk{background:var(--panel);box-shadow:0 0 0 3px var(--edge),6px 6px 0 3px #0b0c10}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;cursor:pointer;color:#14161c;background:var(--accent);padding:12px 22px;font:900 18px "Courier New",monospace;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 0 0 3px #b8901c,4px 4px 0 3px #0b0c10}
.btn:active{transform:translate(2px,2px);box-shadow:0 0 0 3px #b8901c,2px 2px 0 3px #0b0c10}
.btn.ghost{background:var(--panel2);color:var(--text);box-shadow:0 0 0 3px var(--edge),4px 4px 0 3px #0b0c10}
.overlay{position:fixed;inset:0;pointer-events:none}
.overlay>*{pointer-events:auto}
/* garage terminal */
#terminal{position:absolute;right:28px;top:28px;bottom:28px;width:430px;padding:20px 22px;display:flex;flex-direction:column;gap:14px;overflow:auto}
#terminal .screen-title{font-size:13px;color:var(--dim)}
#terminal h1{margin:0;font-size:28px}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.voxels{color:var(--accent);font:900 22px "Courier New",monospace}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.stat{background:var(--panel2);padding:8px 10px;box-shadow:0 0 0 2px var(--edge)}
.stat b{display:block;font:900 20px "Courier New",monospace}
.stat span{font-size:12px;color:var(--dim)}
.upg h3{margin:4px 0 6px;font-size:14px}
.upg .desc{font-size:12px;color:var(--dim);margin-bottom:6px;min-height:16px}
.tiers{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.tier{border:0;padding:8px 2px;cursor:pointer;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font:700 12px system-ui;display:flex;flex-direction:column;align-items:center;gap:2px}
.tier b{font:900 16px "Courier New",monospace}
.tier.equipped{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.tier.owned{box-shadow:0 0 0 2px var(--accent)}
.tier.locked{opacity:.45;cursor:not-allowed}
.settings h3{margin:4px 0 6px;font-size:14px}
.setrow{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--dim);margin:4px 0}
.seg{display:flex;gap:4px}
.seg button{border:0;padding:5px 8px;cursor:pointer;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font:700 11px system-ui}
.seg button.on{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.next{background:var(--panel2);padding:10px 12px;box-shadow:0 0 0 2px var(--edge);font-size:13px}
.spacer{flex:1}
#terminal .btn.race{font-size:24px;padding:16px}
.toast{position:absolute;left:50%;transform:translateX(-50%);bottom:118px;padding:10px 14px;font-size:14px;z-index:6;pointer-events:none}
.catalog-mode ~ .toast{bottom:auto;top:36px}
/* ---- Garage HUD (owner 2026-10-18) ---- */
#garage{position:absolute;inset:0;pointer-events:none}
#garage>*{pointer-events:auto}
.g-title{position:absolute;left:28px;top:24px;padding:14px 18px;background:#14161cc8;clip-path:polygon(0 8px,8px 8px,8px 0,100% 0,100% 100%,0 100%)}
.g-title .screen-title{font-size:13px;color:var(--dim)}
.g-title h1{margin:2px 0 6px;font-size:30px}
.g-stats{display:flex;gap:14px;font-size:12px;color:var(--dim)}.g-stats b{color:var(--text);font:900 15px "Courier New",monospace}
.g-wallet{position:absolute;right:28px;top:24px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding:10px 16px;background:#14161cc8}
.g-rec{font-size:12px;color:var(--dim)}
.g-bar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:6px;padding:8px;background:#14161cd8;box-shadow:0 0 0 3px var(--edge),6px 6px 0 3px #0b0c10}
.g-tab{border:0;cursor:pointer;width:104px;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:var(--panel2);color:#cfd3dc;box-shadow:0 0 0 2px var(--edge);font:800 12px system-ui;letter-spacing:.05em;text-transform:uppercase}
.g-tab:hover{color:#fff;box-shadow:0 0 0 2px #5a5f6d}
.g-tab.on{background:#2f3442;color:#fff;box-shadow:0 0 0 2px var(--accent)}
.g-racebtn{position:absolute;right:28px;bottom:22px;font-size:30px!important;padding:20px 34px!important}
.g-racemenu{position:absolute;right:28px;bottom:120px;display:flex;flex-direction:column;gap:10px;width:330px}
.g-mode{border:0;text-align:left;cursor:pointer;color:var(--text);padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}
.g-mode .hd{font-size:20px;color:var(--accent)}
.g-mode-sub{grid-column:1;font-size:12px;color:var(--dim)}
.g-go{grid-row:1/3;grid-column:2;font:900 18px "Courier New",monospace;color:var(--good)}
.g-mode.off{cursor:default;opacity:.75}.g-mode.off .hd{color:var(--dim)}
.g-soon{grid-row:1/3;grid-column:2;font:800 11px system-ui;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge);color:var(--amber)}
.g-panel{position:absolute;right:28px;top:110px;bottom:128px;width:440px;padding:18px 20px;overflow:auto;display:flex;flex-direction:column;gap:14px}
.g-panel h2{margin:0;font-size:22px}
.g-close{position:absolute;right:10px;top:10px;border:0;cursor:pointer;width:30px;height:30px;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font:900 14px system-ui}
.g-note{font-size:12px;color:var(--dim)}
.g-avatar{display:flex;gap:14px;align-items:center}.g-avatar>div:last-child{display:flex;flex-direction:column;gap:3px}
.g-avatar-box{width:96px;height:96px;display:flex;align-items:center;justify-content:center;background:var(--panel2);box-shadow:0 0 0 2px var(--edge);color:#cfd3dc}
.g-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.g-grid>div{background:var(--panel2);padding:10px;display:flex;flex-direction:column;gap:2px}
.g-grid b{font:900 18px "Courier New",monospace}.g-grid span{font-size:11px;color:var(--dim)}
/* Catalog: list on the left, turntable on the right, paint + features under the car */
.catalog-mode .g-title{left:28px}
.cat-list{position:absolute;left:28px;top:128px;bottom:128px;width:328px;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.cat-card{border:0;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:6px 6px 8px;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);text-align:left}
.cat-thumb{display:block;width:100%;aspect-ratio:296/124;height:auto}
.cat-row{display:flex;justify-content:space-between;align-items:center;padding:0 4px}.cat-row b{font-size:15px}
.cat-tag{font:700 12px system-ui;font-style:normal;color:var(--accent)}.cat-tag.own{color:var(--dim)}.cat-tag.use{color:var(--good)}.cat-tag.short{color:var(--bad)}
.cat-buy{display:flex;gap:14px;align-items:center}.cat-act{padding:10px 22px;font-size:15px}.cat-act:disabled{opacity:.55;cursor:default}.cat-short{font:700 12px system-ui;color:var(--bad)}
.g-sub{font:600 12px system-ui;color:var(--dim);letter-spacing:0;text-transform:none;margin-left:8px}
.cat-league{display:flex;gap:8px;align-items:baseline;padding:8px 4px 0;color:var(--accent)}.cat-league b{font-size:15px}.cat-league span{font-size:11px;color:var(--dim)}
.cat-card.on{background:#2f3442;box-shadow:0 0 0 2px var(--accent)}
.cat-under{position:absolute;left:400px;right:28px;bottom:128px;padding:12px 16px 12px;background:#14161cd8;display:flex;flex-direction:column;gap:10px;align-items:center}
.cat-under .g-close{right:8px;top:8px}
.cat-name{display:flex;gap:10px;align-items:baseline}.cat-name b{font-size:20px}.cat-name span{font-size:12px;color:var(--dim)}
.cat-paints{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.swatch{width:30px;height:30px;border:0;cursor:pointer;box-shadow:0 0 0 2px var(--edge),inset 0 -8px 0 #0003}
.swatch.on{box-shadow:0 0 0 3px var(--accent),inset 0 -8px 0 #0003}
.cat-opts{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}.cat-opts .setrow{gap:10px}
/* race hud */
/* ---- race HUD (S20) ---- */
.hud2 .cluster{position:absolute;left:50%;bottom:14px;height:236px;transform:translateX(-50%) scale(var(--hud-scale,1));transform-origin:50% 100%}
.hud2 .plate{position:absolute;overflow:visible}
.hud2 .gauge{position:absolute;top:0;overflow:visible}
.hud2 .gauge text{font-family:system-ui,"Segoe UI",sans-serif}
.hud2 .bracket{position:absolute}
.hud2 .paddle{position:absolute;pointer-events:none;transition:transform 60ms linear}
.hud2 .paddle-hit{position:absolute;padding:0;border:0;background:none;cursor:pointer;touch-action:none}
.hud2 .paddle svg{display:block}
.hud2 .paddle.down{transform:translateX(-3px);filter:brightness(.8)}
.hud2 .paddle.left.down{transform:translateX(3px)}
.hud2 .pedal-pod{position:absolute;transition:transform .9s cubic-bezier(.45,0,.8,.45) .5s,opacity .9s ease-in .5s}
.hud2 .keylabels{position:absolute;left:0;top:0;pointer-events:none}
.hud2 .keylabel{position:absolute;width:100px;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}
.hud2 .keylabel span{font:800 10.5px system-ui,"Segoe UI",sans-serif;letter-spacing:.08em;color:#eeeae0;text-shadow:0 1px 0 #000,0 0 3px #000}
.hud2 .keylabel i{font:800 9px system-ui,"Segoe UI",sans-serif;font-style:normal;letter-spacing:.06em;color:#22252c;background:#eeeae0;height:15px;line-height:15px;text-align:center;box-shadow:0 3px 0 #8a909b,0 4px 0 #0008;clip-path:polygon(0 2px,2px 2px,2px 0,calc(100% - 2px) 0,calc(100% - 2px) 2px,100% 2px,100% calc(100% + 4px),0 calc(100% + 4px))}
.hud2 .pedal-pod svg{display:block}
.hud2 .pedal-pod.gone{transform:translateY(200px);opacity:0;pointer-events:none}
.hud2 .pedal{position:absolute;pointer-events:none;transform:perspective(320px) rotateX(16deg);transform-origin:50% 100%;transition:transform 70ms linear,filter 70ms linear}
.hud2 .pedal.down{transform:perspective(320px) rotateX(34deg);filter:brightness(.82)}
.hud2 .paddle-hit:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
.hud2 .keyhint{position:absolute;pointer-events:none;text-align:center;color:#eeeae0;font:600 13px system-ui;text-shadow:0 1px 0 #000,0 0 4px #000}
.hud2 .grade{position:absolute;left:50%;bottom:250px;transform:translateX(-50%);filter:drop-shadow(0 3px 0 #000a)}
.hud2 .count{position:absolute;left:50%;top:100px;transform:translateX(-50%)}
.hud2 .race-strip{position:absolute;left:24px;top:20px;width:440px;height:76px;background:#2b2e38e6;clip-path:polygon(0 8px,8px 8px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 8px,100% 8px,100% 100%,0 100%)}
.hud2 .race-strip .road{position:absolute;left:16px;right:28px;top:46px;height:12px;background:#1d1f26}
.hud2 .race-strip .tick{position:absolute;top:42px;width:3px;height:22px;background:#5a5f6d}
.hud2 .race-strip .flag{position:absolute;right:14px;top:38px;width:14px;height:30px;background:repeating-conic-gradient(#111 0 25%,#f4f4f0 0 50%) 0 0/7px 7px}
.hud2 .race-strip .car{position:absolute;top:46px;width:26px;height:12px}
.hud2 .race-strip .car::before{content:"";position:absolute;left:6px;top:-6px;width:12px;height:6px;background:inherit;filter:brightness(.85)}
.hud2 .race-strip .me{background:#d23a2a}.hud2 .race-strip .them{background:#eeeae0}
.hud2 .race-strip .gap{position:absolute;left:16px;top:12px;font:700 16px system-ui;color:#eeeae0}
.hud2 .race-strip .good{color:var(--good)}.hud2 .race-strip .bad{color:var(--amber)}
#lights{position:absolute;top:22px;left:50%;transform:translateX(-50%);display:flex;gap:12px;padding:12px 14px}
#lights i{width:42px;height:42px;background:#2b2e38;box-shadow:inset 0 0 0 3px #1a1c22}
#lights i.red{background:#e0261c}#lights i.amber{background:#f2a43a}#lights i.green{background:#4ade80}
#hint{position:absolute;top:100px;left:50%;transform:translateX(-50%);font-size:15px;padding:8px 14px;white-space:nowrap}
#progress{position:absolute;top:22px;left:28px;width:260px;padding:10px 12px;font-size:12px}
#progress .track{position:relative;height:10px;background:#2b2e38;margin:6px 0}
#progress .me,#progress .them{position:absolute;top:-3px;width:8px;height:16px}
#progress .me{background:var(--accent)}#progress .them{background:#eeeae0}
#tach{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);padding:14px 16px 12px;width:min(760px,64vw)}
#tach .segs{display:grid;grid-template-columns:repeat(40,1fr);gap:3px;height:34px}
#tach .segs i{background:#2b2e38}
#tach .segs i.on{background:#e9ecf2}
#tach .segs i.zone{box-shadow:inset 0 0 0 2px var(--good)}
#tach .segs i.zone.on{background:var(--good)}
#tach .segs i.red{background:#4a2326}
#tach .segs i.red.on{background:var(--bad)}
#tach .lbl{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--dim)}
#gearbox{position:absolute;right:250px;bottom:28px;padding:10px 16px;text-align:center;min-width:120px}
#gearbox b{display:block;font:900 44px "Courier New",monospace;line-height:1}
#gearbox span{font-size:12px;color:var(--dim)}
#shiftBtn{position:absolute;right:28px;bottom:28px;width:200px;height:110px;font-size:28px;touch-action:none}
#grade{position:absolute;top:32%;left:50%;transform:translateX(-50%);font:900 44px "Courier New",monospace;letter-spacing:.06em;text-shadow:0 3px 0 #0b0c10;transition:opacity .25s}
/* results */
#results{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,92vw);padding:24px 26px;display:flex;flex-direction:column;gap:14px}
#results h1{margin:0;font-size:44px}
.win{color:var(--good)}.loss{color:var(--bad)}
.times{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:4px 8px;font:700 13px system-ui;box-shadow:0 0 0 2px var(--edge);background:var(--panel2)}
.chip.Perfect{box-shadow:0 0 0 2px var(--good);color:var(--good)}.chip.Good{box-shadow:0 0 0 2px var(--blue);color:var(--blue)}
.chip.Early,.chip.Late,.chip.Bog,.chip.Wheelspin{box-shadow:0 0 0 2px var(--amber);color:var(--amber)}
.earn{display:grid;grid-template-columns:1fr auto;gap:4px 16px;font-size:14px}
.earn .total{font:900 20px "Courier New",monospace;color:var(--accent)}
.dev-tag{position:fixed;right:10px;bottom:10px;z-index:50;border:0;cursor:pointer;background:#6a3ad2;color:#fff;font:900 11px "Courier New",monospace;letter-spacing:.1em;padding:4px 8px}
.dev-panel{position:fixed;right:16px;top:16px;z-index:50;width:430px;max-height:calc(100vh - 60px);overflow:auto;padding:12px 14px;font-size:13px}
.dev-h{font-size:15px;color:#c9a7ff;margin-bottom:6px}.dev-h span{font:600 11px system-ui;color:var(--dim);text-transform:none;letter-spacing:0;margin-left:6px}
.dev-sec{border-top:2px solid var(--edge);padding:7px 0}.dev-sec b{display:inline-block;min-width:72px;color:var(--accent)}.dev-v{color:var(--dim)}
.dev-sec>div{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;align-items:center}
.dev-row{flex-direction:column;align-items:stretch!important}.dev-row label{display:flex;justify-content:space-between;gap:8px}
.dev-panel select{background:var(--panel2);color:var(--text);border:2px solid var(--edge);font:13px system-ui;padding:2px 4px}
.dev-b{border:0;cursor:pointer;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);padding:4px 8px;font:700 12px system-ui}
.dev-b.on{background:#6a3ad2;color:#fff;box-shadow:0 0 0 2px #9a74f0}
.dev-readout{position:fixed;right:16px;top:110px;z-index:40;white-space:pre;background:#14161ce0;color:#c9ffd9;font:12px ui-monospace,monospace;padding:6px 9px;pointer-events:none}
`;
