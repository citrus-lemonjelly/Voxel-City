// Patch notes panel (owner S50): every version newest first, with Added / Changed / Fixed / Removed (from src/data/changelog.ts).
import { CHANGELOG, VERSION } from '../../data/changelog';

export function notesHtml(close: string): string {
  const KINDS = [['added', 'Added'], ['changed', 'Changed'], ['fixed', 'Fixed'], ['removed', 'Removed']] as const;
  return `<div class="g-panel g-notes blk">${close}<h2 class="hd">Patch notes <small class="g-sub">Current V${VERSION}</small></h2>
      ${CHANGELOG.map(v => `<section class="pn-ver ${v.header ? 'big' : ''}">${v.header ? `<div class="pn-banner hd">${v.header}</div>` : ''}<div class="pn-head"><b class="hd">V${v.version}</b><span>${v.title}</span><time>${v.date}</time></div>
        ${KINDS.filter(([k]) => v[k]?.length).map(([k, label]) => `<div class="pn-kind pn-${k}">${label}</div><ul>${v[k]!.map(t => `<li>${t.replace(/</g, '&lt;')}</li>`).join('')}</ul>`).join('')}</section>`).join('')}</div>`;
}
