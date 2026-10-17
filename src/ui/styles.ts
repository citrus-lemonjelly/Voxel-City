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
.toast{position:absolute;right:480px;bottom:40px;padding:10px 14px;font-size:14px}
/* race hud */
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
`;
