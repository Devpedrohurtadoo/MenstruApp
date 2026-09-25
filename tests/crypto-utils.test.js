import { describe, it, expect } from 'vitest';
import CryptoUtils from '../crypto-utils.js';

describe('CryptoUtils', () => {
  it('reports WebCrypto as supported in this runtime', () => {
    expect(CryptoUtils.isSupported()).toBe(true);
  });

  it('hashes a secret and verifies it correctly', async () => {
    const stored = await CryptoUtils.hashSecret('1234');
    expect(await CryptoUtils.verifySecret('1234', stored)).toBe(true);
  });

  it('rejects an incorrect secret', async () => {
    const stored = await CryptoUtils.hashSecret('1234');
    expect(await CryptoUtils.verifySecret('9999', stored)).toBe(false);
  });

  it('rejects verification against an empty/missing record', async () => {
    expect(await CryptoUtils.verifySecret('1234', null)).toBe(false);
    expect(await CryptoUtils.verifySecret('1234', {})).toBe(false);
  });

  it('uses a fresh random salt (and therefore hash) on every call, even for the same secret', async () => {
    const a = await CryptoUtils.hashSecret('mismoSecreto');
    const b = await CryptoUtils.hashSecret('mismoSecreto');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    // pero ambos siguen verificando correctamente contra el mismo secreto original
    expect(await CryptoUtils.verifySecret('mismoSecreto', a)).toBe(true);
    expect(await CryptoUtils.verifySecret('mismoSecreto', b)).toBe(true);
  });

  it('never stores or returns the plaintext secret', async () => {
    const stored = await CryptoUtils.hashSecret('miContraseñaSecreta');
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain('miContraseñaSecreta');
  });

  it('timingSafeEqual only accepts equal strings of equal length', () => {
    expect(CryptoUtils.timingSafeEqual('abc', 'abc')).toBe(true);
    expect(CryptoUtils.timingSafeEqual('abc', 'abd')).toBe(false);
    expect(CryptoUtils.timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(CryptoUtils.timingSafeEqual('abc', 123)).toBe(false);
  });

  it('round-trips JSON data through AES-GCM encryption without leaking plaintext', async () => {
    const { key } = await CryptoUtils.deriveEncryptionKey('passphrase-de-prueba');
    const original = { days: { '2026-01-01': { flow: 'medio' } }, settings: { cycleLength: 28 } };
    const encrypted = await CryptoUtils.encryptJSON(key, original);
    expect(encrypted.data).not.toContain('medio');
    const decrypted = await CryptoUtils.decryptJSON(key, encrypted);
    expect(decrypted).toEqual(original);
  });

  it('derives the same encryption key from the same passphrase and salt', async () => {
    const first = await CryptoUtils.deriveEncryptionKey('passphrase-correcta');
    const second = await CryptoUtils.deriveEncryptionKey('passphrase-correcta', first.salt);
    const encrypted = await CryptoUtils.encryptJSON(first.key, { secreto: true });
    const decrypted = await CryptoUtils.decryptJSON(second.key, encrypted);
    expect(decrypted).toEqual({ secreto: true });
  });

  it('fails to decrypt with a key derived from a different passphrase', async () => {
    const { key: keyA, salt } = await CryptoUtils.deriveEncryptionKey('passphrase-correcta');
    const { key: keyB } = await CryptoUtils.deriveEncryptionKey('passphrase-incorrecta', salt);
    const encrypted = await CryptoUtils.encryptJSON(keyA, { secreto: true });
    await expect(CryptoUtils.decryptJSON(keyB, encrypted)).rejects.toThrow();
  });
});
