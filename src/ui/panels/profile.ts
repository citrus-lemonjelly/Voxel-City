// Profile panel: driver card (avatar comes with the avatar system) and lifetime stats.
import { SaveV1, RACE_DISTS, typingStats } from '../../save/save';
import { CARS } from '../../data/cars';
import { averageWpm } from '../../game/typing';
import { DEV } from '../devConsole';
import { icon, fmtTime } from './shared';

export function profileHtml(save: SaveV1, close: string): string {
  const rate = save.races ? Math.round(save.wins / save.races * 100) + '%' : '—';
  return `<div class="g-panel blk">${close}<h2 class="hd">Profile</h2>
      <div class="g-avatar"><div class="g-avatar-box">${icon('profile', 7)}</div><div><b class="hd">Driver</b><span>League ${CARS[save.carId].league}</span><span class="g-note">Avatar comes with the avatar system.</span></div></div>
      <div class="g-grid"><div><b>${save.races}</b><span>races</span></div><div><b>${save.wins}</b><span>wins</span></div><div><b>${rate}</b><span>win rate</span></div>
        ${RACE_DISTS.map(d => `<div><b>${save.best[d] ? fmtTime(save.best[d]!) : '—'}</b><span>best ${d} m</span></div>`).join('')}<div><b>${save.perfectShifts}</b><span>perfect shifts</span></div><div><b>${typingStats(save).best ? Math.round(typingStats(save).best) : '—'}</b><span>best wpm</span></div><div><b>${typingStats(save).races ? Math.round(averageWpm(typingStats(save).recent)) : '—'}</b><span>avg wpm (10)</span></div><div><b>${typingStats(save).wins}/${typingStats(save).races}</b><span>typing wins</span></div><div><b>${DEV.unlimited ? '∞' : save.voxels.toLocaleString()}</b><span>voxels</span></div></div></div>`;
}
