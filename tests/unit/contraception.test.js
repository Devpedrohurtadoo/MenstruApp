import { describe, it, expect } from 'vitest';
import { analyze, calendarMarks } from '../../public/js/domain/cycle.js';
import { computeNotices } from '../../public/js/domain/insights.js';
import { modeFlags, hormonalContraception, visibleFeatures } from '../../public/js/domain/modes.js';
import { upcomingOccurrences } from '../../public/js/domain/reminders.js';
import { addDays, localTimestamp, rangeISO } from '../../public/js/core/dates.js';

/** Bleeds of `length` days every `every` days, `count` times. */
function bleeds(first, every, count, length = 4) {
  /** @type {Record<string, any>} */
  const days = {};
  for (let c = 0; c < count; c++) for (let i = 0; i < length; i++) days[addDays(first, c * every + i)] = { flow: 'light' };
  return days;
}

const settings = (/** @type {string} */ method, extra = {}) => ({ mode: 'track', contraception: { method, ...extra } });
const ctx = { mode: 'track', age: 30, experience: 'experienced' };

describe('hormonal contraception', () => {
  it('recognises hormonal methods and whether they have a scheduled bleed', () => {
    expect(hormonalContraception(settings('pill_combined', { pillRegimen: '21_7' }))).toEqual({ method: 'pill_combined', scheduledBleeds: true });
    expect(hormonalContraception(settings('patch'))?.scheduledBleeds).toBe(true);
    expect(hormonalContraception(settings('ring'))?.scheduledBleeds).toBe(true);
    for (const method of ['pill_progestin', 'injection', 'implant', 'iud_hormonal']) {
      expect(hormonalContraception(settings(method))?.scheduledBleeds, method).toBe(false);
    }
    expect(hormonalContraception(settings('pill_combined', { pillRegimen: 'continuous' }))?.scheduledBleeds).toBe(false);
    for (const method of ['iud_copper', 'condom', 'fam', 'none', 'other']) expect(hormonalContraception(settings(method)), method).toBeNull();
    // Trying to conceive: an old method left in the settings no longer applies.
    expect(hormonalContraception({ mode: 'conceive', contraception: { method: 'pill_combined' } })).toBeNull();
  });

  it('hides fertility (and unscheduled "periods") and says why', () => {
    const pill = modeFlags(settings('pill_combined', { pillRegimen: '21_7' }));
    expect(pill).toMatchObject({ fertility: false, predictions: true, withdrawalBleeds: true, fertilityTracking: false, fertilityHidden: 'hormonal' });
    const implant = modeFlags({ mode: 'avoid', contraception: { method: 'implant' }, features: { fertilityInAvoid: true } });
    expect(implant).toMatchObject({ fertility: false, predictions: false, predictionsHidden: 'hormonal', fertilityHidden: 'hormonal' });
    expect(modeFlags(settings('iud_copper'))).toMatchObject({ fertility: true, predictions: true, hormonal: null, withdrawalBleeds: false });
    expect(visibleFeatures({ mode: 'avoid' })).toMatchObject({ fertility: false, fertilityHidden: 'setting' });
    expect(visibleFeatures({ mode: 'pregnant' })).toMatchObject({ predictionsHidden: 'mode', fertilityHidden: 'mode' });
    expect(visibleFeatures({ mode: 'postpartum' })).toMatchObject({ predictions: false, predictionsHidden: 'postpartum', fertilityHidden: 'mode' });
    expect(visibleFeatures({ mode: 'conceive' })).toMatchObject({ predictions: true, fertility: true, fertilityHidden: null });
  });

  it('predicts withdrawal bleeds without ovulation, phases or PMS on the combined pill', () => {
    const days = bleeds('2024-01-22', 28, 4);
    const s = settings('pill_combined', { pillRegimen: '21_7' });
    const a = analyze(days, { today: '2024-05-01', settings: s });
    expect(a.hormonal).toEqual({ method: 'pill_combined', scheduledBleeds: true });
    expect(a.prediction).toMatchObject({ nextPeriodStart: '2024-05-13', bleedKind: 'withdrawal', pmsStart: null });
    expect(a.current?.phase).toBeNull();
    const marks = calendarMarks(a, days, rangeISO('2024-04-20', '2024-06-30'));
    expect(Object.values(marks).some((m) => m.fertility || m.ovulation || m.pms)).toBe(false);
    expect(marks['2024-05-13'].period).toBe('predicted');
    expect(marks['2024-05-13'].phase).toBe('menstrual');
    expect(marks['2024-05-01'].phase).toBeNull();
    // A natural cycle keeps its phases and fertile days.
    const natural = analyze(days, { today: '2024-05-01', settings: settings('iud_copper') });
    expect(natural.prediction?.bleedKind).toBe('period');
    expect(Object.values(calendarMarks(natural, days, rangeISO('2024-04-20', '2024-06-30'))).some((m) => m.fertility)).toBe(true);
  });

  it('never calls a continuous method "late" and does not pause for missing bleeds', () => {
    // Continuous pill, last bleed 40 days ago.
    const days = bleeds('2024-01-01', 28, 3);
    const s = settings('pill_combined', { pillRegimen: 'continuous' });
    const a = analyze(days, { today: addDays('2024-02-26', 40), settings: s });
    expect(a.current).toMatchObject({ late: false, lateDays: 0, stale: false, phase: null });
    expect(a.prediction).toBeNull();
    const ids = computeNotices(a, days, { ...ctx, today: addDays('2024-02-26', 40) }).map((n) => n.id);
    expect(ids).not.toContain('late');
    expect(ids).not.toContain('lateTest');
    expect(ids).not.toContain('stale');
  });

  it('rewords a missing withdrawal bleed and skips natural-cycle notices', () => {
    const days = { ...bleeds('2024-01-01', 28, 4), '2024-04-10': { sex: 'unprotected' } };
    const s = settings('pill_combined', { pillRegimen: '21_7' });
    const a = analyze(days, { today: '2024-04-28', settings: s });
    const notices = computeNotices(a, days, { ...ctx, today: '2024-04-28' });
    expect(notices.map((n) => n.id)).toContain('lateWithdrawal');
    expect(notices.map((n) => n.id)).not.toContain('late');
    expect(notices.map((n) => n.id)).not.toContain('lateTest');
    // The same data without a hormonal method is a late period.
    const natural = analyze(days, { today: '2024-04-28', settings: { mode: 'track' } });
    expect(computeNotices(natural, days, { ...ctx, today: '2024-04-28' }).map((n) => n.id)).toContain('lateTest');
  });

  it('does not treat absent or irregular bleeding on an implant as amenorrhoea or irregular cycles', () => {
    // Irregular bleeding, then nothing for months while logging other things.
    const days = { ...bleeds('2024-01-01', 20, 1), ...bleeds('2024-01-21', 45, 1), ...bleeds('2024-03-06', 23, 1), ...bleeds('2024-03-29', 40, 1) };
    for (const d of rangeISO('2024-08-01', '2024-08-20')) days[d] = { moods: ['calm'] };
    days['2024-08-10'] = { flow: 'light' };
    const s = settings('implant');
    const a = analyze(days, { today: '2024-08-20', settings: s });
    const ids = computeNotices(a, days, { ...ctx, today: '2024-08-20' }).map((n) => n.id);
    for (const id of ['amenorrhea', 'irregular', 'shortCycles', 'longCycles', 'intermenstrual', 'late', 'stale']) expect(ids, id).not.toContain(id);
    const natural = analyze(days, { today: '2024-08-20', settings: { mode: 'track' } });
    expect(computeNotices(natural, days, { ...ctx, today: '2024-08-20' }).map((n) => n.id)).toContain('irregular');
  });

  it('turns fertile-window and ovulation reminders off', () => {
    const days = bleeds('2024-01-01', 28, 5);
    const reminders = [
      { id: 'f', type: 'fertile_start', enabled: true, time: '09:00' },
      { id: 'o', type: 'ovulation', enabled: true, time: '09:00' },
      { id: 'p', type: 'period_soon', enabled: true, time: '09:00', daysBefore: 2 },
    ];
    const occurrences = (/** @type {Record<string, any>} */ s) => {
      const a = analyze(days, { today: '2024-05-01', settings: s });
      const flags = modeFlags(s);
      return upcomingOccurrences(reminders, {
        now: localTimestamp('2024-05-01', '08:00'),
        today: '2024-05-01',
        horizonDays: 30,
        prediction: flags.predictions ? a.prediction : null,
        current: a.current,
        flags: { fertility: flags.fertility },
      }).map((o) => o.type);
    };
    expect(occurrences(settings('iud_copper'))).toEqual(expect.arrayContaining(['fertile_start', 'ovulation', 'period_soon']));
    const pill = occurrences(settings('pill_combined', { pillRegimen: '21_7' }));
    expect(pill).toContain('period_soon');
    expect(pill).not.toContain('fertile_start');
    expect(pill).not.toContain('ovulation');
    expect(occurrences(settings('implant'))).toEqual([]);
  });
});
