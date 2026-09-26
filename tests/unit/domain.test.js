import { describe, it, expect } from 'vitest';
import { analyze } from '../../public/js/domain/cycle.js';
import { computeNotices, computeInsights, frequencies } from '../../public/js/domain/insights.js';
import { pregnancyInfo, contractionStats } from '../../public/js/domain/pregnancy.js';
import { upcomingOccurrences, contraceptionAction, repeatDates } from '../../public/js/domain/reminders.js';
import { loggingStreak, newAchievements } from '../../public/js/domain/streaks.js';
import { createLuna, normalize } from '../../public/js/domain/luna.js';
import { modeFlags } from '../../public/js/domain/modes.js';
import { addDays, localTimestamp } from '../../public/js/core/dates.js';

function periodsEvery(first, len, count, periodLength = 5) {
  const days = {};
  for (let c = 0; c < count; c++) for (let i = 0; i < periodLength; i++) days[addDays(first, c * len + i)] = { flow: 'medium' };
  return days;
}

const baseCtx = { mode: 'track', age: 30, experience: 'experienced' };

describe('notices', () => {
  it('flags red-flag symptoms as urgent', () => {
    const days = { ...periodsEvery('2024-01-01', 28, 3), '2024-03-10': { symptoms: { fever: 2 } } };
    const a = analyze(days, { today: '2024-03-10', settings: {} });
    const notices = computeNotices(a, days, { ...baseCtx, today: '2024-03-10' });
    expect(notices[0]).toMatchObject({ id: 'redFlag.fever', level: 'urgent' });
  });

  it('flags irregular, short and long cycles only for adults', () => {
    const days = { ...periodsEvery('2024-01-01', 21, 2), ...periodsEvery('2024-02-12', 45, 3) };
    const a = analyze(days, { today: '2024-06-20', settings: {} });
    const adult = computeNotices(a, days, { ...baseCtx, today: '2024-06-20' }).map((n) => n.id);
    expect(adult).toContain('irregular');
    expect(adult).toContain('longCycles');
    const teen = computeNotices(a, days, { ...baseCtx, age: 15, today: '2024-06-20' }).map((n) => n.id);
    expect(teen).not.toContain('irregular');
  });

  it('suggests a pregnancy test when late after unprotected sex', () => {
    const days = { ...periodsEvery('2024-01-01', 28, 3), '2024-03-10': { sex: 'unprotected' } };
    const a = analyze(days, { today: '2024-03-30', settings: {} });
    const ids = computeNotices(a, days, { ...baseCtx, today: '2024-03-30' }).map((n) => n.id);
    expect(ids).toContain('lateTest');
  });

  it('flags bleeding during pregnancy and after menopause', () => {
    const preg = computeNotices(analyze({}, { today: '2024-03-10' }), { '2024-03-10': { flow: 'spotting' } }, { ...baseCtx, mode: 'pregnant', today: '2024-03-10' });
    expect(preg[0].id).toBe('pregnancyBleeding');
    const days = { ...periodsEvery('2022-01-01', 30, 2), '2024-01-10': { flow: 'light' }, '2024-01-11': { flow: 'light' } };
    const a = analyze(days, { today: '2024-01-12', settings: { mode: 'perimenopause' } });
    const ids = computeNotices(a, days, { ...baseCtx, mode: 'perimenopause', today: '2024-01-12' }).map((n) => n.id);
    expect(ids).toContain('postmenopausalBleeding');
  });

  it('mentions emergency contraception after unprotected sex in the fertile window (avoid mode)', () => {
    const days = { ...periodsEvery('2024-01-01', 28, 3), '2024-03-09': { sex: 'unprotected' } };
    const a = analyze(days, { today: '2024-03-10', settings: {} });
    const ids = computeNotices(a, days, { ...baseCtx, mode: 'avoid', today: '2024-03-10' }).map((n) => n.id);
    expect(ids).toContain('emergencyContraception');
  });
});

describe('insights', () => {
  it('finds symptoms that cluster in a phase', () => {
    const days = periodsEvery('2024-01-01', 28, 5);
    for (let c = 0; c < 4; c++) {
      for (let i = 0; i < 4; i++) {
        const d = addDays('2024-01-01', c * 28 + 23 + i);
        days[d] = { ...(days[d] ?? {}), symptoms: { bloating: 2 }, energy: 2 };
      }
      for (let i = 8; i < 12; i++) days[addDays('2024-01-01', c * 28 + i)] = { energy: 5 };
    }
    const a = analyze(days, { today: '2024-05-01', settings: {} });
    const { patterns, energy, regularity } = computeInsights(a, days);
    expect(patterns[0]).toMatchObject({ id: 'bloating', kind: 'symptom', phase: 'luteal' });
    expect(energy).toMatchObject({ best: 'follicular', worst: 'luteal' });
    expect(regularity).toBe('veryRegular');
  });

  it('counts frequencies in a range', () => {
    const f = frequencies({ '2024-01-01': { symptoms: { cramps: 1 }, moods: ['sad'] }, '2024-01-02': { symptoms: { cramps: 2 } } }, '2024-01-01', '2024-01-31');
    expect(f.symptoms[0]).toEqual({ id: 'cramps', count: 2 });
    expect(f.loggedDays).toBe(2);
  });
});

describe('pregnancy', () => {
  it('dates a pregnancy from LMP, due date or conception', () => {
    const lmp = pregnancyInfo({ basis: 'lmp', date: '2024-01-01' }, '2024-03-11');
    expect(lmp).toMatchObject({ dueDate: '2024-10-07', weeks: 10, days: 0, trimester: 1 });
    expect(pregnancyInfo({ basis: 'due', date: '2024-10-07' }, '2024-03-11').lmp).toBe('2024-01-01');
    expect(pregnancyInfo({ basis: 'conception', date: '2024-01-15' }, '2024-03-11').lmp).toBe('2024-01-01');
    expect(pregnancyInfo({ basis: 'lmp', date: '2024-01-01' }, '2024-08-01').trimester).toBe(3);
  });

  it('recognises the 5-1-1 contraction pattern', () => {
    const now = 10_000_000;
    const list = Array.from({ length: 13 }, (_, i) => ({ start: now - 60 * 60_000 + i * 5 * 60_000, end: now - 60 * 60_000 + i * 5 * 60_000 + 65_000 }));
    expect(contractionStats(list, now + 70_000)).toMatchObject({ pattern511: true, avgIntervalMin: 5 });
    expect(contractionStats(list.slice(0, 3), now + 70_000).pattern511).toBe(false);
  });
});

describe('reminders', () => {
  it('follows contraceptive schedules', () => {
    expect(contraceptionAction('pill', '2024-01-01', '2024-01-21', '21_7')).toBe('take');
    expect(contraceptionAction('pill', '2024-01-01', '2024-01-22', '21_7')).toBeNull();
    expect(contraceptionAction('pill', '2024-01-01', '2024-01-29', '21_7')).toBe('take');
    expect(contraceptionAction('patch', '2024-01-01', '2024-01-08')).toBe('patchChange');
    expect(contraceptionAction('ring', '2024-01-01', '2024-01-22')).toBe('ringRemove');
  });

  it('schedules period and daily reminders in the future only', () => {
    const days = periodsEvery('2024-01-01', 28, 5);
    const a = analyze(days, { today: '2024-05-01', settings: {} });
    const now = localTimestamp('2024-05-01', '12:00');
    const occ = upcomingOccurrences(
      [
        { id: 'p', type: 'period_soon', enabled: true, time: '09:00', daysBefore: 2 },
        { id: 'l', type: 'log_daily', enabled: true, time: '21:00' },
        { id: 'off', type: 'log_daily', enabled: false, time: '08:00' },
      ],
      { now, today: '2024-05-01', horizonDays: 30, prediction: a.prediction, current: a.current, flags: { fertility: true } },
    );
    expect(occ.find((o) => o.type === 'period_soon')?.date).toBe('2024-05-18');
    expect(occ.filter((o) => o.type === 'log_daily')).toHaveLength(31);
    expect(occ.every((o) => o.at > now)).toBe(true);
    expect(occ.some((o) => o.reminderId === 'off')).toBe(false);
  });

  it('expands repeating dated reminders', () => {
    expect(repeatDates({ id: 'x', type: 'custom', enabled: true, time: '10:00', date: '2024-01-31', repeat: 'monthly' }, '2024-02-01', '2024-04-30')).toEqual([
      '2024-02-29',
      '2024-03-31',
      '2024-04-30',
    ]);
    expect(repeatDates({ id: 'y', type: 'checkup', enabled: true, time: '10:00', date: '2023-06-01', repeat: 'yearly' }, '2024-01-01', '2024-12-31')).toEqual([
      '2024-06-01',
    ]);
  });
});

describe('streaks', () => {
  it('counts the current and best streak without breaking before the day ends', () => {
    const days = { '2024-01-01': { flow: 'light' }, '2024-01-02': { moods: ['calm'] }, '2024-01-04': { flow: 'light' }, '2024-01-05': { energy: 3 } };
    expect(loggingStreak(days, '2024-01-06')).toMatchObject({ current: 2, best: 2, total: 4, loggedToday: false });
    expect(loggingStreak(days, '2024-01-07').current).toBe(0);
    expect(newAchievements({ streak: { current: 2, best: 7, total: 9 }, completedCycles: 1, bbtConfirmed: 0 }, { firstLog: '2024-01-01' })).toEqual([
      'streak7',
      'firstCycle',
    ]);
  });
});

describe('modes', () => {
  it('hides predictions during pregnancy and fertility in avoid mode by default', () => {
    expect(modeFlags({ mode: 'pregnant' })).toMatchObject({ predictions: false, fertility: false, pregnancy: true });
    expect(modeFlags({ mode: 'avoid' }).fertility).toBe(false);
    expect(modeFlags({ mode: 'avoid', features: { fertilityInAvoid: true } }).fertility).toBe(true);
    expect(modeFlags({ mode: 'postpartum', postpartum: { periodReturned: true } }).predictions).toBe(true);
  });
});

describe('luna engine', () => {
  const kb = {
    intents: [
      { id: 'cramps', keywords: { colicos: 3, 'dolor de regla': 4 }, answer: ['Calor local ayuda.'], article: 'dolor-menstrual' },
      { id: 'pcos', keywords: { sop: 4, 'ovario poliquistico': 4 }, answer: ['El SOP es...'], article: 'sop' },
    ],
    redFlags: [{ id: 'heavy', patterns: ['empapo una compresa cada hora'], answer: ['Busca atención médica.'] }],
    contextual: { nextPeriod: { 'cuando me baja': 4, 'proxima regla': 4 } },
    smalltalk: { hello: { keywords: ['hola'], answer: ['¡Hola {name}!'] } },
    fallback: ['No te he entendido.'],
    disclaimer: 'No sustituyo a una profesional.',
  };
  const luna = createLuna(kb);

  it('normalises accents and punctuation', () => {
    expect(normalize('¿Cólicos, OTRA VEZ?')).toBe('colicos otra vez');
  });

  it('answers from the knowledge base with a disclaimer', () => {
    const r = luna.reply('Tengo muchos cólicos');
    expect(r).toMatchObject({ intent: 'cramps', article: 'dolor-menstrual', urgent: false });
    expect(r.paragraphs.at(-1)).toBe(kb.disclaimer);
  });

  it('puts red flags first', () => {
    const r = luna.reply('Empapo una compresa cada hora y tengo colicos');
    expect(r.urgent).toBe(true);
    expect(r.paragraphs[0]).toBe('Busca atención médica.');
    expect(r.intent).toBe('cramps');
  });

  it('does not match short keywords inside other words', () => {
    expect(luna.reply('me gusta la sopa').intent).toBeUndefined();
    expect(luna.reply('creo que tengo sop').intent).toBe('pcos');
  });

  it('uses contextual handlers with personal data', () => {
    const r = luna.reply('¿Cuándo me baja la regla?', { contextual: { nextPeriod: () => ['El 12 de mayo.'] } });
    expect(r.paragraphs[0]).toBe('El 12 de mayo.');
  });

  it('handles small talk and unknown questions', () => {
    expect(luna.reply('hola', { name: 'Ana' }).paragraphs[0]).toBe('¡Hola Ana!');
    expect(luna.reply('xyz qwerty').paragraphs).toEqual(kb.fallback);
  });
});
