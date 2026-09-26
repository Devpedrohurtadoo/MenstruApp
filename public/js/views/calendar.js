// Month calendar with period/fertility/ovulation marks, keyboard navigation (roving tabindex),
// quick "edit period" mode and the cycle history.

import { h, announce } from '../core/dom.js';
import { t, fmtMonth, fmtDate, weekdayLabels, localeWeekStart, fmtNumber } from '../core/i18n.js';
import { monthKey, monthGrid, addMonths, addDays, isISODate, diffDays } from '../core/dates.js';
import { icon } from '../ui/icons.js';
import { button, iconButton, card, badge } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { calendarMarks } from '../domain/cycle.js';
import { BLEEDING } from '../domain/catalog.js';
import { saveDay, store } from '../app.js';

let editMode = false;
/** @type {string | null} */
let focusDate = null;

/** @param {import('./shell.js').ViewContext} ctx */
export function render(ctx) {
  const { derived, data, prefs } = ctx.state;
  if (!derived || !data) return h('div');
  const today = derived.today;
  const requested = ctx.route.segments[0];
  const month = requested && /^\d{4}-\d{2}$/.test(requested) && isISODate(`${requested}-01`) ? requested : monthKey(today);
  const weekStart = prefs.weekStart === 'auto' ? localeWeekStart() : prefs.weekStart;
  const dates = monthGrid(month, weekStart);
  const flags = derived.flags;
  const marks = calendarMarks(derived.analysis, data.days, dates, { showFertility: flags.fertility, showPredictions: flags.predictions });

  const go = (/** @type {number} */ delta) => {
    const next = addMonths(month, delta);
    ctx.navigate(`calendar/${next}`, { replace: true });
    // The month title is rebuilt with the view, so it cannot announce itself: say it.
    announce(fmtMonth(next));
  };
  const header = h(
    'div',
    { class: 'cal__header' },
    iconButton({ icon: 'chevron-left', label: t('calendar.prevMonth'), onClick: () => go(-1), fk: 'cal-prev' }),
    h('h2', { class: 'cal__month', id: 'cal-month', text: fmtMonth(month) }),
    iconButton({ icon: 'chevron-right', label: t('calendar.nextMonth'), onClick: () => go(1), fk: 'cal-next' }),
  );

  const labels = weekdayLabels(weekStart, 'short');
  const longLabels = weekdayLabels(weekStart, 'long');
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const week = dates.slice(r * 7, r * 7 + 7);
    if (r === 5 && week.every((d) => monthKey(d) !== month)) break;
    rows.push(
      h(
        'div',
        { class: 'cal__row', role: 'row' },
        week.map((d) => dayCell(d, marks[d], { month, today, data, flags })),
      ),
    );
  }
  const initialFocus = focusDate && dates.includes(focusDate) ? focusDate : dates.includes(today) ? today : `${month}-01`;
  const grid = h(
    'div',
    {
      class: ['cal__grid', editMode ? 'is-editing' : ''],
      role: 'grid',
      'aria-labelledby': 'cal-month',
      onKeydown: (/** @type {KeyboardEvent} */ e) => onGridKey(e, month, ctx),
    },
    h('div', { class: 'cal__row cal__weekdays', role: 'row' }, labels.map((l, i) => h('span', { role: 'columnheader', class: 'cal__weekday', 'aria-label': longLabels[i], text: l }))),
    rows,
  );
  // Roving tabindex: exactly one focusable day.
  for (const cell of grid.querySelectorAll('.cal__day')) {
    /** @type {HTMLElement} */ (cell).tabIndex = /** @type {HTMLElement} */ (cell).dataset.date === initialFocus ? 0 : -1;
  }

  const toolbar = h(
    'div',
    { class: 'cal__toolbar' },
    month !== monthKey(today) ? button({ label: t('calendar.today'), icon: 'calendar-check', variant: 'ghost', size: 'sm', onClick: () => ctx.navigate('calendar', { replace: true }) }) : h('span'),
    button({
      label: editMode ? t('calendar.doneEditing') : t('calendar.editPeriod'),
      icon: editMode ? 'check' : 'droplet',
      variant: editMode ? 'primary' : 'soft',
      size: 'sm',
      fk: 'edit-period',
      onClick: () => {
        editMode = !editMode;
        ctx.navigate(`calendar/${month}`, { replace: true });
      },
    }),
  );

  return h(
    'div',
    { class: 'view calendar' },
    header,
    toolbar,
    editMode ? h('p', { class: 'cal__edit-hint', role: 'status', text: t('calendar.editHint') }) : null,
    grid,
    legend(flags),
    history(derived),
  );
}

/**
 * @param {string} d
 * @param {ReturnType<typeof calendarMarks>[string]} m
 * @param {{ month: string, today: string, data: import('../app.js').Data, flags: any }} c
 */
function dayCell(d, m, c) {
  const other = monthKey(d) !== c.month;
  const future = d > c.today;
  const parts = [fmtDate(d, 'weekday')];
  if (d === c.today) parts.push(t('calendar.a11y.today'));
  // With the combined pill, patch or ring the bleeds are withdrawal bleeds, not periods.
  const bleed = c.flags.withdrawalBleeds;
  if (m.period === 'logged') parts.push(t(bleed ? 'calendar.a11y.bleed' : 'calendar.a11y.period'));
  if (m.period === 'estimated') parts.push(t('calendar.a11y.periodEstimated'));
  if (m.period === 'predicted') parts.push(t(bleed ? 'calendar.a11y.bleedPredicted' : 'calendar.a11y.periodPredicted'));
  if (m.spotting) parts.push(t('flow.spotting'));
  if (m.fertility) parts.push(t(`calendar.a11y.fertility.${m.fertility}`));
  if (m.ovulation) parts.push(t(`calendar.a11y.ovulation.${m.ovulation}`));
  if (m.pms) parts.push(t('calendar.a11y.pms'));
  if (m.hasData) parts.push(t('calendar.a11y.hasData'));
  const cls = [
    'cal__day',
    other ? 'is-other' : '',
    future ? 'is-future' : '',
    d === c.today ? 'is-today' : '',
    m.period ? `is-period-${m.period}` : '',
    m.spotting ? 'is-spotting' : '',
    m.fertility ? `is-fertile-${m.fertility}` : '',
    m.ovulation ? 'is-ovulation' : '',
    m.pms ? 'is-pms' : '',
  ];
  return h(
    'div',
    { role: 'gridcell', class: 'cal__cell' },
    h(
      'button',
      {
        type: 'button',
        class: cls,
        dataset: { date: d, fk: `day-${d}` },
        'aria-label': parts.join(', '),
        'aria-current': d === c.today ? 'date' : null,
        onClick: () => onDay(d, future),
      },
      h('span', { class: 'cal__num', text: fmtNumber(Number(d.slice(8))) }),
      m.ovulation ? h('span', { class: 'cal__ov', 'aria-hidden': 'true' }) : null,
      m.hasData ? h('span', { class: 'cal__dot', 'aria-hidden': 'true' }) : null,
    ),
  );
}

/** @param {string} d @param {boolean} future */
async function onDay(d, future) {
  focusDate = d;
  if (future) {
    toast(t('calendar.futureDay'));
    return;
  }
  if (editMode) {
    const entry = store.get().data?.days[d] ?? {};
    const bleeding = BLEEDING.has(entry.flow ?? '');
    try {
      await saveDay(d, { ...entry, flow: bleeding ? undefined : 'medium' });
    } catch (err) {
      console.error(err);
      toast(t('errors.save'), { type: 'error' });
    }
    return;
  }
  const { openDayLog } = await import('./daylog.js');
  openDayLog(d);
}

/**
 * @param {KeyboardEvent} e
 * @param {string} month
 * @param {import('./shell.js').ViewContext} ctx
 */
function onGridKey(e, month, ctx) {
  const target = /** @type {HTMLElement} */ (e.target);
  const date = target.dataset?.date;
  if (!date) return;
  /** @type {Record<string, number>} */
  const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  /** @type {string | null} */
  let next = null;
  if (e.key in deltas) next = addDays(date, deltas[e.key]);
  else if (e.key === 'PageUp') next = `${addMonths(month, -1)}-01`;
  else if (e.key === 'PageDown') next = `${addMonths(month, 1)}-01`;
  else if (e.key === 'Home') next = addDays(date, -Array.from(target.closest('.cal__row')?.querySelectorAll('.cal__day') ?? []).findIndex((x) => x === target));
  else if (e.key === 'End') {
    const cells = Array.from(target.closest('.cal__row')?.querySelectorAll('.cal__day') ?? []);
    next = addDays(date, cells.length - 1 - cells.findIndex((x) => x === target));
  }
  if (!next) return;
  e.preventDefault();
  focusDate = next;
  const grid = target.closest('.cal__grid');
  const cell = /** @type {HTMLElement | null} */ (grid?.querySelector(`[data-date="${next}"]`));
  if (cell) {
    grid?.querySelectorAll('.cal__day').forEach((c) => (/** @type {HTMLElement} */ (c).tabIndex = -1));
    cell.tabIndex = 0;
    cell.focus();
  } else {
    ctx.navigate(`calendar/${monthKey(next)}`, { replace: true });
    requestAnimationFrame(() => /** @type {HTMLElement | null} */ (document.querySelector(`[data-date="${next}"]`))?.focus());
  }
}

/** @param {any} flags */
function legend(flags) {
  const bleed = flags.withdrawalBleeds;
  const items = [['period-logged', bleed ? 'calendar.legend.bleed' : 'calendar.legend.period']];
  if (flags.predictions) items.push(['period-predicted', bleed ? 'calendar.legend.predictedBleed' : 'calendar.legend.predicted']);
  if (flags.fertility) items.push(['fertile', 'calendar.legend.fertile'], ['ovulation', 'calendar.legend.ovulation']);
  // There is no premenstrual phase without a natural cycle.
  if (flags.predictions && !bleed) items.push(['pms', 'calendar.legend.pms']);
  items.push(['data', 'calendar.legend.data']);
  return h(
    'ul',
    { class: 'legend', 'aria-label': t('calendar.legend.title') },
    items.map(([cls, key]) => h('li', { class: 'legend__item' }, h('span', { class: ['legend__swatch', `legend__swatch--${cls}`], 'aria-hidden': 'true' }), h('span', { text: t(key) }))),
  );
}

/** @param {NonNullable<import('../app.js').AppState['derived']>} d */
function history(d) {
  const cycles = d.analysis.cycles.slice().reverse().slice(0, 12);
  if (!cycles.length) return null;
  return card({
    title: t('calendar.history'),
    icon: 'history',
    children: [
      h(
        'ul',
        { class: 'cycle-list' },
        cycles.map((c) =>
          h(
            'li',
            { class: 'cycle-list__item' },
            h('a', { href: `#/calendar/${c.start.slice(0, 7)}`, class: 'cycle-list__date', text: fmtDate(c.start, 'medium') }),
            h(
              'span',
              { class: 'cycle-list__meta' },
              c.ongoing
                ? badge(t('calendar.current', { day: diffDays(c.start, d.today) + 1 }), 'accent')
                : h('span', { text: t('calendar.cycleLength', { count: /** @type {number} */ (c.length) }) }),
              c.periodLength ? h('span', { class: 'muted', text: ` · ${t('calendar.periodLength', { count: c.periodLength })}` }) : null,
              c.excluded ? h('span', { class: 'muted small', text: ` · ${t(`calendar.excluded.${c.excluded}`)}` }) : null,
              c.ovulation?.method === 'bbt' ? h('span', { class: 'cycle-list__ov', title: t('calendar.bbtConfirmed') }, icon('thermometer', { size: 14, label: t('calendar.bbtConfirmed') })) : null,
            ),
          ),
        ),
      ),
      h('a', { class: 'link', href: '#/analysis', text: t('calendar.seeAnalysis') }),
    ],
  });
}

export function cleanup() {
  editMode = false;
}
