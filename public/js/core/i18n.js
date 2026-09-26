// Internationalisation: dictionaries, plural rules and Intl-based formatting.
// Adding a language = add public/js/i18n/<code>.js + public/js/content/library-<code>.js
// and register it in LANGUAGES below.

import es from '../i18n/es.js';
import en from '../i18n/en.js';
import { toUTCDate } from './dates.js';

export const LANGUAGES = /** @type {const} */ ([
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]);

/** @type {Record<string, any>} */
const DICTS = { es, en };
const DEFAULT_LANG = 'es';

let lang = DEFAULT_LANG;
let tag = 'es-ES';
let plural = new Intl.PluralRules(tag);

/** Picks the best supported language from the browser settings. */
export function detectLanguage() {
  const prefs = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const p of prefs) {
    const code = String(p).toLowerCase().split('-')[0];
    if (code in DICTS) return code;
  }
  return DEFAULT_LANG;
}

/** @param {string} code */
export function setLanguage(code) {
  lang = code in DICTS ? code : DEFAULT_LANG;
  const browser = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  const regional = browser.find((l) => String(l).toLowerCase().startsWith(`${lang}-`));
  tag = regional ?? (lang === 'es' ? 'es-ES' : 'en-US');
  try {
    plural = new Intl.PluralRules(tag);
  } catch {
    tag = lang;
    plural = new Intl.PluralRules(lang);
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export const getLanguage = () => lang;
export const getLocaleTag = () => tag;

/** @param {Record<string, any>} dict @param {string} key */
function lookup(dict, key) {
  let node = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

/**
 * Translates a key. Objects with plural categories are resolved with `params.count`.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  /** @type {any} */
  let value = lookup(DICTS[lang], key);
  if (value === undefined) value = lookup(DICTS[DEFAULT_LANG], key);
  if (value === undefined) return key;
  if (typeof value === 'object') {
    const count = Number(params?.count ?? 0);
    const category = count === 0 && 'zero' in value ? 'zero' : plural.select(count);
    value = value[category] ?? value.other;
  }
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? fmtParam(params[name]) : match));
}

/** @param {string | number} p */
function fmtParam(p) {
  return typeof p === 'number' ? fmtNumber(p) : String(p);
}

/** @param {string} key */
export function has(key) {
  return lookup(DICTS[lang], key) !== undefined;
}

/**
 * Returns a raw dictionary node (e.g. a list of strings).
 * @param {string} key
 */
export function raw(key) {
  return lookup(DICTS[lang], key) ?? lookup(DICTS[DEFAULT_LANG], key);
}

/** @type {Record<string, Intl.DateTimeFormatOptions>} */
const DATE_STYLES = {
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  short: { day: 'numeric', month: 'short' },
  dayMonth: { day: 'numeric', month: 'long' },
  weekday: { weekday: 'long', day: 'numeric', month: 'long' },
  weekdayShort: { weekday: 'short', day: 'numeric', month: 'short' },
  month: { month: 'long', year: 'numeric' },
  monthOnly: { month: 'long' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
};

/**
 * @param {string} iso
 * @param {keyof typeof DATE_STYLES} [style]
 */
export function fmtDate(iso, style = 'long') {
  return new Intl.DateTimeFormat(tag, { ...DATE_STYLES[style], timeZone: 'UTC' }).format(toUTCDate(iso));
}

/** @param {string} monthKey "YYYY-MM" */
export function fmtMonth(monthKey) {
  const text = fmtDate(`${monthKey}-01`, 'month');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** @param {number} ts epoch ms */
export function fmtTime(ts) {
  return new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

/** @param {number} ts epoch ms */
export function fmtDateTime(ts) {
  return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
}

/** @param {number} n @param {Intl.NumberFormatOptions} [opts] */
export function fmtNumber(n, opts) {
  return new Intl.NumberFormat(tag, opts).format(n);
}

/**
 * "hoy", "mañana", "en 3 días", "hace 2 días".
 * @param {number} days
 */
export function fmtRelativeDays(days) {
  return new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }).format(days, 'day');
}

/**
 * Weekday labels in display order.
 * @param {0 | 1} weekStart
 * @param {'narrow' | 'short' | 'long'} [style]
 */
export function weekdayLabels(weekStart, style = 'short') {
  const fmt = new Intl.DateTimeFormat(tag, { weekday: style, timeZone: 'UTC' });
  // 2024-01-01 was a Monday.
  const labels = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  return weekStart === 1 ? labels : [labels[6], ...labels.slice(0, 6)];
}

/** First day of week for the active locale: 1 = Monday, 0 = Sunday. @returns {0 | 1} */
export function localeWeekStart() {
  try {
    const locale = /** @type {any} */ (new Intl.Locale(tag));
    const info = typeof locale.getWeekInfo === 'function' ? locale.getWeekInfo() : locale.weekInfo;
    if (info?.firstDay === 7) return 0;
    if (info?.firstDay === 1) return 1;
  } catch {
    /* fall through */
  }
  return /-(US|CA|MX|BR|JP|PH|IL)$/i.test(tag) ? 0 : 1;
}

/** Sorts strings with the active locale's collation. @param {string} a @param {string} b */
export function compareText(a, b) {
  return a.localeCompare(b, tag, { sensitivity: 'base' });
}
