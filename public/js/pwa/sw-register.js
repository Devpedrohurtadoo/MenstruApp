// Registers the service worker (through a Trusted Types policy that only allows /sw.js) and
// surfaces updates to the UI: the new version waits until the user taps "Update".

import { store, bus } from '../app.js';

/** @type {ServiceWorkerRegistration | null} */
let registration = null;

/** @type {any} */
const policy =
  typeof window !== 'undefined' && /** @type {any} */ (window).trustedTypes?.createPolicy
    ? /** @type {any} */ (window).trustedTypes.createPolicy('menstruapp', {
        createScriptURL: (/** @type {string} */ url) => {
          if (url === '/sw.js') return url;
          throw new TypeError(`Blocked script URL: ${url}`);
        },
      })
    : null;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let accepted = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload for an update (accepted here or in another window), never on the very first
    // install — but a first-visit page that accepts an update must reload too.
    if ((!hadController && !accepted) || reloading) return;
    reloading = true;
    location.reload();
  });
  const url = policy ? policy.createScriptURL('/sw.js') : '/sw.js';
  navigator.serviceWorker
    .register(url, { scope: '/', updateViaCache: 'none' })
    .then((reg) => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) store.set({ updateReady: true });
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) store.set({ updateReady: true });
        });
      });
      setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
    })
    .catch((err) => console.warn('[sw] registration failed', err));
  bus.on('apply-update', () => {
    const waiting = registration?.waiting;
    if (waiting) {
      accepted = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else location.reload();
  });
}

export async function checkForUpdate() {
  if (!registration) return false;
  try {
    await registration.update();
  } catch {
    return false;
  }
  await new Promise((r) => setTimeout(r, 1500));
  const waiting = Boolean(registration.waiting || registration.installing);
  if (waiting) store.set({ updateReady: true });
  return waiting;
}

export function getRegistration() {
  return registration ?? navigator.serviceWorker?.ready ?? null;
}
