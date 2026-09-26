// Statistics, charts and personal patterns.

import { h } from '../core/dom.js';
import { t, fmtDate, fmtNumber } from '../core/i18n.js';
import { addDays, rangeISO } from '../core/dates.js';
import { card, button, emptyState, badge, segmented } from '../ui/components.js';
import { barChart, lineChart, heatTable } from '../ui/charts.js';
import { computeInsights, frequencies } from '../domain/insights.js';
import { cToF, kgToLb } from '../domain/catalog.js';
import { icon } from '../ui/icons.js';

/** @type {{ version: number, value: ReturnType<typeof computeInsights> } | null} */
let insightsCache = null;
let bbtCycleIndex = -1;
let range = 90;

/** @param {import('./shell.js').ViewContext} ctx */
export function render(ctx) {
  const { derived, data, version } = ctx.state;
  if (!derived || !data) return h('div');
  const { analysis, settings, flags } = derived;
  const blocks = [];

  if (!analysis.hasData && !Object.keys(data.days).length) {
    return h('div', { class: 'view analysis' }, card({ children: emptyState({ title: t('analysis.emptyTitle'), text: t('analysis.emptyText'), action: button({ label: t('home.fullLog'), variant: 'primary', onClick: () => ctx.openLog() }) }) }));
  }

  if (!insightsCache || insightsCache.version !== version) insightsCache = { version, value: computeInsights(analysis, data.days) };
  const insights = insightsCache.value;
  const stats = analysis.stats;
  const young = (derived.age !== null && derived.age < 18) || (derived.age === null && settings.experience === 'new');

  // Summary tiles.
  const tiles = [
    tile('calendar', t('analysis.avgCycle'), stats.cycle ? t('common.days', { count: Math.round(stats.cycle.mean) }) : '—', stats.cycle ? t('analysis.range', { min: stats.cycle.min, max: stats.cycle.max }) : t('analysis.needTwo')),
    tile('droplet', t('analysis.avgPeriod'), stats.period ? t('common.days', { count: Math.round(stats.period.mean) }) : '—', stats.period ? t('analysis.basedOn', { count: stats.period.count }) : t('analysis.logWholePeriod')),
    tile('history', t('analysis.cyclesTracked'), fmtNumber(stats.validCycleCount), insights.regularity ? t(`analysis.regularity.${insights.regularity}`) : t('analysis.regularityUnknown')),
  ];
  if (flags.fertilityTracking) {
    const confirmed = analysis.cycles.filter((c) => c.ovulation?.method === 'bbt').length;
    tiles.push(tile('thermometer', t('analysis.lutealPhase'), t('common.days', { count: stats.lutealLength }), confirmed ? t('analysis.bbtConfirmedCount', { count: confirmed }) : t('analysis.lutealDefault')));
  }
  blocks.push(h('div', { class: 'tiles' }, tiles));

  // Cycle length chart.
  const recent = analysis.cycles.filter((c) => c.length !== null).slice(-12);
  if (recent.length) {
    const band = /** @type {[number, number]} */ (young ? [21, 45] : [24, 38]);
    blocks.push(
      card({
        children: barChart({
          title: t('analysis.cycleChart'),
          summary: t('analysis.cycleChartSummary', { count: recent.length, avg: stats.cycle ? Math.round(stats.cycle.mean) : '—', min: band[0], max: band[1] }),
          data: recent.map((c) => ({ label: fmtDate(c.start, 'short'), value: c.length, muted: Boolean(c.excluded) })),
          unit: t('common.daysShort'),
          valueHeader: t('analysis.lengthDays'),
          band,
          average: stats.cycle?.mean ?? null,
        }),
      }),
    );
    blocks.push(h('p', { class: 'muted small', text: t('analysis.bandNote', { min: band[0], max: band[1] }) }));
  }

  const periods = analysis.periods.filter((p) => p.lengthKnown).slice(-12);
  if (periods.length >= 2) {
    blocks.push(
      card({
        children: barChart({
          title: t('analysis.periodChart'),
          summary: t('analysis.periodChartSummary', { count: periods.length, avg: stats.period ? Math.round(stats.period.mean) : '—' }),
          data: periods.map((p) => ({ label: fmtDate(p.start, 'short'), value: p.length })),
          unit: t('common.daysShort'),
          valueHeader: t('analysis.lengthDays'),
          band: [2, 8],
          yMin: 0,
          average: stats.period?.mean ?? null,
        }),
      }),
    );
  }

  // Personal patterns.
  const patternItems = insights.patterns.map((p) =>
    h('li', { class: 'insight' }, icon(p.kind === 'mood' ? 'brain' : 'activity', { size: 18 }), h('span', { text: t('analysis.pattern', { item: t(`${p.kind === 'mood' ? 'moods' : 'symptoms'}.${p.id}`), phase: t(`phases.${p.phase}`).toLowerCase(), pct: Math.round(p.rate * 100) }) })),
  );
  if (insights.energy) {
    patternItems.push(h('li', { class: 'insight' }, icon('zap', { size: 18 }), h('span', { text: t('analysis.energy', { best: t(`phases.${insights.energy.best}`).toLowerCase(), worst: t(`phases.${insights.energy.worst}`).toLowerCase() }) })));
  }
  blocks.push(
    card({
      title: t('analysis.patterns'),
      icon: 'sparkles',
      children: patternItems.length ? [h('ul', { class: 'insights' }, patternItems), h('p', { class: 'muted small', text: t('analysis.patternsNote') })] : h('p', { class: 'muted', text: t('analysis.patternsEmpty') }),
    }),
  );

  if (insights.phaseTable && insights.phaseTable.rows.length && insights.phaseTable.phases.length >= 2) {
    blocks.push(
      card({
        title: t('analysis.phaseTable'),
        icon: 'chart',
        children: heatTable({
          caption: t('analysis.phaseTableCaption'),
          columns: insights.phaseTable.phases.map((p) => t(`phases.${p}`)),
          rows: insights.phaseTable.rows.map((r) => ({ label: t(`${r.kind === 'mood' ? 'moods' : 'symptoms'}.${r.id}`), values: r.rates })),
        }),
      }),
    );
  }

  // Frequencies in a time window.
  const from = addDays(derived.today, -range + 1);
  const freq = frequencies(data.days, from, derived.today);
  const top = [...freq.symptoms.map((x) => ({ ...x, kind: 'symptoms' })), ...freq.moods.map((x) => ({ ...x, kind: 'moods' }))].sort((a, b) => b.count - a.count).slice(0, 8);
  const maxCount = Math.max(1, ...top.map((x) => x.count));
  blocks.push(
    card({
      title: t('analysis.frequent'),
      icon: 'list-checks',
      children: [
        segmented({
          label: t('analysis.window'),
          hideLabel: true,
          options: [30, 90, 365].map((n) => ({ value: n, label: t('analysis.lastDays', { count: n }) })),
          value: range,
          onChange: (v) => {
            range = v;
            ctx.navigate('analysis', { replace: true });
          },
        }),
        top.length
          ? h(
              'ul',
              { class: 'hbars' },
              top.map((x) =>
                h(
                  'li',
                  { class: 'hbars__item' },
                  h('span', { class: 'hbars__label', text: t(`${x.kind}.${x.id}`) }),
                  h('span', { class: 'hbars__track', 'aria-hidden': 'true' }, h('span', { class: 'hbars__bar', style: { width: `${(x.count / maxCount) * 100}%` } })),
                  h('span', { class: 'hbars__value', text: t('analysis.timesDays', { count: x.count }) }),
                ),
              ),
            )
          : h('p', { class: 'muted', text: t('analysis.noLogsWindow') }),
        h('p', { class: 'muted small', text: t('analysis.loggedDays', { count: freq.loggedDays, total: range }) }),
      ],
    }),
  );

  // Basal temperature chart for a chosen cycle.
  const bbtCycles = analysis.cycles.filter((c) => Object.keys(data.days).some((d) => d >= c.start && (!c.end || d <= c.end) && typeof data.days[d].bbt === 'number'));
  if (flags.fertilityTracking && bbtCycles.length) {
    const idx = bbtCycleIndex < 0 || bbtCycleIndex >= bbtCycles.length ? bbtCycles.length - 1 : bbtCycleIndex;
    const cyc = bbtCycles[idx];
    const end = cyc.end ?? derived.today;
    const unitF = settings.temperatureUnit === 'F';
    const days = rangeISO(cyc.start, end);
    const points = days.map((d, i) => {
      const v = data.days[d]?.bbt;
      return { label: String(i + 1), value: typeof v === 'number' ? (unitF ? cToF(v) : v) : null, flag: Boolean(data.days[d]?.bbtDisturbed) };
    });
    const ovIndex = cyc.ovulation ? days.indexOf(cyc.ovulation.day) : -1;
    const coverline = cyc.ovulation?.coverline ? (unitF ? cToF(cyc.ovulation.coverline) : cyc.ovulation.coverline) : null;
    blocks.push(
      card({
        title: t('analysis.bbtChart'),
        icon: 'thermometer',
        action: bbtCycles.length > 1 ? h('select', { class: 'input input--select', 'aria-label': t('analysis.chooseCycle'), onChange: (/** @type {Event} */ e) => { bbtCycleIndex = Number(/** @type {HTMLSelectElement} */ (e.target).value); ctx.navigate('analysis', { replace: true }); } }, bbtCycles.map((c, i) => h('option', { value: i, selected: i === idx, text: fmtDate(c.start, 'medium') }))) : null,
        children: [
          lineChart({
            title: t('analysis.bbtCycle', { date: fmtDate(cyc.start, 'long') }),
            summary: cyc.ovulation?.method === 'bbt' ? t('analysis.bbtSummaryConfirmed', { day: ovIndex + 1 }) : t('analysis.bbtSummaryNone'),
            points,
            unit: unitF ? '°F' : '°C',
            decimals: 2,
            reference: coverline,
            markers: ovIndex >= 0 ? [{ index: ovIndex, label: t('calendar.legend.ovulation') }] : [],
          }),
          cyc.ovulation?.method === 'bbt' ? badge(t('analysis.ovulationConfirmed', { date: fmtDate(cyc.ovulation.day, 'short') }), 'good') : h('p', { class: 'muted small', text: t('analysis.bbtHowTo') }),
        ],
      }),
    );
  }

  // Weight trend.
  const weightDays = Object.keys(data.days).filter((d) => typeof data.days[d].weight === 'number' && d >= addDays(derived.today, -180)).sort();
  if (weightDays.length >= 3) {
    const lb = settings.weightUnit === 'lb';
    blocks.push(
      card({
        children: lineChart({
          title: t('analysis.weightChart'),
          summary: t('analysis.weightSummary', { count: weightDays.length }),
          points: weightDays.map((d) => ({ label: fmtDate(d, 'short'), value: lb ? kgToLb(data.days[d].weight) : data.days[d].weight })),
          unit: lb ? 'lb' : 'kg',
          decimals: 1,
        }),
      }),
    );
  }

  blocks.push(
    card({
      title: t('analysis.share'),
      icon: 'file-text',
      children: [
        h('p', { class: 'muted', text: t('analysis.shareText') }),
        h('div', { class: 'btn-row' }, button({ label: t('analysis.report'), icon: 'file-down', variant: 'primary', onClick: () => ctx.navigate('report') }), ctx.state.server.share ? button({ label: t('analysis.shareLink'), icon: 'share-2', variant: 'soft', onClick: () => ctx.navigate('settings/share') }) : null),
      ],
    }),
  );

  return h('div', { class: 'view analysis' }, blocks);
}

/**
 * @param {string} ic
 * @param {string} label
 * @param {string} value
 * @param {string} sub
 */
function tile(ic, label, value, sub) {
  return h('div', { class: 'tile' }, h('span', { class: 'tile__icon' }, icon(ic, { size: 18 })), h('span', { class: 'tile__label', text: label }), h('span', { class: 'tile__value', text: value }), h('span', { class: 'tile__sub', text: sub }));
}
