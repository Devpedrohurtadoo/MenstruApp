// Settings hub; each section lives in views/settings/<section>.js.

import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { listItem, avatar, emptyState } from '../ui/components.js';

const SECTIONS = /** @type {const} */ ([
  ['profile', 'user', 'settings.sections.profile'],
  ['mode', 'target', 'settings.sections.mode'],
  ['cycle', 'calendar', 'settings.sections.cycle'],
  ['reminders', 'bell', 'settings.sections.reminders'],
  ['appearance', 'palette', 'settings.sections.appearance'],
  ['privacy', 'shield', 'settings.sections.privacy'],
  ['data', 'package', 'settings.sections.data'],
  ['share', 'share-2', 'settings.sections.share'],
  ['language', 'languages', 'settings.sections.language'],
  ['about', 'info', 'settings.sections.about'],
]);

/** @type {Record<string, () => Promise<{ render: (ctx: any) => Node | Promise<Node> }>>} */
const LOADERS = {
  profile: () => import('./settings/profile.js'),
  mode: () => import('./settings/mode.js'),
  cycle: () => import('./settings/cycle.js'),
  reminders: () => import('./settings/reminders.js'),
  appearance: () => import('./settings/appearance.js'),
  privacy: () => import('./settings/privacy.js'),
  data: () => import('./settings/data.js'),
  share: () => import('./settings/share.js'),
  language: () => import('./settings/language.js'),
  about: () => import('./settings/about.js'),
};

/** @param {import('./shell.js').ViewContext} ctx */
export function title(ctx) {
  const section = ctx.route.segments[0];
  const found = SECTIONS.find(([id]) => id === section);
  return found ? t(found[2]) : t('nav.settings');
}

/** @param {import('./shell.js').ViewContext} ctx */
export async function render(ctx) {
  const section = ctx.route.segments[0];
  if (section && LOADERS[section]) {
    const mod = await LOADERS[section]();
    return h('div', { class: 'view settings' }, await mod.render(ctx));
  }
  if (section) return h('div', { class: 'view' }, emptyState({ title: t('learn.notFound') }));
  const profile = ctx.state.derived?.profile ?? {};
  return h(
    'div',
    { class: 'view settings' },
    h(
      'a',
      { class: 'profile-head', href: '#/settings/profile' },
      avatar({ name: profile.name, avatar: profile.avatar, photo: profile.photo }, 56),
      h('span', { class: 'profile-head__text' }, h('strong', { text: profile.name || t('settings.profile.anonymous') }), h('span', { class: 'muted', text: t(`modes.${ctx.state.derived?.settings.mode ?? 'track'}.title`) })),
    ),
    h(
      'div',
      { class: 'list' },
      SECTIONS.filter(([id]) => id !== 'share' || ctx.state.server.share).map(([id, ic, key]) => listItem({ icon: ic, title: t(key), subtitle: t(`settings.sections.${id}Desc`), href: `#/settings/${id}` })),
    ),
  );
}
