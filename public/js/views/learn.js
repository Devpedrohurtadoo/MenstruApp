// "Learn": educational library, search, glossary, FAQ, when-to-see-a-professional and help.

import { h } from '../core/dom.js';
import { t, getLanguage, compareText } from '../core/i18n.js';
import { icon } from '../ui/icons.js';
import { card, listItem, emptyState, button } from '../ui/components.js';
import { normalize } from '../domain/luna.js';

/** @typedef {{ id: string, category: string, title: string, summary: string, keywords: string[], body: Array<{ h?: string, p?: string, ul?: string[] }>, consult?: string[], related?: string[], modes?: string[] }} Article */
/** @typedef {{ categories: Array<{ id: string, title: string, icon: string, desc: string }>, articles: Article[], glossary: Array<{ term: string, def: string }>,
 *  faq: Array<{ q: string, a: string[] }>, consult: { urgent: string[], soon: string[], routine: string[] }, help: Array<{ id: string, title: string, steps: string[] }> }} Library */

/** @type {Map<string, Library>} */
const cache = new Map();

/** @returns {Promise<Library>} */
export async function loadLibrary() {
  const lang = getLanguage();
  const hit = cache.get(lang);
  if (hit) return hit;
  const mod = await import(`../content/library-${lang}.js`);
  cache.set(lang, mod.default);
  return mod.default;
}

/** @param {import('./shell.js').ViewContext} ctx */
export function title(ctx) {
  const sub = ctx.route.segments[0];
  if (sub === 'glossary') return t('learn.glossary');
  if (sub === 'faq') return t('learn.faq');
  if (sub === 'consult') return t('learn.consult');
  if (sub === 'help') return t('learn.help');
  if (sub === 'search') return t('learn.searchTitle');
  return t('nav.learn');
}

/** @param {import('./shell.js').ViewContext} ctx */
export async function render(ctx) {
  const lib = await loadLibrary();
  const [sub, id] = ctx.route.segments;
  if (sub === 'article' && id) return articleView(lib, id, ctx);
  if (sub === 'category' && id) return categoryView(lib, id);
  if (sub === 'search') return searchView(lib, ctx.route.params.get('q') ?? '', ctx);
  if (sub === 'glossary') return glossaryView(lib);
  if (sub === 'faq') return faqView(lib);
  if (sub === 'consult') return consultView(lib);
  if (sub === 'help') return helpView(lib);
  return hub(lib, ctx);
}

/** @param {import('./shell.js').ViewContext} ctx @param {string} [value] */
function searchBox(ctx, value = '') {
  const input = h('input', { type: 'search', class: 'input input--search', id: 'learn-search', value, placeholder: t('learn.searchPlaceholder'), maxLength: 80, enterKeyHint: 'search', autocomplete: 'off' });
  return h(
    'form',
    {
      class: 'search',
      role: 'search',
      onSubmit: (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) ctx.navigate(`learn/search?q=${encodeURIComponent(q)}`);
      },
    },
    h('label', { class: 'sr-only', for: 'learn-search', text: t('learn.searchPlaceholder') }),
    icon('search', { size: 18 }),
    input,
  );
}

/** @param {Library} lib @param {import('./shell.js').ViewContext} ctx */
function hub(lib, ctx) {
  const mode = ctx.state.derived?.flags.mode ?? 'track';
  const featured = lib.articles.filter((a) => a.modes?.includes(mode)).slice(0, 4);
  return h(
    'div',
    { class: 'view learn' },
    searchBox(ctx),
    h(
      'a',
      { class: 'luna-cta', href: '#/luna' },
      h('span', { class: 'luna-cta__icon' }, icon('luna', { size: 26 })),
      h('span', { class: 'luna-cta__text' }, h('strong', { text: t('learn.askLuna') }), h('span', { text: t('learn.askLunaText') })),
      icon('chevron-right', { size: 18 }),
    ),
    featured.length ? card({ title: t('learn.forYou'), icon: 'sparkles', children: h('div', { class: 'list' }, featured.map((a) => listItem({ title: a.title, subtitle: a.summary, href: `#/learn/article/${a.id}` }))) }) : null,
    h('h2', { class: 'section-heading', text: t('learn.categories') }),
    h(
      'div',
      { class: 'cat-grid' },
      lib.categories.map((c) =>
        h('a', { class: 'cat', href: `#/learn/category/${c.id}` }, h('span', { class: 'cat__icon' }, icon(c.icon, { size: 22 })), h('span', { class: 'cat__title', text: c.title }), h('span', { class: 'cat__desc', text: c.desc })),
      ),
    ),
    h(
      'div',
      { class: 'list' },
      listItem({ icon: 'stethoscope', title: t('learn.consult'), subtitle: t('learn.consultDesc'), href: '#/learn/consult' }),
      listItem({ icon: 'circle-question-mark', title: t('learn.faq'), subtitle: t('learn.faqDesc'), href: '#/learn/faq' }),
      listItem({ icon: 'book-open', title: t('learn.glossary'), subtitle: t('learn.glossaryDesc'), href: '#/learn/glossary' }),
      listItem({ icon: 'lightbulb', title: t('learn.help'), subtitle: t('learn.helpDesc'), href: '#/learn/help' }),
    ),
    h('p', { class: 'disclaimer', text: t('learn.contentNote') }),
  );
}

/** @param {Library} lib @param {string} id */
function categoryView(lib, id) {
  const cat = lib.categories.find((c) => c.id === id);
  if (!cat) return notFound();
  const list = lib.articles.filter((a) => a.category === id);
  return h('div', { class: 'view learn' }, h('h2', { class: 'section-heading', text: cat.title }), h('p', { class: 'muted', text: cat.desc }), h('div', { class: 'list' }, list.map((a) => listItem({ title: a.title, subtitle: a.summary, href: `#/learn/article/${a.id}` }))));
}

/** @param {Library} lib @param {string} id @param {import('./shell.js').ViewContext} ctx */
function articleView(lib, id, ctx) {
  const a = lib.articles.find((x) => x.id === id);
  if (!a) return notFound();
  const cat = lib.categories.find((c) => c.id === a.category);
  const related = (a.related ?? []).map((rid) => lib.articles.find((x) => x.id === rid)).filter(Boolean);
  return h(
    'article',
    { class: 'view learn article' },
    cat ? h('a', { class: 'article__cat', href: `#/learn/category/${cat.id}` }, icon(cat.icon, { size: 16 }), h('span', { text: cat.title })) : null,
    h('h2', { class: 'article__title', text: a.title }),
    h('p', { class: 'article__summary', text: a.summary }),
    h(
      'div',
      { class: 'prose' },
      a.body.map((b) => (b.h ? h('h3', { text: b.h }) : b.ul ? h('ul', null, b.ul.map((li) => h('li', { text: li }))) : h('p', { text: b.p ?? '' }))),
    ),
    a.consult?.length
      ? h('aside', { class: 'consult-box' }, h('h3', null, icon('stethoscope', { size: 18 }), ` ${t('learn.whenToConsult')}`), h('ul', null, a.consult.map((c) => h('li', { text: c }))))
      : null,
    button({ label: t('learn.askLunaAbout'), icon: 'luna', variant: 'soft', full: true, onClick: () => ctx.navigate(`luna?about=${encodeURIComponent(a.id)}`) }),
    related.length ? card({ title: t('learn.related'), children: h('div', { class: 'list' }, related.map((r) => listItem({ title: /** @type {Article} */ (r).title, href: `#/learn/article/${/** @type {Article} */ (r).id}` }))) }) : null,
    h('p', { class: 'disclaimer', text: t('learn.articleDisclaimer') }),
  );
}

/**
 * @param {Library} lib
 * @param {string} query
 */
export function searchLibrary(lib, query) {
  const q = normalize(query);
  if (!q) return { articles: [], glossary: [], faq: [] };
  const words = q.split(' ').filter((w) => w.length > 1);
  /** @param {string} text @param {number} weight */
  const score = (text, weight) => {
    const n = normalize(text);
    let sc = 0;
    if (n.includes(q)) sc += weight * 2;
    for (const w of words) if (n.includes(w)) sc += weight;
    return sc;
  };
  const articles = lib.articles
    .map((a) => ({ a, s: score(a.title, 4) + score(a.keywords.join(' '), 3) + score(a.summary, 2) + score(a.body.map((b) => b.h ?? b.p ?? (b.ul ?? []).join(' ')).join(' '), 0.5) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
  const glossary = lib.glossary.filter((g) => score(g.term, 3) + score(g.def, 1) > 0);
  const faq = lib.faq.filter((f) => score(f.q, 3) + score(f.a.join(' '), 1) > 0);
  return { articles, glossary, faq };
}

/** @param {Library} lib @param {string} query @param {import('./shell.js').ViewContext} ctx */
function searchView(lib, query, ctx) {
  const r = searchLibrary(lib, query);
  const total = r.articles.length + r.glossary.length + r.faq.length;
  return h(
    'div',
    { class: 'view learn' },
    searchBox(ctx, query),
    h('p', { class: 'muted', role: 'status', text: t('learn.results', { count: total, query }) }),
    r.articles.length ? h('div', { class: 'list' }, r.articles.slice(0, 20).map((a) => listItem({ title: a.title, subtitle: a.summary, href: `#/learn/article/${a.id}` }))) : null,
    r.glossary.length ? card({ title: t('learn.glossary'), children: h('dl', { class: 'glossary' }, r.glossary.slice(0, 10).map((g) => [h('dt', { text: g.term }), h('dd', { text: g.def })])) }) : null,
    r.faq.length ? card({ title: t('learn.faq'), children: r.faq.slice(0, 10).map(faqItem) }) : null,
    !total ? emptyState({ title: t('learn.noResults'), text: t('learn.noResultsText'), action: button({ label: t('learn.askLuna'), icon: 'luna', variant: 'soft', onClick: () => ctx.navigate(`luna?q=${encodeURIComponent(query)}`) }) }) : null,
  );
}

/** @param {Library} lib */
function glossaryView(lib) {
  const items = [...lib.glossary].sort((a, b) => compareText(a.term, b.term));
  return h('div', { class: 'view learn' }, h('dl', { class: 'glossary' }, items.map((g) => [h('dt', { text: g.term }), h('dd', { text: g.def })])));
}

/** @param {{ q: string, a: string[] }} f */
function faqItem(f) {
  return h('details', { class: 'faq' }, h('summary', { text: f.q }), h('div', { class: 'prose' }, f.a.map((p) => h('p', { text: p }))));
}

/** @param {Library} lib */
function faqView(lib) {
  return h('div', { class: 'view learn' }, lib.faq.map(faqItem));
}

/** @param {Library} lib */
function consultView(lib) {
  const group = (/** @type {'urgent' | 'soon' | 'routine'} */ level, /** @type {string} */ ic) =>
    h('section', { class: ['consult', `consult--${level}`] }, h('h2', null, icon(ic, { size: 20 }), ` ${t(`learn.consultLevels.${level}`)}`), h('ul', null, lib.consult[level].map((x) => h('li', { text: x }))));
  return h('div', { class: 'view learn' }, h('p', { class: 'lead', text: t('learn.consultIntro') }), group('urgent', 'siren'), group('soon', 'stethoscope'), group('routine', 'calendar-check'), h('p', { class: 'disclaimer', text: t('learn.consultNote') }));
}

/** @param {Library} lib */
function helpView(lib) {
  return h(
    'div',
    { class: 'view learn' },
    lib.help.map((item) => h('details', { class: 'faq', id: `help-${item.id}` }, h('summary', { text: item.title }), h('ol', { class: 'steps-list' }, item.steps.map((s) => h('li', { text: s }))))),
  );
}

function notFound() {
  return h('div', { class: 'view' }, emptyState({ title: t('learn.notFound'), action: h('a', { class: 'btn btn--soft', href: '#/learn', text: t('nav.learn') }) }));
}
