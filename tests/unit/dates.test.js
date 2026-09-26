import { describe, it, expect } from 'vitest';
import { addDays, diffDays, isISODate, monthGrid, weekdayMonday0, rangeISO, addMonths, todayISO, daysInMonth, parseTime, ageFromProfile } from '../../public/js/core/dates.js';

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2023-02-29')).toBe(false);
    expect(isISODate('2024-13-01')).toBe(false);
    expect(isISODate('2024-1-01')).toBe(false);
    expect(isISODate('not a date')).toBe(false);
    expect(isISODate(20240101)).toBe(false);
  });

  it('adds days across months, years and leap days', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2024-01-15', 28)).toBe('2024-02-12');
  });

  it('is immune to daylight-saving transitions', () => {
    // Europe switches on the last Sunday of March/October; US in March/November.
    expect(diffDays('2024-03-30', '2024-04-01')).toBe(2);
    expect(diffDays('2024-10-26', '2024-10-28')).toBe(2);
    expect(diffDays('2024-03-09', '2024-03-11')).toBe(2);
    expect(addDays('2024-03-31', 1)).toBe('2024-04-01');
  });

  it('computes differences and ranges', () => {
    expect(diffDays('2024-01-01', '2024-12-31')).toBe(365);
    expect(diffDays('2024-03-10', '2024-03-01')).toBe(-9);
    expect(rangeISO('2024-02-27', '2024-03-02')).toEqual(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02']);
  });

  it('knows weekdays (Monday = 0)', () => {
    expect(weekdayMonday0('2024-01-01')).toBe(0); // Monday
    expect(weekdayMonday0('2024-01-07')).toBe(6); // Sunday
    expect(weekdayMonday0('1970-01-01')).toBe(3); // Thursday
  });

  it('builds month grids starting on Monday or Sunday', () => {
    const mon = monthGrid('2024-09', 1);
    expect(mon).toHaveLength(42);
    expect(mon[0]).toBe('2024-08-26'); // Monday before Sunday 1 September
    expect(mon[6]).toBe('2024-09-01');
    const sun = monthGrid('2024-09', 0);
    expect(sun[0]).toBe('2024-09-01');
  });

  it('adds months and knows month lengths', () => {
    expect(addMonths('2024-12', 1)).toBe('2025-01');
    expect(addMonths('2024-01', -1)).toBe('2023-12');
    expect(addMonths('2024-05', -17)).toBe('2022-12');
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
  });

  it('uses the local calendar day for today', () => {
    expect(todayISO(new Date(2024, 4, 9, 23, 59))).toBe('2024-05-09');
    expect(todayISO(new Date(2024, 4, 10, 0, 1))).toBe('2024-05-10');
  });

  it('parses times defensively', () => {
    expect(parseTime('07:30')).toEqual([7, 30]);
    expect(parseTime('24:00')).toEqual([9, 0]);
  });

  it('takes the youngest possible age when only the birth year is known', () => {
    expect(ageFromProfile({ birthYear: 2008 }, '2026-01-10')).toBe(17);
    expect(ageFromProfile({ birthYear: 2008 }, '2026-12-31')).toBe(17);
    expect(ageFromProfile({ birthYear: null }, '2026-01-10')).toBeNull();
    expect(ageFromProfile({}, '2026-01-10')).toBeNull();
  });
});
