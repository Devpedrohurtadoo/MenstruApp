// WebCrypto primitives (work in browsers and in Node >= 20 for tests).
// Nothing in this module ever persists a secret; callers decide what (encrypted) data to store.

const subtle = globalThis.crypto?.subtle;

/** OWASP (2023+) recommendation for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000;

export class CryptoUnavailableError extends Error {
  constructor() {
    super('WebCrypto is not available (a secure context — HTTPS or localhost — is required).');
    this.name = 'CryptoUnavailableError';
  }
}

export function isCryptoAvailable() {
  return Boolean(subtle && globalThis.crypto?.getRandomValues);
}

function ensure() {
  if (!isCryptoAvailable()) throw new CryptoUnavailableError();
  return /** @type {SubtleCrypto} */ (subtle);
}

/** @param {number} length @returns {Uint8Array<ArrayBuffer>} */
export function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const utf8 = {
  /** @param {string} s */
  encode: (s) => encoder.encode(s),
  /** @param {BufferSource} b */
  decode: (b) => decoder.decode(b),
};

/** @param {ArrayBuffer | Uint8Array<ArrayBuffer>} input */
export function toB64(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** @param {string} b64 @returns {Uint8Array<ArrayBuffer>} */
export function fromB64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** @param {ArrayBuffer | Uint8Array<ArrayBuffer>} input */
export function toB64Url(input) {
  return toB64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} str */
export function fromB64Url(str) {
  if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new TypeError('Invalid base64url');
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return fromB64(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

/** Best-effort zeroing of sensitive byte arrays. @param {Uint8Array<ArrayBuffer> | null | undefined} bytes */
export function wipe(bytes) {
  if (bytes) bytes.fill(0);
}

/**
 * Constant-time comparison for equal-length strings or byte arrays.
 * @param {string | Uint8Array<ArrayBuffer>} a
 * @param {string | Uint8Array<ArrayBuffer>} b
 */
export function timingSafeEqual(a, b) {
  const x = typeof a === 'string' ? utf8.encode(a) : a;
  const y = typeof b === 'string' ? utf8.encode(b) : b;
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/**
 * Derives a non-extractable AES-GCM key-encryption key from a human secret.
 * @param {string} secret
 * @param {Uint8Array<ArrayBuffer>} salt
 * @param {number} [iterations]
 */
export async function pbkdf2Key(secret, salt, iterations = PBKDF2_ITERATIONS) {
  const s = ensure();
  const material = await s.importKey('raw', utf8.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return s.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * Imports high-entropy key material as an HKDF base key.
 * @param {Uint8Array<ArrayBuffer>} bytes
 */
export async function hkdfBase(bytes) {
  return ensure().importKey('raw', bytes, 'HKDF', false, ['deriveKey', 'deriveBits']);
}

/**
 * @param {CryptoKey} base HKDF base key
 * @param {string} info context label
 * @param {boolean} [extractable]
 */
export async function deriveAesKey(base, info, extractable = false) {
  return ensure().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) }, base, { name: 'AES-GCM', length: 256 }, extractable, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * @param {CryptoKey} base HKDF base key
 * @param {string} info context label
 */
export async function deriveHmacKey(base, info) {
  return ensure().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) }, base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, [
    'sign',
  ]);
}

/**
 * @param {CryptoKey} base HKDF base key
 * @param {string} info
 * @param {number} length bytes
 */
export async function deriveBytes(base, info, length = 32) {
  const bits = await ensure().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) }, base, length * 8);
  return new Uint8Array(bits);
}

/** Random, non-extractable AES-GCM key (safe to persist in IndexedDB as a CryptoKey). */
export async function generateAesKey() {
  return ensure().generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} plaintext
 * @param {Uint8Array<ArrayBuffer>} [aad]
 * @returns {Promise<{ iv: string, ct: string }>}
 */
export async function aesEncrypt(key, plaintext, aad) {
  const iv = randomBytes(12);
  /** @type {AesGcmParams} */
  const params = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = aad;
  const ct = await ensure().encrypt(params, key, plaintext);
  return { iv: toB64(iv), ct: toB64(ct) };
}

/**
 * @param {CryptoKey} key
 * @param {{ iv: string, ct: string }} payload
 * @param {Uint8Array<ArrayBuffer>} [aad]
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function aesDecrypt(key, payload, aad) {
  /** @type {AesGcmParams} */
  const params = { name: 'AES-GCM', iv: fromB64(payload.iv) };
  if (aad) params.additionalData = aad;
  const pt = await ensure().decrypt(params, key, fromB64(payload.ct));
  return new Uint8Array(pt);
}

/**
 * @param {CryptoKey} key
 * @param {unknown} value
 * @param {string} [aad]
 */
export async function encryptJSON(key, value, aad) {
  return aesEncrypt(key, utf8.encode(JSON.stringify(value)), aad ? utf8.encode(aad) : undefined);
}

/**
 * @param {CryptoKey} key
 * @param {{ iv: string, ct: string }} payload
 * @param {string} [aad]
 */
export async function decryptJSON(key, payload, aad) {
  const bytes = await aesDecrypt(key, payload, aad ? utf8.encode(aad) : undefined);
  return JSON.parse(utf8.decode(bytes));
}

/**
 * @param {CryptoKey} key HMAC key
 * @param {string} data
 */
export async function hmac(key, data) {
  return new Uint8Array(await ensure().sign('HMAC', key, utf8.encode(data)));
}

/** @param {Uint8Array<ArrayBuffer> | string} data */
export async function sha256(data) {
  const bytes = typeof data === 'string' ? utf8.encode(data) : data;
  return new Uint8Array(await ensure().digest('SHA-256', bytes));
}

// Crockford base32 (no I, L, O, U) — used for human-readable recovery and sync codes.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** @param {Uint8Array<ArrayBuffer>} bytes */
export function toBase32(bytes) {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(buffer << (5 - bits)) & 31];
  return out;
}

/**
 * Normalises user-typed base32 (case, separators, look-alike characters).
 * @param {string} input
 */
export function normalizeBase32(input) {
  return (
    String(input)
      .normalize('NFKC') // full-width letters/digits → ASCII
      .toUpperCase()
      // spaces, any dash (typographic ones too) and invisible format characters (zero-width…)
      .replace(/[\s\p{Pd}\p{Cf}]/gu, '')
      .replace(/[IL]/g, '1')
      .replace(/O/g, '0')
  );
}

/** @param {string} input @returns {Uint8Array<ArrayBuffer>} */
export function fromBase32(input) {
  const str = normalizeBase32(input);
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    const val = B32.indexOf(ch);
    if (val < 0) throw new TypeError('Invalid base32 character');
    buffer = (buffer << 5) | val;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Groups a code for display: "ABCD-EFGH-...". @param {string} code @param {number} [size] */
export function groupCode(code, size = 4) {
  return code.match(new RegExp(`.{1,${size}}`, 'g'))?.join('-') ?? code;
}
