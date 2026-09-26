// What each usage mode shows. Keeping this in one table avoids scattered `if (mode === ...)`.

import { HORMONAL_METHODS } from './catalog.js';

/** Modes in which the user's contraceptive method applies (the ones where it can be set). */
const CONTRACEPTION_MODES = new Set(['track', 'avoid', 'postpartum']);

/**
 * The user's hormonal contraception, if any. With it there is no natural cycle: no ovulation to
 * predict, and bleeding is either a withdrawal bleed (combined methods with a break: pill, patch,
 * ring) or unscheduled bleeding (progestogen-only pill, continuous pill, injection, implant,
 * hormonal IUD), which is often irregular or absent. The copper IUD and barrier or fertility
 * awareness methods keep the natural cycle.
 * @param {Record<string, any> | null | undefined} settings
 * @returns {null | { method: string, scheduledBleeds: boolean }}
 */
export function hormonalContraception(settings) {
  const c = settings?.contraception;
  if (!c || !HORMONAL_METHODS.has(c.method) || !CONTRACEPTION_MODES.has(settings?.mode ?? 'track')) return null;
  const scheduledBleeds = c.method === 'patch' || c.method === 'ring' || (c.method === 'pill_combined' && c.pillRegimen !== 'continuous');
  return { method: c.method, scheduledBleeds };
}

/**
 * Which personal predictions can be shown and, when they are hidden, why: answers such as Luna's
 * "am I fertile?" can then explain it and point to the right setting.
 *  - predictionsHidden: 'mode' (pregnancy), 'postpartum' (period not back yet) or 'hormonal'
 *    (a method without scheduled bleeds).
 *  - fertilityHidden: 'mode' (pregnancy, postpartum, perimenopause), 'hormonal' (no natural
 *    ovulation) or 'setting' (avoid mode with the fertility toggle off).
 * @param {Record<string, any>} settings
 * @param {{ periodReturned?: boolean }} [extra]
 */
export function visibleFeatures(settings, extra = {}) {
  const mode = settings?.mode ?? 'track';
  const hormonal = hormonalContraception(settings);
  const postpartumReturned = Boolean(settings?.postpartum?.periodReturned || extra.periodReturned);
  /** @type {null | 'mode' | 'postpartum' | 'hormonal'} */
  let predictionsHidden = null;
  if (mode === 'pregnant') predictionsHidden = 'mode';
  else if (mode === 'postpartum' && !postpartumReturned) predictionsHidden = 'postpartum';
  else if (hormonal && !hormonal.scheduledBleeds) predictionsHidden = 'hormonal';
  /** @type {null | 'mode' | 'setting' | 'hormonal'} */
  let fertilityHidden = null;
  if (mode === 'pregnant' || mode === 'postpartum' || mode === 'perimenopause') fertilityHidden = 'mode';
  else if (hormonal) fertilityHidden = 'hormonal';
  else if (mode === 'avoid' && !settings?.features?.fertilityInAvoid) fertilityHidden = 'setting';
  return {
    predictions: !predictionsHidden,
    predictionsHidden,
    fertility: !fertilityHidden,
    fertilityHidden,
    hormonal,
    /** Bleeding is a withdrawal bleed of a combined hormonal method, not a period. */
    withdrawalBleeds: Boolean(hormonal?.scheduledBleeds),
  };
}

/**
 * @param {Record<string, any>} settings
 * @param {{ periodReturned?: boolean }} [extra]
 */
export function modeFlags(settings, extra = {}) {
  const mode = settings?.mode ?? 'track';
  const visible = visibleFeatures(settings, extra);
  return {
    mode,
    /** Cycle predictions (next period, phases). */
    predictions: visible.predictions,
    /** Fertile window / ovulation highlights. */
    fertility: visible.fertility,
    /** Fertility is the main focus of the home screen. */
    fertilityFocus: mode === 'conceive',
    /** Basal temperature, mucus and LH tests shown prominently in the log. */
    fertilityTracking: (mode === 'conceive' || mode === 'avoid' || mode === 'track') && !visible.hormonal,
    contraception: mode === 'avoid' || mode === 'track' || mode === 'postpartum',
    pregnancy: mode === 'pregnant',
    postpartum: mode === 'postpartum',
    menopause: mode === 'perimenopause',
    /** Predictions carry a low-confidence warning. */
    lowConfidence: mode === 'perimenopause' || mode === 'postpartum',
    /** Show the "this app is not a contraceptive" disclaimer next to fertility info. */
    contraceptionDisclaimer: mode === 'avoid' || mode === 'track',
    /** Hormonal contraception in use (no natural cycle), see hormonalContraception(). */
    hormonal: visible.hormonal,
    /** Bleeds are withdrawal bleeds: say "withdrawal bleed" rather than "period". */
    withdrawalBleeds: visible.withdrawalBleeds,
    /** Why predictions / fertility are hidden (see visibleFeatures()). */
    predictionsHidden: visible.predictionsHidden,
    fertilityHidden: visible.fertilityHidden,
  };
}

/**
 * Which tips suit a day: the life stage, otherwise the phase of the cycle on that day.
 * @param {{ pregnancy: boolean, postpartum: boolean, predictions: boolean, menopause: boolean }} flags see modeFlags()
 * @param {string | null | undefined} phase
 */
export function tipTopic(flags, phase) {
  if (flags.pregnancy) return 'pregnancy';
  if (flags.postpartum && !flags.predictions) return 'postpartum';
  if (flags.menopause) return 'menopause';
  return phase ?? 'general';
}

/** Tabs of the daily log that make sense for a mode. @param {string} mode */
export function logSections(mode) {
  const base = ['period', 'symptoms', 'mood', 'body', 'notes'];
  if (mode === 'pregnant') return ['bleeding', 'symptoms', 'mood', 'body', 'notes'];
  if (mode === 'postpartum') return ['period', 'symptoms', 'mood', 'body', 'contraception', 'notes'];
  if (mode === 'perimenopause') return [...base.slice(0, 4), 'sex', 'notes'];
  return ['period', 'symptoms', 'mood', 'fertility', 'sex', 'contraception', 'body', 'notes'];
}
