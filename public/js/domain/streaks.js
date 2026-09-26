// Gentle gamification: logging streaks and milestones. No guilt when a streak ends.

import { addDays, diffDays } from '../core/dates.js';

/**
 * @param {Record<string, any>} days
 * @param {string} today
 */
export function loggingStreak(days, today) {
  const logged = new Set(Object.keys(days).filter((d) => Object.keys(days[d] ?? {}).some((k) => k !== 'updatedAt')));
  let current = 0;
  // A streak stays alive until the end of today even if today is not logged yet.
  let cursor = logged.has(today) ? today : addDays(today, -1);
  while (logged.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  /** @type {string | null} */
  let prev = null;
  for (const d of Array.from(logged).sort()) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, total: logged.size, loggedToday: logged.has(today) };
}

export const ACHIEVEMENTS = /** @type {const} */ ([
  'firstLog',
  'streak7',
  'streak30',
  'streak100',
  'firstCycle',
  'threeCycles',
  'twelveCycles',
  'bbtConfirmed',
  'reportExported',
  'backupDone',
]);

/**
 * @param {{ streak: { current: number, best: number, total: number }, completedCycles: number, bbtConfirmed: number,
 *   events?: Set<string> }} ctx
 * @param {Record<string, string>} unlocked
 * @returns {string[]} newly unlocked achievement ids
 */
export function newAchievements(ctx, unlocked) {
  /** @type {Record<string, boolean>} */
  const rules = {
    firstLog: ctx.streak.total >= 1,
    streak7: ctx.streak.best >= 7,
    streak30: ctx.streak.best >= 30,
    streak100: ctx.streak.best >= 100,
    firstCycle: ctx.completedCycles >= 1,
    threeCycles: ctx.completedCycles >= 3,
    twelveCycles: ctx.completedCycles >= 12,
    bbtConfirmed: ctx.bbtConfirmed >= 1,
    reportExported: ctx.events?.has('reportExported') ?? false,
    backupDone: ctx.events?.has('backupDone') ?? false,
  };
  return ACHIEVEMENTS.filter((id) => rules[id] && !unlocked[id]);
}
