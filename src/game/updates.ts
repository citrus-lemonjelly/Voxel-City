// Update notice (owner V0.2.1): when a newer build is published on the site, tell the player and let them reload into it.
// The build stamps itself (__VC_BUILD__) and writes build/version.json next to the game. The live game re-reads that file
// now and then; when its build time is newer than ours, an update is out. Reloading uses a fresh address (?v=…) so the
// browser and the site's cache can't hand back the old page. Only runs when the game is served from a web site (not when
// the HTML file is opened from the computer, and not inside the Claude test link, which has no version.json).
declare const __VC_BUILD__: { version: string; built: string } | undefined;
export const BUILD = typeof __VC_BUILD__ !== 'undefined' ? __VC_BUILD__ : { version: 'dev', built: '' };

export interface RemoteBuild { version: string; built: string; title?: string }
export const UPDATE_CHECK = { firstMs: 8_000, everyMs: 120_000 };

/** Is `remote` a newer build than the one running? (Build times are ISO strings, so they compare as text.) */
export const isNewer = (remote: RemoteBuild | null, mine = BUILD) => !!remote && !!remote.built && !!mine.built && remote.built > mine.built;

/** Watch the site for a newer build; calls `found` once with it. */
export function watchForUpdates(found: (r: RemoteBuild) => void) {
  if (!/^https?:$/.test(location.protocol) || !BUILD.built) return;
  let done = false, busy = false;
  const check = async () => {
    if (done || busy) return; busy = true;
    try {
      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) { const r = await res.json() as RemoteBuild; if (isNewer(r)) { done = true; found(r); } }
    } catch { /* offline or no version.json here — try again later */ }
    busy = false;
  };
  setTimeout(check, UPDATE_CHECK.firstMs);
  setInterval(check, UPDATE_CHECK.everyMs);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}

/** Reload into the new build: same page, fresh address so no cache serves the old one. Other address options (?dev) stay. */
export function reloadInto(r: RemoteBuild) {
  const u = new URL(location.href);
  u.searchParams.set('v', r.version); u.searchParams.set('b', r.built.replace(/\D/g, '').slice(0, 14));
  location.replace(u.toString());
}
