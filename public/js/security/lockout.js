// Pure logic for throttling repeated wrong PIN/passphrase attempts with exponential backoff.
// It only slows down guessing through the app's own screens. Someone with a copy of the
// browser storage can guess offline at the speed of PBKDF2 (a 4-digit PIN falls in minutes, a
// 6-digit one in hours on a laptop): only a passphrase resists that (see docs/SECURITY.md).

export const MAX_ATTEMPTS = 5;
export const BASE_LOCK_MS = 30_000;
export const MAX_LOCK_MS = 15 * 60_000;

/** @typedef {{ count: number, lockUntil: number, strikes: number }} LockoutState */

/** @returns {LockoutState} */
export const initialLockout = () => ({ count: 0, lockUntil: 0, strikes: 0 });

/**
 * @param {LockoutState | null | undefined} state
 * @param {number} [now]
 */
export function lockStatus(state, now = Date.now()) {
  const s = normalizeLockout(state, now);
  if (s.lockUntil > now) return { locked: true, remainingMs: s.lockUntil - now, attemptsLeft: 0 };
  return { locked: false, remainingMs: 0, attemptsLeft: Math.max(0, MAX_ATTEMPTS - s.count) };
}

/**
 * A wait can never be longer than MAX_LOCK_MS from now: a lock recorded while the clock was
 * wrong (set years ahead, then corrected) must not lock the owner out for years.
 * @param {LockoutState | null | undefined} state
 * @param {number} [now]
 * @returns {LockoutState}
 */
export function normalizeLockout(state, now = Date.now()) {
  const s = state ?? initialLockout();
  return s.lockUntil - now > MAX_LOCK_MS ? { ...s, lockUntil: now + MAX_LOCK_MS } : s;
}

/**
 * @param {LockoutState | null | undefined} state
 * @param {number} [now]
 * @returns {LockoutState}
 */
export function registerFailure(state, now = Date.now()) {
  const s = normalizeLockout(state, now);
  const count = s.count + 1;
  if (count >= MAX_ATTEMPTS) {
    const strikes = s.strikes + 1;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** (strikes - 1), MAX_LOCK_MS);
    return { count: 0, lockUntil: now + lockMs, strikes };
  }
  return { count, lockUntil: 0, strikes: s.strikes };
}
