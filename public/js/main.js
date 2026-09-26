// Entry point: applies preferences, boots storage and decides between onboarding, the lock
// screen and the app itself.

import { setLanguage, detectLanguage, t } from './core/i18n.js';
import { h, replace } from './core/dom.js';
import { store, initApp, bus, getVault } from './app.js';
import { applyTheme, watchSystemTheme } from './ui/theme.js';
import { startParticles, setParticleLevel } from './ui/effects.js';
import { isCryptoAvailable } from './security/crypto.js';
import { registerServiceWorker } from './pwa/sw-register.js';
import { initInstallPrompt } from './pwa/install.js';
import { closeAllModals } from './ui/modal.js';
import { icon } from './ui/icons.js';

const appRoot = /** @type {HTMLElement} */ (document.getElementById('app'));
let onboardingActive = false;
/** @type {null | (() => void)} */
let unmountShell = null;

/** @param {'crypto' | 'storage' | 'unknown'} reason */
function fatal(reason) {
  replace(
    appRoot,
    h(
      'main',
      { class: 'screen screen--center' },
      h('div', { class: 'fatal' }, icon('shield-alert', { size: 40 }), h('h1', { text: t('fatal.title') }), h('p', { text: t(`fatal.${reason}`) })),
    ),
  );
}

async function showOnboarding() {
  onboardingActive = true;
  unmountShell?.();
  unmountShell = null;
  const { renderOnboarding } = await import('./views/onboarding.js');
  renderOnboarding(appRoot, {
    onFinish: () => {
      onboardingActive = false;
      showApp();
    },
  });
}

async function showLock() {
  unmountShell?.();
  unmountShell = null;
  closeAllModals();
  const { renderLock } = await import('./views/lock.js');
  // "Add profile" locks the current one and immediately starts onboarding: let onboarding win.
  if (onboardingActive) return;
  renderLock(appRoot, { onReset: showOnboarding });
}

/** @param {'camouflage' | 'guest'} kind */
async function showDiscreet(kind) {
  unmountShell?.();
  unmountShell = null;
  closeAllModals();
  const m = await import('./views/camouflage.js');
  if (kind === 'camouflage') m.renderCalculator(appRoot, () => showLock());
  else m.renderGuest(appRoot, () => showLock());
}

async function showApp() {
  if (onboardingActive) return;
  closeAllModals();
  const { mountShell } = await import('./views/shell.js');
  unmountShell?.();
  unmountShell = mountShell(appRoot);
  import('./pwa/services.js').then((m) => m.startServices()).catch((err) => console.error('[services]', err));
}

async function boot() {
  const prefs = store.get().prefs;
  setLanguage(prefs.lang ?? detectLanguage());
  await applyTheme(prefs);
  watchSystemTheme(() => store.get().prefs);
  const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('particles'));
  if (canvas) startParticles(canvas, prefs.particles);

  window.addEventListener('online', () => store.set({ online: true }));
  window.addEventListener('offline', () => store.set({ online: false }));
  registerServiceWorker();
  initInstallPrompt();

  if (!isCryptoAvailable()) return fatal('crypto');
  try {
    await initApp();
  } catch (err) {
    console.error('[boot]', err);
    return fatal('storage');
  }
  await applyTheme(prefs, store.get().db);

  bus.on('unlocked', () => showApp());
  bus.on('locked', (/** @type {{ reason?: string }} */ e) => {
    if (e?.reason === 'camouflage') showDiscreet('camouflage');
    else if (e?.reason === 'guest') showDiscreet('guest');
    else showLock();
  });
  bus.on('add-profile', () => showOnboarding());
  bus.on('prefs-changed', async (/** @type {import('./data/prefs.js').Prefs} */ next) => {
    await applyTheme(next, store.get().db);
    setParticleLevel(next.particles);
  });

  const { profiles, prefs: p } = store.get();
  if (!profiles.length) return showOnboarding();
  // A single profile without any lock opens directly (its data is still encrypted at rest).
  if (profiles.length === 1) {
    const vault = await getVault(profiles[0].id);
    if (vault && !vault.locks.some((/** @type {{ type: string }} */ l) => l.type !== 'device')) {
      const { unlock } = await import('./app.js');
      try {
        await unlock(profiles[0].id, { type: 'device' });
        return;
      } catch (err) {
        console.error('[boot] device unlock failed', err);
      }
    }
  }
  if (p.lastProfileId && !profiles.some((x) => x.id === p.lastProfileId)) store.set({ prefs: { ...p, lastProfileId: profiles[0].id } });
  showLock();
}

boot().catch((err) => {
  console.error('[boot]', err);
  fatal('unknown');
});
