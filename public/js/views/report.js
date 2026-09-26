// Report for a medical appointment: generated on the device as a PDF (no server involved).

import { h, downloadBlob } from '../core/dom.js';
import { t, fmtDate, fmtNumber } from '../core/i18n.js';
import { addDays, todayISO, rangeISO, diffDays } from '../core/dates.js';
import { card, button, segmented, toggle, notice } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { PdfDoc } from '../lib/pdf.js';
import { frequencies } from '../domain/insights.js';
import { BLEEDING } from '../domain/catalog.js';
import { recordEvent, store } from '../app.js';

const opts = { months: 6, notes: false, name: true };

export function title() {
  return t('report.title');
}

/** @param {import('./shell.js').ViewContext} ctx */
export function render(ctx) {
  const rerender = () => ctx.navigate('report', { replace: true });
  return h(
    'div',
    { class: 'view report' },
    card({
      children: [
        h('p', { class: 'lead', text: t('report.intro') }),
        segmented({
          label: t('report.period'),
          options: [3, 6, 12, 0].map((m) => ({ value: m, label: m ? t('report.months', { count: m }) : t('report.all') })),
          value: opts.months,
          onChange: (v) => {
            opts.months = v;
            rerender();
          },
        }),
        toggle({ label: t('report.includeName'), checked: opts.name, onChange: (v) => (opts.name = v) }),
        toggle({ label: t('report.includeNotes'), description: t('report.includeNotesDesc'), checked: opts.notes, onChange: (v) => (opts.notes = v) }),
        h(
          'div',
          { class: 'btn-row' },
          button({ label: t('report.download'), icon: 'file-down', variant: 'primary', onClick: () => exportPdf(false) }),
          'share' in navigator ? button({ label: t('report.share'), icon: 'share-2', variant: 'soft', onClick: () => exportPdf(true) }) : null,
        ),
        notice({ level: 'info', title: t('report.privacyTitle'), text: t('report.privacyText') }),
      ],
    }),
  );
}

/** @param {boolean} share */
async function exportPdf(share) {
  const { data, derived } = store.get();
  if (!data || !derived) return;
  const blob = buildReport(data, derived, opts);
  const filename = `menstruapp-informe-${todayISO()}.pdf`;
  try {
    if (share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
      await navigator.share({ files: [new File([blob], filename, { type: 'application/pdf' })], title: t('report.title') });
    } else {
      downloadBlob(blob, filename);
    }
    await recordEvent('reportExported');
    toast(t('report.done'), { type: 'success' });
  } catch (err) {
    if (/** @type {any} */ (err)?.name !== 'AbortError') toast(t('errors.generic'), { type: 'error' });
  }
}

/**
 * @param {import('../app.js').Data} data
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {{ months: number, notes: boolean, name: boolean }} o
 */
export function buildReport(data, d, o) {
  const today = d.today;
  const allDates = Object.keys(data.days).sort();
  const from = o.months ? addDays(today, -Math.round(o.months * 30.44)) : allDates[0] ?? today;
  const pdf = new PdfDoc({ title: t('report.title') });
  pdf.footer = `${t('report.footer')} · ${fmtDate(today, 'long')}`;

  pdf.text('Menstruapp', { size: 10, color: '#8a3b6b', bold: true });
  pdf.text(t('report.title'), { size: 20, bold: true, gap: 4 });
  const who = o.name && d.profile.name ? `${d.profile.name}${d.age ? ` · ${t('report.age', { count: d.age })}` : ''}` : d.age ? t('report.age', { count: d.age }) : '';
  if (who) pdf.text(who, { size: 11 });
  pdf.text(t('report.range', { from: fmtDate(from, 'long'), to: fmtDate(today, 'long') }), { size: 10, color: '#6d5e7a' });
  pdf.text(t('report.mode', { mode: t(`modes.${d.settings.mode}.title`) }), { size: 10, color: '#6d5e7a', gap: 8 });

  const a = d.analysis;
  pdf.heading(t('report.summary'));
  const cs = a.stats.cycle;
  const ps = a.stats.period;
  pdf.table(
    [t('report.metric'), t('report.value')],
    [
      [t('analysis.avgCycle'), cs ? t('report.meanRange', { mean: fmtNumber(cs.mean), min: cs.min, max: cs.max, sd: fmtNumber(cs.sd) }) : '—'],
      [t('analysis.avgPeriod'), ps ? t('report.meanRange', { mean: fmtNumber(ps.mean), min: ps.min, max: ps.max, sd: fmtNumber(ps.sd) }) : '—'],
      [t('analysis.cyclesTracked'), String(a.stats.validCycleCount)],
      [t('report.lastPeriod'), a.periods.at(-1) ? fmtDate(/** @type {any} */ (a.periods.at(-1)).start, 'long') : '—'],
      [t('report.nextPeriod'), a.prediction ? t('report.predicted', { date: fmtDate(a.prediction.nextPeriodStart, 'long'), margin: a.prediction.margin }) : '—'],
      [t('analysis.lutealPhase'), t('common.days', { count: a.stats.lutealLength })],
    ],
    [0.45, 0.55],
  );

  const cycles = a.cycles.filter((c) => c.start >= from);
  if (cycles.length) {
    pdf.heading(t('report.cycles'));
    pdf.table(
      [t('report.start'), t('report.cycleLength'), t('report.periodLength'), t('report.heavyDays'), t('report.ovulation')],
      cycles.map((c) => {
        const end = c.end ?? today;
        const heavy = rangeISO(c.start, end).filter((x) => data.days[x]?.flow === 'heavy').length;
        return [
          fmtDate(c.start, 'medium'),
          c.length ? t('common.days', { count: c.length }) + (c.excluded ? ` (${t(`calendar.excluded.${c.excluded}`)})` : '') : t('report.ongoing'),
          c.periodLength ? t('common.days', { count: c.periodLength }) : '—',
          String(heavy),
          c.ovulation ? `${fmtDate(c.ovulation.day, 'short')} (${t(`report.ovMethod.${c.ovulation.method}`)})` : '—',
        ];
      }),
      [0.24, 0.2, 0.18, 0.14, 0.24],
    );
  }

  const freq = frequencies(data.days, from, today);
  if (freq.symptoms.length) {
    pdf.heading(t('report.symptoms'));
    pdf.text(t('report.symptomsNote', { count: freq.loggedDays }), { size: 9.5, color: '#6d5e7a', gap: 6 });
    const max = Math.max(...freq.symptoms.map((s) => s.count));
    pdf.bars(freq.symptoms.slice(0, 12).map((s) => ({ label: t(`symptoms.${s.id}`), value: t('analysis.timesDays', { count: s.count }), fraction: s.count / max })));
  }
  if (freq.moods.length) {
    pdf.heading(t('report.moods'));
    const max = Math.max(...freq.moods.map((s) => s.count));
    pdf.bars(freq.moods.slice(0, 8).map((s) => ({ label: t(`moods.${s.id}`), value: t('analysis.timesDays', { count: s.count }), fraction: s.count / max })), '#9b7be8');
  }

  const inRange = Object.keys(data.days).filter((x) => x >= from && x <= today);
  const bleedingDays = inRange.filter((x) => BLEEDING.has(data.days[x].flow));
  const clots = inRange.filter((x) => data.days[x].clots === 'large').length;
  const meds = new Map();
  for (const x of inRange) for (const m of data.days[x].meds ?? []) meds.set(m.name.toLowerCase(), (meds.get(m.name.toLowerCase()) ?? 0) + 1);
  pdf.heading(t('report.bleeding'));
  pdf.text(t('report.bleedingText', { days: bleedingDays.length, heavy: inRange.filter((x) => data.days[x].flow === 'heavy').length, clots }), { gap: 6 });
  if (a.intermenstrual.length) pdf.text(t('report.intermenstrual', { count: a.intermenstrual.filter((r) => r.start >= from).length }), { gap: 6 });
  if (meds.size) {
    pdf.heading(t('report.meds'));
    pdf.table([t('report.medName'), t('report.medDays')], Array.from(meds.entries()).sort((x, y) => y[1] - x[1]).slice(0, 15).map(([name, count]) => [name, String(count)]), [0.7, 0.3]);
  }
  if (d.settings.contraception?.method && d.settings.contraception.method !== 'none') {
    pdf.text(t('report.contraception', { method: t(`contraception.${d.settings.contraception.method}`) }), { gap: 6 });
  }

  if (d.notices.length) {
    pdf.heading(t('report.flags'));
    for (const n of d.notices.filter((x) => x.level !== 'info' || x.id === 'irregular' || x.id === 'heavyFlow')) {
      pdf.text(`• ${t(`notices.${n.id}.title`, n.params)}`, { gap: 2 });
    }
    pdf.text(t('report.flagsNote'), { size: 9, color: '#6d5e7a', gap: 6 });
  }

  if (o.notes) {
    const notes = inRange.filter((x) => data.days[x].notes).sort();
    if (notes.length) {
      pdf.heading(t('report.notes'));
      for (const x of notes.slice(-60)) {
        pdf.text(fmtDate(x, 'medium'), { size: 9.5, bold: true, gap: 0 });
        pdf.text(data.days[x].notes, { size: 9.5, gap: 6 });
      }
    }
  }

  pdf.heading(t('report.questions'));
  pdf.text(t('report.questionsText'), { size: 9.5, color: '#6d5e7a', gap: 4 });
  for (let i = 0; i < 4; i++) {
    pdf.space(18);
    pdf.rule('#d9cce2');
  }
  pdf.space(6);
  pdf.text(t('report.disclaimer'), { size: 8.5, color: '#8a7c96' });
  return pdf.toBlob();
}

/** @param {string} a @param {string} b */
export const daysBetween = (a, b) => diffDays(a, b);
