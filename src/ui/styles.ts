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
.crowns{color:#e8c46a;font:900 16px "Courier New",monospace;display:inline-flex;align-items:center;gap:4px}.crown-ic{display:inline-flex;color:#e8c46a;--accent:#b8901c;margin-right:3px;vertical-align:-2px}
.btn .crown-ic{color:#14161c;--accent:#14161c}
.cat-tag.cr{color:#e8c46a;display:inline-flex;align-items:center}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.stat{background:var(--panel2);padding:8px 10px;box-shadow:0 0 0 2px var(--edge)}
.stat b{display:block;font:900 20px "Courier New",monospace}
.stat span{font-size:12px;color:var(--dim)}
.upg h3{margin:4px 0 6px;font-size:14px}
.upg .desc{font-size:12px;color:var(--dim);margin-bottom:6px;min-height:16px}
.g-panel.g-upg{gap:9px}.g-upg h2{margin:0}
.upg-hd{display:flex;align-items:baseline;gap:10px;margin-bottom:5px}.upg-hd h3{margin:0;font-size:13px;flex:none;width:104px}
.upg-hd .desc{margin:0;min-height:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-upg .tier{padding:4px 2px;font-size:11px;gap:0}.g-upg .tier b{font-size:14px}
.tiers.g3{grid-template-columns:repeat(3,1fr)}.tiers.g2{grid-template-columns:repeat(2,1fr)}.g-upg .tier.gear{padding:7px 2px}.g-upg .tier.gear b{font-size:13px;text-transform:uppercase}
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
.catalog-mode ~ .toast,.strip-mode ~ .toast{bottom:auto;top:36px}
/* ---- Garage HUD (owner 2026-10-18) ---- */
#garage{position:absolute;inset:0;pointer-events:none}
#garage>*{pointer-events:auto}
.g-title .screen-title{font-size:13px;color:var(--dim)}
.g-stats{display:flex;gap:14px;font-size:12px;color:var(--dim)}.g-stats b{color:var(--text);font:900 15px "Courier New",monospace}
.g-tabwrap{position:relative;display:flex}
.g-sub{position:absolute;left:50%;bottom:calc(100% + 22px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:6px;background:#14161cf0;white-space:nowrap;z-index:6}
.g-sub-name{font:900 11px 'Courier New',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);padding:0 6px 0 2px}
.g-subtab{border:0;cursor:pointer;height:30px;padding:0 12px;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font:900 12px 'Courier New',monospace;letter-spacing:.08em;text-transform:uppercase}
.g-subtab:hover:not(:disabled){box-shadow:0 0 0 2px var(--accent)}
.g-subtab.drive{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.g-subtab:disabled{cursor:default;opacity:.6}
canvas.grab{cursor:grab}canvas.grabbing{cursor:grabbing}
@keyframes rb-spin{to{transform:rotate(360deg)}}
.g-racebtn:hover .rb-wheel{animation:rb-spin .9s linear infinite}
.g-racebtn:hover .rb-gear{animation:rb-spin 1.6s linear infinite reverse}
@media (prefers-reduced-motion:reduce){.g-racebtn .rb-ic{animation:none!important}}
/* update notice (owner V0.2.1): static, top centre, above everything */
.upd{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:14px;padding:12px 16px;max-width:820px;width:max-content}
.upd-txt{display:flex;flex-direction:column;gap:2px}.upd-txt .hd{color:var(--accent);font-size:16px}.upd-txt span{font-size:12.5px;color:#cfd3dc}
.upd .btn{font-size:14px;padding:9px 14px;white-space:nowrap}
.g-new{position:absolute;top:-9px;right:-12px;font:900 9px system-ui;letter-spacing:.08em;text-transform:uppercase;font-style:normal;padding:2px 5px;background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.pn-ver{padding:12px 14px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}
.pn-ver.big{box-shadow:0 0 0 2px var(--accent)}.pn-banner{margin:-12px -14px 10px;padding:8px 14px;background:var(--accent);color:#14161c;font-size:15px;letter-spacing:.1em}
.pn-head{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}.pn-head .hd{color:var(--accent);font-size:18px}
.pn-head span{flex:1;font-weight:700;font-size:13px}.pn-head time{font-size:11px;color:var(--dim)}
.pn-kind{font:800 11px system-ui;letter-spacing:.08em;text-transform:uppercase;margin:8px 0 2px}
.pn-added{color:var(--good)}.pn-changed{color:var(--blue)}.pn-fixed{color:var(--amber)}.pn-removed{color:var(--bad)}
.pn-ver ul{margin:0;padding-left:18px;font-size:12.5px;color:#cfd3dc}.pn-ver li{margin:2px 0}
.g-racemenu{position:absolute;right:28px;bottom:116px;display:flex;flex-direction:column;gap:8px;width:330px}
.g-mode{border:0;text-align:left;cursor:pointer;color:var(--text);padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}
.g-mode .hd{font-size:20px;color:var(--accent)}
.g-mode-sub{grid-column:1;font-size:12px;color:var(--dim)}
.g-go{grid-row:1/3;grid-column:2;font:900 18px "Courier New",monospace;color:var(--good)}
.g-mode.off{cursor:default;opacity:.75}.g-mode.off .hd{color:var(--dim)}
.g-soon{grid-row:1/3;grid-column:2;font:800 11px system-ui;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge);color:var(--amber)}
.g-panel{position:absolute;right:28px;top:110px;bottom:104px;width:440px;padding:18px 20px;overflow:auto;display:flex;flex-direction:column;gap:14px}
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
.cat-card{position:relative;border:0;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:6px 6px 8px;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);text-align:left}
.cat-thumb{display:block;width:100%;aspect-ratio:296/124;height:auto}
.cat-row{display:flex;justify-content:space-between;align-items:center;padding:0 4px}.cat-row b{font-size:15px}
.cat-tag{font:700 12px system-ui;font-style:normal;color:var(--accent)}.cat-tag.own{color:var(--dim)}.cat-tag.use{color:var(--good)}.cat-tag.short{color:var(--bad)}
.cat-buy{display:flex;gap:14px;align-items:center}.cat-act{padding:10px 22px;font-size:15px}.cat-act:disabled{opacity:.55;cursor:default}.cat-short{font:700 12px system-ui;color:var(--bad)}
.g-strip-bar{display:block;height:5px;background:#2a2e38;margin-top:6px}.g-strip-bar u{display:block;height:100%;background:var(--accent)}
.g-boss{font-style:normal;font:900 11px system-ui;color:#14161c;background:var(--bad);padding:1px 6px;margin-left:6px;vertical-align:3px}
.res-note{font:700 13px system-ui;color:var(--accent);margin-top:-6px}
/* the Strip screen: a sideways scroller of level cards (owner: like CSR) */
.strip-wrap{position:absolute;left:28px;right:28px;bottom:118px;padding:12px 14px 14px;background:#14161ce0;display:flex;flex-direction:column;gap:10px}
.sl-head{display:flex;align-items:baseline;gap:14px;position:relative}.sl-head h2{margin:0;font-size:22px}.sl-head span{font-size:12px;color:var(--dim)}.sl-head .g-close{right:0;top:-2px}
.sl-row{display:flex;align-items:stretch;gap:8px;min-width:0}
.sl-arrow{flex:none;width:34px;border:0;cursor:pointer;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font-size:14px}
.sl-arrow:hover{background:#2f3442}
.strip-track{flex:1;min-width:0;display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;padding:4px 2px 8px;cursor:grab;user-select:none}
.strip-track.dragging{cursor:grabbing;scroll-snap-type:none}
.sl-card{flex:none;width:176px;scroll-snap-align:center;display:flex;flex-direction:column;gap:5px;padding:10px 12px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}
.sl-card.locked{opacity:.55}.sl-card.boss .sl-top b{color:var(--bad)}
.sl-bar{margin-top:0}
.g-pick{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.g-dist{display:flex;justify-content:flex-end}.g-dist button{min-width:64px}
.g-sub{font:600 12px system-ui;color:var(--dim);letter-spacing:0;text-transform:none;margin-left:8px}
/* Parts screen: side banner tabs + part cards (reuses the Catalog layout) */
.pt-tabs{position:absolute;left:28px;top:128px;bottom:128px;width:150px;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:5px;scrollbar-width:thin}
.pt-tab{border:0;cursor:pointer;text-align:left;padding:6px 10px;flex:none;background:var(--panel2);color:var(--text);box-shadow:0 0 0 2px var(--edge);font:800 13px system-ui;letter-spacing:.02em}
.pt-plate{grid-column:1/-1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}
.pt-plate label{font:800 12px system-ui;text-transform:uppercase;letter-spacing:.05em;color:#cfd3dc;display:flex;align-items:center;gap:8px}
.pt-plate input{width:120px;padding:6px 8px;border:0;background:#0f1116;color:#fff;box-shadow:0 0 0 2px var(--edge);font:800 16px 'Courier New',monospace;text-transform:uppercase;letter-spacing:.12em}
.pt-plate input:focus{outline:none;box-shadow:0 0 0 2px var(--accent)}
.cat-repaint{margin:6px 0}
.pt-group{flex:none;font:800 10px 'Courier New',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8a8f9c;padding:6px 2px 0}
.pt-group:first-child{padding-top:0}
.pt-plist{bottom:auto;max-height:calc(100% - 256px)}
.pt-paints{display:flex;flex-direction:column;gap:8px;padding:2px}
.pt-paints .cat-paints{justify-content:flex-start}
.swatch.cur{box-shadow:0 0 0 2px var(--edge),inset 0 0 0 3px #fff,inset 0 -8px 0 #0003}
.swatch.on.cur{box-shadow:0 0 0 3px var(--accent),inset 0 0 0 3px #fff,inset 0 -8px 0 #0003}
.swatch.prem{background-image:linear-gradient(135deg,#ffffff00 35%,#ffffff55 50%,#ffffff00 65%)!important}
.pt-key{text-align:left;font-size:11px}
.pt-tab.on{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}.pt-tab.soon{cursor:default;opacity:.4;font-weight:600;font-size:12px}
.catalog-mode .pt-list{left:196px;width:300px}.catalog-mode .pt-list ~ .cat-under{left:528px}
.pt-rar{font:800 10px system-ui;letter-spacing:.06em;text-transform:uppercase;padding:0 4px;color:var(--dim)}.pt-rar.rare{color:var(--blue)}.pt-rar.epic{color:#c9b8ff}
.cat-league{display:flex;gap:8px;align-items:baseline;padding:8px 4px 0;color:var(--accent)}.cat-league b{font-size:15px}.cat-league span{font-size:11px;color:var(--dim)}
.cat-card.on{background:#2f3442;box-shadow:0 0 0 2px var(--accent)}
.cat-under{position:absolute;left:400px;right:28px;bottom:128px;padding:12px 16px 12px;background:#14161cd8;display:flex;flex-direction:column;gap:10px;align-items:center}
.cat-under .g-close{right:8px;top:8px}
.cat-rating{display:flex;gap:12px;align-items:center}.cat-rating .g-note b{color:var(--text)}
.cat-name{display:flex;gap:10px;align-items:baseline}.cat-name b{font-size:20px}.cat-name span{font-size:12px;color:var(--dim)}
.cat-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;width:100%;max-width:900px}
.cs{display:flex;flex-direction:column;gap:2px;min-width:0}.cs span{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}.cs b{font:700 13px system-ui;font-variant-numeric:tabular-nums}
.cs i{display:block;height:5px;background:#2a2e38}.cs u{display:block;height:100%;background:var(--accent)}
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
/* compact Upgrades (owner 2026-10-22): one row per part — name on the left, small T1–T5 buttons beside it */
.g-upg .upg-grid{display:flex;flex-direction:column;gap:5px}
.g-upg .upg{display:grid;grid-template-columns:108px 1fr;align-items:center;gap:8px}
.g-upg .upg h3{margin:0;font-size:11px;letter-spacing:.06em}
.g-upg .tiers{gap:4px}.g-upg .tier{padding:0;height:28px;justify-content:center}.g-upg .tier b{font-size:12px}
.g-upg .tier.gear{padding:0}.g-upg .tier.gear b{font-size:11px}
.g-upg .upg-info{min-height:32px;padding:6px 8px;background:#1e2129;color:#cfd4de;font-size:12px;line-height:1.35}
/* Upgrades ▸ Gear ratios drop-down (owner Q192, V0.17.0): one row per gear under the Transmission row */
.g-upg .ratio-lock{margin:-1px 0 1px 116px;font-size:11px}
.g-upg .ratios{margin:-1px 0 2px 116px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d;padding:4px 8px 6px}
.g-upg .ratios summary{cursor:pointer;list-style:none;font-size:11px;color:var(--accent);padding:3px 0;letter-spacing:.06em}
.g-upg .ratios summary::-webkit-details-marker{display:none}
.g-upg .ratios summary::before{content:'▸ ';color:#9aa3b5}.g-upg .ratios[open] summary::before{content:'▾ '}
.g-upg .ratio-row{display:grid;grid-template-columns:30px 24px 40px 24px 1fr 58px;align-items:center;gap:5px;margin:3px 0;font-size:12px}
.g-upg .ratio-row span{color:#9aa3b5;font-weight:700}.g-upg .ratio-row b{text-align:center;font-variant-numeric:tabular-nums}.g-upg .ratio-row b.ch{color:var(--accent)}
.g-upg .ratio-row .rb{height:22px;padding:0}.g-upg .ratio-row .rb b{font-size:12px}
.g-upg .ratio-row em{font-style:normal;text-align:right;color:#cfd4de;font-variant-numeric:tabular-nums}
.g-upg .rbar,.cl-bar{position:relative;height:18px;cursor:ew-resize;touch-action:none;background:linear-gradient(#2c313d,#2c313d) 0 50%/100% 6px no-repeat}
.g-upg .rbar::after{content:'';position:absolute;left:50%;top:4px;width:2px;height:10px;background:#5a5f6d}
.g-upg .rbar u{position:absolute;top:3px;width:8px;height:12px;margin-left:-4px;background:var(--accent);box-shadow:inset -2px -2px 0 #b8901c}
.g-upg .rbar:hover u,.g-upg .rbar.drag u{background:#ffe27a}
.g-upg .ratio-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px}.g-upg .ratio-foot .btn{font-size:11px;padding:5px 10px}
/* Upgrades ▸ Test run (owner C11, V0.16.0) */
/* ---- Car Lab (Build & Tune Update): rating box + Car Lab button on Upgrades; slider rows on the Car Lab panel ---- */
.sl-mode{display:flex;gap:4px;margin-left:auto;margin-right:34px}.sl-mode button{font-size:11px;padding:5px 10px}.sl-mode button:disabled{opacity:.55;cursor:default}
.cl-setups{display:flex;gap:8px;align-items:stretch}.cl-setups .seg{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.cl-setups .seg button{font-size:11px;padding:6px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cl-sname{width:118px;padding:0 8px;font:600 12px system-ui;color:#e9ecf2;border:0;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d}.cl-sname:focus{outline:2px solid var(--accent)}
.cl-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cl-top .g-note{flex:1;min-width:160px}
.cl-top>.btn{margin-left:auto;font-size:13px;padding:8px 14px}
.cl-unlocks{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;padding:6px 8px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d;font-size:11px;color:#7d8290}
.cl-unlocks span{display:flex;justify-content:space-between;gap:6px}.cl-unlocks span.ok{color:#cfd4de}.cl-unlocks i{font-style:normal;color:#7d8290}.cl-unlocks span.ok i{color:var(--good)}
.cl-rows{display:flex;flex-direction:column;gap:6px}
.cl-row{display:grid;grid-template-columns:96px 24px 84px 24px 1fr;grid-template-rows:auto auto;align-items:center;gap:2px 6px;padding:6px 8px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d}
.cl-name{font:700 11px system-ui;letter-spacing:.06em;text-transform:uppercase;color:#cfd4de}
.cl-row .rb{height:22px;padding:0}.cl-val{text-align:center;font:700 12px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap}.cl-val.ch{color:var(--accent)}
.cl-ends{grid-column:2/-1;display:flex;justify-content:space-between;font-size:11px;color:#7d8290}
.cl-row.lock{grid-template-columns:96px 1fr;grid-template-rows:auto}.cl-lock{font-size:12px;color:#7d8290}
.g-lab .ratios{margin:0}.g-lab .dyno table td,.g-lab .dyno table th{padding:4px 5px}
.cl-foot{display:flex;justify-content:space-between;gap:8px}.cl-foot .btn{font-size:12px;padding:6px 12px}
.dyno{display:flex;flex-direction:column;gap:6px;margin-top:4px}.dyno .dyno-go{align-self:flex-start;font-size:13px;padding:7px 14px}
.dyno table{width:100%;border-collapse:collapse;font:600 12px system-ui;font-variant-numeric:tabular-nums}
.dyno th{text-align:left;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#7d8290;padding:3px 6px}
.dyno td{padding:4px 6px;background:#1e2129}.dyno tr.cur td{color:var(--accent)}.dyno td.best{color:var(--good)}
.dyno em{font-style:normal;font-size:11px;margin-left:4px}.dyno em.up{color:var(--good)}.dyno em.down{color:var(--bad)}
/* nitrous badge (owner Q175 A, V0.16.0): ready = grey ring, firing = yellow ring + the bottle drains, used = greyed out */
.hud2 .nos-badge{position:absolute;z-index:3;width:54px;height:54px;padding:0;border:0;background:none;cursor:pointer;touch-action:none;filter:drop-shadow(0 3px 0 #000a)}
.hud2 .nos-badge svg{display:block;width:100%;height:100%}
.hud2 .nos-badge .nr{fill:#5a5f6d}.hud2 .nos-badge .nb{fill:#3b8cff}.hud2 .nos-badge .nb-empty{fill:#232733}.hud2 .nos-badge .nshine{fill:#bfe0ff}
.hud2 .nos-badge.firing .nr{fill:#f2c230}
.hud2 .nos-badge.used{opacity:.45;cursor:default}.hud2 .nos-badge.used .nb{fill:#5a5f6d}.hud2 .nos-badge.used .nshine{display:none}
.hud2 .nos-key{position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font:800 9px system-ui;font-style:normal;color:#22252c;background:#eeeae0;padding:1px 6px;box-shadow:0 2px 0 #8a909b}
/* race progress bar (owner 2026-10-22, V0.15.0): top centre, a line with the two cars — drawn from above in
   their own paint — moving along it (your car a little in front). No panel, no gap text. Start lights and hint sit under it. */
.hud2 .race-strip{position:absolute;left:50%;top:14px;transform:translateX(-50%);width:660px;height:64px;pointer-events:none}
/* the same track and flag as the Typing Race bar (.ty-prog, owner 2026-10-22): a solid slate line, chequered flag at the finish */
.hud2 .race-strip .road{position:absolute;left:0;right:0;top:31px;height:3px;background:#3a3f4dcc}
.hud2 .race-strip .flag{position:absolute;right:-6px;top:24px;width:8px;height:16px;background:repeating-linear-gradient(#eee 0 4px,#111 4px 8px)}
.hud2 .race-strip .car{position:absolute;width:62px;height:28px;filter:drop-shadow(0 2px 0 #000a)}
.hud2 .race-strip .them{top:11px;background:#eeeae0}.hud2 .race-strip .me{top:22px;background:#d23a2a;z-index:1}
.hud2 .race-strip .car img{display:block;width:100%;height:100%;transform:scaleX(-1)}.hud2 .race-strip .car.pic{background:none}
#lights{position:absolute;top:86px;left:50%;transform:translateX(-50%);display:flex;gap:12px;padding:12px 14px;transition:opacity .6s ease}
#lights.gone{opacity:0;pointer-events:none}
#vsPlate{position:absolute;top:160px;right:28px;display:flex;align-items:center;gap:10px;padding:8px 12px;font:700 13px system-ui;transition:opacity .4s ease,transform .4s ease}
#vsPlate em{font-style:normal;color:#7d8290;font-size:11px;text-transform:uppercase;letter-spacing:.1em}#vsPlate span{display:flex;align-items:center;gap:6px}
#vsPlate.gone{opacity:0;transform:translateX(24px);pointer-events:none}
.hud2.phone #vsPlate{top:100px;right:10px;transform:scale(.8);transform-origin:100% 0;font-size:12px}.hud2.phone #vsPlate.gone{transform:scale(.8) translateX(24px)}
#hint .wet{display:block;color:#7cc4ff;margin-top:2px}
#hint{position:absolute;top:160px;left:50%;transform:translateX(-50%);font-size:15px;padding:8px 14px;white-space:nowrap}
.hud2 .count{position:absolute;left:50%;top:214px;transform:translateX(-50%)}
.hud2.phone .race-strip{transform:translateX(-50%) scale(.62);transform-origin:50% 0;top:6px}
.hud2.phone #lights{transform:translateX(-50%) scale(.6);transform-origin:50% 0;top:52px}
.hud2.phone #hint{top:92px;font-size:12px;padding:5px 10px}
.hud2.phone .grade{bottom:auto;top:98px;transform:translateX(-50%) scale(.7);transform-origin:50% 0}
.hud2.phone .count{top:122px;transform:translateX(-50%) scale(.5);transform-origin:50% 0}
#lights i{width:42px;height:42px;background:#2b2e38;box-shadow:inset 0 0 0 3px #1a1c22}
#lights i.red{background:#e0261c}#lights i.amber{background:#f2a43a}#lights i.green{background:#4ade80}
/* phone race screen (owner 2026-10-21): "− +" pair and the pedal in the bottom corners, gauge in the middle, big thumb zones */
.hud2.phone{-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
.hud2.phone .cluster{bottom:6px}
.hud2 .ph-side{position:absolute;bottom:16px;display:flex;align-items:flex-end;gap:12px;transform:scale(var(--hud-scale,1));pointer-events:none}
.hud2 .ph-pads{left:22px;transform-origin:0 100%}
.hud2 .ph-gasside{right:30px;transform-origin:100% 100%}
.hud2.swap .ph-pads{left:auto;right:22px;transform-origin:100% 100%}
.hud2.swap .ph-gasside{right:auto;left:30px;transform-origin:0 100%}
.hud2 .ph-pad{position:relative}
.hud2 .ph-pad.down{transform:translateY(3px);filter:brightness(.8)}
.hud2 .ph-zone{top:24%;bottom:0;width:16%}
.hud2 .ph-down{left:0}.hud2 .ph-up{left:16%}.hud2 .ph-gas{right:0;width:24%}
.hud2.swap .ph-down{left:auto;right:16%}.hud2.swap .ph-up{left:auto;right:0}.hud2.swap .ph-gas{right:auto;left:0}
.hud2 .ph-zone.gone{pointer-events:none}
/* phones play sideways only (owner Q168) */
#vc-rotate{display:none}
@media (orientation:portrait){.vc-phone #vc-rotate{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:24px;background:#14161cf4}}
#vc-rotate .blk{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 26px;text-align:center}
#vc-rotate h2{margin:0;font-size:18px;color:var(--accent)}#vc-rotate p{margin:0;font-size:13px;color:var(--dim)}
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

/* ---- Typing Race (owner 2026-10-19) ---- */
#typing{position:absolute;inset:0;pointer-events:none}
#typing .blk,#typing button{pointer-events:auto}
.ty-prog{position:absolute;left:28px;right:28px;top:12px;height:16px}
.ty-prog i{position:absolute;left:0;right:0;top:7px;height:3px;background:#3a3f4dcc}
.ty-prog u{position:absolute;top:2px;width:12px;height:12px;background:#8e9bb3;box-shadow:0 0 0 2px #0b0c10}
.ty-prog u.me{background:var(--accent);z-index:1}
.ty-flag{position:absolute;right:-6px;top:0;width:8px;height:16px;background:repeating-linear-gradient(#eee 0 4px,#111 4px 8px)}
.ty-tag{position:absolute;left:0;top:0;font:800 11px system-ui;letter-spacing:.04em;padding:2px 6px;background:#14161cd8;color:#e9ecf2;box-shadow:0 0 0 2px var(--edge);white-space:nowrap;will-change:transform}
.ty-tag.me{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.ty-lights{position:absolute;left:50%;top:120px;transform:translateX(-50%);display:flex;gap:14px;padding:14px 18px}
.ty-lights i{width:50px;height:50px;background:#2a2d36;box-shadow:inset 0 0 0 4px #1a1c22}
.ty-lights i.on{background:#e0261c;box-shadow:inset 0 0 0 4px #8a1a14}
.ty-lights i.go{background:#3ac25a;box-shadow:inset 0 0 0 4px #1f7a36}
.ty-go{position:absolute;left:50%;top:200px;transform:translateX(-50%);font-size:60px;color:var(--accent);text-shadow:4px 4px 0 #0b0c10}
.ty-cap{position:absolute;left:28px;top:calc(65% - 26px);font:800 12px system-ui;color:#e9ecf2;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 2px #000}
.ty-panel{position:absolute;left:28px;right:28px;top:65%;bottom:22px;padding:16px 22px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.ty-text{font:600 24px/1.55 "Courier New",monospace;color:#e9ecf2}
.ty-text .tw{white-space:nowrap}
.ty-text .done{color:#6f7a8c}.ty-text .cur{background:var(--accent);color:#14161c;box-shadow:0 3px 0 #b8901c}.ty-text .bad{background:var(--bad);color:#fff}
.ty-stats{display:flex;gap:10px;margin-top:auto}
.ty-stats .stat{flex:1;display:flex;flex-direction:column}
.ty-stats .stat b{font:900 22px "Courier New",monospace}.ty-stats .stat span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;font-weight:800}
.ty-stats .ty-hint{flex:1.8}
.ty-nitro b{display:flex;gap:6px;align-items:center;height:28px}.ty-nitro i{width:30px;height:14px;background:#2a2d36;box-shadow:inset 0 0 0 2px #1a1c22}
.ty-nitro i.on{background:#3aa0ff;box-shadow:inset 0 0 0 2px #1c5ea8,0 0 0 2px #0b0c10}.ty-hint b{color:var(--amber)}
#typing-res{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:660px;padding:22px 26px;display:flex;flex-direction:column;gap:10px}
.ty-rcap{font-size:13px;color:var(--dim)}.ty-rhead{margin:0;font-size:30px;color:var(--text)}.ty-rhead.win{color:var(--accent)}
.ty-rows{display:flex;flex-direction:column;gap:6px}
.ty-row{display:grid;grid-template-columns:52px 1fr 90px 60px;align-items:center;gap:8px;padding:7px 12px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge);font-size:14px}
.ty-row.me{box-shadow:0 0 0 2px var(--accent)}.ty-row .pl{font-size:19px;color:var(--accent)}.ty-row .dim{color:var(--dim)}
.ty-earn{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--dim)}.ty-earn b{color:var(--good)}.ty-earn .tot{margin-left:auto;color:var(--text)}
.ty-btns{display:flex;gap:12px;justify-content:flex-end}

/* ---- Garage: my cars (owner 2026-10-19) ---- */
.gr-head{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 4px;color:var(--accent)}.gr-head b{font-size:14px}
.gr-favonly{border:0;cursor:pointer;font:800 11px system-ui;padding:5px 8px;background:var(--panel2);color:var(--dim);box-shadow:0 0 0 2px var(--edge)}
.gr-favonly.on{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c}
.gr-card{position:relative}.gr-sub{font-size:11px;color:var(--dim);padding:0 4px}
.gr-star{position:absolute;right:8px;top:8px;font-style:normal;font-size:18px;line-height:1;color:#5a5f6d;cursor:pointer;text-shadow:0 1px 0 #0b0c10;padding:2px 4px;background:#14161cb0}
.gr-star:hover{color:#cfd3dc}.gr-star.on{color:var(--accent)}
.gr-empty{padding:10px 6px}
.gr-info{position:absolute;right:28px;top:128px;width:300px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.gr-info .g-close{right:8px;top:8px}
.gr-name{display:flex;flex-direction:column;gap:2px;padding-right:30px}.gr-name b{font-size:20px}.gr-name span{font-size:11.5px;color:var(--dim)}
.gr-stats{display:flex;flex-direction:column;gap:7px}
.gr-stat{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:11px;color:var(--dim)}
.gr-stat span{text-transform:uppercase;letter-spacing:.06em}.gr-stat b{font:700 12px system-ui;color:var(--text);font-variant-numeric:tabular-nums}
.gr-stat i{grid-column:1/3;position:relative;display:block;height:6px;background:#2a2e38}
.gr-stat u{position:absolute;left:0;top:0;bottom:0;background:#9aa3b5}.gr-stat s{position:absolute;top:0;bottom:0;background:var(--good);text-decoration:none}.gr-stat s.worse{background:var(--bad)}
.gr-key{display:flex;gap:14px;font-size:11px;color:var(--dim)}.gr-key span{display:flex;align-items:center;gap:5px}
.gr-key u,.gr-key s,.gr-key em{display:inline-block;width:14px;height:6px;background:#9aa3b5}.gr-key s{background:var(--good)}.gr-key em{background:var(--bad)}
.gr-dial{position:absolute;left:0;top:0;display:flex;align-items:center;z-index:5;pointer-events:none}
/* blocky connector in the panel style: grey edge blocks with the dark drop shadow, card → rail → each button */
.gr-fan{position:relative;flex:none;width:28px;height:150px}
.gr-fan i{position:absolute;left:12px;width:16px;height:6px;background:var(--edge);box-shadow:3px 3px 0 #0b0c10}
.gr-fan i.in{left:0;top:72px;width:14px}
.gr-fan i.rail{left:10px;top:18px;width:6px;height:114px}
.gr-dbtns{display:flex;flex-direction:column;gap:12px;pointer-events:auto}
.gr-dbtn{border:0;cursor:pointer;width:132px;height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:var(--panel);color:var(--text);box-shadow:0 0 0 3px var(--edge),4px 4px 0 3px #0b0c10}
.gr-dbtn b{font:900 14px "Courier New",monospace;letter-spacing:.08em;text-transform:uppercase}.gr-dbtn span{font-size:10px;color:var(--dim)}
.gr-dbtn:hover:not(:disabled){box-shadow:0 0 0 3px var(--accent),4px 4px 0 3px #0b0c10}
.gr-dbtn.drive{background:var(--accent);color:#14161c;box-shadow:0 0 0 3px #b8901c,4px 4px 0 3px #0b0c10}.gr-dbtn.drive span{color:#3a3010}
.gr-dbtn:disabled{cursor:default;opacity:.6}
.gr-pick{position:absolute;left:380px;top:140px;width:200px}

/* ---- Body Lab (dev only; Car Lab until V0.21.0) ---- */
#carlab input,#carlab select{accent-color:var(--accent)}
#carlab input[type=range]{height:6px}
#carlab{position:absolute;left:20px;top:20px;bottom:20px;width:380px;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;font-size:12px}
.lab-h{display:flex;flex-direction:column;gap:2px;position:relative}.lab-h b{font-size:20px;color:var(--accent)}.lab-h span{color:var(--dim)}.lab-h .g-close{right:0;top:0}
.lab-sec{display:flex;flex-direction:column;gap:6px;padding:10px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}.lab-sec>b{color:var(--accent);font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.lab-sec label{display:flex;align-items:center;gap:8px;justify-content:space-between;color:var(--dim)}
.lab-n span{flex:0 0 120px}.lab-n input{flex:1}.lab-n em{flex:0 0 32px;font-style:normal;text-align:right;color:var(--text);font-variant-numeric:tabular-nums}
.lab-p select,.lab-sec select{background:#14161c;color:var(--text);border:0;box-shadow:0 0 0 2px var(--edge);padding:3px 6px;font:600 12px system-ui}
.lab-flags{display:grid;grid-template-columns:1fr 1fr;gap:4px}.lab-flags label{justify-content:flex-start}
#carlab textarea{background:#14161c;color:var(--text);border:0;box-shadow:0 0 0 2px var(--edge);font:12px "Courier New",monospace;padding:6px;resize:vertical}
.lab-btns{display:flex;gap:8px;flex-wrap:wrap}.lab-btns .btn{font-size:12px;padding:8px 10px}.lab-msg{color:var(--good)}

/* ---- Settings ▸ Controls (owner 2026-10-19) ---- */
.ctl{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}.ctl h3{margin:0;font-size:14px;color:var(--accent)}
.ctl-tabs{display:flex;margin-bottom:4px}.ctl-tabs button{flex:1;padding:7px 8px;font-size:12px}
.keycap{border:0;cursor:pointer;min-width:84px;padding:5px 10px;background:#14161c;color:var(--text);font:900 12px "Courier New",monospace;letter-spacing:.06em;box-shadow:0 0 0 2px var(--edge),3px 3px 0 2px #0b0c10}
.keycap:hover{box-shadow:0 0 0 2px var(--accent),3px 3px 0 2px #0b0c10}.keycap.wait{background:var(--accent);color:#14161c;box-shadow:0 0 0 2px #b8901c,3px 3px 0 2px #0b0c10}
.keycap.ghost{min-width:0;color:var(--dim)}
.ctl-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:2px}
/* Garage ▸ per-car record */
.gr-rec{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:var(--dim);padding:6px 8px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}
.gr-rec b{color:var(--text);font:700 12px system-ui;font-variant-numeric:tabular-nums}.gr-rec em{font-style:normal;font-size:10px}
/* V0.9.0 Economy Update: Daily tab, garage slots + boss tab, sell */
.g-dot{position:absolute;top:7px;right:9px;width:8px;height:8px;background:var(--accent);box-shadow:0 0 0 2px #b8901c}
.gr-tabs{display:flex;margin:2px 4px 8px}.gr-tabs button{flex:1;padding:7px 8px;font:900 12px 'Courier New',monospace;letter-spacing:.06em;text-transform:uppercase}
.gr-head{gap:6px}.gr-head .hd{margin-right:auto}
.gr-slot{border:0;cursor:pointer;font:800 11px system-ui;padding:5px 8px;background:var(--panel2);color:#e8c46a;box-shadow:0 0 0 2px var(--edge);display:inline-flex;align-items:center}
.gr-slot:hover:not(:disabled){box-shadow:0 0 0 2px var(--accent)}.gr-slot:disabled{opacity:.45;cursor:not-allowed}
.g-subtab.sell.arm{background:var(--bad);color:#fff;box-shadow:0 0 0 2px #8e2a28}
.g-panel.g-daily{width:480px}
.dl-list{display:flex;flex-direction:column;gap:8px}
.dl-task{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center;padding:10px 12px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge)}
.dl-task.done{box-shadow:0 0 0 2px var(--accent)}.dl-task.got{opacity:.55}
.dl-txt{font:800 13px system-ui}
.dl-rw{font:900 12px 'Courier New',monospace;color:var(--accent);display:inline-flex;gap:8px;align-items:center;justify-self:end}
.dl-cr{color:#e8c46a;display:inline-flex;align-items:center}
.dl-bar{display:block;height:8px;background:#14161c;box-shadow:0 0 0 2px var(--edge)}.dl-bar u{display:block;height:100%;background:var(--accent)}
.dl-st{font:900 12px 'Courier New',monospace;font-style:normal;color:var(--dim);justify-self:end;text-transform:uppercase}
.dl-btn{font-size:13px;padding:5px 14px;justify-self:end}
.dl-h{margin:6px 0 0;font-size:16px}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}
.cal-day{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;background:var(--panel2);box-shadow:0 0 0 2px var(--edge);font:700 11px 'Courier New',monospace;color:var(--dim)}
.cal-day b{color:var(--text);font-size:12px}
.cal-day.big{box-shadow:0 0 0 2px #e8c46a}
.cal-day.today{box-shadow:0 0 0 2px var(--accent);color:var(--accent);background:#2f3442}
.cal-day.got{opacity:.45}.cal-day em{position:absolute;top:1px;right:3px;font-style:normal;color:var(--good)}
.cal-sw{display:block;width:16px;height:12px;box-shadow:0 0 0 2px #0b0c10}
.cal-cr{color:#e8c46a;display:inline-flex;align-items:center}
.cal-foot{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cal-foot .btn{font-size:14px;padding:8px 14px}
/* ---- every screen fits (owner 2026-10-21, V0.14.0): on small windows (phones) main.ts fitUI() scales the menu layer, the
   results and the Typing Race screen down by --ui-s inside a box the size of the window, so each screen shows in full and
   long panels scroll inside themselves. PCs: --ui-s = 1, nothing changes. ---- */
#garage,#typing{inset:auto;left:0;top:0;width:var(--ui-w,100vw);height:var(--ui-h,100vh);transform:scale(var(--ui-s,1));transform-origin:0 0}
#results,#typing-res{transform:translate(-50%,-50%) scale(var(--ui-s,1));max-height:calc(var(--ui-h,100vh) - 24px);overflow-y:auto}
.gr-info{max-height:calc(100% - 128px - 96px);overflow-y:auto}
/* open screens sit on top of the buttons that are always there (owner): car card, wallet, Menu · Notes · Cam and Race
   < panels and lists < Garage sub-tabs < the side rail (z 7, themeBevel.ts) */
.g-title,.g-wallet,.g-util,.g-raceside{z-index:2}
.g-panel,.cat-list,.pt-tabs,.cat-under,.gr-info,.strip-wrap,.g-racemenu{z-index:4}
#garage>.g-sub{z-index:5}
/* ---- Typing Race on phones (owner E1, V0.15.0): the hidden box that opens the phone keyboard (16 px so iPhones don't zoom),
   Nitro + Leave buttons top-right, and "Tap to type" when the keyboard is closed ---- */
#ty-kb{position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;font-size:16px;resize:none;pointer-events:none}
#typing .ty-phone{position:absolute;right:28px;top:52px;display:flex;gap:8px}
#typing .ty-phone .btn{font-size:14px;padding:8px 14px}
#typing .ty-tap{position:absolute;left:50%;top:34%;transform:translateX(-50%);display:none;font-size:16px}
#typing:not(.kb-on) .ty-tap{display:inline-flex}
/* Strip reward pop-up (owner E5, V0.15.0): over the race results, scaled to fit like them */
.reward-pop{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--ui-s,1));z-index:20;display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 24px 18px;text-align:center;min-width:300px}
.reward-pop .rp-title{color:var(--accent);font-size:14px;letter-spacing:.1em}
.reward-pop .rp-car{width:296px;height:124px;image-rendering:pixelated}
.reward-pop b.hd{font-size:18px}.reward-pop span{font-size:12px;color:var(--dim);margin-bottom:6px}
/* Drift HUD (owner, V0.18.0): score top-left of the strip, ghost rival top-right, the turn card above the gauge, the live drift
   points over the car; a dash plate right of the gauge holds the Drift button beside the gas pedal. Steady — no blinking. */
.dhud .d-score,.dhud .d-rival{position:absolute;top:14px;display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:7px 12px 8px;min-width:132px}
.dhud .d-score{left:20px}.dhud .d-rival{right:20px;align-items:flex-end}
.dhud .d-lbl{font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5}
.dhud .d-score b,.dhud .d-rival b{font-size:26px;line-height:1.1;color:#e9ecf2}
.dhud .d-rival b{color:#9fb3c4}
.dhud .d-chain{font-size:14px;color:#7d8290}.dhud .d-chain.hot{color:#f2c230}
.dhud .d-turn{position:absolute;left:50%;bottom:calc(250px * var(--hud-scale,1) + 46px);transform:translateX(-50%);display:none;align-items:center;gap:10px;padding:8px 14px;font:700 13px system-ui;color:#e9ecf2;white-space:nowrap}
.dhud .d-turn.on{display:flex}
.dhud .d-turn .d-arrow{font:700 22px system-ui;color:#f2c230;line-height:1}
.dhud .d-turn i{font-style:normal;color:#9aa3b5;min-width:44px}
.dhud .d-turn .d-bar{position:relative;width:120px;height:12px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d}
.dhud .d-turn .d-bar u{position:absolute;left:0;top:2px;bottom:2px;background:#5a5f6d;text-decoration:none}
.dhud .d-turn .d-bar em{position:absolute;right:2px;top:0;bottom:0;width:10px;background:#2d5a3e}
.dhud .d-turn.near .d-bar u{background:#f2a43a}
.dhud .d-turn.go{box-shadow:inset 3px 3px 0 #3f4555,inset -3px -3px 0 #15171d,0 0 0 2px #4ade80}
.dhud .d-turn.go .d-bar u{background:#4ade80}.dhud .d-turn.go i{color:#4ade80}
.dhud .d-run{position:absolute;left:50%;top:38%;transform:translateX(-50%);display:none;flex-direction:column;align-items:center;gap:2px;text-shadow:0 2px 0 #000,0 0 6px #000;pointer-events:none}
.dhud .d-run.on{display:flex}
.dhud .d-run b{font-size:30px;color:#e9ecf2}.dhud .d-run span{font:700 13px system-ui;color:#cfd4de}
.dhud .d-run.z-perfect b,.dhud .d-run.z-perfect span{color:#4ade80}.dhud .d-run.z-out span{color:#f2a43a}
.dhud .d-run b.banked{color:#f2c230;font-size:34px}
.dhud .grade{bottom:auto;top:30%}
.dhud .d-bay{position:absolute}.dhud .d-plate{position:absolute;left:0;top:0;overflow:visible}
.dhud .d-btn,.dhud .pedal{position:absolute;pointer-events:none}
.dhud .d-btn svg{display:block}
.dhud .d-btn{transition:transform 70ms linear,filter 70ms linear}.dhud .d-btn.down{transform:translateY(4px);filter:brightness(.8)}
.dhud .d-btn.d-brake.down{transform:rotate(-6deg) translateY(2px);transform-origin:40% 90%}
.dhud .pedal{transform:perspective(320px) rotateX(16deg)}
.hud2.dhud.phone .d-score,.hud2.dhud.phone .d-rival{top:6px;transform:scale(.75);transform-origin:0 0;min-width:110px}
.hud2.dhud.phone .d-rival{transform-origin:100% 0}
.hud2.dhud.phone .d-turn{bottom:auto;top:96px;transform:translateX(-50%) scale(.85);transform-origin:50% 0}
.hud2.dhud.phone .d-run{top:30%}
.hud2.dhud .d-phdrift .d-btn{position:relative}
.hud2.dhud .d-phzone{left:0;width:30%}
.hud2.dhud.swap .d-phzone{left:auto;right:0}
/* drift cue (owner, V0.18.1): a small 3-2-1 light just above the gauge — steady, no blinking; green = tap Drift now */
.dhud .d-cue{position:absolute;top:-42px;transform:translateX(-50%);display:flex;gap:6px;padding:6px 8px;opacity:0;transition:opacity .15s;pointer-events:none}
.dhud .d-cue.on{opacity:1}
.dhud .d-cue i{width:18px;height:18px;background:#1e2129;box-shadow:inset 2px 2px 0 #121418,inset -2px -2px 0 #2c313d}
.dhud .d-cue i.lit{background:#f2a43a;box-shadow:inset 2px 2px 0 #ffd08a,inset -2px -2px 0 #a8661a}
.dhud .d-cue i.go{background:#4ade80;box-shadow:inset 2px 2px 0 #a6f5c2,inset -2px -2px 0 #23874a}
`;
