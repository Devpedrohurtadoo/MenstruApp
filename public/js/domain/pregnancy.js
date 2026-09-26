// Pregnancy dating (Naegele's rule), kick counting and contraction timing.

import { addDays, diffDays } from '../core/dates.js';

export const PREGNANCY_DAYS = 280;

/**
 * @param {{ basis: 'lmp' | 'due' | 'conception', date: string }} preg
 * @param {string} today
 */
export function pregnancyInfo(preg, today) {
  const lmp = preg.basis === 'lmp' ? preg.date : preg.basis === 'due' ? addDays(preg.date, -PREGNANCY_DAYS) : addDays(preg.date, -14);
  const dueDate = addDays(lmp, PREGNANCY_DAYS);
  const gaDays = diffDays(lmp, today);
  const weeks = Math.floor(gaDays / 7);
  const days = gaDays - weeks * 7;
  /** @type {1 | 2 | 3} */
  const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  return {
    lmp,
    dueDate,
    gaDays,
    weeks,
    days,
    trimester,
    daysToDue: diffDays(today, dueDate),
    progress: Math.min(1, Math.max(0, gaDays / PREGNANCY_DAYS)),
    valid: gaDays >= 0 && gaDays <= 44 * 7,
    overdue: gaDays > PREGNANCY_DAYS,
    /** Week number used for weekly notes (clamped to the content we have). */
    noteWeek: Math.min(42, Math.max(4, weeks)),
  };
}

/**
 * Contraction statistics over the last hour.
 * @param {Array<{ start: number, end: number }>} list
 * @param {number} now epoch ms
 */
export function contractionStats(list, now) {
  const hour = list.filter((c) => c.start >= now - 60 * 60_000 && c.end > c.start).sort((x, y) => x.start - y.start);
  if (hour.length < 2) return { count: hour.length, avgDurationSec: null, avgIntervalMin: null, pattern511: false };
  const durations = hour.map((c) => (c.end - c.start) / 1000);
  const intervals = hour.slice(1).map((c, i) => (c.start - hour[i].start) / 60_000);
  const avgDurationSec = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const avgIntervalMin = Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10;
  const span = (hour[hour.length - 1].start - hour[0].start) / 60_000;
  // "5-1-1": every ≤5 minutes, lasting ≥1 minute, for ≥1 hour — a common prompt to call the care team.
  const pattern511 = avgIntervalMin <= 5 && avgDurationSec >= 60 && span >= 55;
  return { count: hour.length, avgDurationSec, avgIntervalMin, pattern511 };
}

/**
 * @param {Array<{ start: number, end: number, count: number }>} sessions
 */
export function lastKickSession(sessions) {
  const done = sessions.filter((s) => s.end > s.start).sort((x, y) => y.start - x.start);
  const s = done[0];
  if (!s) return null;
  return { ...s, minutes: Math.max(1, Math.round((s.end - s.start) / 60_000)) };
}
