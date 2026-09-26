// Main application frame: header, routed content, bottom tab bar and status banners.

import { h, replace, announce, prefersReducedMotion } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icon } from '../ui/icons.js';
import { iconButton } from '../ui/components.js';
import { store, lock, bus } from '../app.js';
import { currentRoute, navigate, onRouteChange } from './router.js';
import { hasOpenModal } from '../ui/modal.js';

/** @type {Record<string, () => Promise<{ render: (ctx: ViewContext) => Node | Promise<Node>, cleanup?: () => void, title?: (ctx: ViewContext) => string }>>} */
const VIEWS = {
  home: () => import('./home.js'),
  calendar: () => import('./calendar.js'),
  analysis: () => import('./analysis.js'),
  learn: () => import('./learn.js'),
  luna: () => import('./luna.js'),
  settings: () => import('./settings.js'),
  report: () => import('./report.js'),
  pregnancy: () => import('./pregnancy.js'),
};

const TABS = [
  { name: 'home', icon: 'home' },
  { name: 'calendar', icon: 'calendar' },
  { name: 'log', icon: 'plus' },
  { name: 'analysis', icon: 'chart' },
  { name: 'learn', icon: 'learn' },
];

/** @typedef {{ route: import('./router.js').Route, state: import('../app.js').AppState, navigate: typeof navigate, openLog: (iso?: string) => void }} ViewContext */

export function mountShell(/** @type {HTMLElement} */ appRoot) {
  const main = h('main', { id: 'main', class: 'main', tabIndex: -1 });
  const title = h('h1', { class: 'topbar__title' });
  const back = iconButton({ icon: 'arrow-left', label: t('common.back'), onClick: () => history.back(), class: 'topbar__back' });
  const actions = h('div', { class: 'topbar__actions' });
  const banners = h('div', { class: 'banners', 'aria-live': 'polite' });
  const header = h('header', { class: 'topbar' }, back, title, actions);
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': t('nav.label') });
  const skip = h('a', { class: 'skip-link', href: '#main', text: t('nav.skip'), onClick: (/** @type {Event} */ e) => { e.preventDefault(); main.focus(); } });
  replace(appRoot, skip, header, banners, main, tabbar);

  /** @type {null | { cleanup?: () => void }} */
  let activeModule = null;
  let lastRoutePath = '';
  let lastRouteName = '';
  let lastVersion = -1;
  let lastPrefs = store.get().prefs;
  let renderSeq = 0;

  /** @param {string} [iso] */
  const openLog = async (iso) => {
    const { openDayLog } = await import('./daylog.js');
    openDayLog(iso);
  };

  const renderTabs = (/** @type {string} */ active) => {
    replace(
      tabbar,
      TABS.map((tab) => {
        if (tab.name === 'log') {
          return h(
            'button',
            { type: 'button', class: 'tabbar__add', 'aria-label': t('nav.log'), onClick: () => openLog() },
            h('span', { class: 'tabbar__add-inner' }, icon('plus', { size: 26 })),
          );
        }
        const on = active === tab.name;
        return h(
          'a',
          { class: ['tabbar__item', on ? 'is-active' : ''], href: `#/${tab.name}`, 'aria-current': on ? 'page' : null },
          icon(tab.icon, { size: 22 }),
          h('span', { class: 'tabbar__label', text: t(`nav.${tab.name}`) }),
        );
      }),
    );
  };

  const renderHeader = (/** @type {import('./router.js').Route} */ route, /** @type {string} */ viewTitle) => {
    const topLevel = TABS.some((tab) => tab.name === route.name) && route.segments.length === 0;
    back.hidden = topLevel;
    title.textContent = viewTitle;
    const state = store.get();
    const btns = [];
    if (state.session?.vaultInfo.needsSecret) {
      btns.push(iconButton({ icon: 'shield', label: t('shell.safeScreen'), onClick: () => import('./camouflage.js').then((m) => m.showCamouflage()) }));
      btns.push(iconButton({ icon: 'lock', label: t('shell.lockNow'), onClick: () => lock('manual') }));
    }
    if (route.name !== 'settings') btns.push(iconButton({ icon: 'settings', label: t('nav.settings'), onClick: () => navigate('settings') }));
    replace(actions, btns);
  };

  const renderBanners = () => {
    const state = store.get();
    const items = [];
    if (!state.online) items.push(h('div', { class: 'banner banner--muted' }, icon('wifi-off', { size: 16 }), h('span', { text: t('shell.offline') })));
    if (state.updateReady) {
      items.push(
        h(
          'div',
          { class: 'banner' },
          icon('sparkles', { size: 16 }),
          h('span', { text: t('shell.updateReady') }),
          h('button', { type: 'button', class: 'banner__action', text: t('shell.updateNow'), onClick: () => bus.emit('apply-update') }),
        ),
      );
    }
    replace(banners, items);
  };

  /**
   * @param {boolean} navigated a hashchange happened
   * @param {boolean} [inPlace] it was a replace/same-URL navigation (in-view update)
   */
  const render = async (navigated, inPlace = false) => {
    const seq = ++renderSeq;
    const route = currentRoute();
    // A real page change resets scroll/focus; in-view updates (month change, settings
    // toggles, filters) keep them. Module state is only cleaned up when the view changes.
    const viewChanged = route.name !== lastRouteName;
    const routeChanged = navigated && (viewChanged || (!inPlace && route.path !== lastRoutePath));
    const loader = VIEWS[route.name];
    if (!loader) {
      navigate('home', { replace: true });
      return;
    }
    const mod = await loader();
    if (seq !== renderSeq) return;
    const state = store.get();
    if (!state.session) return;
    /** @type {ViewContext} */
    const ctx = { route, state, navigate, openLog };
    const focusKey = /** @type {HTMLElement | null} */ (document.activeElement)?.dataset?.fk ?? null;
    const scrollY = window.scrollY;
    if (viewChanged && activeModule?.cleanup) activeModule.cleanup();
    const node = await mod.render(ctx);
    if (seq !== renderSeq) return;
    const viewTitle = mod.title ? mod.title(ctx) : t(`nav.${route.name}`);
    const swap = () => {
      renderHeader(route, viewTitle);
      renderTabs(route.name);
      renderBanners();
      replace(main, node);
    };
    const canAnimate = routeChanged && 'startViewTransition' in document && !prefersReducedMotion();
    if (canAnimate) /** @type {any} */ (document).startViewTransition(swap);
    else swap();
    activeModule = mod;
    document.title = `${viewTitle} · Menstruapp`;
    if (routeChanged) {
      window.scrollTo(0, 0);
      if (lastRoutePath) {
        main.focus({ preventScroll: true });
        announce(viewTitle);
      }
    } else {
      window.scrollTo(0, scrollY);
      if (focusKey) /** @type {HTMLElement | null} */ (main.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`))?.focus({ preventScroll: true });
    }
    lastRoutePath = route.path;
    lastRouteName = route.name;
  };

  const offRoute = onRouteChange((_route, inPlace) => render(true, inPlace));
  const offStore = store.subscribe((state, prev) => {
    if (!state.session) return;
    const dataChanged = state.version !== lastVersion;
    const prefsChanged = state.prefs.lang !== lastPrefs.lang || state.prefs.weekStart !== lastPrefs.weekStart;
    // Optional backend capabilities arrive asynchronously after unlocking.
    const serverChanged = state.server !== prev.server;
    if (state.online !== prev.online || state.updateReady !== prev.updateReady) renderBanners();
    if (dataChanged || prefsChanged || serverChanged) {
      lastVersion = state.version;
      lastPrefs = state.prefs;
      // Re-rendering under an open sheet is fine: sheets live outside <main>.
      if (!hasOpenModal() || dataChanged) render(false);
    }
  });
  lastVersion = store.get().version;
  render(true);

  return () => {
    offRoute();
    offStore();
    activeModule?.cleanup?.();
  };
}
