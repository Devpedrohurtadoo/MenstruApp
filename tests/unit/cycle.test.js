import { describe, it, expect } from 'vitest';
import { analyze, detectPeriods, predictLength, detectBbtShift, calendarMarks, phaseOn, fertilityLevel, withoutMissedPeriods } from '../../public/js/domain/cycle.js';
import { pregnancyExclusions } from '../../public/js/domain/pregnancy.js';
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

  it('does not end a period because another log (symptoms, pill) has no flow', () => {
    for (const other of [{ symptoms: { cramps: 2 } }, { contraceptionTaken: true }]) {
      const days = { '2024-03-01': { flow: 'medium' }, '2024-03-02': other };
      const a = analyze(days, { today: '2024-03-02', settings: {} });
      expect(a.periods[0]).toMatchObject({ lengthKnown: false, estimatedEnd: '2024-03-05' });
      expect(a.current?.inPeriod).toBe(true);
    }
    // Once bleeding has stopped for a few days the length is known anyway.
    const days = { ...withPeriods(['2024-03-01'], 2), '2024-03-03': { symptoms: { cramps: 1 } }, '2024-03-04': { moods: ['calm'] } };
    expect(detectPeriods(days, { today: '2024-03-10' }).periods[0]).toMatchObject({ lengthKnown: true, length: 2 });
  });

  it('ignores bleeding logged after today', () => {
    const days = regular('2024-01-01', 28, 4);
    const withFuture = { ...days, '2024-04-10': { flow: 'medium' } };
    const a = analyze(withFuture, { today: '2024-04-09', settings: {} });
    expect(a.periods.at(-1)?.start).toBe('2024-03-25');
    expect(a.current).toEqual(analyze(days, { today: '2024-04-09', settings: {} }).current);
    expect(a.prediction?.nextPeriodStart).toBe('2024-04-22');
  });

  it('bridges up to 3 unlogged days inside a period, but not days logged without flow', () => {
    const days = { '2024-01-01': { flow: 'medium' }, '2024-01-02': { flow: 'medium' }, '2024-01-06': { flow: 'light' }, '2024-01-07': { flow: 'light' } };
    const bridged = detectPeriods(days, { today: '2024-02-01' });
    expect(bridged.periods).toHaveLength(1);
    expect(bridged.periods[0]).toMatchObject({ start: '2024-01-01', end: '2024-01-07', length: 7 });
    expect(bridged.intermenstrual).toEqual([]);
    const stopped = detectPeriods({ ...days, '2024-01-04': { flow: 'none' } }, { today: '2024-02-01' });
    expect(stopped.periods[0].end).toBe('2024-01-02');
    expect(stopped.intermenstrual).toEqual([{ start: '2024-01-06', end: '2024-01-07' }]);
  });

  it('does not let a lone light day turn the next real period into intermenstrual bleeding', () => {
    const days = { ...withPeriods(['2024-01-01', '2024-02-18']), '2024-02-08': { flow: 'light' } };
    const a = analyze(days, { today: '2024-03-01', settings: {} });
    expect(a.periods.map((p) => p.start)).toEqual(['2024-01-01', '2024-02-18']);
    expect(a.intermenstrual).toEqual([{ start: '2024-02-08', end: '2024-02-08' }]);
    expect(a.cycles[0].length).toBe(48);
  });

  it('knows the length of bleeding longer than 15 days (so it can be flagged)', () => {
    const days = { ...withPeriods(['2024-01-01'], 20), ...withPeriods(['2024-02-01', '2024-03-01'], 5) };
    const a = analyze(days, { today: '2024-03-20', settings: {} });
    expect(a.periods[0]).toMatchObject({ lengthKnown: true, length: 20 });
    expect(a.stats.period?.max).toBe(20);
    // …without making the predicted periods 20 days long.
    expect(a.prediction?.periodLength).toBe(5);
  });
});

describe('pregnancies and the bleeding after them', () => {
  it('keeps the period that started a pregnancy (its LMP) and the cycle before it', () => {
    const days = regular('2024-01-01', 28, 3);
    const a = analyze(days, { today: '2024-05-01', settings: { mode: 'pregnant' }, excludeRanges: [['2024-02-26', '2024-05-01']] });
    expect(a.periods.map((p) => p.start)).toEqual(['2024-01-01', '2024-01-29', '2024-02-26']);
    expect(a.cycles[1]).toMatchObject({ length: 28, excluded: null });
    expect(a.cycles[2].excluded).toBe('pregnancy');
    expect(a.stats.validCycleCount).toBe(2);
    // Bleeding during the pregnancy is not a period.
    const bled = analyze({ ...days, '2024-04-02': { flow: 'light' }, '2024-04-03': { flow: 'light' } }, { today: '2024-05-01', settings: { mode: 'pregnant' }, excludeRanges: [['2024-02-26', '2024-05-01']] });
    expect(bled.periods).toHaveLength(3);
  });

  it('predicts nothing during a pregnancy', () => {
    const a = analyze(regular('2024-01-01', 28, 3), { today: '2024-05-01', settings: { mode: 'pregnant' }, excludeRanges: [['2024-02-26', '2024-05-01']] });
    expect(a.prediction).toBeNull();
    expect(a.current).toMatchObject({ late: false, phase: null });
  });

  it('does not take lochia after a birth for a period', () => {
    const preg = { history: [{ from: '2024-02-26', to: '2024-12-01' }], endedOn: '2024-12-01', outcome: 'birth' };
    const ranges = pregnancyExclusions(preg, null, { postpartum: { birthDate: '2024-12-01' } }, '2025-01-20');
    expect(ranges.excludeRanges).toEqual([['2024-02-26', '2024-12-01']]);
    expect(ranges.nonMenstrual).toContainEqual(['2024-12-01', '2025-01-12']);
    const lochia = Object.fromEntries(rangeISO('2024-12-01', '2024-12-28').map((d) => [d, { flow: d < '2024-12-10' ? 'heavy' : 'light' }]));
    const days = { ...regular('2024-01-01', 28, 3), ...lochia };
    const without = analyze(days, { today: '2025-01-20', settings: {}, excludeRanges: ranges.excludeRanges });
    expect(without.periods.map((p) => p.start)).toContain('2024-12-02');
    const a = analyze(days, { today: '2025-01-20', settings: {}, ...ranges });
    expect(a.periods.map((p) => p.start)).toEqual(['2024-01-01', '2024-01-29', '2024-02-26']);
  });

  it('builds the ranges of an active pregnancy and of past ones', () => {
    const past = { history: [{ from: '2023-01-10', to: '2023-03-01' }], endedOn: '2023-03-01', outcome: 'loss' };
    expect(pregnancyExclusions(past, { lmp: '2024-02-01' }, {}, '2024-04-01')).toEqual({
      excludeRanges: [['2023-01-10', '2023-03-01'], ['2024-02-01', '2024-04-01']],
      nonMenstrual: [['2023-03-01', '2023-03-15']],
    });
    // An impossible LMP in the future is ignored.
    expect(pregnancyExclusions(null, { lmp: '2024-05-01' }, null, '2024-04-01')).toEqual({ excludeRanges: [], nonMenstrual: [] });
  });
});

describe('ovulation from LH tests', () => {
  it('ignores a stray positive during the period or far from the next period', () => {
    const days = { ...regular('2024-01-01', 28, 3), '2024-01-03': { flow: 'medium', lh: 'positive' } };
    expect(analyze(days, { today: '2024-03-01', settings: {} }).cycles[0].ovulation).toBeNull();
    // Ongoing cycle: a positive on cycle day 3 must not move the ovulation to day 4.
    const ongoing = regular('2024-01-01', 28, 5);
    ongoing['2024-04-24'] = { flow: 'medium', lh: 'positive' };
    const a = analyze(ongoing, { today: '2024-05-01', settings: {} });
    expect(a.prediction).toMatchObject({ ovulationDay: '2024-05-06', ovulationMethod: 'estimate' });
  });

  it('uses the last positive of the surge', () => {
    const days = { ...regular('2024-01-01', 28, 2), '2024-01-12': { lh: 'positive' }, '2024-01-13': { lh: 'positive' }, '2024-01-14': { lh: 'positive' } };
    expect(analyze(days, { today: '2024-02-05', settings: {} }).cycles[0].ovulation).toEqual({ day: '2024-01-15', method: 'lh' });
    const peak = { ...days, '2024-01-13': { lh: 'peak' } };
    expect(analyze(peak, { today: '2024-02-05', settings: {} }).cycles[0].ovulation).toEqual({ day: '2024-01-14', method: 'lh' });
  });

  it('marks an LH-predicted ovulation as such, not as confirmed', () => {
    const days = { ...regular('2024-01-01', 28, 5), '2024-05-05': { lh: 'positive' } };
    const a = analyze(days, { today: '2024-05-05', settings: {} });
    expect(a.prediction).toMatchObject({ ovulationDay: '2024-05-06', ovulationMethod: 'lh' });
    expect(calendarMarks(a, days, ['2024-05-06'])['2024-05-06'].ovulation).toBe('lh');
  });
});

describe('a detected ovulation moves the next period', () => {
  it('pushes the expected period to one luteal phase after a late ovulation', () => {
    const days = regular('2024-01-01', 28, 5);
    rangeISO('2024-04-28', '2024-05-10').forEach((d) => (days[d] = { ...(days[d] ?? {}), bbt: 36.3 }));
    ['2024-05-11', '2024-05-12', '2024-05-13'].forEach((d) => (days[d] = { bbt: 36.75 }));
    const a = analyze(days, { today: '2024-05-15', settings: {} });
    expect(a.current?.ovulation).toMatchObject({ day: '2024-05-10', method: 'bbt' });
    expect(a.prediction?.nextPeriodStart).toBe('2024-05-24');
    expect(a.current?.late).toBe(false);
    // Without the temperatures the usual 28 days apply.
    expect(analyze(regular('2024-01-01', 28, 5), { today: '2024-05-15', settings: {} }).prediction?.nextPeriodStart).toBe('2024-05-20');
  });
});

describe('cycle length prediction', () => {
  it('falls back to the stated or default average without history, with a wide margin', () => {
    expect(predictLength([], null)).toMatchObject({ length: 28, basis: 'default', margin: 7 });
    expect(predictLength([], 32)).toMatchObject({ length: 32, basis: 'settings', margin: 5 });
  });

  it('reflects the observed spread when there are only one or two cycles', () => {
    const two = predictLength([45, 22], null);
    expect(two.basis).toBe('mixed');
    expect(two.margin).toBeGreaterThanOrEqual(7);
    expect(predictLength([28, 29], 28).margin).toBeLessThanOrEqual(4);
    expect(predictLength([34], 28).margin).toBeGreaterThan(3);
  });

  it('ignores a cycle that is about twice the others (a period that was not logged)', () => {
    expect(withoutMissedPeriods([28, 56, 28])).toEqual([28, 28]);
    expect(withoutMissedPeriods([30, 29, 87])).toEqual([30, 29]);
    // Irregular cycles: nothing can be told apart, keep them all.
    expect(withoutMissedPeriods([24, 56, 35])).toEqual([24, 56, 35]);
    expect(predictLength([28, 56, 28], null)).toMatchObject({ length: 28 });
    expect(predictLength([28, 56, 28], null).margin).toBeLessThanOrEqual(3);
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

  it('is not over-confident with little or messy data', () => {
    // Only the stated average (28 by default in onboarding): low confidence, wide margin.
    const none = analyze(withPeriods(['2024-03-01']), { today: '2024-03-10', settings: { cycleLength: 28 } });
    expect(none.prediction).toMatchObject({ confidence: 'low', margin: 5, cycleLength: 28 });
    // Two very different cycles (45 and 22 days).
    const two = analyze(withPeriods(['2024-01-01', '2024-02-15', '2024-03-08']), { today: '2024-03-20', settings: {} });
    expect(two.prediction?.confidence).toBe('low');
    expect(two.prediction?.margin).toBeGreaterThanOrEqual(7);
    // 28, 56 (a period not logged), 28.
    const missed = analyze(withPeriods(['2024-01-01', '2024-01-29', '2024-03-25', '2024-04-22']), { today: '2024-05-01', settings: {} });
    expect(missed.prediction).toMatchObject({ cycleLength: 28, nextPeriodStart: '2024-05-20' });
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
