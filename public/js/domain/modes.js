// What each usage mode shows. Keeping this in one table avoids scattered `if (mode === ...)`.

/**
 * @param {Record<string, any>} settings
 * @param {{ periodReturned?: boolean }} [extra]
 */
export function modeFlags(settings, extra = {}) {
  const mode = settings?.mode ?? 'track';
  const fertilityInAvoid = Boolean(settings?.features?.fertilityInAvoid);
  const postpartumReturned = Boolean(settings?.postpartum?.periodReturned || extra.periodReturned);
  return {
    mode,
    /** Cycle predictions (next period, phases). */
    predictions: mode === 'track' || mode === 'conceive' || mode === 'avoid' || mode === 'perimenopause' || (mode === 'postpartum' && postpartumReturned),
    /** Fertile window / ovulation highlights. */
    fertility: mode === 'track' || mode === 'conceive' || (mode === 'avoid' && fertilityInAvoid),
    /** Fertility is the main focus of the home screen. */
    fertilityFocus: mode === 'conceive',
    /** Basal temperature, mucus and LH tests shown prominently in the log. */
    fertilityTracking: mode === 'conceive' || mode === 'avoid' || mode === 'track',
    contraception: mode === 'avoid' || mode === 'track' || mode === 'postpartum',
    pregnancy: mode === 'pregnant',
    postpartum: mode === 'postpartum',
    menopause: mode === 'perimenopause',
    /** Predictions carry a low-confidence warning. */
    lowConfidence: mode === 'perimenopause' || mode === 'postpartum',
    /** Show the "this app is not a contraceptive" disclaimer next to fertility info. */
    contraceptionDisclaimer: mode === 'avoid' || mode === 'track',
  };
}

/** Tabs of the daily log that make sense for a mode. @param {string} mode */
export function logSections(mode) {
  const base = ['period', 'symptoms', 'mood', 'body', 'notes'];
  if (mode === 'pregnant') return ['bleeding', 'symptoms', 'mood', 'body', 'notes'];
  if (mode === 'postpartum') return ['period', 'symptoms', 'mood', 'body', 'contraception', 'notes'];
  if (mode === 'perimenopause') return [...base.slice(0, 4), 'sex', 'notes'];
  return ['period', 'symptoms', 'mood', 'fertility', 'sex', 'contraception', 'body', 'notes'];
}
