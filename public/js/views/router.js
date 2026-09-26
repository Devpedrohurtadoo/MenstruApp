// Hash router: works offline, needs no server rewrites and keeps the back button meaningful.

/** @typedef {{ name: string, segments: string[], params: URLSearchParams, path: string }} Route */

/** @returns {Route} */
export function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  let segments;
  try {
    segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    segments = [];
  }
  return { name: segments[0] || 'home', segments: segments.slice(1), params: new URLSearchParams(query), path };
}

/**
 * @param {string} path e.g. "calendar/2024-05" (no leading "#/")
 * @param {{ replace?: boolean }} [opts]
 */
export function navigate(path, opts = {}) {
  const url = `#/${path.replace(/^#?\/?/, '')}`;
  if (location.hash === url) {
    inPlace = true;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    inPlace = false;
    return;
  }
  if (opts.replace) {
    inPlace = true;
    history.replaceState(history.state, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    inPlace = false;
  } else {
    location.hash = url;
  }
}

/** True while dispatching a replace/same-URL navigation (an in-view update, not a new page). */
let inPlace = false;

/** @param {(route: Route, inPlace: boolean) => void} fn */
export function onRouteChange(fn) {
  const handler = () => fn(currentRoute(), inPlace);
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
