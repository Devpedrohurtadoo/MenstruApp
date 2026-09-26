// Pregnancy dating (Naegele's rule), kick counting and contraction timing.

import { addDays, diffDays } from '../core/dates.js';

export const PREGNANCY_DAYS = 280;
/** Bleeding after a pregnancy ends that is not a period: lochia lasts up to ~6 weeks after a birth,
 *  and bleeding after a pregnancy loss up to ~2 weeks. */
export const BLEEDING_AFTER = Object.freeze({ birth: 42, other: 14 });

/**
 * Date ranges for analyze(): pregnancies (from the LMP to their end) and the bleeding right after
 * them, so that neither lochia nor pregnancy bleeding is taken as a period.
 * @param {{ history?: Array<{ from: string, to: string }>, endedOn?: string, outcome?: string } | null | undefined} preg pregnancy document
 * @param {{ lmp: string } | null | undefined} active pregnancyInfo() of the active pregnancy, if any
 * @param {{ postpartum?: { birthDate?: string } | null } | null | undefined} settings
 * @param {string} today
 * @returns {{ excludeRanges: Array<[string, string]>, nonMenstrual: Array<[string, string]> }}
 */
export function pregnancyExclusions(preg, active, settings, today) {
  /** @type {Array<[string, string]>} */
  const excludeRanges = [];
  /** @type {Array<[string, string]>} */
  const nonMenstrual = [];
  for (const r of preg?.history ?? []) {
    excludeRanges.push([r.from, r.to]);
    // Only the last pregnancy records its outcome; older ones get the shorter (safe) window.
    const birth = preg?.outcome === 'birth' && preg.endedOn === r.to;
    nonMenstrual.push([r.to, addDays(r.to, birth ? BLEEDING_AFTER.birth : BLEEDING_AFTER.other)]);
  }
  if (active && active.lmp <= today) excludeRanges.push([active.lmp, today]);
  const birthDate = settings?.postpartum?.birthDate;
  if (birthDate) nonMenstrual.push([birthDate, addDays(birthDate, BLEEDING_AFTER.birth)]);
  return { excludeRanges, nonMenstrual };
}

/** No pregnancy lasts longer than this: beyond it the dates (or the mode) need updating. */
export const MAX_GESTATION_DAYS = 44 * 7;

/**
 * @param {{ basis: 'lmp' | 'due' | 'conception', date: string }} preg
 * @param {string} today
 */
export function pregnancyInfo(preg, today) {
  const lmp = preg.basis === 'lmp' ? preg.date : preg.basis === 'due' ? addDays(preg.date, -PREGNANCY_DAYS) : addDays(preg.date, -14);
  const dueDate = addDays(lmp, PREGNANCY_DAYS);
  const elapsed = diffDays(lmp, today);
  // Impossible dates (an LMP after today, or more than 44 weeks ago) are flagged, and the
  // gestational age is kept within 0+0 and 44+0 so that nothing shows "-2+4 weeks".
  const gaDays = Math.min(MAX_GESTATION_DAYS, Math.max(0, elapsed));
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
    progress: Math.min(1, gaDays / PREGNANCY_DAYS),
    valid: elapsed >= 0 && elapsed <= MAX_GESTATION_DAYS,
    /** Why the dates look impossible: 'future' (LMP after today) or 'tooLong' (more than 44 weeks). */
    issue: /** @type {null | 'future' | 'tooLong'} */ (elapsed < 0 ? 'future' : elapsed > MAX_GESTATION_DAYS ? 'tooLong' : null),
    overdue: elapsed > PREGNANCY_DAYS,
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
