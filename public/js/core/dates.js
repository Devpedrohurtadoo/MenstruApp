// Calendar-date arithmetic on "YYYY-MM-DD" strings.
// Every calculation goes through integer day numbers (days since 1970-01-01 in UTC), so
// daylight-saving transitions and time zones can never shift a date by one day.

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * @param {string} iso
 * @returns {boolean}
 */
export function isISODate(iso) {
  if (typeof iso !== 'string') return false;
  const m = ISO_RE.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

/**
 * @param {number} year
 * @param {number} month 1-12
 */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** @param {number} y @param {number} m 1-12 @param {number} d */
export function isoFromParts(y, m, d) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** @param {string} iso @returns {[number, number, number]} */
export function parts(iso) {
  const m = ISO_RE.exec(iso);
  if (!m) throw new RangeError(`Invalid ISO date: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** @param {string} iso @returns {number} */
export function dayNumber(iso) {
  const [y, m, d] = parts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** @param {number} n @returns {string} */
export function fromDayNumber(n) {
  const date = new Date(n * MS_PER_DAY);
  return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** @param {string} iso @param {number} days */
export function addDays(iso, days) {
  return fromDayNumber(dayNumber(iso) + days);
}

/** Number of days from `a` to `b` (b - a). @param {string} a @param {string} b */
export function diffDays(a, b) {
  return dayNumber(b) - dayNumber(a);
}

/** @param {string} a @param {string} b */
export function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** @param {string} a @param {string} b */
export function minISO(a, b) {
  return a <= b ? a : b;
}

/** @param {string} a @param {string} b */
export function maxISO(a, b) {
  return a >= b ? a : b;
}

/** Local calendar date for a timestamp (defaults to now). @param {Date} [date] */
export function todayISO(date = new Date()) {
  return isoFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Inclusive range of ISO dates.
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function rangeISO(from, to) {
  const out = [];
  const end = dayNumber(to);
  for (let n = dayNumber(from); n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

/** @param {string} iso @returns {string} "YYYY-MM" */
export function monthKey(iso) {
  return iso.slice(0, 7);
}

/** @param {string} key "YYYY-MM" @param {number} delta */
export function addMonths(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${String(Math.floor(idx / 12)).padStart(4, '0')}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/**
 * Day of week, 0 = Monday … 6 = Sunday.
 * @param {string} iso
 */
export function weekdayMonday0(iso) {
  // 1970-01-01 was a Thursday (index 3 with Monday = 0).
  return (((dayNumber(iso) + 3) % 7) + 7) % 7;
}

/**
 * Builds the 6x7 grid of dates shown by a month calendar.
 * @param {string} key "YYYY-MM"
 * @param {0 | 1} weekStart 1 = Monday, 0 = Sunday
 * @returns {string[]}
 */
export function monthGrid(key, weekStart = 1) {
  const first = `${key}-01`;
  const mondayIndex = weekdayMonday0(first);
  const offset = weekStart === 1 ? mondayIndex : (mondayIndex + 1) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Converts an ISO date to a Date at UTC midnight (for Intl formatting with timeZone UTC).
 * @param {string} iso
 */
export function toUTCDate(iso) {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Local timestamp for a calendar date and "HH:MM" time.
 * @param {string} iso
 * @param {string} hhmm
 */
export function localTimestamp(iso, hhmm) {
  const [y, m, d] = parts(iso);
  const [hh, mm] = parseTime(hhmm);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/** @param {string} hhmm @returns {[number, number]} */
export function parseTime(hhmm) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
  if (!match) return [9, 0];
  return [Number(match[1]), Number(match[2])];
}

/** @param {string} hhmm */
export function isTime(hhmm) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(hhmm));
}

/**
 * Age in whole years on a reference date. Only the birth year is known, and the birthday may not
 * have come yet this year: the youngest possible age is returned (the oldest is one more), so
 * guidance for teenagers is never withheld from someone who may still be 17.
 * @param {{ birthYear?: number | null }} profile
 * @param {string} today
 * @returns {number | null}
 */
export function ageFromProfile(profile, today) {
  if (!profile?.birthYear) return null;
  const [y] = parts(today);
  return Math.max(0, y - profile.birthYear - 1);
}
