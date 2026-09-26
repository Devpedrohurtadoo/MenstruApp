// Cycle engine: turns logged days into periods, cycles, statistics and predictions.
// Pure functions only (no DOM, no storage) so every rule is unit-tested.
//
// Definitions
//  - Bleeding day: flow light/medium/heavy (spotting alone never starts a period).
//  - Period: run of bleeding days; gaps of up to 2 unlogged/spotting days are bridged.
//  - A run that starts less than 15 days after the previous period started is treated as
//    intermenstrual bleeding (worth mentioning to a professional), not as a new cycle.
//  - Cycle length: days between two consecutive period starts.
//  - Prediction: recency-weighted mean of the last ≤6 valid cycles (outliers removed), blended
//    with the user's stated average when there is little history; uncertainty from the spread.
//  - Ovulation: confirmed by basal temperature ("3 over 6" rule) or estimated from an LH test,
//    otherwise estimated as next period − luteal phase length (learned or 14 days).

import { BLEEDING } from './catalog.js';
import { addDays, diffDays, isISODate, rangeISO } from '../core/dates.js';

export const DEFAULTS = Object.freeze({ cycleLength: 28, periodLength: 5, lutealLength: 14 });
export const LIMITS = Object.freeze({ minCycle: 15, maxCycle: 90, bridgeGap: 3, maxPeriod: 15 });
const HISTORY_WINDOW = 6;

/**
 * @typedef {Record<string, any>} DayEntry
 * @typedef {{ start: string, end: string, days: string[], lengthKnown: boolean, length: number | null, estimatedEnd: string }} Period
 * @typedef {{ start: string, end: string | null, length: number | null, periodLength: number | null, ovulation: Ovulation | null,
 *   lutealLength: number | null, excluded: null | 'gap' | 'pregnancy', ongoing: boolean }} Cycle
 * @typedef {{ day: string, method: 'bbt' | 'lh' | 'estimate', coverline?: number }} Ovulation
 */

/** @param {number[]} xs */
export function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** @param {number[]} xs */
export function describe(xs) {
  if (!xs.length) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
  return {
    count: xs.length,
    mean: Math.round(mean * 10) / 10,
    median: median(xs),
    sd: Math.round(sd * 10) / 10,
    min: Math.min(...xs),
    max: Math.max(...xs),
    range: Math.max(...xs) - Math.min(...xs),
  };
}

/**
 * @param {Record<string, DayEntry>} days
 * @param {{ today: string, excludeRanges?: Array<[string, string]>, periodLengthHint?: number }} ctx
 */
export function detectPeriods(days, ctx) {
  const excluded = ctx.excludeRanges ?? [];
  const inExcluded = (/** @type {string} */ d) => excluded.some(([a, b]) => d >= a && d <= b);
  const bleeding = Object.keys(days)
    .filter((d) => isISODate(d) && BLEEDING.has(days[d]?.flow) && !inExcluded(d))
    .sort();

  /** @type {Array<{ start: string, end: string, days: string[] }>} */
  const runs = [];
  for (const d of bleeding) {
    const last = runs[runs.length - 1];
    if (last && diffDays(last.end, d) <= LIMITS.bridgeGap) {
      last.end = d;
      last.days.push(d);
    } else {
      runs.push({ start: d, end: d, days: [d] });
    }
  }

  /** @type {Array<{ start: string, end: string, days: string[] }>} */
  const merged = [];
  /** @type {Array<{ start: string, end: string }>} */
  const intermenstrual = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (prev && diffDays(prev.start, run.start) < LIMITS.minCycle) {
      intermenstrual.push({ start: run.start, end: run.end });
    } else {
      merged.push(run);
    }
  }

  const hint = ctx.periodLengthHint ?? DEFAULTS.periodLength;
  /** @type {Period[]} */
  const periods = merged.map((run, i) => {
    const length = diffDays(run.start, run.end) + 1;
    const next = merged[i + 1];
    const after = rangeISO(addDays(run.end, 1), addDays(run.end, LIMITS.bridgeGap));
    const explicitEnd = after.some((d) => days[d] && (days[d].flow === 'none' || days[d].flow === 'spotting' || (!days[d].flow && Object.keys(days[d]).some((k) => k !== 'updatedAt'))));
    const finished = diffDays(run.end, ctx.today) > LIMITS.bridgeGap || Boolean(next);
    const lengthKnown = length <= LIMITS.maxPeriod && (explicitEnd || (finished && run.days.length >= 2));
    return {
      start: run.start,
      end: run.end,
      days: run.days,
      lengthKnown,
      length: lengthKnown ? length : null,
      estimatedEnd: lengthKnown ? run.end : addDays(run.start, Math.max(length, hint) - 1),
    };
  });
  return { periods, intermenstrual };
}

/**
 * Basal body temperature shift ("3 over 6"): three consecutive readings above the highest of
 * the previous six, the third at least 0.2 °C above that coverline. Ovulation ≈ day before.
 * @param {Array<{ date: string, bbt: number }>} readings sorted, undisturbed readings of one cycle
 * @returns {Ovulation | null}
 */
export function detectBbtShift(readings) {
  for (let i = 6; i + 2 < readings.length; i++) {
    const cover = Math.max(...readings.slice(i - 6, i).map((r) => r.bbt));
    const [a, b, c] = readings.slice(i, i + 3);
    if (a.bbt > cover && b.bbt > cover && c.bbt >= cover + 0.2 - 1e-9 && diffDays(a.date, c.date) <= 3) {
      return { day: addDays(a.date, -1), method: 'bbt', coverline: cover };
    }
  }
  return null;
}

/**
 * @param {Record<string, DayEntry>} days
 * @param {string} from
 * @param {string} to inclusive
 * @returns {Ovulation | null}
 */
export function detectOvulation(days, from, to) {
  const dates = Object.keys(days)
    .filter((d) => d >= from && d <= to)
    .sort();
  const readings = dates.filter((d) => typeof days[d].bbt === 'number' && !days[d].bbtDisturbed).map((d) => ({ date: d, bbt: days[d].bbt }));
  const bbt = detectBbtShift(readings);
  if (bbt) return bbt;
  const lhDay = dates.find((d) => days[d].lh === 'positive' || days[d].lh === 'peak');
  if (lhDay) return { day: addDays(lhDay, 1), method: 'lh' };
  return null;
}

/**
 * @param {number[]} lengths chronological cycle lengths
 * @param {number | null | undefined} prior user-stated average
 */
export function predictLength(lengths, prior) {
  const sample = lengths.slice(-HISTORY_WINDOW);
  if (!sample.length) {
    return { length: prior ?? DEFAULTS.cycleLength, margin: prior ? 3 : 4, basis: /** @type {'settings' | 'default'} */ (prior ? 'settings' : 'default'), n: 0 };
  }
  let used = sample;
  if (sample.length >= 4) {
    const med = median(sample);
    const filtered = sample.filter((x) => Math.abs(x - med) <= 10);
    if (filtered.length >= 3) used = filtered;
  }
  if (used.length >= 3) {
    const weights = used.map((_, i) => i + 1);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const mean = used.reduce((acc, x, i) => acc + x * weights[i], 0) / wsum;
    const sd = Math.sqrt(used.reduce((acc, x, i) => acc + weights[i] * (x - mean) ** 2, 0) / wsum);
    return { length: Math.round(mean), margin: Math.min(7, Math.max(1, Math.round(sd))), basis: /** @type {const} */ ('history'), n: used.length };
  }
  const p = prior ?? DEFAULTS.cycleLength;
  const k = 2;
  const mean = (used.reduce((a, b) => a + b, 0) + p * k) / (used.length + k);
  return { length: Math.round(mean), margin: 3, basis: /** @type {const} */ ('mixed'), n: used.length };
}

/**
 * Full analysis of a profile's cycle data.
 * @param {Record<string, DayEntry>} days
 * @param {{ today: string, settings?: Record<string, any>, excludeRanges?: Array<[string, string]> }} ctx
 */
export function analyze(days, ctx) {
  const settings = ctx.settings ?? {};
  const today = ctx.today;
  const periodHint = settings.periodLength ?? DEFAULTS.periodLength;
  const { periods, intermenstrual } = detectPeriods(days, { today, excludeRanges: ctx.excludeRanges, periodLengthHint: periodHint });
  const excluded = ctx.excludeRanges ?? [];

  /** @type {Cycle[]} */
  const cycles = periods.map((p, i) => {
    const next = periods[i + 1];
    const end = next ? addDays(next.start, -1) : null;
    const length = next ? diffDays(p.start, next.start) : null;
    const overlapsPregnancy = excluded.some(([a, b]) => a <= (end ?? today) && b >= p.start);
    /** @type {Cycle['excluded']} */
    let excl = null;
    if (length !== null && length > LIMITS.maxCycle) excl = 'gap';
    if (overlapsPregnancy) excl = 'pregnancy';
    const ovulation = detectOvulation(days, p.start, end ?? today);
    const luteal = ovulation && next ? diffDays(ovulation.day, next.start) : null;
    return {
      start: p.start,
      end,
      length,
      periodLength: p.length,
      ovulation,
      lutealLength: luteal !== null && luteal >= 8 && luteal <= 18 ? luteal : null,
      excluded: excl,
      ongoing: !next,
    };
  });

  const validLengths = cycles.filter((c) => c.length !== null && !c.excluded).map((c) => /** @type {number} */ (c.length));
  const periodLengths = periods.filter((p) => p.lengthKnown).map((p) => /** @type {number} */ (p.length));
  const lutealLengths = cycles.map((c) => c.lutealLength).filter((x) => x !== null);

  const cycleStats = describe(validLengths.slice(-12));
  const periodStats = describe(periodLengths.slice(-12));
  const lutealLength =
    lutealLengths.length >= 2 ? Math.round(median(/** @type {number[]} */ (lutealLengths.slice(-6)))) : (settings.lutealLength ?? DEFAULTS.lutealLength);
  const predictedPeriodLength = periodLengths.length ? Math.round(median(periodLengths.slice(-6))) : periodHint;
  const lengthPrediction = predictLength(validLengths, settings.cycleLength);

  const last = periods[periods.length - 1] ?? null;
  const lastCycle = cycles[cycles.length - 1] ?? null;

  /** @type {null | Record<string, any>} */
  let current = null;
  /** @type {null | Record<string, any>} */
  let prediction = null;

  if (last && last.start <= today) {
    const cycleDay = diffDays(last.start, today) + 1;
    const expected = addDays(last.start, lengthPrediction.length);
    const staleAfter = Math.max(lengthPrediction.length * 2, 60);
    const stale = cycleDay > staleAfter;
    const lateDays = Math.max(0, diffDays(expected, today));
    const late = !stale && lateDays > 0;
    const nextStart = late ? today : expected;
    const inPeriod = today <= (last.lengthKnown ? last.end : last.estimatedEnd);

    const confirmed = lastCycle?.ovulation ?? null;
    const estimatedOv = addDays(expected, -lutealLength);
    const ovulationDay = confirmed ? confirmed.day : estimatedOv;
    const ovulation = /** @type {Ovulation} */ (confirmed ?? { day: estimatedOv, method: 'estimate' });

    current = {
      start: last.start,
      cycleDay,
      inPeriod,
      stale,
      late,
      lateDays: late ? lateDays : 0,
      ovulation,
      phase: stale ? null : phaseOn(today, { start: last.start, periodEnd: last.lengthKnown ? last.end : last.estimatedEnd, ovulationDay, nextStart: expected }),
    };

    if (!stale && lateDays <= 7) {
      const fertileStart = addDays(ovulationDay, -5);
      const fertileEnd = addDays(ovulationDay, 1);
      prediction = {
        nextPeriodStart: nextStart,
        window: [addDays(nextStart, -lengthPrediction.margin), addDays(nextStart, lengthPrediction.margin)],
        margin: lengthPrediction.margin,
        cycleLength: lengthPrediction.length,
        periodLength: predictedPeriodLength,
        basis: lengthPrediction.basis,
        sampleSize: lengthPrediction.n,
        confidence: confidenceLevel(lengthPrediction, settings.mode),
        ovulationDay,
        ovulationMethod: ovulation.method,
        fertileStart,
        fertileEnd,
        pmsStart: addDays(nextStart, -5),
        daysUntilPeriod: diffDays(today, nextStart),
        daysUntilOvulation: diffDays(today, ovulationDay),
        upcoming: Array.from({ length: 6 }, (_, i) => addDays(nextStart, lengthPrediction.length * i)),
      };
    }
  }

  return {
    today,
    periods,
    intermenstrual,
    cycles,
    stats: { cycle: cycleStats, period: periodStats, lutealLength, validCycleCount: validLengths.length },
    current,
    prediction,
    hasData: periods.length > 0,
  };
}

/**
 * @param {{ basis: string, n: number, margin: number }} p
 * @param {string} [mode]
 * @returns {'low' | 'medium' | 'high'}
 */
function confidenceLevel(p, mode) {
  if (mode === 'perimenopause' || mode === 'postpartum') return 'low';
  if (p.basis === 'history' && p.n >= 4 && p.margin <= 2) return 'high';
  if (p.basis === 'history' && p.margin <= 4) return 'medium';
  if (p.basis === 'mixed' || p.basis === 'settings') return 'medium';
  return 'low';
}

/**
 * Phase for a date inside a cycle.
 * @param {string} date
 * @param {{ start: string, periodEnd: string, ovulationDay: string, nextStart: string }} c
 * @returns {'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | null}
 */
export function phaseOn(date, c) {
  if (date < c.start || date >= c.nextStart) return null;
  if (date <= c.periodEnd) return 'menstrual';
  const fromOv = diffDays(c.ovulationDay, date);
  if (Math.abs(fromOv) <= 1) return 'ovulatory';
  return fromOv < 0 ? 'follicular' : 'luteal';
}

/**
 * Fertility level relative to (estimated) ovulation, following the classic Wilcox curve.
 * @param {number} daysFromOvulation
 * @returns {'high' | 'medium' | 'low' | null}
 */
export function fertilityLevel(daysFromOvulation) {
  if (daysFromOvulation >= -2 && daysFromOvulation <= 0) return 'high';
  if (daysFromOvulation >= -5 && daysFromOvulation <= -3) return 'medium';
  if (daysFromOvulation === 1) return 'low';
  return null;
}

/**
 * Calendar decorations for a range of dates.
 * @param {ReturnType<typeof analyze>} a
 * @param {Record<string, DayEntry>} days
 * @param {string[]} dates
 * @param {{ showFertility?: boolean, showPredictions?: boolean }} [opts]
 */
export function calendarMarks(a, days, dates, opts = {}) {
  const showFertility = opts.showFertility ?? true;
  const showPredictions = opts.showPredictions ?? true;
  /** @type {Record<string, { period: null | 'logged' | 'estimated' | 'predicted', spotting: boolean, fertility: null | 'high' | 'medium' | 'low',
   *  ovulation: null | 'confirmed' | 'estimated', pms: boolean, phase: string | null, hasData: boolean, intermenstrual: boolean }>} */
  const marks = {};
  const pred = showPredictions ? a.prediction : null;
  for (const d of dates) {
    const entry = days[d];
    marks[d] = {
      period: entry && BLEEDING.has(entry.flow) ? 'logged' : null,
      spotting: entry?.flow === 'spotting',
      fertility: null,
      ovulation: null,
      pms: false,
      phase: null,
      hasData: Boolean(entry && Object.keys(entry).some((k) => k !== 'updatedAt')),
      intermenstrual: a.intermenstrual.some((r) => d >= r.start && d <= r.end),
    };
  }

  // 1. Logged cycles: phases, the unconfirmed tail of periods, confirmed ovulations and, for the
  //    ongoing cycle, the current fertile window and PMS days.
  a.cycles.forEach((c, i) => {
    const period = a.periods[i];
    const periodEnd = period.lengthKnown ? period.end : period.estimatedEnd;
    /** @type {string} */
    let nextStart;
    /** @type {string | null} */
    let ovDay;
    if (c.end) {
      nextStart = addDays(c.end, 1);
      ovDay = c.ovulation?.day ?? addDays(nextStart, -a.stats.lutealLength);
    } else if (pred) {
      nextStart = pred.nextPeriodStart;
      ovDay = pred.ovulationDay;
    } else {
      nextStart = addDays(periodEnd, 1);
      ovDay = null;
    }
    for (const d of dates) {
      if (d < c.start || d >= nextStart) continue;
      const m = marks[d];
      m.phase = ovDay ? phaseOn(d, { start: c.start, periodEnd, ovulationDay: ovDay, nextStart }) : 'menstrual';
      if (!m.period && d > period.end && d <= periodEnd) m.period = d > a.today ? 'predicted' : 'estimated';
      if (c.ovulation && d === c.ovulation.day) m.ovulation = 'confirmed';
      if (c.ongoing && pred) {
        if (showFertility && !m.period) m.fertility = fertilityLevel(diffDays(pred.ovulationDay, d));
        if (showFertility && d === pred.ovulationDay && !m.ovulation) m.ovulation = pred.ovulationMethod === 'estimate' ? 'estimated' : 'confirmed';
        if (d >= pred.pmsStart && !m.period) m.pms = true;
      }
    }
  });

  // 2. Predicted future cycles.
  if (pred) {
    pred.upcoming.forEach((/** @type {string} */ start, /** @type {number} */ idx) => {
      const periodEnd = addDays(start, pred.periodLength - 1);
      const nextStart = pred.upcoming[idx + 1] ?? addDays(start, pred.cycleLength);
      const ovDay = addDays(nextStart, -a.stats.lutealLength);
      for (const d of dates) {
        if (d < start || d >= nextStart || d < a.today) continue;
        const m = marks[d];
        if (m.period === 'logged') continue;
        m.phase = phaseOn(d, { start, periodEnd, ovulationDay: ovDay, nextStart });
        if (d <= periodEnd) m.period = 'predicted';
        if (showFertility && !m.period) {
          m.fertility = fertilityLevel(diffDays(ovDay, d));
          if (d === ovDay) m.ovulation = 'estimated';
        }
        if (d >= addDays(nextStart, -5) && !m.period) m.pms = true;
      }
    });
  }
  return marks;
}
