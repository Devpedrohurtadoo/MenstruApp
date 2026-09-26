// Chat with Luna. Everything runs on the device; conversations are not stored or sent anywhere.

import { h, replace, downloadBlob, announce, prefersReducedMotion } from '../core/dom.js';
import { t, getLanguage, fmtDate, fmtTime, fmtDateTime } from '../core/i18n.js';
import { diffDays } from '../core/dates.js';
import { icon } from '../ui/icons.js';
import { button, iconButton, chip } from '../ui/components.js';
import { createLuna } from '../domain/luna.js';
import { store, bus } from '../app.js';
import { loadLibrary } from './learn.js';
import { fertilityLevel } from '../domain/cycle.js';

/** @typedef {{ from: 'luna' | 'user', text: string[], at: number, urgent?: boolean, article?: string, related?: string[] }} Message
 *  `related` holds follow-up questions (the related intents' topic labels). */

/** @type {Message[]} */
let messages = [];
/** @type {Map<string, ReturnType<typeof createLuna>>} */
const engines = new Map();

async function engine() {
  const lang = getLanguage();
  const hit = engines.get(lang);
  if (hit) return hit;
  const kb = (await import(`../content/luna-${lang}.js`)).default;
  const luna = createLuna(kb);
  engines.set(lang, luna);
  return luna;
}

/**
 * Answers that use the user's own data.
 * @returns {Record<string, () => string[] | null>}
 */
function contextual() {
  const d = store.get().derived;
  const noData = () => [t('luna.ctx.noData')];
  if (!d) return {};
  const pred = d.analysis.prediction;
  const cur = d.analysis.current;
  return {
    nextPeriod: () => {
      if (d.flags.pregnancy) return [t('luna.ctx.pregnantNoPeriod')];
      if (cur?.late) return [t('luna.ctx.late', { count: cur.lateDays })];
      if (!pred) return noData();
      return [
        t('luna.ctx.nextPeriod', { date: fmtDate(pred.nextPeriodStart, 'long'), from: fmtDate(pred.window[0], 'short'), to: fmtDate(pred.window[1], 'short') }),
        t(`luna.ctx.confidence.${pred.confidence}`),
      ];
    },
    fertileNow: () => {
      if (!pred) return noData();
      if (!d.flags.fertility) return [t('luna.ctx.fertilityHidden')];
      const level = fertilityLevel(diffDays(pred.ovulationDay, d.today));
      return [
        level ? t(`luna.ctx.fertile.${level}`) : t('luna.ctx.fertile.none'),
        t('luna.ctx.fertileWindow', { from: fmtDate(pred.fertileStart, 'short'), to: fmtDate(pred.fertileEnd, 'short') }),
        t('luna.ctx.notContraception'),
      ];
    },
    ovulation: () => {
      if (!pred) return noData();
      return [t(pred.ovulationMethod === 'estimate' ? 'luna.ctx.ovulationEstimated' : 'luna.ctx.ovulationConfirmed', { date: fmtDate(pred.ovulationDay, 'long') })];
    },
    cycleDay: () => {
      if (!cur || cur.stale) return noData();
      return [t('luna.ctx.cycleDay', { day: cur.cycleDay, phase: cur.phase ? t(`phases.${cur.phase}`).toLowerCase() : '—' }), cur.phase ? t(`luna.ctx.phaseInfo.${cur.phase}`) : ''].filter(Boolean);
    },
    cycleNormal: () => {
      const s = d.analysis.stats.cycle;
      if (!s || s.count < 2) return [t('luna.ctx.needMoreCycles')];
      const inRange = s.min >= 24 && s.max <= 38;
      return [t('luna.ctx.cycleStats', { mean: Math.round(s.mean), min: s.min, max: s.max, count: s.count }), t(inRange && s.range <= 9 ? 'luna.ctx.cycleTypical' : 'luna.ctx.cycleCheck')];
    },
    periodLength: () => {
      const s = d.analysis.stats.period;
      if (!s) return [t('luna.ctx.needPeriodLogs')];
      return [t('luna.ctx.periodStats', { mean: Math.round(s.mean), count: s.count }), t(s.max > 8 ? 'luna.ctx.periodLong' : 'luna.ctx.periodTypical')];
    },
    pregnancyWeek: () => {
      if (!d.pregnancy) return [t('luna.ctx.notPregnantMode')];
      return [t('pregnancy.weeks', { weeks: d.pregnancy.weeks, days: d.pregnancy.days }), t('luna.ctx.dueDate', { date: fmtDate(d.pregnancy.dueDate, 'long') })];
    },
    pregnancyChance: () => {
      if (cur?.late) return [t('luna.ctx.lateTest', { count: cur.lateDays })];
      return [t('luna.ctx.pregnancyChance')];
    },
  };
}

function welcome() {
  const name = store.get().derived?.profile.name;
  return /** @type {Message} */ ({ from: 'luna', text: [name ? t('luna.welcomeName', { name }) : t('luna.welcome'), t('luna.welcome2')], at: Date.now() });
}

/** @param {import('./shell.js').ViewContext} ctx */
export async function render(ctx) {
  if (!messages.length) messages.push(welcome());
  const lib = await loadLibrary();
  const list = h('div', { class: 'chat__list', role: 'log', 'aria-live': 'polite', 'aria-label': t('luna.conversation') });
  const typing = h('div', { class: 'chat__typing', hidden: true, 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
  const input = h('textarea', { class: 'input chat__input', id: 'luna-input', rows: 1, maxLength: 500, placeholder: t('luna.placeholder'), enterKeyHint: 'send' });

  const drawMessages = () => {
    replace(
      list,
      messages.map((m) =>
        h(
          'div',
          { class: ['msg', `msg--${m.from}`, m.urgent ? 'msg--urgent' : ''] },
          m.from === 'luna' ? h('span', { class: 'msg__avatar', 'aria-hidden': 'true' }, icon('luna', { size: 16 })) : null,
          h(
            'div',
            { class: 'msg__bubble' },
            h('span', { class: 'sr-only', text: m.from === 'luna' ? t('luna.lunaSays') : t('luna.youSaid') }),
            m.text.map((p) => h('p', { text: p })),
            m.article ? linkToArticle(lib, m.article) : null,
            m.related?.length
              ? h('div', { class: 'chips' }, m.related.map((label) => chip({ label, selected: false, onClick: () => ask(label) })))
              : null,
            h('span', { class: 'msg__time', text: fmtTime(m.at) }),
          ),
        ),
      ),
    );
    list.append(typing);
    requestAnimationFrame(() => list.lastElementChild?.scrollIntoView({ block: 'end', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  };

  const ask = async (/** @type {string} */ text) => {
    const q = text.trim().slice(0, 500);
    if (!q) return;
    messages.push({ from: 'user', text: [q], at: Date.now() });
    input.value = '';
    drawMessages();
    typing.hidden = false;
    const luna = await engine();
    const reply = luna.reply(q, { contextual: contextual(), name: store.get().derived?.profile.name ?? '' });
    await new Promise((r) => setTimeout(r, prefersReducedMotion() ? 150 : 450 + Math.random() * 400));
    typing.hidden = true;
    const related = [...(reply.related ?? []), ...(reply.followUps ?? [])]
      .map((id) => luna.intent(id)?.topic ?? '')
      .filter((label, i, all) => label && all.indexOf(label) === i)
      .slice(0, 3);
    messages.push({ from: 'luna', text: reply.paragraphs, at: Date.now(), urgent: reply.urgent, article: reply.article, related });
    drawMessages();
    announce(reply.paragraphs[0] ?? '', reply.urgent ? 'assertive' : 'polite');
  };

  const suggestions = /** @type {string[]} */ (suggestionsFor(ctx.state.derived?.flags.mode ?? 'track'));
  const form = h(
    'form',
    {
      class: 'chat__form',
      onSubmit: (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        ask(input.value);
      },
    },
    h('label', { class: 'sr-only', for: 'luna-input', text: t('luna.placeholder') }),
    input,
    iconButton({ icon: 'send', label: t('luna.send'), variant: 'primary', class: 'chat__send' }),
  );
  form.querySelector('.chat__send')?.setAttribute('type', 'submit');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      ask(input.value);
    }
  });

  drawMessages();
  const about = ctx.route.params.get('about');
  const q = ctx.route.params.get('q');
  if (about || q) {
    const article = about ? lib.articles.find((a) => a.id === about) : null;
    ctx.navigate('luna', { replace: true });
    setTimeout(() => ask(article ? t('luna.askAbout', { title: article.title }) : /** @type {string} */ (q)), 0);
  }

  return h(
    'div',
    { class: 'view chat' },
    h('p', { class: 'chat__privacy' }, icon('lock', { size: 14 }), h('span', { text: t('luna.privacy') })),
    list,
    h('div', { class: 'chat__suggestions chips' }, suggestions.map((s) => chip({ label: s, selected: false, onClick: () => ask(s) }))),
    form,
    h(
      'div',
      { class: 'btn-row btn-row--end' },
      button({
        label: t('luna.export'),
        icon: 'download',
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          const text = messages.map((m) => `[${fmtDateTime(m.at)}] ${m.from === 'luna' ? 'Luna' : t('luna.you')}:\n${m.text.join('\n')}`).join('\n\n');
          downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `luna-${new Date().toISOString().slice(0, 10)}.txt`);
        },
      }),
      button({
        label: t('luna.clear'),
        icon: 'rotate-ccw',
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          messages = [welcome()];
          drawMessages();
        },
      }),
    ),
  );
}

/** @param {string} mode */
function suggestionsFor(mode) {
  const byMode = /** @type {Record<string, string[]>} */ ({
    pregnant: ['luna.suggest.pregnancyWeek', 'luna.suggest.nausea', 'luna.suggest.warningSigns'],
    postpartum: ['luna.suggest.postpartum', 'luna.suggest.mood', 'luna.suggest.breastfeeding'],
    perimenopause: ['luna.suggest.hotFlashes', 'luna.suggest.menopause', 'luna.suggest.sleep'],
    conceive: ['luna.suggest.fertileNow', 'luna.suggest.ovulation', 'luna.suggest.conceive'],
    avoid: ['luna.suggest.nextPeriod', 'luna.suggest.missedPill', 'luna.suggest.emergency'],
  });
  return (byMode[mode] ?? ['luna.suggest.nextPeriod', 'luna.suggest.cramps', 'luna.suggest.normal', 'luna.suggest.mood']).map((k) => t(k));
}

/** @param {import('./learn.js').Library} lib @param {string} id */
function linkToArticle(lib, id) {
  const a = lib.articles.find((x) => x.id === id);
  if (!a) return null;
  return h('a', { class: 'msg__link', href: `#/learn/article/${a.id}` }, icon('book-open', { size: 14 }), h('span', { text: t('luna.readMore', { title: a.title }) }));
}

export function cleanup() {
  /* conversation is kept while the app is unlocked; cleared on lock */
}

bus.on('locked', () => {
  messages = [];
});
