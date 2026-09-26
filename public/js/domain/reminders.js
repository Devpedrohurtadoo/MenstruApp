// Turns reminder settings + predictions into concrete notification times.
// The scheduler (pwa/notifications.js) renders the texts and delivers them.

import { addDays, diffDays, localTimestamp, rangeISO, weekdayMonday0, parts, isoFromParts, daysInMonth } from '../core/dates.js';

/**
 * @typedef {{ id: string, type: string, enabled: boolean, time: string, daysBefore?: number, weekday?: number, date?: string,
 *   title?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' }} Reminder
 * @typedef {{ key: string, reminderId: string, type: string, at: number, date: string, params: Record<string, any> }} Occurrence
 */

/**
 * Sensible reminders for a mode (disabled by default except the ones chosen in onboarding).
 * @param {string} mode
 * @returns {Reminder[]}
 */
export function defaultReminders(mode) {
  /** @type {Reminder[]} */
  const list = [];
  if (mode !== 'pregnant') list.push({ id: 'period_soon', type: 'period_soon', enabled: false, time: '09:00', daysBefore: 2 });
  if (mode !== 'pregnant') list.push({ id: 'period_late', type: 'period_late', enabled: false, time: '09:00', daysBefore: 3 });
  if (mode === 'conceive' || mode === 'track') list.push({ id: 'fertile_start', type: 'fertile_start', enabled: false, time: '09:00' });
  if (mode === 'conceive') list.push({ id: 'ovulation', type: 'ovulation', enabled: false, time: '09:00' });
  if (mode === 'conceive') list.push({ id: 'bbt', type: 'bbt', enabled: false, time: '07:00' });
  list.push({ id: 'log_daily', type: 'log_daily', enabled: false, time: '21:00' });
  list.push({ id: 'daily_tip', type: 'daily_tip', enabled: false, time: '10:00' });
  if (mode === 'pregnant') list.push({ id: 'pregnancy_week', type: 'pregnancy_week', enabled: false, time: '10:00' });
  return list;
}

/**
 * @param {Reminder} r
 * @param {string} iso
 * @param {Record<string, any>} [params]
 * @returns {Occurrence}
 */
function occ(r, iso, params = {}) {
  return { key: `${r.id}:${iso}`, reminderId: r.id, type: r.type, at: localTimestamp(iso, r.time), date: iso, params };
}

/** Days between injections (13 weeks); the reminder comes `daysBefore` days earlier. */
const INJECTION_INTERVAL = 91;

/**
 * Contraceptive schedule for patch/ring/pill-with-break regimens.
 * @param {string} type
 * @param {string} startDate first day of the current pack/patch/ring
 * @param {string} iso
 * @param {string} [regimen]
 * @param {string} [method] contraceptive method: the progestogen-only pill is taken every day with no break
 * @returns {string | null} action key or null when nothing is due that day
 */
export function contraceptionAction(type, startDate, iso, regimen, method) {
  const day = (((diffDays(startDate, iso) % 28) + 28) % 28);
  if (type === 'pill') {
    // Only the combined pill has a pill-free week, and only in the 21+7 regimen.
    const pillFree = regimen === '21_7' && (method === undefined || method === 'pill_combined');
    if (pillFree && day >= 21) return null;
    return 'take';
  }
  if (type === 'patch') {
    if (day === 0) return 'patchApply';
    if (day === 7 || day === 14) return 'patchChange';
    if (day === 21) return 'patchRemove';
    return null;
  }
  if (type === 'ring') {
    if (day === 0) return 'ringInsert';
    if (day === 21) return 'ringRemove';
    return null;
  }
  return null;
}

/**
 * @param {Reminder[]} reminders
 * @param {{ now: number, today: string, horizonDays?: number, prediction?: Record<string, any> | null,
 *   current?: Record<string, any> | null, pregnancy?: { lmp: string, dueDate: string } | null,
 *   contraception?: { method?: string, startDate?: string | null, pillRegimen?: string } | null, flags?: { fertility: boolean },
 *   tipTopic?: (date: string) => string }} ctx tipTopic: which tips suit a date (its life stage or predicted phase)
 * @returns {Occurrence[]}
 */
export function upcomingOccurrences(reminders, ctx) {
  const horizon = ctx.horizonDays ?? 30;
  const end = addDays(ctx.today, horizon);
  const dates = rangeISO(ctx.today, end);
  /** @type {Occurrence[]} */
  const out = [];
  const pred = ctx.prediction;
  const contra = ctx.contraception;

  for (const r of reminders) {
    if (!r.enabled) continue;
    switch (r.type) {
      case 'log_daily':
      case 'bbt':
        for (const d of dates) out.push(occ(r, d));
        break;
      case 'daily_tip':
        for (const d of dates) out.push(occ(r, d, { topic: ctx.tipTopic?.(d) ?? 'general' }));
        break;
      case 'pill':
        for (const d of dates) {
          const action = contra?.startDate ? contraceptionAction('pill', contra.startDate, d, contra.pillRegimen, contra.method) : 'take';
          if (action) out.push(occ(r, d, { action }));
        }
        break;
      case 'patch':
      case 'ring':
        if (!contra?.startDate) break;
        for (const d of dates) {
          const action = contraceptionAction(r.type, contra.startDate, d);
          if (action) out.push(occ(r, d, { action }));
        }
        break;
      case 'injection':
        if (contra?.startDate) {
          // Next doses from today on, however long ago the first injection was.
          const lead = r.daysBefore ?? 7;
          const first = Math.max(1, Math.ceil((diffDays(contra.startDate, ctx.today) + lead) / INJECTION_INTERVAL));
          for (let k = first; ; k++) {
            const due = addDays(contra.startDate, INJECTION_INTERVAL * k);
            const remind = addDays(due, -lead);
            if (remind > end) break;
            if (remind >= ctx.today) out.push(occ(r, remind, { due }));
          }
        }
        break;
      case 'period_soon':
        if (pred?.upcoming) {
          for (const start of pred.upcoming) {
            const d = addDays(start, -(r.daysBefore ?? 2));
            if (d >= ctx.today && d <= end) out.push(occ(r, d, { start, days: r.daysBefore ?? 2 }));
          }
        }
        break;
      case 'period_late':
        if (pred && ctx.current && !ctx.current.late) {
          const d = addDays(pred.nextPeriodStart, r.daysBefore ?? 3);
          if (d >= ctx.today && d <= end) out.push(occ(r, d, { days: r.daysBefore ?? 3 }));
        }
        break;
      case 'fertile_start':
        if (pred && ctx.flags?.fertility && pred.fertileStart >= ctx.today && pred.fertileStart <= end) out.push(occ(r, pred.fertileStart));
        break;
      case 'ovulation':
        if (pred && ctx.flags?.fertility && pred.ovulationDay >= ctx.today && pred.ovulationDay <= end) out.push(occ(r, pred.ovulationDay));
        break;
      case 'pregnancy_week':
        if (ctx.pregnancy) {
          for (const d of dates) {
            const ga = diffDays(ctx.pregnancy.lmp, d);
            if (ga > 0 && ga % 7 === 0 && ga <= 42 * 7) out.push(occ(r, d, { week: ga / 7 }));
          }
        }
        break;
      case 'appointment':
      case 'checkup':
      case 'custom':
      case 'backup':
        for (const d of repeatDates(r, ctx.today, end)) {
          const remindOn = addDays(d, -(r.daysBefore ?? 0));
          if (remindOn >= ctx.today && remindOn <= end) out.push(occ(r, remindOn, { title: r.title ?? '', date: d }));
        }
        break;
      default:
        break;
    }
  }
  return out.filter((o) => o.at > ctx.now).sort((x, y) => x.at - y.at);
}

/**
 * Dates on which a dated/repeating reminder falls within [from, to] (plus its lead time).
 * @param {Reminder} r
 * @param {string} from
 * @param {string} to
 */
export function repeatDates(r, from, to) {
  const lead = r.daysBefore ?? 0;
  const windowEnd = addDays(to, lead);
  if (!r.date) {
    if (r.repeat === 'daily') return rangeISO(from, windowEnd);
    if (r.repeat === 'weekly' && typeof r.weekday === 'number') return rangeISO(from, windowEnd).filter((d) => weekdayMonday0(d) === r.weekday);
    return [];
  }
  const repeat = r.repeat ?? 'none';
  if (repeat === 'none') return r.date >= from && r.date <= windowEnd ? [r.date] : [];
  if (repeat === 'daily') return rangeISO(r.date > from ? r.date : from, windowEnd);
  if (repeat === 'weekly') {
    return rangeISO(r.date > from ? r.date : from, windowEnd).filter((d) => ((diffDays(/** @type {string} */ (r.date), d) % 7) + 7) % 7 === 0);
  }
  const [, , day] = parts(r.date);
  /** @type {string[]} */
  const out = [];
  const [fy, fm] = parts(from);
  const [ty, tm] = parts(windowEnd);
  for (let y = fy; y <= ty; y++) {
    for (let m = 1; m <= 12; m++) {
      if ((y === fy && m < fm) || (y === ty && m > tm)) continue;
      if (repeat === 'yearly' && m !== parts(r.date)[1]) continue;
      const iso = isoFromParts(y, m, Math.min(day, daysInMonth(y, m)));
      if (iso >= r.date && iso >= from && iso <= windowEnd) out.push(iso);
    }
  }
  return out;
}
