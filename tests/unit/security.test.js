import { describe, it, expect } from 'vitest';
import * as C from '../../public/js/security/crypto.js';
import {
  createVault,
  unlockVault,
  deriveProfileKeys,
  setPrimaryLock,
  regenerateRecovery,
  addWebAuthnLock,
  describeVault,
  secretProblem,
  WrongSecretError,
} from '../../public/js/security/vault.js';
import { lockStatus, registerFailure, MAX_ATTEMPTS, MAX_LOCK_MS, initialLockout } from '../../public/js/security/lockout.js';

describe('crypto primitives', () => {
  it('round-trips base64, base64url and base32', () => {
    const bytes = C.randomBytes(40);
    expect(C.fromB64(C.toB64(bytes))).toEqual(bytes);
    expect(C.fromB64Url(C.toB64Url(bytes))).toEqual(bytes);
    expect(C.fromBase32(C.toBase32(bytes))).toEqual(bytes);
  });

  it('normalises look-alike characters in base32 codes', () => {
    const bytes = C.randomBytes(20);
    const code = C.toBase32(bytes);
    const messy = C.groupCode(code).toLowerCase().replace(/1/g, 'l').replace(/0/g, 'o');
    expect(C.fromBase32(messy)).toEqual(bytes);
  });

  it('encrypts JSON with AES-GCM and binds additional data', async () => {
    const key = await C.generateAesKey();
    const payload = await C.encryptJSON(key, { secret: 'abc' }, 'slot-1');
    expect(await C.decryptJSON(key, payload, 'slot-1')).toEqual({ secret: 'abc' });
    await expect(C.decryptJSON(key, payload, 'slot-2')).rejects.toThrow();
  });

  it('detects tampering', async () => {
    const key = await C.generateAesKey();
    const payload = await C.encryptJSON(key, { a: 1 });
    const bytes = C.fromB64(payload.ct);
    bytes[0] ^= 1;
    await expect(C.decryptJSON(key, { iv: payload.iv, ct: C.toB64(bytes) })).rejects.toThrow();
  });

  it('compares in constant time only equal-length inputs', () => {
    expect(C.timingSafeEqual('abc', 'abc')).toBe(true);
    expect(C.timingSafeEqual('abc', 'abd')).toBe(false);
    expect(C.timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('vault', () => {
  it('rejects weak PINs and short passphrases', () => {
    expect(secretProblem('pin', '123')).toBe('lock.errors.pinLength');
    expect(secretProblem('pin', '1111')).toBe('lock.errors.pinRepeated');
    expect(secretProblem('pin', '1234')).toBe('lock.errors.pinSequence');
    expect(secretProblem('pin', '482913')).toBeNull();
    expect(secretProblem('passphrase', 'short')).toBe('lock.errors.passphraseLength');
    expect(secretProblem('passphrase', 'una frase larga')).toBeNull();
  });

  it('creates a PIN vault that only the PIN or the recovery code can open', async () => {
    const { vault, master, recoveryCode } = await createVault('p1', { method: 'pin', secret: '482913' });
    expect(recoveryCode).toMatch(/^[0-9A-Z]{32}$/);
    expect(JSON.stringify(vault)).not.toContain('482913');
    expect(describeVault(vault)).toMatchObject({ primary: 'pin', pinDigits: 6, hasRecovery: true, hasBiometric: false });

    expect(await unlockVault(vault, { type: 'pin', secret: '482913' })).toEqual(master);
    expect(await unlockVault(vault, { type: 'recovery', secret: C.groupCode(recoveryCode).toLowerCase() })).toEqual(master);
    await expect(unlockVault(vault, { type: 'pin', secret: '482914' })).rejects.toBeInstanceOf(WrongSecretError);
    await expect(unlockVault(vault, { type: 'passphrase', secret: '482913' })).rejects.toBeInstanceOf(WrongSecretError);
  });

  it('supports a no-lock vault that is still encrypted at rest', async () => {
    const { vault, master, recoveryCode } = await createVault('p2', { method: 'none' });
    expect(recoveryCode).toBeNull();
    expect(describeVault(vault).needsSecret).toBe(false);
    expect(await unlockVault(vault, { type: 'device' })).toEqual(master);
  });

  it('changes the primary lock without changing the master secret', async () => {
    const { vault, master } = await createVault('p3', { method: 'pin', secret: '482913' });
    const { vault: v2, recoveryCode } = await setPrimaryLock(vault, master, { method: 'passphrase', secret: 'luna llena de marzo' });
    expect(recoveryCode).toBeNull(); // existing recovery code is kept
    expect(await unlockVault(v2, { type: 'passphrase', secret: 'luna llena de marzo' })).toEqual(master);
    await expect(unlockVault(v2, { type: 'pin', secret: '482913' })).rejects.toBeInstanceOf(WrongSecretError);

    const { vault: v3 } = await setPrimaryLock(v2, master, { method: 'none' });
    expect(describeVault(v3)).toMatchObject({ primary: 'none', hasRecovery: false });
    expect(await unlockVault(v3, { type: 'device' })).toEqual(master);
  });

  it('regenerates the recovery code and invalidates the old one', async () => {
    const { vault, master, recoveryCode } = await createVault('p4', { method: 'pin', secret: '739184' });
    const { vault: v2, recoveryCode: fresh } = await regenerateRecovery(vault, master);
    expect(fresh).not.toBe(recoveryCode);
    expect(await unlockVault(v2, { type: 'recovery', secret: fresh })).toEqual(master);
    await expect(unlockVault(v2, { type: 'recovery', secret: /** @type {string} */ (recoveryCode) })).rejects.toBeInstanceOf(WrongSecretError);
  });

  it('wraps the master secret with a WebAuthn PRF output', async () => {
    const { vault, master } = await createVault('p5', { method: 'pin', secret: '739184' });
    const prfOutput = C.randomBytes(32);
    const v2 = await addWebAuthnLock(vault, master, { credentialId: 'abc', prfSalt: C.toB64(C.randomBytes(32)), prfOutput });
    expect(describeVault(v2).hasBiometric).toBe(true);
    expect(await unlockVault(v2, { type: 'webauthn', prfOutput })).toEqual(master);
    await expect(unlockVault(v2, { type: 'webauthn', prfOutput: C.randomBytes(32) })).rejects.toBeInstanceOf(WrongSecretError);
  });

  it('derives deterministic record keys from the master secret', async () => {
    const master = C.randomBytes(32);
    const a = await deriveProfileKeys(master);
    const b = await deriveProfileKeys(new Uint8Array(master));
    const payload = await C.encryptJSON(a.encKey, { x: 1 });
    expect(await C.decryptJSON(b.encKey, payload)).toEqual({ x: 1 });
    expect(await C.hmac(a.idKey, 'day:2024-01-01')).toEqual(await C.hmac(b.idKey, 'day:2024-01-01'));
  });
});

describe('lockout', () => {
  it('locks after too many failures and backs off exponentially up to a cap', () => {
    let s = initialLockout();
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) s = registerFailure(s, now);
    expect(lockStatus(s, now)).toMatchObject({ locked: false, attemptsLeft: 1 });
    s = registerFailure(s, now);
    expect(lockStatus(s, now).locked).toBe(true);
    const firstLockUntil = s.lockUntil;
    const firstDuration = firstLockUntil - now;
    expect(lockStatus(s, firstLockUntil + 1).locked).toBe(false);

    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerFailure(s, firstLockUntil);
    const secondDuration = s.lockUntil - firstLockUntil;
    expect(secondDuration).toBe(firstDuration * 2);

    let many = { count: MAX_ATTEMPTS - 1, lockUntil: 0, strikes: 30 };
    many = registerFailure(many, 0);
    expect(many.lockUntil).toBe(MAX_LOCK_MS);
  });
});
