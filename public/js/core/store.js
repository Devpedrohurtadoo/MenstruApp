// Tiny observable store. State is replaced immutably so subscribers can compare references.

/**
 * @template T
 * @param {T} initial
 */
export function createStore(initial) {
  let state = initial;
  /** @type {Set<(state: T, prev: T) => void>} */
  const subscribers = new Set();
  return {
    /** @returns {T} */
    get: () => state,
    /** @param {Partial<T> | ((s: T) => Partial<T>)} patch */
    set(patch) {
      const prev = state;
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      for (const fn of subscribers) fn(state, prev);
    },
    /** @param {(state: T, prev: T) => void} fn */
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

/** Minimal pub/sub bus for app-wide events (lock, data-changed, route, ...). */
export function createBus() {
  /** @type {Map<string, Set<(payload?: any) => void>>} */
  const handlers = new Map();
  return {
    /** @param {string} name @param {(payload?: any) => void} fn */
    on(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)?.add(fn);
      return () => handlers.get(name)?.delete(fn);
    },
    /** @param {string} name @param {any} [payload] */
    emit(name, payload) {
      for (const fn of handlers.get(name) ?? []) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[bus] handler for "${name}" failed`, err);
        }
      }
    },
  };
}

/**
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} ms
 * @returns {F & { flush: () => void, cancel: () => void }}
 */
export function debounce(fn, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {any[] | null} */
  let pending = null;
  const wrapped = /** @type {any} */ (
    (/** @type {any[]} */ ...args) => {
      pending = args;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const a = pending;
        pending = null;
        if (a) fn(...a);
      }, ms);
    }
  );
  wrapped.flush = () => {
    clearTimeout(timer);
    const a = pending;
    pending = null;
    if (a) fn(...a);
  };
  wrapped.cancel = () => {
    clearTimeout(timer);
    pending = null;
  };
  return wrapped;
}

/** @param {number} n @param {number} min @param {number} max */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Random identifier (URL-safe, 128 bits). */
export function uid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
