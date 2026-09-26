// "Add to home screen": custom prompt on Android/desktop (beforeinstallprompt) and clear
// step-by-step instructions on iOS/iPadOS Safari, where no install event exists.

import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icon } from '../ui/icons.js';
import { button, card, iconButton } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { store } from '../app.js';

/** @type {any} */
let deferred = null;

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: window-controls-overlay)').matches || /** @type {any} */ (navigator).standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function initInstallPrompt() {
  store.set({ install: { canPrompt: false, ios: isIOS(), standalone: isStandalone() } });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    store.set({ install: { ...store.get().install, canPrompt: true } });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    store.set({ install: { ...store.get().install, canPrompt: false, standalone: true } });
    toast(t('install.installed'), { type: 'success' });
  });
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
  deferred = null;
  store.set({ install: { ...store.get().install, canPrompt: false } });
  return choice.outcome === 'accepted';
}

/**
 * Install suggestion card (null when already installed).
 * @param {{ onDismiss?: () => void }} [o]
 */
export function installCard(o = {}) {
  const inst = store.get().install;
  if (inst.standalone || isStandalone()) return null;
  const dismiss = o.onDismiss ? iconButton({ icon: 'close', label: t('common.dismiss'), size: 16, onClick: o.onDismiss }) : null;
  if (inst.canPrompt) {
    return card({
      title: t('install.title'),
      icon: 'smartphone',
      action: dismiss,
      class: 'install-card',
      children: [h('p', { class: 'muted', text: t('install.benefits') }), button({ label: t('install.button'), icon: 'download', variant: 'primary', full: true, onClick: () => promptInstall() })],
    });
  }
  if (inst.ios) {
    return card({
      title: t('install.title'),
      icon: 'smartphone',
      action: dismiss,
      class: 'install-card',
      children: [
        h('p', { class: 'muted', text: t('install.benefits') }),
        h(
          'ol',
          { class: 'steps-list' },
          h('li', null, t('install.ios1'), ' ', h('span', { class: 'inline-icon', role: 'img', 'aria-label': t('install.shareIcon') }, icon('share-2', { size: 16 }))),
          h('li', { text: t('install.ios2') }),
          h('li', { text: t('install.ios3') }),
        ),
        h('p', { class: 'muted small', text: t('install.iosNote') }),
      ],
    });
  }
  return card({
    title: t('install.title'),
    icon: 'smartphone',
    action: dismiss,
    class: 'install-card',
    children: [h('p', { class: 'muted', text: t('install.benefits') }), h('p', { class: 'small', text: t('install.generic') })],
  });
}
