import { describe, it, expect } from 'vitest';
import { analyze, detectPeriods, predictLength, detectBbtShift, calendarMarks, phaseOn, fertilityLevel } from '../../public/js/domain/cycle.js';
import { addDays, rangeISO } from '../../public/js/core/dates.js';

/** Builds day entries with periods starting on the given dates. */
function withPeriods(starts, length = 5, flow = 'medium') {
  /** @type {Record<string, any>} */
  const days = {};
  for (const s of starts) for (let i = 0; i < length; i++) days[addDays(s, i)] = { flow };
  return days;
}

/** Periods every `len` days, `count` times, starting at `first`. */
function regular(first, len, count, periodLength = 5) {
  return withPeriods(
    Array.from({ length: count }, (_, i) => addDays(first, i * len)),
    periodLength,
  );
}

describe('period detection', () => {
  it('groups bleeding days, bridging short gaps', () => {
    const days = { '2024-01-01': { flow: 'heavy' }, '2024-01-02': { flow: 'medium' }, '2024-01-04': { flow: 'light' } };
    const { periods } = detectPeriods(days, { today: '2024-02-01' });
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({ start: '2024-01-01', end: '2024-01-04', lengthKnown: true, length: 4 });
  });

  it('never starts a period with spotting alone', () => {
    const days = { '2024-01-10': { flow: 'spotting' }, '2024-01-11': { flow: 'spotting' } };
    expect(detectPeriods(days, { today: '2024-02-01' }).periods).toHaveLength(0);
  });

  it('treats bleeding less than 15 days after a period start as intermenstrual', () => {
    const days = { ...withPeriods(['2024-01-01'], 5), '2024-01-12': { flow: 'light' } };
    const { periods, intermenstrual } = detectPeriods(days, { today: '2024-02-01' });
    expect(periods).toHaveLength(1);
    expect(intermenstrual).toEqual([{ start: '2024-01-12', end: '2024-01-12' }]);
  });

  it('marks single-day periods as unknown length unless an end was logged', () => {
    const lone = detectPeriods({ '2024-01-01': { flow: 'medium' } }, { today: '2024-02-01', periodLengthHint: 5 });
    expect(lone.periods[0]).toMatchObject({ lengthKnown: false, length: null, estimatedEnd: '2024-01-05' });
    const ended = detectPeriods({ '2024-01-01': { flow: 'medium' }, '2024-01-02': { flow: 'none' } }, { today: '2024-02-01' });
    expect(ended.periods[0]).toMatchObject({ lengthKnown: true, length: 1 });
  });

  it('does not decide the length of an ongoing period', () => {
    const { periods } = detectPeriods(withPeriods(['2024-01-30'], 2), { today: '2024-02-01' });
    expect(periods[0].lengthKnown).toBe(false);
  });
});

describe('cycle length prediction', () => {
  it('falls back to the stated or default average without history', () => {
    expect(predictLength([], null)).toMatchObject({ length: 28, basis: 'default', margin: 4 });
    expect(predictLength([], 32)).toMatchObject({ length: 32, basis: 'settings', margin: 3 });
  });

  it('blends little history with the prior', () => {
    expect(predictLength([34], 28)).toMatchObject({ length: 30, basis: 'mixed' });
  });

  it('weights recent cycles more and ignores outliers', () => {
    const p = predictLength([28, 28, 29, 60, 30, 30], null);
    expect(p.basis).toBe('history');
    expect(p.length).toBe(29);
    expect(p.margin).toBeLessThanOrEqual(2);
  });
});

describe('full analysis', () => {
  it('predicts a regular 28-day cycle precisely', () => {
    const days = regular('2024-01-01', 28, 5);
    const a = analyze(days, { today: '2024-05-01', settings: { mode: 'track' } });
    expect(a.stats.cycle).toMatchObject({ count: 4, mean: 28, sd: 0 });
    expect(a.stats.period?.median).toBe(5);
    expect(a.current).toMatchObject({ start: '2024-04-22', cycleDay: 10, late: false, stale: false });
    expect(a.prediction).toMatchObject({
      nextPeriodStart: '2024-05-20',
      ovulationDay: '2024-05-06',
      fertileStart: '2024-05-01',
      fertileEnd: '2024-05-07',
      confidence: 'high',
      daysUntilPeriod: 19,
    });
    expect(a.current?.phase).toBe('follicular');
  });

  it('reports lateness, then pauses predictions when very late', () => {
    // Last period 2024-03-25 → expected 2024-04-22.
    const days = regular('2024-01-01', 28, 4);
    const onTime = analyze(days, { today: '2024-04-22', settings: {} });
    expect(onTime.current).toMatchObject({ late: false, lateDays: 0 });
    const late3 = analyze(days, { today: '2024-04-25', settings: {} });
    expect(late3.current).toMatchObject({ late: true, lateDays: 3 });
    expect(late3.prediction?.nextPeriodStart).toBe('2024-04-25');
    const late20 = analyze(days, { today: '2024-05-12', settings: {} });
    expect(late20.current?.lateDays).toBe(20);
    expect(late20.prediction).toBeNull();
  });

  it('flags stale data instead of absurd lateness', () => {
    const a = analyze(regular('2023-01-01', 28, 3), { today: '2024-01-01', settings: {} });
    expect(a.current?.stale).toBe(true);
    expect(a.prediction).toBeNull();
  });

  it('excludes cycles longer than 90 days (missed logging) from statistics', () => {
    const days = withPeriods(['2024-01-01', '2024-01-29', '2024-06-01', '2024-06-29']);
    const a = analyze(days, { today: '2024-07-05', settings: {} });
    expect(a.cycles[1].excluded).toBe('gap');
    expect(a.stats.cycle?.count).toBe(2);
  });

  it('excludes cycles overlapping a pregnancy', () => {
    const days = withPeriods(['2023-01-01', '2023-01-29', '2024-02-01', '2024-03-01']);
    const a = analyze(days, { today: '2024-03-10', settings: {}, excludeRanges: [['2023-02-10', '2023-11-01']] });
    expect(a.cycles[1].excluded).toBe('pregnancy');
  });

  it('confirms ovulation with the basal temperature shift and learns the luteal phase', () => {
    const days = regular('2024-01-01', 30, 4);
    // Cycle starting 2024-01-31: low temps, then a clear shift on 2024-02-16.
    rangeISO('2024-02-05', '2024-02-15').forEach((d) => (days[d] = { ...(days[d] ?? {}), bbt: 36.3 }));
    ['2024-02-16', '2024-02-17', '2024-02-18', '2024-02-19'].forEach((d) => (days[d] = { bbt: 36.75 }));
    const cyc = analyze(days, { today: '2024-04-05', settings: {} }).cycles[1];
    expect(cyc.ovulation).toMatchObject({ day: '2024-02-15', method: 'bbt' });
    expect(cyc.lutealLength).toBe(15);
  });

  it('uses a positive LH test when there is no temperature data', () => {
    const days = { ...regular('2024-01-01', 28, 2), '2024-01-13': { lh: 'positive' } };
    const a = analyze(days, { today: '2024-02-05', settings: {} });
    expect(a.cycles[0].ovulation).toEqual({ day: '2024-01-14', method: 'lh' });
  });

  it('reports low confidence in perimenopause mode', () => {
    const a = analyze(regular('2024-01-01', 28, 5), { today: '2024-05-01', settings: { mode: 'perimenopause' } });
    expect(a.prediction?.confidence).toBe('low');
  });
});

describe('bbt shift', () => {
  it('requires the third high temperature to clear the coverline by 0.2 °C', () => {
    const low = Array.from({ length: 6 }, (_, i) => ({ date: addDays('2024-01-01', i), bbt: 36.4 }));
    const weak = [...low, { date: '2024-01-07', bbt: 36.5 }, { date: '2024-01-08', bbt: 36.5 }, { date: '2024-01-09', bbt: 36.5 }];
    expect(detectBbtShift(weak)).toBeNull();
    const strong = [...low, { date: '2024-01-07', bbt: 36.5 }, { date: '2024-01-08', bbt: 36.55 }, { date: '2024-01-09', bbt: 36.6 }];
    expect(detectBbtShift(strong)).toMatchObject({ day: '2024-01-06', coverline: 36.4 });
  });
});

describe('phases, fertility and calendar marks', () => {
  it('computes phases inside a cycle', () => {
    const c = { start: '2024-01-01', periodEnd: '2024-01-05', ovulationDay: '2024-01-15', nextStart: '2024-01-29' };
    expect(phaseOn('2024-01-03', c)).toBe('menstrual');
    expect(phaseOn('2024-01-10', c)).toBe('follicular');
    expect(phaseOn('2024-01-14', c)).toBe('ovulatory');
    expect(phaseOn('2024-01-20', c)).toBe('luteal');
    expect(phaseOn('2024-01-29', c)).toBeNull();
  });

  it('grades fertility around ovulation', () => {
    expect(fertilityLevel(-5)).toBe('medium');
    expect(fertilityLevel(-1)).toBe('high');
    expect(fertilityLevel(1)).toBe('low');
    expect(fertilityLevel(2)).toBeNull();
  });

  it('marks logged, predicted and fertile days', () => {
    const days = regular('2024-01-01', 28, 5);
    const a = analyze(days, { today: '2024-05-01', settings: {} });
    const marks = calendarMarks(a, days, rangeISO('2024-04-20', '2024-06-20'));
    expect(marks['2024-04-22'].period).toBe('logged');
    expect(marks['2024-05-20'].period).toBe('predicted');
    expect(marks['2024-05-24'].period).toBe('predicted');
    expect(marks['2024-05-25'].period).toBeNull();
    expect(marks['2024-05-05'].fertility).toBe('high');
    expect(marks['2024-05-06'].ovulation).toBe('estimated');
    expect(marks['2024-05-17'].pms).toBe(true);
    expect(marks['2024-06-17'].period).toBe('predicted');
    const noFertility = calendarMarks(a, days, ['2024-05-05'], { showFertility: false });
    expect(noFertility['2024-05-05'].fertility).toBeNull();
  });
});
