// Per-profile encrypted vault.
//
// A random 256-bit master secret is generated once per profile and never stored in clear.
// It is "wrapped" (AES-GCM encrypted) by one or more locks:
//   - pin / passphrase: key derived with PBKDF2-SHA256 (600k iterations, random salt)
//   - recovery:         a random 160-bit code shown once to the user (PBKDF2, 200k iterations)
//   - webauthn:         key derived from the authenticator's PRF output (Face ID / fingerprint)
//   - device:           a random non-extractable CryptoKey stored in IndexedDB (only when the
//                       user explicitly chooses "no lock"; data is still encrypted at rest)
// Changing the PIN only re-wraps the master secret; records never need re-encryption.
// A wrong secret simply fails AES-GCM authentication, so there is no separate password hash.

import * as C from './crypto.js';

export const MASTER_BYTES = 32;
const RECOVERY_BYTES = 20; // 160 bits → 32 Crockford base32 characters
const RECOVERY_ITERATIONS = 200_000;

export class WrongSecretError extends Error {
  constructor() {
    super('The secret does not unlock this vault.');
    this.name = 'WrongSecretError';
  }
}

/**
 * @typedef {'pin' | 'passphrase' | 'recovery' | 'webauthn' | 'device'} LockType
 * @typedef {{ type: LockType, iv: string, wrapped: string, kdf?: { name: 'PBKDF2', hash: 'SHA-256', iterations: number, salt: string },
 *   digits?: number, credentialId?: string, prfSalt?: string, key?: CryptoKey, createdAt: number }} Lock
 * @typedef {{ profileId: string, version: 1, createdAt: number, locks: Lock[] }} Vault
 */

/** @param {LockType} type */
const aad = (type) => C.utf8.encode(`menstruapp:vault:v1:${type}`);

/**
 * @param {LockType} type
 * @param {string} secret
 */
function normalizeSecret(type, secret) {
  if (type === 'recovery') return C.normalizeBase32(secret);
  if (type === 'pin') return String(secret).replace(/\D/g, '');
  return String(secret).normalize('NFC');
}

/**
 * @param {'pin' | 'passphrase' | 'recovery'} type
 * @param {string} secret
 * @param {Uint8Array<ArrayBuffer>} master
 * @returns {Promise<Lock>}
 */
async function passwordLock(type, secret, master) {
  const salt = C.randomBytes(16);
  const iterations = type === 'recovery' ? RECOVERY_ITERATIONS : C.PBKDF2_ITERATIONS;
  const kek = await C.pbkdf2Key(normalizeSecret(type, secret), salt, iterations);
  const { iv, ct } = await C.aesEncrypt(kek, master, aad(type));
  /** @type {Lock} */
  const lock = {
    type,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: C.toB64(salt) },
    iv,
    wrapped: ct,
    createdAt: Date.now(),
  };
  if (type === 'pin') lock.digits = normalizeSecret('pin', secret).length;
  return lock;
}

/** @param {Uint8Array<ArrayBuffer>} master @returns {Promise<Lock>} */
async function deviceLock(master) {
  const key = await C.generateAesKey();
  const { iv, ct } = await C.aesEncrypt(key, master, aad('device'));
  return { type: 'device', key, iv, wrapped: ct, createdAt: Date.now() };
}

/** @param {Uint8Array<ArrayBuffer>} prfOutput */
async function webauthnKek(prfOutput) {
  const base = await C.hkdfBase(prfOutput);
  return C.deriveAesKey(base, 'menstruapp:webauthn-kek:v1');
}

/** Generates a fresh human-readable recovery code (32 chars, shown grouped). */
export function generateRecoveryCode() {
  return C.toBase32(C.randomBytes(RECOVERY_BYTES));
}

/**
 * Validates PIN/passphrase strength rules used across the UI.
 * @param {'pin' | 'passphrase'} type
 * @param {string} secret
 * @returns {string | null} i18n error key or null when valid
 */
export function secretProblem(type, secret) {
  if (type === 'pin') {
    if (!/^\d{4,8}$/.test(secret)) return 'lock.errors.pinLength';
    if (/^(\d)\1+$/.test(secret)) return 'lock.errors.pinRepeated';
    if ('0123456789'.includes(secret) || '9876543210'.includes(secret)) return 'lock.errors.pinSequence';
    return null;
  }
  if (secret.length < 8) return 'lock.errors.passphraseLength';
  if (secret.length > 256) return 'lock.errors.passphraseTooLong';
  return null;
}

/**
 * Creates a new vault for a profile.
 * @param {string} profileId
 * @param {{ method: 'pin' | 'passphrase' | 'none', secret?: string }} options
 * @returns {Promise<{ vault: Vault, master: Uint8Array<ArrayBuffer>, recoveryCode: string | null }>}
 */
export async function createVault(profileId, { method, secret }) {
  const master = C.randomBytes(MASTER_BYTES);
  /** @type {Lock[]} */
  const locks = [];
  /** @type {string | null} */
  let recoveryCode = null;
  if (method === 'none') {
    locks.push(await deviceLock(master));
  } else {
    if (!secret || secretProblem(method, secret)) throw new Error('Invalid secret');
    locks.push(await passwordLock(method, secret, master));
    recoveryCode = generateRecoveryCode();
    locks.push(await passwordLock('recovery', recoveryCode, master));
  }
  return { vault: { profileId, version: 1, createdAt: Date.now(), locks }, master, recoveryCode };
}

/** @param {Vault} vault */
export function describeVault(vault) {
  const types = new Set(vault.locks.map((l) => l.type));
  /** @type {'pin' | 'passphrase' | 'none'} */
  const primary = types.has('pin') ? 'pin' : types.has('passphrase') ? 'passphrase' : 'none';
  return {
    primary,
    pinDigits: vault.locks.find((l) => l.type === 'pin')?.digits ?? null,
    hasRecovery: types.has('recovery'),
    hasBiometric: types.has('webauthn'),
    biometric: vault.locks.find((l) => l.type === 'webauthn') ?? null,
    needsSecret: primary !== 'none',
  };
}

/**
 * Unlocks a vault and returns the master secret bytes (caller must wipe them after use).
 * @param {Vault} vault
 * @param {{ type: LockType, secret?: string, prfOutput?: Uint8Array<ArrayBuffer> }} attempt
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function unlockVault(vault, attempt) {
  const lock = vault.locks.find((l) => l.type === attempt.type);
  if (!lock) throw new WrongSecretError();
  try {
    if (lock.type === 'device') {
      if (!lock.key) throw new WrongSecretError();
      return await C.aesDecrypt(lock.key, { iv: lock.iv, ct: lock.wrapped }, aad('device'));
    }
    if (lock.type === 'webauthn') {
      if (!attempt.prfOutput) throw new WrongSecretError();
      const kek = await webauthnKek(attempt.prfOutput);
      return await C.aesDecrypt(kek, { iv: lock.iv, ct: lock.wrapped }, aad('webauthn'));
    }
    if (!lock.kdf || typeof attempt.secret !== 'string') throw new WrongSecretError();
    const kek = await C.pbkdf2Key(normalizeSecret(lock.type, attempt.secret), C.fromB64(lock.kdf.salt), lock.kdf.iterations);
    return await C.aesDecrypt(kek, { iv: lock.iv, ct: lock.wrapped }, aad(lock.type));
  } catch (err) {
    if (err instanceof C.CryptoUnavailableError) throw err;
    throw new WrongSecretError();
  }
}

/**
 * Replaces the primary lock (PIN ↔ passphrase ↔ none). Keeps biometrics/recovery only when a
 * secret-based lock remains (without a secret they would add nothing).
 * @param {Vault} vault
 * @param {Uint8Array<ArrayBuffer>} master
 * @param {{ method: 'pin' | 'passphrase' | 'none', secret?: string }} options
 * @returns {Promise<{ vault: Vault, recoveryCode: string | null }>}
 */
export async function setPrimaryLock(vault, master, { method, secret }) {
  const kept = vault.locks.filter((l) => l.type === 'recovery' || l.type === 'webauthn');
  /** @type {Lock[]} */
  let locks;
  /** @type {string | null} */
  let recoveryCode = null;
  if (method === 'none') {
    locks = [await deviceLock(master)];
  } else {
    if (!secret || secretProblem(method, secret)) throw new Error('Invalid secret');
    locks = [await passwordLock(method, secret, master), ...kept];
    if (!locks.some((l) => l.type === 'recovery')) {
      recoveryCode = generateRecoveryCode();
      locks.push(await passwordLock('recovery', recoveryCode, master));
    }
  }
  return { vault: { ...vault, locks }, recoveryCode };
}

/**
 * @param {Vault} vault
 * @param {Uint8Array<ArrayBuffer>} master
 */
export async function regenerateRecovery(vault, master) {
  const recoveryCode = generateRecoveryCode();
  const lock = await passwordLock('recovery', recoveryCode, master);
  return { vault: { ...vault, locks: [...vault.locks.filter((l) => l.type !== 'recovery'), lock] }, recoveryCode };
}

/**
 * @param {Vault} vault
 * @param {Uint8Array<ArrayBuffer>} master
 * @param {{ credentialId: string, prfSalt: string, prfOutput: Uint8Array<ArrayBuffer> }} cred
 * @returns {Promise<Vault>}
 */
export async function addWebAuthnLock(vault, master, { credentialId, prfSalt, prfOutput }) {
  const kek = await webauthnKek(prfOutput);
  const { iv, ct } = await C.aesEncrypt(kek, master, aad('webauthn'));
  /** @type {Lock} */
  const lock = { type: 'webauthn', credentialId, prfSalt, iv, wrapped: ct, createdAt: Date.now() };
  return { ...vault, locks: [...vault.locks.filter((l) => l.type !== 'webauthn'), lock] };
}

/**
 * @param {Vault} vault
 * @param {LockType} type
 * @returns {Vault}
 */
export function removeLock(vault, type) {
  return { ...vault, locks: vault.locks.filter((l) => l.type !== type) };
}

/**
 * Derives the working keys for a profile from its master secret.
 * @param {Uint8Array<ArrayBuffer>} master
 * @returns {Promise<{ encKey: CryptoKey, idKey: CryptoKey }>}
 */
export async function deriveProfileKeys(master) {
  const base = await C.hkdfBase(master);
  const [encKey, idKey] = await Promise.all([C.deriveAesKey(base, 'menstruapp:records:v1'), C.deriveHmacKey(base, 'menstruapp:record-ids:v1')]);
  return { encKey, idKey };
}
