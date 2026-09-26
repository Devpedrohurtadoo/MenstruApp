// Notices (things worth knowing or checking with a professional) and personal patterns.
// Thresholds follow FIGO 2018 ranges for normal uterine bleeding in adults (frequency 24–38
// days, duration ≤ 8 days, variation ≤ 7–9 days) and the wider ranges typical in the first
// years after menarche (21–45 days). Wording is always informative, never a diagnosis.

import { BLEEDING, SYMPTOMS, DIFFICULT_MOODS, MOODS } from './catalog.js';
import { addDays, diffDays, rangeISO } from '../core/dates.js';
import { calendarMarks, fertilityLevel } from './cycle.js';

/**
 * @typedef {{ id: string, level: 'urgent' | 'consult' | 'info', params?: Record<string, any>, article?: string }} Notice
 */

const RED_FLAGS = new Set(SYMPTOMS.filter((s) => s.redFlag).map((s) => s.id));

/**
 * @param {ReturnType<typeof import('./cycle.js').analyze>} a
 * @param {Record<string, any>} days
 * @param {{ today: string, mode: string, age: number | null, experience?: string, modeSince?: string | null,
 *   pregnancyActive?: boolean, postpartumBirthDate?: string | null }} ctx
 * @returns {Notice[]}
 */
export function computeNotices(a, days, ctx) {
  /** @type {Notice[]} */
  const out = [];
  const { today, mode } = ctx;
  const young = (ctx.age !== null && ctx.age < 18) || (ctx.age === null && ctx.experience === 'new');
  const recent = [today, addDays(today, -1)];

  // Red-flag symptoms logged today or yesterday.
  for (const d of recent) {
    for (const id of Object.keys(days[d]?.symptoms ?? {})) {
      if (RED_FLAGS.has(id) && !out.some((n) => n.params?.symptom === id)) {
        out.push({ id: `redFlag.${id}`, level: 'urgent', params: { symptom: id } });
      }
    }
  }

  if (mode === 'pregnant') {
    const bleed = recent.find((d) => days[d]?.flow && days[d].flow !== 'none');
    if (bleed) out.push({ id: 'pregnancyBleeding', level: days[bleed].flow === 'heavy' ? 'urgent' : 'consult', article: 'embarazo-alarma' });
    return out;
  }

  if (mode === 'postpartum' && ctx.postpartumBirthDate) {
    const weeks = diffDays(ctx.postpartumBirthDate, today) / 7;
    const heavy = recent.some((d) => days[d]?.flow === 'heavy' && days[d]?.clots === 'large');
    if (heavy && weeks <= 12) out.push({ id: 'postpartumHeavyBleeding', level: 'urgent', article: 'posparto' });
  }

  const periods = a.periods;
  const last = periods[periods.length - 1] ?? null;

  if (mode === 'perimenopause' && periods.length >= 2) {
    const prev = periods[periods.length - 2];
    if (last && diffDays(prev.end, last.start) >= 365) out.push({ id: 'postmenopausalBleeding', level: 'consult', article: 'menopausia' });
  }
  if (mode === 'perimenopause' && last && diffDays(last.end, today) >= 365) {
    out.push({ id: 'menopauseMilestone', level: 'info', params: { count: diffDays(last.end, today) }, article: 'menopausia' });
  }

  const cur = a.current;
  if (cur?.stale) out.push({ id: 'stale', level: 'info' });

  const tracking = mode === 'track' || mode === 'conceive' || mode === 'avoid';
  // Hormonal contraception: there is no natural cycle, so a late or absent bleed, amenorrhoea or
  // irregular bleeding do not mean what they mean in a natural cycle (see cycle.js).
  const hormonal = a.hormonal ?? null;
  // A natural cycle, as opposed to bleeding driven by a hormonal method.
  const natural = tracking && !hormonal;
  if (tracking && cur && !cur.stale && cur.late && cur.lateDays >= 5) {
    if (hormonal) {
      out.push({ id: 'lateWithdrawal', level: 'info', params: { count: cur.lateDays }, article: 'metodos-anticonceptivos' });
    } else {
      const unprotected = Object.keys(days).some((d) => d >= cur.start && days[d]?.sex === 'unprotected');
      out.push({ id: unprotected ? 'lateTest' : 'late', level: 'info', params: { count: cur.lateDays }, article: 'test-embarazo' });
    }
  }

  // No bleeding for 90+ days while the user keeps logging other things.
  if (natural && last && diffDays(last.start, today) >= 90) {
    const logging = Object.keys(days).filter((d) => d > addDays(today, -30)).length >= 5;
    if (logging) out.push({ id: 'amenorrhea', level: 'consult', params: { count: diffDays(last.start, today) }, article: 'ciclos-irregulares' });
  }

  const recentCycles = a.cycles.filter((c) => c.length !== null && !c.excluded).slice(-6);
  const lengths = recentCycles.map((c) => /** @type {number} */ (c.length));
  if (natural && !young && lengths.length >= 3) {
    const variation = Math.max(...lengths) - Math.min(...lengths);
    const limit = ctx.age !== null && ctx.age >= 26 && ctx.age <= 41 ? 7 : 9;
    if (variation > limit) out.push({ id: 'irregular', level: 'info', params: { count: variation }, article: 'ciclos-irregulares' });
  }
  const [minNormal, maxNormal] = young ? [21, 45] : [24, 38];
  if (natural && lengths.filter((l) => l < minNormal).length >= 2) out.push({ id: 'shortCycles', level: 'consult', params: { min: minNormal }, article: 'ciclos-irregulares' });
  if (natural && lengths.filter((l) => l > maxNormal).length >= 2) out.push({ id: 'longCycles', level: 'consult', params: { max: maxNormal }, article: 'ciclos-irregulares' });

  const knownPeriods = periods.filter((p) => p.lengthKnown).slice(-3);
  if (mode !== 'postpartum' && knownPeriods.some((p) => /** @type {number} */ (p.length) > 8)) {
    out.push({ id: 'longPeriod', level: 'consult', article: 'sangrado-abundante' });
  }

  if (last && mode !== 'postpartum') {
    const inLast = rangeISO(last.start, last.end);
    const heavyDays = inLast.filter((d) => days[d]?.flow === 'heavy').length;
    const bigClots = inLast.some((d) => days[d]?.clots === 'large');
    if (heavyDays >= 3 || bigClots) out.push({ id: 'heavyFlow', level: 'info', article: 'sangrado-abundante' });
  }

  // Without a scheduled bleed (implant, hormonal IUD, injection, minipill...) all bleeding is
  // "unscheduled": "between periods" does not apply.
  if (a.intermenstrual.some((r) => r.start >= addDays(today, -90)) && mode !== 'postpartum' && !(hormonal && !hormonal.scheduledBleeds)) {
    out.push({ id: 'intermenstrual', level: 'consult', article: 'ciclos-irregulares' });
  }

  if (mode === 'conceive' && ctx.modeSince) {
    const months = diffDays(ctx.modeSince, today) / 30.44;
    const threshold = ctx.age !== null && ctx.age >= 35 ? 6 : 12;
    if (months >= threshold) out.push({ id: 'conceiveHelp', level: 'info', params: { count: threshold }, article: 'buscar-embarazo' });
  }

  if (mode === 'avoid' && a.prediction) {
    const risky = rangeISO(addDays(today, -5), today).find(
      (d) => days[d]?.sex === 'unprotected' && fertilityLevel(diffDays(/** @type {any} */ (a.prediction).ovulationDay, d)) !== null,
    );
    if (risky) out.push({ id: 'emergencyContraception', level: 'consult', params: { count: diffDays(risky, today) }, article: 'anticoncepcion-emergencia' });
  }

  const order = { urgent: 0, consult: 1, info: 2 };
  return out.sort((x, y) => order[x.level] - order[y.level]);
}

/**
 * Personal patterns: symptoms/moods that cluster in a phase, energy by phase, regularity.
 * @param {ReturnType<typeof import('./cycle.js').analyze>} a
 * @param {Record<string, any>} days
 */
export function computeInsights(a, days) {
  const dates = Object.keys(days).sort();
  if (!dates.length || !a.periods.length) return { patterns: [], energy: null, regularity: null, phaseTable: null };
  const marks = calendarMarks(a, days, dates, { showPredictions: false });
  /** @type {Record<string, number>} */
  const phaseDays = {};
  /** @type {Record<string, Record<string, number>>} */
  const occurrences = {};
  /** @type {Record<string, Set<string>>} */
  const cyclesSeen = {};
  /** @type {Record<string, number[]>} */
  const energy = {};
  const cycleOf = (/** @type {string} */ d) => a.periods.filter((p) => p.start <= d).at(-1)?.start ?? 'none';

  for (const d of dates) {
    const phase = marks[d]?.phase;
    const entry = days[d];
    if (!phase || !entry) continue;
    phaseDays[phase] = (phaseDays[phase] ?? 0) + 1;
    const items = [...Object.keys(entry.symptoms ?? {}).map((s) => `symptom:${s}`), ...(entry.moods ?? []).map((/** @type {string} */ m) => `mood:${m}`)];
    for (const item of items) {
      occurrences[item] = occurrences[item] ?? {};
      occurrences[item][phase] = (occurrences[item][phase] ?? 0) + 1;
      (cyclesSeen[item] = cyclesSeen[item] ?? new Set()).add(cycleOf(d));
    }
    if (typeof entry.energy === 'number') (energy[phase] = energy[phase] ?? []).push(entry.energy);
  }

  const phases = Object.keys(phaseDays).filter((p) => phaseDays[p] >= 3);
  /** @type {Array<{ item: string, kind: 'symptom' | 'mood', id: string, phase: string, rate: number, lift: number, count: number }>} */
  const patterns = [];
  for (const [item, byPhase] of Object.entries(occurrences)) {
    const total = Object.values(byPhase).reduce((x, y) => x + y, 0);
    if (total < 4 || (cyclesSeen[item]?.size ?? 0) < 2) continue;
    const rates = phases.map((p) => ({ phase: p, rate: (byPhase[p] ?? 0) / phaseDays[p] }));
    const best = rates.reduce((x, y) => (y.rate > x.rate ? y : x), { phase: '', rate: 0 });
    const others = rates.filter((r) => r.phase !== best.phase);
    const otherMean = others.length ? others.reduce((x, y) => x + y.rate, 0) / others.length : 0;
    const lift = otherMean > 0 ? best.rate / otherMean : best.rate > 0 ? 10 : 0;
    if (best.rate >= 0.4 && lift >= 1.8) {
      const [kind, id] = /** @type {['symptom' | 'mood', string]} */ (item.split(':'));
      patterns.push({ item, kind, id, phase: best.phase, rate: Math.round(best.rate * 100) / 100, lift: Math.round(lift * 10) / 10, count: total });
    }
  }
  patterns.sort((x, y) => y.lift - x.lift || y.count - x.count);

  /** @type {null | { best: string, worst: string, averages: Record<string, number> }} */
  let energyInsight = null;
  const avgs = Object.fromEntries(
    Object.entries(energy)
      .filter(([, xs]) => xs.length >= 3)
      .map(([p, xs]) => [p, Math.round((xs.reduce((x, y) => x + y, 0) / xs.length) * 10) / 10]),
  );
  const keys = Object.keys(avgs);
  if (keys.length >= 2) {
    const best = keys.reduce((x, y) => (avgs[y] > avgs[x] ? y : x));
    const worst = keys.reduce((x, y) => (avgs[y] < avgs[x] ? y : x));
    if (avgs[best] - avgs[worst] >= 1) energyInsight = { best, worst, averages: avgs };
  }

  const stats = a.stats.cycle;
  const regularity = stats && stats.count >= 3 ? (stats.range <= 3 ? 'veryRegular' : stats.range <= 7 ? 'regular' : 'variable') : null;

  // Symptom × phase frequency table for the analysis view.
  const phaseOrder = ['menstrual', 'follicular', 'ovulatory', 'luteal'].filter((p) => phaseDays[p]);
  const topItems = Object.entries(occurrences)
    .map(([item, byPhase]) => ({ item, total: Object.values(byPhase).reduce((x, y) => x + y, 0) }))
    .sort((x, y) => y.total - x.total)
    .slice(0, 10)
    .map((x) => x.item);
  const phaseTable = {
    phases: phaseOrder,
    rows: topItems.map((item) => ({
      item,
      kind: item.split(':')[0],
      id: item.split(':')[1],
      rates: phaseOrder.map((p) => (phaseDays[p] ? Math.round(((occurrences[item][p] ?? 0) / phaseDays[p]) * 100) : 0)),
    })),
  };

  return { patterns: patterns.slice(0, 5), energy: energyInsight, regularity, phaseTable };
}

/**
 * How often each symptom/mood was logged in a period of time.
 * @param {Record<string, any>} days
 * @param {string} from
 * @param {string} to
 */
export function frequencies(days, from, to) {
  const inRange = Object.keys(days).filter((d) => d >= from && d <= to);
  /** @type {Record<string, number>} */
  const symptoms = {};
  /** @type {Record<string, number>} */
  const moods = {};
  for (const d of inRange) {
    for (const s of Object.keys(days[d].symptoms ?? {})) symptoms[s] = (symptoms[s] ?? 0) + 1;
    for (const m of days[d].moods ?? []) moods[m] = (moods[m] ?? 0) + 1;
  }
  const sort = (/** @type {Record<string, number>} */ o) =>
    Object.entries(o)
      .map(([id, count]) => ({ id, count }))
      .sort((x, y) => y.count - x.count);
  return { loggedDays: inRange.length, symptoms: sort(symptoms), moods: sort(moods) };
}

/**
 * Wellbeing summary for a list of moods (share of difficult moods).
 * @param {Record<string, any>} days
 * @param {string} from
 */
export function moodBalance(days, from) {
  let good = 0;
  let hard = 0;
  for (const d of Object.keys(days)) {
    if (d < from) continue;
    for (const m of days[d].moods ?? []) {
      if (!(/** @type {readonly string[]} */ (MOODS).includes(m))) continue;
      if (DIFFICULT_MOODS.has(m)) hard++;
      else good++;
    }
  }
  return { good, hard };
}

/** Days with bleeding logged in a range. @param {Record<string, any>} days @param {string} from @param {string} to */
export function bleedingDays(days, from, to) {
  return rangeISO(from, to).filter((d) => BLEEDING.has(days[d]?.flow)).length;
}
