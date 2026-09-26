// Pure logic for throttling repeated wrong PIN/passphrase attempts with exponential backoff.
// It protects against guessing through the UI; offline brute force against a copied device is
// mitigated instead by PBKDF2 and by recommending 6+ digit PINs or passphrases.

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
  const s = state ?? initialLockout();
  if (s.lockUntil > now) return { locked: true, remainingMs: s.lockUntil - now, attemptsLeft: 0 };
  return { locked: false, remainingMs: 0, attemptsLeft: Math.max(0, MAX_ATTEMPTS - s.count) };
}

/**
 * @param {LockoutState | null | undefined} state
 * @param {number} [now]
 * @returns {LockoutState}
 */
export function registerFailure(state, now = Date.now()) {
  const s = state ?? initialLockout();
  const count = s.count + 1;
  if (count >= MAX_ATTEMPTS) {
    const strikes = s.strikes + 1;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** (strikes - 1), MAX_LOCK_MS);
    return { count: 0, lockUntil: now + lockMs, strikes };
  }
  return { count, lockUntil: 0, strikes: s.strikes };
}
