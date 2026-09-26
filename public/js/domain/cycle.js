// Cycle engine: turns logged days into periods, cycles, statistics and predictions.
// Pure functions only (no DOM, no storage) so every rule is unit-tested.
//
// Definitions
//  - Bleeding day: flow light/medium/heavy (spotting alone never starts a period). Days after
//    `today` are ignored (they can only come from a clock or time-zone change, or an import).
//  - Period: run of bleeding days. Gaps of up to 2 unlogged/spotting days are bridged, and gaps of
//    3 when none of those days was logged as "no flow" and the period stays within 8 days.
//    A period ends with a day logged as "no flow" or spotting, or when bleeding days stop: a day
//    with other logs (symptoms, a pill...) but no flow says nothing about bleeding.
//  - A run that starts less than 15 days after the previous period started is treated as
//    intermenstrual bleeding (worth mentioning to a professional), not as a new cycle. A single
//    isolated light day followed within 15 days by a real period is the intermenstrual one.
//  - Pregnancies (`excludeRanges`, from the LMP to the end) and other bleeding that is not
//    menstrual (`nonMenstrual`: lochia after a birth, bleeding after a loss) never form periods;
//    the period that started a pregnancy (its LMP) still counts.
//  - Cycle length: days between two consecutive period starts.
//  - Prediction: recency-weighted mean of the last ≤6 valid cycles (outliers and likely missed
//    period logs removed), blended with the user's stated average when there is little history;
//    the margin reflects the observed spread and how much data there is.
//  - Ovulation: confirmed by basal temperature ("3 over 6" rule) or predicted by an LH surge
//    (ignored during the period or outside 8–18 days before the next period), otherwise estimated
//    as next period − luteal phase length (learned or 14 days). A detected ovulation can push the
//    expected next period later, never earlier.
//  - Hormonal contraception (see hormonalContraception() in modes.js): no ovulation, phases or
//    fertile window. With a pill/patch/ring break the next withdrawal bleed is still predicted;
//    with the other hormonal methods bleeding is unscheduled, so nothing is predicted and a long
//    time without bleeding is neither "late" nor "stale".

import { BLEEDING } from './catalog.js';
import { hormonalContraception } from './modes.js';
import { addDays, diffDays, isISODate, maxISO, rangeISO } from '../core/dates.js';

export const DEFAULTS = Object.freeze({ cycleLength: 28, periodLength: 5, lutealLength: 14 });
export const LIMITS = Object.freeze({ minCycle: 15, maxCycle: 90, bridgeGap: 3, longBridgeGap: 4, maxBridgedPeriod: 8, maxPeriod: 15 });
/** LH surge window of a completed cycle, in days before the next period (luteal phase 7–17 days). */
const LH_WINDOW = Object.freeze({ earliest: 18, latest: 8 });
const HISTORY_WINDOW = 6;
const MAX_MARGIN = 10;

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
 * @typedef {{ start: string, end: string, days: string[] }} Run
 */

/**
 * Bleeding days that are not menstrual: those inside a pregnancy (except the period that started
 * it, which begins on its LMP) and those in `nonMenstrual` ranges (lochia, bleeding after a loss).
 * @param {string[]} bleeding sorted bleeding days
 * @param {{ excludeRanges?: Array<[string, string]>, nonMenstrual?: Array<[string, string]> }} ctx
 */
function nonMenstrualDays(bleeding, ctx) {
  /** @type {Set<string>} */
  const skip = new Set();
  for (const [lmp, end] of ctx.excludeRanges ?? []) {
    /** @type {Set<string>} */
    const lmpPeriod = new Set();
    const first = bleeding.find((d) => Math.abs(diffDays(lmp, d)) <= LIMITS.bridgeGap);
    if (first) {
      let last = first;
      for (const d of bleeding) {
        if (d < first) continue;
        if (diffDays(last, d) > LIMITS.bridgeGap || diffDays(first, d) >= LIMITS.maxPeriod) break;
        lmpPeriod.add(d);
        last = d;
      }
    }
    for (const d of bleeding) if (d >= lmp && d <= end && !lmpPeriod.has(d)) skip.add(d);
  }
  for (const [from, to] of ctx.nonMenstrual ?? []) for (const d of bleeding) if (d >= from && d <= to) skip.add(d);
  return skip;
}

/**
 * Whether bleeding on `d` continues `run`: after up to 2 unlogged/spotting days always; after 3
 * only if none was logged as "no flow" and the period stays within a normal length.
 * @param {Record<string, DayEntry>} days
 * @param {Run} run
 * @param {string} d
 */
function continuesRun(days, run, d) {
  const gap = diffDays(run.end, d);
  if (gap <= LIMITS.bridgeGap) return true;
  if (gap > LIMITS.longBridgeGap) return false;
  return rangeISO(addDays(run.end, 1), addDays(d, -1)).every((x) => days[x]?.flow !== 'none') && diffDays(run.start, d) < LIMITS.maxBridgedPeriod;
}

/** A single light day on its own (often spotting logged as "light"). @param {Record<string, DayEntry>} days @param {Run} run */
const loneLightDay = (days, run) => run.days.length === 1 && days[run.start]?.flow === 'light';

/** Clearly a period: 3+ days or medium/heavy flow. @param {Record<string, DayEntry>} days @param {Run} run */
const periodLike = (days, run) => run.days.length >= 3 || run.days.some((d) => days[d]?.flow === 'medium' || days[d]?.flow === 'heavy');

/**
 * @param {Record<string, DayEntry>} days
 * @param {{ today: string, excludeRanges?: Array<[string, string]>, nonMenstrual?: Array<[string, string]>, periodLengthHint?: number }} ctx
 */
export function detectPeriods(days, ctx) {
  const all = Object.keys(days)
    .filter((d) => isISODate(d) && d <= ctx.today && BLEEDING.has(days[d]?.flow))
    .sort();
  const skip = nonMenstrualDays(all, ctx);
  const bleeding = all.filter((d) => !skip.has(d));

  /** @type {Run[]} */
  const runs = [];
  for (const d of bleeding) {
    const last = runs[runs.length - 1];
    if (last && continuesRun(days, last, d)) {
      last.end = d;
      last.days.push(d);
    } else {
      runs.push({ start: d, end: d, days: [d] });
    }
  }

  /** @type {Run[]} */
  const merged = [];
  /** @type {Array<{ start: string, end: string }>} */
  const intermenstrual = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (!prev || diffDays(prev.start, run.start) >= LIMITS.minCycle) {
      merged.push(run);
    } else if (loneLightDay(days, prev) && periodLike(days, run)) {
      // The lone light day was the bleeding between periods, not the start of this one.
      intermenstrual.push({ start: prev.start, end: prev.end });
      merged[merged.length - 1] = run;
    } else {
      intermenstrual.push({ start: run.start, end: run.end });
    }
  }
  intermenstrual.sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0));

  const hint = ctx.periodLengthHint ?? DEFAULTS.periodLength;
  /** @type {Period[]} */
  const periods = merged.map((run, i) => {
    const length = diffDays(run.start, run.end) + 1;
    const next = merged[i + 1];
    const after = rangeISO(addDays(run.end, 1), addDays(run.end, LIMITS.bridgeGap));
    // Only a day logged as "no flow" or spotting ends a period: other logs say nothing about bleeding.
    const explicitEnd = after.some((d) => d <= ctx.today && (days[d]?.flow === 'none' || days[d]?.flow === 'spotting'));
    const finished = diffDays(run.end, ctx.today) > LIMITS.bridgeGap || Boolean(next);
    // Prolonged bleeding (> 15 days) still has a known length: it is exactly what should be flagged.
    const lengthKnown = explicitEnd || (finished && run.days.length >= 2);
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
 * The last positive (or "peak") test of the last LH surge among the given dates.
 * @param {Record<string, DayEntry>} days
 * @param {string[]} dates sorted
 */
function lhSurgeEnd(days, dates) {
  const positives = dates.filter((d) => days[d].lh === 'positive' || days[d].lh === 'peak');
  if (!positives.length) return null;
  let first = positives.length - 1;
  while (first > 0 && diffDays(positives[first - 1], positives[first]) <= 2) first--;
  const surge = positives.slice(first);
  const peaks = surge.filter((d) => days[d].lh === 'peak');
  const pick = peaks.length ? peaks : surge;
  return pick[pick.length - 1];
}

/**
 * @param {Record<string, DayEntry>} days
 * @param {string} from first day of the cycle
 * @param {string} to inclusive
 * @param {{ periodEnd?: string, lhFrom?: string, lhTo?: string }} [opts] LH positives count only after the
 *   period and inside [lhFrom, lhTo]: a stray positive on day 3 must not move the ovulation.
 * @returns {Ovulation | null}
 */
export function detectOvulation(days, from, to, opts = {}) {
  const dates = Object.keys(days)
    .filter((d) => d >= from && d <= to)
    .sort();
  const readings = dates.filter((d) => typeof days[d].bbt === 'number' && !days[d].bbtDisturbed).map((d) => ({ date: d, bbt: days[d].bbt }));
  const bbt = detectBbtShift(readings);
  if (bbt) return bbt;
  const plausible = dates.filter((d) => (!opts.periodEnd || d > opts.periodEnd) && (!opts.lhFrom || d >= opts.lhFrom) && (!opts.lhTo || d <= opts.lhTo));
  const lhDay = lhSurgeEnd(days, plausible);
  if (lhDay) return { day: addDays(lhDay, 1), method: 'lh' };
  return null;
}

/** @param {number} x @param {number} min @param {number} max */
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

/**
 * Drops cycles that are about 2× or 3× the others: almost always a period that was not logged.
 * @param {number[]} lengths
 */
export function withoutMissedPeriods(lengths) {
  if (lengths.length < 3) return lengths;
  return lengths.filter((x, i) => {
    const others = lengths.filter((_, j) => j !== i);
    const m = median(others);
    if (Math.max(...others) - Math.min(...others) > 7) return true;
    return ![2, 3].some((k) => Math.abs(x - k * m) <= Math.max(3, 0.1 * k * m));
  });
}

/**
 * @param {number[]} lengths chronological cycle lengths
 * @param {number | null | undefined} prior user-stated average
 */
export function predictLength(lengths, prior) {
  const sample = withoutMissedPeriods(lengths.slice(-HISTORY_WINDOW));
  if (!sample.length) {
    // Without any cycle the stated (or default) average is only a rough guide.
    return { length: prior ?? DEFAULTS.cycleLength, margin: prior ? 5 : 7, basis: /** @type {'settings' | 'default'} */ (prior ? 'settings' : 'default'), n: 0 };
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
    const margin = clamp(Math.round(sd) + (used.length === 3 ? 1 : 0), 1, MAX_MARGIN);
    return { length: Math.round(mean), margin, basis: /** @type {const} */ ('history'), n: used.length };
  }
  // One or two cycles: blend with the prior; the margin covers what has been seen so far.
  const p = prior ?? DEFAULTS.cycleLength;
  const k = 2;
  const mean = (used.reduce((a, b) => a + b, 0) + p * k) / (used.length + k);
  const spread = Math.max(...[...used, p].map((x) => Math.abs(x - mean)));
  const margin = clamp(Math.ceil(spread) + (used.length === 1 ? 3 : 2), 3, MAX_MARGIN);
  return { length: Math.round(mean), margin, basis: /** @type {const} */ ('mixed'), n: used.length };
}

/**
 * Full analysis of a profile's cycle data.
 * @param {Record<string, DayEntry>} days
 * @param {{ today: string, settings?: Record<string, any>, excludeRanges?: Array<[string, string]>, nonMenstrual?: Array<[string, string]> }} ctx
 *   excludeRanges: pregnancies from their LMP to their end; nonMenstrual: other bleeding that is not a period
 *   (lochia after a birth, bleeding after a loss). See pregnancyExclusions() in pregnancy.js.
 */
export function analyze(days, ctx) {
  const settings = ctx.settings ?? {};
  const today = ctx.today;
  const periodHint = settings.periodLength ?? DEFAULTS.periodLength;
  const { periods, intermenstrual } = detectPeriods(days, { today, excludeRanges: ctx.excludeRanges, nonMenstrual: ctx.nonMenstrual, periodLengthHint: periodHint });
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
    return { start: p.start, end, length, periodLength: p.length, ovulation: null, lutealLength: null, excluded: excl, ongoing: !next };
  });

  const validLengths = cycles.filter((c) => c.length !== null && !c.excluded).map((c) => /** @type {number} */ (c.length));
  const lengthPrediction = predictLength(validLengths, settings.cycleLength);
  const hormonal = hormonalContraception(settings);

  // Ovulation of each cycle. LH positives only count after the period and 8–18 days before the next
  // period (for the ongoing cycle, not earlier than that before the expected one). A hormonal method
  // stops ovulation, so the current cycle has none.
  cycles.forEach((c, i) => {
    const p = periods[i];
    const periodEnd = p.lengthKnown ? p.end : p.estimatedEnd;
    const next = periods[i + 1];
    const window = next
      ? { lhFrom: addDays(next.start, -LH_WINDOW.earliest), lhTo: addDays(next.start, -LH_WINDOW.latest) }
      : { lhFrom: maxISO(addDays(p.start, 5), addDays(p.start, lengthPrediction.length - LH_WINDOW.earliest - lengthPrediction.margin)) };
    c.ovulation = hormonal && c.ongoing ? null : detectOvulation(days, p.start, c.end ?? today, { periodEnd, ...window });
    const luteal = c.ovulation && next ? diffDays(c.ovulation.day, next.start) : null;
    c.lutealLength = luteal !== null && luteal >= 8 && luteal <= 18 ? luteal : null;
  });

  const periodLengths = periods.filter((p) => p.lengthKnown).map((p) => /** @type {number} */ (p.length));
  const lutealLengths = cycles.map((c) => c.lutealLength).filter((x) => x !== null);

  const cycleStats = describe(validLengths.slice(-12));
  const periodStats = describe(periodLengths.slice(-12));
  const lutealLength =
    lutealLengths.length >= 2 ? Math.round(median(/** @type {number[]} */ (lutealLengths.slice(-6)))) : (settings.lutealLength ?? DEFAULTS.lutealLength);
  // Prolonged bleeding episodes are reported, but do not make the predicted periods longer.
  const typicalLengths = periodLengths.filter((l) => l <= LIMITS.maxPeriod);
  const predictedPeriodLength = typicalLengths.length ? Math.round(median(typicalLengths.slice(-6))) : periodHint;

  const last = periods[periods.length - 1] ?? null;
  const lastCycle = cycles[cycles.length - 1] ?? null;
  // No cycle predictions during a pregnancy (the last period is the one that started it).
  const pregnant = settings.mode === 'pregnant';

  /** @type {null | Record<string, any>} */
  let current = null;
  /** @type {null | Record<string, any>} */
  let prediction = null;

  if (last && last.start <= today) {
    const cycleDay = diffDays(last.start, today) + 1;
    const confirmed = lastCycle?.ovulation ?? null;
    // Hormonal methods without a break: bleeding is unscheduled, there is nothing to predict.
    const unscheduled = Boolean(hormonal && !hormonal.scheduledBleeds);
    let expected = addDays(last.start, lengthPrediction.length);
    // A detected ovulation this cycle means the period comes about one luteal phase later.
    if (confirmed && addDays(confirmed.day, lutealLength) > expected) expected = addDays(confirmed.day, lutealLength);
    const staleAfter = Math.max(lengthPrediction.length * 2, 60);
    const stale = !unscheduled && cycleDay > staleAfter;
    const lateDays = Math.max(0, diffDays(expected, today));
    const late = !stale && !pregnant && !unscheduled && lateDays > 0;
    const nextStart = late ? today : expected;
    const inPeriod = today <= (last.lengthKnown ? last.end : last.estimatedEnd);

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
      phase: stale || pregnant || hormonal ? null : phaseOn(today, { start: last.start, periodEnd: last.lengthKnown ? last.end : last.estimatedEnd, ovulationDay, nextStart: expected }),
    };

    if (!stale && !pregnant && !unscheduled && lateDays <= 7) {
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
        /** 'withdrawal' with a combined hormonal method (pill, patch or ring with a break). */
        bleedKind: hormonal ? 'withdrawal' : 'period',
        // The ovulation fields stay (as estimates) for compatibility; with a hormonal method
        // modeFlags().fertility is false so they are never shown.
        ovulationDay,
        ovulationMethod: ovulation.method,
        fertileStart,
        fertileEnd,
        pmsStart: hormonal ? null : addDays(nextStart, -5),
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
    /** Hormonal contraception in use (null for a natural cycle). */
    hormonal,
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
  // With no complete cycle or just one, any date is a rough guess.
  if (p.n <= 1) return 'low';
  if (p.basis === 'history' && p.n >= 4 && p.margin <= 2) return 'high';
  if (p.margin <= 4) return 'medium';
  return 'low';
}

/**
 * How sure an ovulation mark is: confirmed by temperature, predicted by an LH test or estimated.
 * @param {Ovulation['method']} method
 * @returns {'confirmed' | 'lh' | 'estimated'}
 */
export function ovulationMark(method) {
  return method === 'bbt' ? 'confirmed' : method === 'lh' ? 'lh' : 'estimated';
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
   *  ovulation: null | 'confirmed' | 'lh' | 'estimated', pms: boolean, phase: string | null, hasData: boolean, intermenstrual: boolean }>} */
  const marks = {};
  const pred = showPredictions ? a.prediction : null;
  // With hormonal contraception there are no natural phases, ovulation, fertile days or PMS.
  const natural = !a.hormonal;
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
      ovDay = natural ? (c.ovulation?.day ?? addDays(nextStart, -a.stats.lutealLength)) : null;
    } else if (pred) {
      nextStart = pred.nextPeriodStart;
      ovDay = natural ? pred.ovulationDay : null;
    } else {
      nextStart = addDays(periodEnd, 1);
      ovDay = null;
    }
    for (const d of dates) {
      if (d < c.start || d >= nextStart) continue;
      const m = marks[d];
      m.phase = ovDay ? phaseOn(d, { start: c.start, periodEnd, ovulationDay: ovDay, nextStart }) : d <= periodEnd ? 'menstrual' : null;
      if (!m.period && d > period.end && d <= periodEnd) m.period = d > a.today ? 'predicted' : 'estimated';
      if (natural && c.ovulation && d === c.ovulation.day) m.ovulation = ovulationMark(c.ovulation.method);
      if (c.ongoing && pred && natural) {
        if (showFertility && !m.period) m.fertility = fertilityLevel(diffDays(pred.ovulationDay, d));
        if (showFertility && d === pred.ovulationDay && !m.ovulation) m.ovulation = ovulationMark(pred.ovulationMethod);
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
        m.phase = natural ? phaseOn(d, { start, periodEnd, ovulationDay: ovDay, nextStart }) : d <= periodEnd ? 'menstrual' : null;
        if (d <= periodEnd) m.period = 'predicted';
        if (natural && showFertility && !m.period) {
          m.fertility = fertilityLevel(diffDays(ovDay, d));
          if (d === ovDay) m.ovulation = 'estimated';
        }
        if (natural && d >= addDays(nextStart, -5) && !m.period) m.pms = true;
      }
    });
  }
  return marks;
}
