// Device-level, non-sensitive preferences (language, theme, colors...). They live in
// localStorage so js/boot.js can apply them synchronously before first paint (no theme flash).
// Nothing health-related is ever stored here.

import { v, validate } from '../core/validate.js';

export const PREFS_KEY = 'menstruapp:prefs:v1';

export const ACCENTS = /** @type {const} */ ({
  rosa: '#e0668f',
  coral: '#ee7a64',
  ciruela: '#b04b86',
  lavanda: '#9b7be8',
  violeta: '#7c5cf0',
  oceano: '#3a8fd6',
  jade: '#2aa283',
  ambar: '#d99a2b',
});

export const BACKGROUND_PRESETS = /** @type {const} */ (['aurora', 'sunset', 'lavender', 'ocean', 'forest', 'night', 'blush', 'minimal']);

const HEX = /^#[0-9a-f]{6}$/i;

const prefsSchema = v.object({
  lang: v.enum(['es', 'en'], { optional: true, nullable: true }),
  theme: v.enum(['auto', 'light', 'dark']),
  accent: v.string({ pattern: HEX }),
  background: v.object({
    type: v.enum(['preset', 'color', 'image']),
    preset: v.enum(BACKGROUND_PRESETS),
    color: v.string({ pattern: HEX }),
    dim: v.number({ min: 0, max: 0.95 }),
  }),
  particles: v.number({ integer: true, min: 0, max: 3 }),
  motion: v.enum(['system', 'reduce', 'full']),
  textScale: v.number({ min: 0.85, max: 1.6 }),
  contrast: v.enum(['normal', 'more']),
  weekStart: v.enum(['auto', 0, 1]),
  lastProfileId: v.string({ max: 64, optional: true, nullable: true }),
  hideProfileNames: v.boolean(),
  installPromptDismissedAt: v.number({ integer: true, min: 0 }),
  backupNudgeAt: v.number({ integer: true, min: 0 }),
});

/**
 * @typedef {{
 *   lang: 'es' | 'en' | null, theme: 'auto' | 'light' | 'dark', accent: string,
 *   background: { type: 'preset' | 'color' | 'image', preset: string, color: string, dim: number },
 *   particles: number, motion: 'system' | 'reduce' | 'full', textScale: number, contrast: 'normal' | 'more',
 *   weekStart: 'auto' | 0 | 1, lastProfileId: string | null, hideProfileNames: boolean,
 *   installPromptDismissedAt: number, backupNudgeAt: number
 * }} Prefs
 */

/** @type {Readonly<Prefs>} */
export const DEFAULT_PREFS = Object.freeze({
  lang: null,
  theme: /** @type {'auto' | 'light' | 'dark'} */ ('auto'),
  accent: ACCENTS.rosa,
  background: { type: /** @type {'preset' | 'color' | 'image'} */ ('preset'), preset: 'aurora', color: '#241a2e', dim: 0.75 },
  particles: 1,
  motion: /** @type {'system' | 'reduce' | 'full'} */ ('system'),
  textScale: 1,
  contrast: /** @type {'normal' | 'more'} */ ('normal'),
  weekStart: /** @type {'auto' | 0 | 1} */ ('auto'),
  lastProfileId: /** @type {string | null} */ (null),
  hideProfileNames: false,
  installPromptDismissedAt: 0,
  backupNudgeAt: 0,
});

/** @returns {Prefs} */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return structuredClone(DEFAULT_PREFS);
    const merged = { ...structuredClone(DEFAULT_PREFS), ...JSON.parse(raw) };
    merged.background = { ...DEFAULT_PREFS.background, ...(merged.background ?? {}) };
    const checked = validate(prefsSchema, merged);
    return checked.ok ? checked.value : structuredClone(DEFAULT_PREFS);
  } catch {
    return structuredClone(DEFAULT_PREFS);
  }
}

/**
 * @param {Partial<Prefs>} patch
 * @returns {Prefs}
 */
export function savePrefs(patch) {
  const next = { ...loadPrefs(), ...patch };
  const checked = validate(prefsSchema, next);
  if (!checked.ok) throw new Error(`Invalid preferences: ${checked.errors[0]}`);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(checked.value));
  } catch {
    /* storage full or blocked: preferences simply won't persist */
  }
  return checked.value;
}

export function clearPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    /* ignore */
  }
}

/** Removes every key this origin stored in Web Storage ("delete everything"). */
export function clearWebStorage() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}
