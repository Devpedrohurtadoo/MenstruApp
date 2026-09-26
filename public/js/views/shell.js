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

/** Section (tab) that each secondary view belongs to, for the document title. */
const SECTION_OF = /** @type {Record<string, string>} */ ({ luna: 'learn', report: 'analysis', pregnancy: 'home' });

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
            { type: 'button', class: 'tabbar__add', 'aria-label': t('nav.log'), dataset: { fk: 'tab-log' }, onClick: () => openLog() },
            h('span', { class: 'tabbar__add-inner' }, icon('plus', { size: 26 })),
          );
        }
        const on = active === tab.name;
        return h(
          'a',
          { class: ['tabbar__item', on ? 'is-active' : ''], href: `#/${tab.name}`, 'aria-current': on ? 'page' : null, dataset: { fk: `tab-${tab.name}` } },
          icon(tab.icon, { size: 22 }),
          h('span', { class: 'tabbar__label', text: t(`nav.${tab.name}`) }),
        );
      }),
    );
  };

  const renderHeader = (/** @type {import('./router.js').Route} */ route, /** @type {string} */ viewTitle) => {
    // Texts created once with the shell follow a language change.
    back.setAttribute('aria-label', t('common.back'));
    back.title = t('common.back');
    skip.textContent = t('nav.skip');
    tabbar.setAttribute('aria-label', t('nav.label'));
    const topLevel = TABS.some((tab) => tab.name === route.name) && route.segments.length === 0;
    back.hidden = topLevel;
    title.textContent = viewTitle;
    const state = store.get();
    const btns = [];
    if (state.session?.vaultInfo.needsSecret) {
      btns.push(iconButton({ icon: 'shield', label: t('shell.safeScreen'), fk: 'top-safe', onClick: () => import('./camouflage.js').then((m) => m.showCamouflage()) }));
      btns.push(iconButton({ icon: 'lock', label: t('shell.lockNow'), fk: 'top-lock', onClick: () => lock('manual') }));
    }
    if (route.name !== 'settings') btns.push(iconButton({ icon: 'settings', label: t('nav.settings'), fk: 'top-settings', onClick: () => navigate('settings') }));
    replace(actions, btns);
  };

  let bannerState = '';
  const renderBanners = () => {
    const state = store.get();
    // Rebuilding an unchanged live region would announce "offline" again on every save.
    const signature = `${state.online}:${state.updateReady}`;
    if (signature === bannerState) return;
    bannerState = signature;
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
    const active = /** @type {HTMLElement | null} */ (document.activeElement);
    const focusKey = active?.dataset?.fk ?? null;
    const focusId = !focusKey && active && active !== document.body && active !== main ? active.id : '';
    const scrollY = window.scrollY;
    if (viewChanged && activeModule?.cleanup) activeModule.cleanup();
    const node = await mod.render(ctx);
    if (seq !== renderSeq) return;
    const viewTitle = mod.title ? mod.title(ctx) : t(`nav.${route.name}`);
    const swap = () => {
      // A view transition runs this callback later (and a skipped transition still runs it):
      // if a newer navigation has rendered meanwhile, this stale view must not replace it.
      if (seq !== renderSeq) return;
      renderHeader(route, viewTitle);
      renderTabs(route.name);
      renderBanners();
      replace(main, node);
    };
    // The first paint is not animated: there is no previous view to transition from.
    const canAnimate = routeChanged && lastRouteName !== '' && 'startViewTransition' in document && !prefersReducedMotion();
    if (canAnimate) /** @type {any} */ (document).startViewTransition(swap);
    else swap();
    activeModule = mod;
    // The tab/window title names the section only: never a name ("Hola, Lucía") or a
    // situation ("Herramientas de embarazo") that others could read in a tab list.
    document.title = `${t(`nav.${SECTION_OF[route.name] ?? route.name}`)} · Menstruapp`;
    if (routeChanged) {
      window.scrollTo(0, 0);
      if (lastRouteName) {
        main.focus({ preventScroll: true });
        announce(viewTitle);
      }
    } else {
      window.scrollTo(0, scrollY);
      // The tab bar and top bar are rebuilt too: look everywhere in the app, by key or id.
      const target = focusKey ? appRoot.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`) : focusId ? document.getElementById(focusId) : null;
      if (target && target !== document.activeElement) /** @type {HTMLElement} */ (target).focus({ preventScroll: true });
      // The focused control is gone (e.g. "my period started" once it has started): continue
      // from the start of the main content instead of the top of the page.
      else if (!target && active && active !== document.body && !document.contains(active)) main.focus({ preventScroll: true });
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
