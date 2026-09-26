// Everything that can be logged, in one place. Labels live in the i18n dictionaries under the
// same ids (e.g. t('symptoms.cramps')), so adding an item here + in es/en is all it takes.

export const MODES = /** @type {const} */ (['track', 'conceive', 'avoid', 'pregnant', 'postpartum', 'perimenopause']);

export const FLOW = /** @type {const} */ (['none', 'spotting', 'light', 'medium', 'heavy']);
/** Flow levels that count as menstrual bleeding (spotting alone never starts a period). */
export const BLEEDING = new Set(['light', 'medium', 'heavy']);
export const FLOW_COLORS = /** @type {const} */ (['bright_red', 'dark_red', 'brown', 'pink', 'orange', 'gray', 'black']);
export const CLOTS = /** @type {const} */ (['none', 'small', 'large']);
export const MUCUS = /** @type {const} */ (['dry', 'sticky', 'creamy', 'watery', 'eggwhite']);
export const LH = /** @type {const} */ (['negative', 'positive', 'peak']);
export const PREGNANCY_TEST = /** @type {const} */ (['negative', 'positive']);
export const SEX = /** @type {const} */ (['none', 'protected', 'unprotected']);
export const LIBIDO = /** @type {const} */ (['low', 'normal', 'high']);
export const EXERCISE = /** @type {const} */ (['none', 'light', 'moderate', 'intense']);

export const MOODS = /** @type {const} */ ([
  'happy',
  'calm',
  'energetic',
  'confident',
  'loving',
  'sensitive',
  'sad',
  'anxious',
  'irritable',
  'stressed',
  'unmotivated',
  'moodSwings',
]);

/** Moods counted as "difficult" for insights (no judgement implied in the UI). */
export const DIFFICULT_MOODS = new Set(['sad', 'anxious', 'irritable', 'stressed', 'unmotivated', 'moodSwings']);

/**
 * @typedef {{ id: string, group: 'pain' | 'body' | 'digestion' | 'skin' | 'sleep' | 'intimate' | 'pregnancy' | 'menopause' | 'postpartum' | 'warning',
 *   modes?: readonly string[], redFlag?: boolean }} Symptom
 */

/** @type {readonly Symptom[]} */
export const SYMPTOMS = [
  { id: 'cramps', group: 'pain' },
  { id: 'headache', group: 'pain' },
  { id: 'migraine', group: 'pain' },
  { id: 'backPain', group: 'pain' },
  { id: 'breastTenderness', group: 'pain' },
  { id: 'pelvicPain', group: 'pain' },
  { id: 'ovulationPain', group: 'pain', modes: ['track', 'conceive', 'avoid', 'perimenopause'] },
  { id: 'jointPain', group: 'pain' },
  { id: 'painfulSex', group: 'intimate' },
  { id: 'bloating', group: 'digestion' },
  { id: 'nausea', group: 'digestion' },
  { id: 'vomiting', group: 'digestion', modes: ['pregnant', 'postpartum', 'track', 'conceive', 'avoid'] },
  { id: 'diarrhea', group: 'digestion' },
  { id: 'constipation', group: 'digestion' },
  { id: 'cravings', group: 'digestion' },
  { id: 'appetiteLoss', group: 'digestion' },
  { id: 'heartburn', group: 'digestion', modes: ['pregnant', 'postpartum', 'perimenopause'] },
  { id: 'acne', group: 'skin' },
  { id: 'fatigue', group: 'body' },
  { id: 'dizziness', group: 'body' },
  { id: 'swelling', group: 'body' },
  { id: 'frequentUrination', group: 'body' },
  { id: 'insomnia', group: 'sleep' },
  { id: 'vaginalDryness', group: 'intimate' },
  { id: 'itching', group: 'intimate' },
  { id: 'unusualDischarge', group: 'intimate' },
  { id: 'hotFlashes', group: 'menopause', modes: ['perimenopause', 'postpartum'] },
  { id: 'nightSweats', group: 'menopause', modes: ['perimenopause', 'postpartum'] },
  { id: 'brainFog', group: 'menopause', modes: ['perimenopause', 'postpartum', 'pregnant'] },
  { id: 'palpitations', group: 'menopause', modes: ['perimenopause', 'pregnant'] },
  { id: 'leakage', group: 'postpartum', modes: ['postpartum', 'pregnant', 'perimenopause'] },
  { id: 'perinealPain', group: 'postpartum', modes: ['postpartum'] },
  { id: 'breastPain', group: 'postpartum', modes: ['postpartum'] },
  { id: 'fever', group: 'warning', redFlag: true },
  { id: 'fainting', group: 'warning', redFlag: true },
  { id: 'severePain', group: 'warning', redFlag: true },
  { id: 'visionChanges', group: 'warning', modes: ['pregnant', 'postpartum'], redFlag: true },
  { id: 'reducedFetalMovement', group: 'warning', modes: ['pregnant'], redFlag: true },
];

export const SYMPTOM_IDS = SYMPTOMS.map((s) => s.id);
export const SYMPTOM_GROUPS = /** @type {const} */ (['pain', 'digestion', 'body', 'skin', 'sleep', 'intimate', 'pregnancy', 'menopause', 'postpartum', 'warning']);

/**
 * Symptoms offered for a usage mode.
 * @param {string} mode
 */
export function symptomsForMode(mode) {
  return SYMPTOMS.filter((s) => !s.modes || s.modes.includes(mode));
}

export const CONTRACEPTION = /** @type {const} */ ([
  'none',
  'pill_combined',
  'pill_progestin',
  'patch',
  'ring',
  'injection',
  'iud_hormonal',
  'iud_copper',
  'implant',
  'condom',
  'fam',
  'other',
]);

/** Methods whose daily intake the user can tick off. */
export const DAILY_METHODS = new Set(['pill_combined', 'pill_progestin']);

/** Hormonal methods: with them there is no natural cycle to predict (the copper IUD is not hormonal). */
export const HORMONAL_METHODS = new Set(['pill_combined', 'pill_progestin', 'patch', 'ring', 'injection', 'iud_hormonal', 'implant']);

export const PREGNANCY_OUTCOMES = /** @type {const} */ (['birth', 'loss', 'other']);

// Units -------------------------------------------------------------------------------------

/** @param {number} c */
export const cToF = (c) => Math.round(((c * 9) / 5) * 100 + 3200) / 100;
/** @param {number} f */
export const fToC = (f) => Math.round((((f - 32) * 5) / 9) * 100) / 100;
/** @param {number} kg */
export const kgToLb = (kg) => Math.round(kg * 2.20462 * 10) / 10;
/** @param {number} lb */
export const lbToKg = (lb) => Math.round((lb / 2.20462) * 10) / 10;

/** Plausible basal body temperature range in °C (anything else is almost certainly a typo). */
export const BBT_RANGE_C = /** @type {const} */ ([34.5, 39.5]);
export const WEIGHT_RANGE_KG = /** @type {const} */ ([20, 350]);
