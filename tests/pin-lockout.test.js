import { describe, it, expect } from 'vitest';
import PinLockout from '../pin-lockout.js';

describe('PinLockout', () => {
  it('allows attempts when there is no prior state', () => {
    const state = PinLockout.getLockState(null, 1000);
    expect(state.locked).toBe(false);
    expect(state.attemptsLeft).toBe(PinLockout.MAX_ATTEMPTS);
  });

  it('decrements attemptsLeft on each failure before the limit', () => {
    const now = 0;
    const after1 = PinLockout.registerFailure(null, now);
    expect(PinLockout.getLockState(after1, now).attemptsLeft).toBe(PinLockout.MAX_ATTEMPTS - 1);
    const after2 = PinLockout.registerFailure(after1, now);
    expect(PinLockout.getLockState(after2, now).attemptsLeft).toBe(PinLockout.MAX_ATTEMPTS - 2);
  });

  it('locks out after MAX_ATTEMPTS consecutive failures', () => {
    let attempts = null;
    const now = 1_000_000;
    for (let i = 0; i < PinLockout.MAX_ATTEMPTS; i++) {
      attempts = PinLockout.registerFailure(attempts, now);
    }
    const state = PinLockout.getLockState(attempts, now);
    expect(state.locked).toBe(true);
    expect(state.remainingMs).toBeGreaterThan(0);
    expect(state.attemptsLeft).toBe(0);
  });

  it('unlocks again once remainingMs has elapsed', () => {
    let attempts = null;
    const now = 0;
    for (let i = 0; i < PinLockout.MAX_ATTEMPTS; i++) attempts = PinLockout.registerFailure(attempts, now);
    const stillLocked = PinLockout.getLockState(attempts, attempts.lockUntil - 1);
    const unlocked = PinLockout.getLockState(attempts, attempts.lockUntil + 1);
    expect(stillLocked.locked).toBe(true);
    expect(unlocked.locked).toBe(false);
  });

  it('increases the lockout duration on repeated lockouts (exponential backoff)', () => {
    const start = 0;
    let attempts = null;
    for (let i = 0; i < PinLockout.MAX_ATTEMPTS; i++) attempts = PinLockout.registerFailure(attempts, start);
    const firstLockUntil = attempts.lockUntil;
    const firstLockDuration = firstLockUntil - start;

    for (let i = 0; i < PinLockout.MAX_ATTEMPTS; i++) attempts = PinLockout.registerFailure(attempts, firstLockUntil);
    const secondLockDuration = attempts.lockUntil - firstLockUntil;

    expect(secondLockDuration).toBeGreaterThan(firstLockDuration);
  });

  it('caps the lockout duration at MAX_LOCK_MS however many strikes accumulate', () => {
    const now = 0;
    const stateWithManyStrikes = { count: PinLockout.MAX_ATTEMPTS - 1, lockUntil: 0, lockStrikes: 20 };
    const locked = PinLockout.registerFailure(stateWithManyStrikes, now);
    expect(locked.lockUntil - now).toBeLessThanOrEqual(PinLockout.MAX_LOCK_MS);
  });

  it('resets attempts and strikes after a successful unlock', () => {
    expect(PinLockout.registerSuccess()).toEqual({ count: 0, lockUntil: 0, lockStrikes: 0 });
  });
});
