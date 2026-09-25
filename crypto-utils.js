/**
 * @fileoverview Utilidades criptográficas locales (WebCrypto): hashing verificable de secretos
 * (PIN, contraseña) y cifrado simétrico para datos en reposo. Nunca almacena secretos en claro.
 * Funciona tanto en navegador (adjunta window.CryptoUtils) como en Node (module.exports) para tests.
 */
(function (global) {
  'use strict';

  const SUBTLE = globalThis.crypto && globalThis.crypto.subtle;
  const PBKDF2_ITERATIONS = 210000;

  /**
   * @description Indica si el entorno soporta WebCrypto (requiere contexto seguro: HTTPS o localhost)
   * @returns {boolean}
   */
  const isSupported = () => !!SUBTLE;

  const assertSupported = () => {
    if (!isSupported()) {
      throw new Error('WebCrypto no disponible: se requiere HTTPS (o localhost) para operar con datos protegidos.');
    }
  };

  /** @description Convierte un ArrayBuffer/TypedArray a base64 */
  const bufToBase64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  /** @description Convierte un string base64 a Uint8Array */
  const base64ToBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  /**
   * @description Genera bytes aleatorios criptográficamente seguros
   * @param {number} len - Cantidad de bytes
   * @returns {Uint8Array}
   */
  const randomBytes = (len) => {
    const arr = new Uint8Array(len);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  };

  const importKeyMaterial = async (secret) => SUBTLE.importKey(
    'raw',
    new TextEncoder().encode(String(secret)),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  /**
   * @description Deriva un hash verificable (unidireccional) de un secreto. Usa un salt aleatorio
   * nuevo si no se proporciona uno (caso: creación); reutiliza el salt guardado para verificar.
   * @param {string} secret - PIN o contraseña en claro (nunca se devuelve ni se guarda tal cual)
   * @param {string} [saltB64] - Salt existente en base64 (para reverificar)
   * @param {number} [iterations=PBKDF2_ITERATIONS] - Iteraciones PBKDF2
   * @returns {Promise<{hash:string, salt:string, iterations:number}>}
   */
  const hashSecret = async (secret, saltB64, iterations = PBKDF2_ITERATIONS) => {
    assertSupported();
    const salt = saltB64 ? base64ToBuf(saltB64) : randomBytes(16);
    const keyMaterial = await importKeyMaterial(secret);
    const bits = await SUBTLE.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return { hash: bufToBase64(bits), salt: bufToBase64(salt), iterations };
  };

  /**
   * @description Comparación en tiempo constante de dos strings de igual longitud esperada
   * @param {string} a - Valor A
   * @param {string} b - Valor B
   * @returns {boolean}
   */
  const timingSafeEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  /**
   * @description Verifica un secreto contra un hash almacenado previamente
   * @param {string} secret - Secreto a comprobar
   * @param {{hash:string, salt:string, iterations:number}} stored - Registro guardado
   * @returns {Promise<boolean>}
   */
  const verifySecret = async (secret, stored) => {
    if (!stored || !stored.hash || !stored.salt) return false;
    if (!isSupported()) return false;
    const { hash } = await hashSecret(secret, stored.salt, stored.iterations || PBKDF2_ITERATIONS);
    return timingSafeEqual(hash, stored.hash);
  };

  /**
   * @description Deriva una clave simétrica AES-GCM-256 a partir de un secreto (para cifrar datos en reposo)
   * @param {string} secret - Frase/contraseña de la que derivar la clave
   * @param {string} [saltB64] - Salt existente en base64 (para re-derivar la misma clave)
   * @param {number} [iterations=PBKDF2_ITERATIONS] - Iteraciones PBKDF2
   * @returns {Promise<{key:CryptoKey, salt:string, iterations:number}>}
   */
  const deriveEncryptionKey = async (secret, saltB64, iterations = PBKDF2_ITERATIONS) => {
    assertSupported();
    const salt = saltB64 ? base64ToBuf(saltB64) : randomBytes(16);
    const keyMaterial = await importKeyMaterial(secret);
    const key = await SUBTLE.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return { key, salt: bufToBase64(salt), iterations };
  };

  /**
   * @description Cifra un objeto serializable con AES-GCM
   * @param {CryptoKey} key - Clave derivada con deriveEncryptionKey
   * @param {*} data - Datos a cifrar (se serializan a JSON)
   * @returns {Promise<{iv:string, data:string}>}
   */
  const encryptJSON = async (key, data) => {
    assertSupported();
    const iv = randomBytes(12);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const cipher = await SUBTLE.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { iv: bufToBase64(iv), data: bufToBase64(cipher) };
  };

  /**
   * @description Descifra un payload generado por encryptJSON
   * @param {CryptoKey} key - Clave derivada con deriveEncryptionKey
   * @param {{iv:string, data:string}} payload - Payload cifrado
   * @returns {Promise<*>} Datos originales
   */
  const decryptJSON = async (key, payload) => {
    assertSupported();
    const iv = base64ToBuf(payload.iv);
    const cipherBuf = base64ToBuf(payload.data);
    const plainBuf = await SUBTLE.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
    return JSON.parse(new TextDecoder().decode(plainBuf));
  };

  const api = {
    isSupported,
    hashSecret,
    verifySecret,
    timingSafeEqual,
    deriveEncryptionKey,
    encryptJSON,
    decryptJSON,
    randomBytes,
    bufToBase64,
    base64ToBuf,
    PBKDF2_ITERATIONS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.CryptoUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
