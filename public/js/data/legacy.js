// One-time migration from Menstruapp v2.x, which stored everything as plain JSON in
// localStorage. We convert it to the v3 model, import it into the encrypted vault during
// onboarding, and then erase the plaintext copies.

import { isISODate, rangeISO, diffDays } from '../core/dates.js';
import { validate } from '../core/validate.js';
import { dayEntrySchema } from './schema.js';

export const LEGACY_KEYS = [
  'menstruapp_cycle_data',
  'menstruapp_wellness_diary',
  'menstruapp_user',
  'menstruapp_theme',
  'menstruapp_reminders',
  'menstruapp_pin_hash',
  'menstruapp_pin_attempts',
  'menstruapp_session',
];

const FLOW = { ligero: 'light', medio: 'medium', fuerte: 'heavy', spotting: 'spotting' };
const SYMPTOMS = { colicos: 'cramps', headache: 'headache', hinchazon: 'bloating', nausea: 'nausea', fatiga: 'fatigue', acne: 'acne' };
const MOODS = { feliz: 'happy', irritable: 'irritable', ansiosa: 'anxious', triste: 'sad', energica: 'energetic', sensible: 'sensitive' };
const MUCUS = { seco: 'dry', cremoso: 'creamy', acuoso: 'watery', elastico: 'eggwhite' };
const ACTIVITY = { ninguna: 'none', ligera: 'light', moderada: 'moderate', intensa: 'intense' };
const DIARY_EMOJI = { '😊': 'happy', '😔': 'sad', '😡': 'irritable', '🥰': 'loving' };

/** @param {string} key */
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasLegacyData() {
  try {
    return LEGACY_KEYS.some((k) => localStorage.getItem(k) !== null);
  } catch {
    return false;
  }
}

/** @param {unknown} v */
const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Converts one v2 day object into a v3 entry (unknown/invalid fields are dropped).
 * @param {any} old
 */
function convertDay(old) {
  /** @type {Record<string, any>} */
  const entry = {};
  if (!old || typeof old !== 'object') return entry;
  if (old.flow in FLOW) entry.flow = FLOW[/** @type {keyof typeof FLOW} */ (old.flow)];
  if (Array.isArray(old.symptoms)) {
    /** @type {Record<string, number>} */
    const symptoms = {};
    for (const s of old.symptoms) if (s in SYMPTOMS) symptoms[SYMPTOMS[/** @type {keyof typeof SYMPTOMS} */ (s)]] = 2;
    if (Object.keys(symptoms).length) entry.symptoms = symptoms;
  }
  if (old.mood in MOODS) entry.moods = [MOODS[/** @type {keyof typeof MOODS} */ (old.mood)]];
  if (typeof old.medication === 'string' && old.medication.trim()) entry.meds = [{ name: old.medication.trim().slice(0, 80) }];
  const bbt = num(old.basalTemp);
  if (bbt !== undefined && bbt >= 34.5 && bbt <= 39.5) entry.bbt = Math.round(bbt * 100) / 100;
  if (old.mucus in MUCUS) entry.mucus = MUCUS[/** @type {keyof typeof MUCUS} */ (old.mucus)];
  if (old.activity in ACTIVITY) entry.exercise = ACTIVITY[/** @type {keyof typeof ACTIVITY} */ (old.activity)];
  const sleep = num(old.sleepHours);
  if (sleep !== undefined && sleep >= 0 && sleep <= 24) entry.sleepHours = sleep;
  if (typeof old.notes === 'string' && old.notes.trim()) entry.notes = old.notes.trim().slice(0, 2000);
  return entry;
}

/**
 * Reads every legacy key and returns data in the v3 shape.
 * @returns {{ days: Record<string, any>, profile: Record<string, any>, settings: Record<string, any>,
 *   reminders: any[], theme: Record<string, any> | null, stats: { days: number } } | null}
 */
export function readLegacyData() {
  if (!hasLegacyData()) return null;
  const cycle = readJSON('menstruapp_cycle_data') ?? {};
  const diary = readJSON('menstruapp_wellness_diary') ?? {};
  const user = readJSON('menstruapp_user') ?? {};
  const theme = readJSON('menstruapp_theme');
  const remindersOld = readJSON('menstruapp_reminders') ?? {};

  /** @type {Record<string, Record<string, any>>} */
  const days = {};
  const oldDays = cycle && typeof cycle.days === 'object' ? cycle.days : {};
  for (const [iso, old] of Object.entries(oldDays)) {
    if (!isISODate(iso)) continue;
    const entry = convertDay(old);
    if (old?.periodStart && !entry.flow) entry.flow = 'medium';
    if (Object.keys(entry).length) days[iso] = entry;
    // v2 stored the end of a period as a date string on its first day: fill the days between.
    if (old?.periodStart && isISODate(old.periodEnd) && old.periodEnd > iso && diffDays(iso, old.periodEnd) <= 15) {
      for (const d of rangeISO(iso, old.periodEnd)) {
        days[d] = days[d] ?? convertDay(oldDays[d]);
        if (!days[d].flow) days[d].flow = 'medium';
      }
    }
  }

  for (const [iso, entry] of Object.entries(diary && typeof diary === 'object' ? diary : {})) {
    if (!isISODate(iso) || !entry || typeof entry !== 'object') continue;
    const day = (days[iso] = days[iso] ?? {});
    const mood = DIARY_EMOJI[/** @type {keyof typeof DIARY_EMOJI} */ (entry.emoji)];
    if (mood) day.moods = Array.from(new Set([...(day.moods ?? []), mood]));
    if (entry.emoji === '😴') day.symptoms = { ...(day.symptoms ?? {}), fatigue: 1 };
    const energy = num(entry.energy);
    if (energy !== undefined) day.energy = Math.min(5, Math.max(1, Math.round(energy / 2)));
    if (typeof entry.notes === 'string' && entry.notes.trim()) {
      day.notes = [day.notes, entry.notes.trim()].filter(Boolean).join('\n\n').slice(0, 2000);
    }
  }

  // Keep only entries that pass the v3 schema.
  for (const [iso, entry] of Object.entries(days)) {
    const checked = validate(dayEntrySchema, entry);
    if (checked.ok && Object.keys(checked.value).length) days[iso] = checked.value;
    else delete days[iso];
  }

  /** @type {Record<string, any>} */
  const profile = {};
  if (typeof user.name === 'string' && user.name.trim()) profile.name = user.name.trim().slice(0, 40);
  if (isISODate(user.birthdate)) profile.birthYear = Number(user.birthdate.slice(0, 4));

  /** @type {Record<string, any>} */
  const settings = {};
  const cl = num(cycle?.settings?.cycleLength);
  const pl = num(cycle?.settings?.periodLength);
  if (cl !== undefined && cl >= 15 && cl <= 90) settings.cycleLength = Math.round(cl);
  if (pl !== undefined && pl >= 1 && pl <= 15) settings.periodLength = Math.round(pl);

  const reminders = [];
  const time = (/** @type {any} */ t, /** @type {string} */ fallback) => (typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : fallback);
  if (remindersOld.pill) reminders.push({ id: 'pill', type: 'pill', enabled: true, time: time(remindersOld.pillTime, '21:00') });
  if (remindersOld.temp) reminders.push({ id: 'bbt', type: 'bbt', enabled: true, time: time(remindersOld.tempTime, '07:00') });
  if (remindersOld.period) {
    const daysBefore = Math.min(14, Math.max(0, Math.round(num(remindersOld.periodDays) ?? 2)));
    reminders.push({ id: 'period_soon', type: 'period_soon', enabled: true, time: '09:00', daysBefore });
  }

  return {
    days,
    profile,
    settings,
    reminders,
    theme: theme && typeof theme === 'object' ? theme : null,
    stats: { days: Object.keys(days).length },
  };
}

/** Erases the plaintext v2 data once it has been imported (or explicitly discarded). */
export function clearLegacyData() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
