// Writes docs/ECONOMY.md from src/data/economy.ts so the tables always match the game. Run: npx tsx tools/economy-doc.mts
import { writeFileSync } from 'node:fs';
const E = await import('../src/data/economy.ts');
const { CARS, CATALOG_ORDER, LEAGUES, carName } = await import('../src/data/cars.ts');
const { levelReward, STRIP, BOSS_CARS } = await import('../src/game/strip.ts');
const f = (n: number) => n.toLocaleString('en-US');
const L: string[] = ['# Voxel City economy', '', 'Generated from `src/data/economy.ts` (the one file to edit). Placeholders until the owner confirms them.', ''];
L.push('## Car prices', '', '| League | Car | Price |', '|---|---|---|');
for (const id of CATALOG_ORDER) { const c = CARS[id]; L.push(`| ${c.league} | ${carName(id)} | ${c.price === 0 ? 'Free (starter)' : c.currency === 'crowns' ? `${f(c.price)} Crowns` : `${f(c.price)} VX`} |`); }
L.push('', `Starting Voxels: ${f(E.ECONOMY.startingVoxels)} VX.`, '');
L.push('## Street Race pay (win · loss)', '', '| League | Scale | Easy | Medium | Hard | Medium wins to buy the cheapest car |', '|---|---|---|---|---|---|');
for (const l of LEAGUES) {
  const p = (d: any) => `${f(E.racePay(l as any, d, true).result)} · ${f(E.racePay(l as any, d, false).result)}`;
  const cheapest = Math.min(...CATALOG_ORDER.filter(id => CARS[id].league === l && CARS[id].currency !== 'crowns' && CARS[id].price > 0).map(id => CARS[id].price));
  L.push(`| ${l} | ×${E.LEAGUE_SCALE[l as 'D']} | ${p('easy')} | ${p('medium')} | ${p('hard')} | ${(cheapest / E.racePay(l as any, 'medium', true).result).toFixed(1)} |`);
}
L.push('', `Bonuses (share of the win): Perfect shift ${E.ECONOMY.perfectShiftBonus * 100}% each · Perfect launch ${E.ECONOMY.perfectLaunchBonus * 100}% · New best ${E.ECONOMY.newBestBonus * 100}%. Rival closeness (s behind your perfect run): ${Object.entries(E.DIFFICULTY).map(([k, d]) => `${d.label} ${d.gap[0]}–${d.gap[1]}`).join(' · ')}.`, '');
const KINDS = Object.keys(E.PART_PRICES) as (keyof typeof E.PART_PRICES)[], KLABEL: Record<string, string> = { engine: 'Engine', trans: 'Transmission', tires: 'Tires', weight: 'Weight', turbo: 'Turbo' };
L.push('## Performance parts (T2 · T3 · T4 · T5)', '', `| League | ${KINDS.map(k => KLABEL[k]).join(' | ')} |`, `|---|${KINDS.map(() => '---').join('|')}|`);
for (const l of LEAGUES) L.push(`| ${l} | ${KINDS.map(k => [2, 3, 4, 5].map(t => f(E.partPrice(k, t, l as any))).join(' · ')).join(' | ')} |`);
L.push('', '## The Strip — one-time level rewards', '', '| League | Level 1 | Level 59 | Boss levels (10, 20 … 60) | Final boss car |', '|---|---|---|---|---|');
for (const l of LEAGUES) {
  const b = [1, 2, 3, 4, 5, 6].map(i => levelReward(l as any, i * 10)), car = BOSS_CARS[l as 'D'];
  L.push(`| ${l} | ${f(levelReward(l as any, 1).vx)} VX | ${f(levelReward(l as any, 59).vx)} VX | +${b[0].crowns} Crowns + decal + cash ${f(b[0].cash)} → ${f(b[5].cash)} VX (plus the level VX) | ${carName(car)} (League ${CARS[car].league}) |`);
}
L.push('', `Strip race wins pay like a Medium Street Race. ${STRIP.rungs} levels per league.`, '');
writeFileSync(new URL('../docs/ECONOMY.md', import.meta.url), L.join('\n'));
console.log(L.join('\n'));
