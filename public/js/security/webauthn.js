// Biometric unlock (Face ID / Touch ID / fingerprint) through WebAuthn's PRF extension.
// The PRF output is a secret that only the authenticator can produce after user verification;
// it is used to wrap the vault's master secret, so biometrics are a real cryptographic unlock,
// not just a UI gate. When the platform does not support PRF we do not offer biometrics.

import { randomBytes, toB64, fromB64, toB64Url, fromB64Url } from './crypto.js';

export class PrfUnsupportedError extends Error {
  constructor() {
    super('This authenticator/browser does not support the WebAuthn PRF extension.');
    this.name = 'PrfUnsupportedError';
  }
}

export function webauthnAvailable() {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && Boolean(navigator.credentials);
}

/** Resolves true when a platform authenticator (biometrics) is likely usable. */
export async function biometricsLikelyAvailable() {
  if (!webauthnAvailable()) return false;
  try {
    const PKC = /** @type {any} */ (window.PublicKeyCredential);
    if (typeof PKC.getClientCapabilities === 'function') {
      const caps = await PKC.getClientCapabilities();
      if (caps && caps['extension:prf'] === false) return false;
    }
    return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Creates a platform credential and evaluates its PRF.
 * @param {{ label: string }} options
 * @returns {Promise<{ credentialId: string, prfSalt: string, prfOutput: Uint8Array<ArrayBuffer> }>}
 */
export async function registerBiometric({ label }) {
  if (!webauthnAvailable()) throw new PrfUnsupportedError();
  const prfSalt = randomBytes(32);
  const credential = /** @type {PublicKeyCredential | null} */ (
    await navigator.credentials.create({
      publicKey: {
        rp: { name: 'Menstruapp' },
        user: { id: randomBytes(16), name: label, displayName: label },
        challenge: randomBytes(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        attestation: 'none',
        timeout: 60_000,
        extensions: /** @type {any} */ ({ prf: { eval: { first: prfSalt } } }),
      },
    })
  );
  if (!credential) throw new PrfUnsupportedError();
  const ext = /** @type {any} */ (credential.getClientExtensionResults());
  if (!ext?.prf?.enabled && !ext?.prf?.results?.first) throw new PrfUnsupportedError();
  const credentialId = toB64Url(credential.rawId);
  let output = ext.prf.results?.first;
  if (!output) {
    output = await evaluate(credentialId, prfSalt);
  }
  return { credentialId, prfSalt: toB64(prfSalt), prfOutput: new Uint8Array(output) };
}

/**
 * @param {string} credentialId base64url
 * @param {Uint8Array<ArrayBuffer>} salt
 * @returns {Promise<ArrayBuffer>}
 */
async function evaluate(credentialId, salt) {
  const assertion = /** @type {PublicKeyCredential | null} */ (
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: 'public-key', id: fromB64Url(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
        extensions: /** @type {any} */ ({ prf: { eval: { first: salt } } }),
      },
    })
  );
  const out = /** @type {any} */ (assertion?.getClientExtensionResults())?.prf?.results?.first;
  if (!out) throw new PrfUnsupportedError();
  return out;
}

/**
 * Asks the authenticator for the PRF secret of an existing credential.
 * @param {{ credentialId: string, prfSalt: string }} lock
 */
export async function unlockWithBiometric(lock) {
  const out = await evaluate(lock.credentialId, fromB64(lock.prfSalt));
  return new Uint8Array(out);
}
