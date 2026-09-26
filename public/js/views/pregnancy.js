// Pregnancy tools: weekly notes, kick counter and contraction timer.

import { h, announce } from '../core/dom.js';
import { t, fmtDate, fmtTime, getLanguage, fmtNumber } from '../core/i18n.js';
import { todayISO } from '../core/dates.js';
import { card, button, emptyState, notice, progressBar } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { saveDoc } from '../app.js';
import { contractionStats, lastKickSession } from '../domain/pregnancy.js';

// A kick session or a running contraction survives switching tabs (you may check the
// calendar mid-count), but belongs to one profile: another profile never sees it.
/** @type {{ start: number, count: number } | null} */
let kickSession = null;
/** @type {number | null} */
let contractionStart = null;
let noteWeek = 0;
let ownerProfile = '';
/** @type {ReturnType<typeof setInterval> | undefined} */
let ticker;

export function title() {
  return t('pregnancy.toolsTitle');
}

/** @param {import('./shell.js').ViewContext} ctx */
export async function render(ctx) {
  const d = ctx.state.derived;
  const preg = ctx.state.data?.docs.pregnancy;
  if (!d?.pregnancy || !preg) {
    return h('div', { class: 'view' }, card({ children: emptyState({ title: t('pregnancy.notActive'), action: h('a', { class: 'btn btn--soft', href: '#/settings/mode', text: t('settings.sections.mode') }) }) }));
  }
  const p = d.pregnancy;
  const profileId = ctx.state.session?.profileId ?? '';
  if (profileId !== ownerProfile) {
    ownerProfile = profileId;
    kickSession = null;
    contractionStart = null;
    noteWeek = 0;
  }
  if (!noteWeek) noteWeek = p.noteWeek;
  const notes = (await import(`../content/pregnancy-${getLanguage()}.js`)).default;
  const rerender = () => ctx.navigate('pregnancy', { replace: true });

  clearInterval(ticker);
  const live = h('span', { class: 'timer' });
  const liveContraction = h('span', { class: 'timer' });
  const tick = () => {
    if (kickSession) live.textContent = elapsed(kickSession.start);
    if (contractionStart) liveContraction.textContent = elapsed(contractionStart);
  };
  if (kickSession || contractionStart) {
    tick();
    ticker = setInterval(tick, 1000);
  }

  const savePreg = (/** @type {Record<string, any>} */ patch) => saveDoc('pregnancy', { ...preg, ...patch });
  const lastKick = lastKickSession(preg.kicks ?? []);
  const stats = contractionStats(preg.contractions ?? [], Date.now());
  const recentContractions = (preg.contractions ?? []).slice(-6).reverse();

  const kickCard = card({
    title: t('pregnancy.kicks.title'),
    icon: 'footprints',
    children: [
      h('p', { class: 'muted', text: t('pregnancy.kicks.intro') }),
      kickSession
        ? [
            h('p', { class: 'big-count', 'aria-live': 'polite', text: fmtNumber(kickSession.count) }),
            h('p', { class: 'muted', 'aria-hidden': 'true' }, live),
            progressBar(kickSession.count / 10, t('pregnancy.kicks.progress')),
            h(
              'div',
              { class: 'btn-row' },
              button({
                label: t('pregnancy.kicks.tap'),
                icon: 'plus',
                variant: 'primary',
                size: 'lg',
                fk: 'kick-tap',
                onClick: async () => {
                  if (!kickSession) return;
                  kickSession.count++;
                  announce(String(kickSession.count));
                  if (kickSession.count >= 10) {
                    const session = { start: kickSession.start, end: Date.now(), count: kickSession.count };
                    kickSession = null;
                    await savePreg({ kicks: [...(preg.kicks ?? []), session].slice(-500) });
                    toast(t('pregnancy.kicks.done', { minutes: Math.max(1, Math.round((session.end - session.start) / 60000)) }), { type: 'success' });
                  }
                  rerender();
                },
              }),
              button({
                label: t('pregnancy.kicks.stop'),
                variant: 'ghost',
                onClick: async () => {
                  if (!kickSession) return;
                  const session = { start: kickSession.start, end: Date.now(), count: kickSession.count };
                  kickSession = null;
                  if (session.count > 0) await savePreg({ kicks: [...(preg.kicks ?? []), session].slice(-500) });
                  rerender();
                },
              }),
            ),
          ]
        : button({ label: t('pregnancy.kicks.start'), icon: 'play', variant: 'primary', onClick: () => { kickSession = { start: Date.now(), count: 0 }; rerender(); } }),
      lastKick ? h('p', { class: 'muted small', text: t('pregnancy.kicks.last', { count: lastKick.count, minutes: lastKick.minutes, date: fmtDate(todayISO(new Date(lastKick.start)), 'short') }) }) : null,
      notice({ level: 'consult', title: t('pregnancy.kicks.warnTitle'), text: t('pregnancy.kicks.warnText') }),
    ],
  });

  const contractionCard = card({
    title: t('pregnancy.contractions.title'),
    icon: 'timer',
    children: [
      h('p', { class: 'muted', text: t('pregnancy.contractions.intro') }),
      contractionStart
        ? [
            h('p', { class: 'big-count', 'aria-hidden': 'true' }, liveContraction),
            button({
              label: t('pregnancy.contractions.stop'),
              icon: 'square',
              variant: 'primary',
              size: 'lg',
              full: true,
              fk: 'contraction',
              onClick: async () => {
                if (!contractionStart) return;
                const c = { start: contractionStart, end: Date.now() };
                contractionStart = null;
                await savePreg({ contractions: [...(preg.contractions ?? []), c].slice(-2000) });
                rerender();
              },
            }),
          ]
        : button({ label: t('pregnancy.contractions.start'), icon: 'play', variant: 'primary', size: 'lg', full: true, fk: 'contraction', onClick: () => { contractionStart = Date.now(); rerender(); } }),
      stats.count >= 2
        ? h('p', { class: 'hero__line', text: t('pregnancy.contractions.stats', { count: stats.count, duration: stats.avgDurationSec ?? 0, interval: fmtNumber(stats.avgIntervalMin ?? 0) }) })
        : null,
      stats.pattern511 ? notice({ level: 'urgent', announceKey: 'contractions-511', title: t('pregnancy.contractions.pattern'), text: t('pregnancy.contractions.patternText') }) : null,
      recentContractions.length
        ? h(
            'ul',
            { class: 'events' },
            recentContractions.map((c, i) => {
              const prev = recentContractions[i + 1];
              return h(
                'li',
                { class: 'events__item' },
                h('span', { class: 'events__label', text: fmtTime(c.start) }),
                h('span', { class: 'events__when', text: `${t('pregnancy.contractions.lasted', { seconds: Math.round((c.end - c.start) / 1000) })}${prev ? ` · ${t('pregnancy.contractions.every', { minutes: fmtNumber((c.start - prev.start) / 60000, { maximumFractionDigits: 1 }) })}` : ''}` }),
              );
            }),
          )
        : null,
      recentContractions.length ? button({ label: t('pregnancy.contractions.clear'), variant: 'ghost', size: 'sm', onClick: async () => { await savePreg({ contractions: [] }); rerender(); } }) : null,
      h('p', { class: 'muted small', text: t('pregnancy.contractions.note') }),
    ],
  });

  const weekCard = card({
    title: t('pregnancy.thisWeek', { week: noteWeek }),
    icon: 'baby',
    children: [
      h('p', { class: 'tip', text: notes[noteWeek] ?? '' }),
      h(
        'div',
        { class: 'btn-row' },
        button({ label: t('pregnancy.prevWeek'), icon: 'chevron-left', variant: 'ghost', size: 'sm', fk: noteWeek - 1 <= 4 ? 'preg-week-edge' : 'preg-prev', disabled: noteWeek <= 4, onClick: () => { noteWeek--; rerender(); } }),
        button({ label: t('pregnancy.nextWeek'), iconAfter: 'chevron-right', variant: 'ghost', size: 'sm', fk: noteWeek + 1 >= 42 ? 'preg-week-edge' : 'preg-next', disabled: noteWeek >= 42, onClick: () => { noteWeek++; rerender(); } }),
      ),
    ],
  });

  return h(
    'div',
    { class: 'view pregnancy' },
    h('p', { class: 'lead', text: `${t('pregnancy.weeks', { weeks: p.weeks, days: p.days })} · ${t('pregnancy.trimester', { n: p.trimester })}` }),
    weekCard,
    p.weeks >= 24 ? kickCard : null,
    p.weeks >= 28 ? contractionCard : null,
    p.weeks < 28 ? notice({ level: 'info', text: t(p.weeks < 24 ? 'pregnancy.laterTools' : 'pregnancy.laterContractions') }) : null,
    h('a', { class: 'link', href: '#/learn/article/embarazo-alarma', text: t('pregnancy.warningSigns') }),
    h('p', { class: 'disclaimer', text: t('pregnancy.disclaimer') }),
  );
}

/** @param {number} start */
function elapsed(start) {
  const s = Math.floor((Date.now() - start) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function cleanup() {
  clearInterval(ticker);
  // Coming back later shows the current week again.
  noteWeek = 0;
}
