/**
 * @fileoverview Lógica pura (sin DOM ni almacenamiento) de bloqueo por intentos fallidos de PIN.
 * Se apoya en backoff exponencial para frenar adivinanzas repetidas desde la propia interfaz.
 * No sustituye a un hash fuerte: un PIN de 4 dígitos siempre es de baja entropía si alguien
 * accede directamente al almacenamiento del dispositivo; esto solo protege frente a intentos
 * repetidos a través de la UI (p. ej. alguien probando PINs con la app abierta).
 */
(function (global) {
  'use strict';

  const MAX_ATTEMPTS = 5;
  const BASE_LOCK_MS = 30 * 1000;
  const MAX_LOCK_MS = 5 * 60 * 1000;

  /**
   * @description Calcula el estado de bloqueo actual a partir del historial guardado
   * @param {{count:number, lockUntil:number, lockStrikes:number}|null} state - Estado guardado
   * @param {number} [now] - Timestamp actual en ms (inyectable para tests)
   * @returns {{locked:boolean, remainingMs:number, attemptsLeft:number}}
   */
  const getLockState = (state, now = Date.now()) => {
    const s = state || { count: 0, lockUntil: 0, lockStrikes: 0 };
    if (s.lockUntil && s.lockUntil > now) {
      return { locked: true, remainingMs: s.lockUntil - now, attemptsLeft: 0 };
    }
    return { locked: false, remainingMs: 0, attemptsLeft: Math.max(0, MAX_ATTEMPTS - (s.count || 0)) };
  };

  /**
   * @description Registra un intento fallido; bloquea con backoff exponencial tras MAX_ATTEMPTS
   * @param {{count:number, lockUntil:number, lockStrikes:number}|null} state - Estado guardado
   * @param {number} [now] - Timestamp actual en ms
   * @returns {{count:number, lockUntil:number, lockStrikes:number}}
   */
  const registerFailure = (state, now = Date.now()) => {
    const s = state || { count: 0, lockUntil: 0, lockStrikes: 0 };
    const count = (s.count || 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      const lockStrikes = (s.lockStrikes || 0) + 1;
      const lockMs = Math.min(BASE_LOCK_MS * 2 ** (lockStrikes - 1), MAX_LOCK_MS);
      return { count: 0, lockUntil: now + lockMs, lockStrikes };
    }
    return { count, lockUntil: 0, lockStrikes: s.lockStrikes || 0 };
  };

  /**
   * @description Estado a guardar tras un desbloqueo correcto
   * @returns {{count:number, lockUntil:number, lockStrikes:number}}
   */
  const registerSuccess = () => ({ count: 0, lockUntil: 0, lockStrikes: 0 });

  const api = { MAX_ATTEMPTS, BASE_LOCK_MS, MAX_LOCK_MS, getLockState, registerFailure, registerSuccess };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.PinLockout = api;
})(typeof window !== 'undefined' ? window : globalThis);
