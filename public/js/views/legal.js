// Privacy policy, legal notice and licences, rendered from the i18n dictionaries.

import { h } from '../core/dom.js';
import { raw, t } from '../core/i18n.js';

/** @param {string} key */
function sections(key) {
  const list = /** @type {Array<[string, string[]]>} */ (raw(key) ?? []);
  return h(
    'div',
    { class: 'prose' },
    list.map(([heading, paragraphs]) => [h('h3', { text: heading }), paragraphs.map((p) => h('p', { text: p }))]),
  );
}

export function privacyPolicy() {
  return h('div', null, h('p', { class: 'muted small', text: t('legal.updated') }), sections('legal.privacy'));
}

export function legalNotice() {
  return sections('legal.terms');
}

export function licenses() {
  return h(
    'div',
    { class: 'prose' },
    h('p', { text: t('legal.licensesIntro') }),
    h(
      'ul',
      null,
      [
        ['Lucide icons', 'ISC License · © Lucide Contributors'],
        ['DM Sans', 'SIL Open Font License 1.1 · © The DM Sans Project Authors'],
        ['Playfair Display', 'SIL Open Font License 1.1 · © The Playfair Display Project Authors'],
      ].map(([name, license]) => h('li', null, h('strong', { text: name }), ` — ${license}`)),
    ),
  );
}
