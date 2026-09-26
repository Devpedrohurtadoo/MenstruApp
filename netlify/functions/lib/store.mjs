// Storage adapter. Production: Netlify Blobs with strong consistency (site-wide stores).
// Local development and tests: an in-memory implementation with the same semantics
// (ETags + conditional writes), selected with MENSTRUAPP_STORE=memory.

import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

/**
 * @typedef {{ data: any, etag: string, metadata: Record<string, any> }} Entry
 * @typedef {{ metadata?: Record<string, any>, onlyIfMatch?: string, onlyIfNew?: boolean }} SetOptions
 * @typedef {{
 *   get(key: string): Promise<Entry | null>,
 *   set(key: string, data: any, options?: SetOptions): Promise<{ modified: boolean, etag?: string }>,
 *   delete(key: string): Promise<void>,
 *   list(prefix?: string): AsyncGenerator<string>,
 * }} KV
 */

/** @type {Map<string, Map<string, Entry>>} */
const memory = new Map();

/** @param {string} name @returns {KV} */
function memoryStore(name) {
  if (!memory.has(name)) memory.set(name, new Map());
  const map = /** @type {Map<string, Entry>} */ (memory.get(name));
  return {
    async get(key) {
      const e = map.get(key);
      return e ? { data: structuredClone(e.data), etag: e.etag, metadata: { ...e.metadata } } : null;
    },
    async set(key, data, options = {}) {
      const current = map.get(key);
      if (options.onlyIfNew && current) return { modified: false };
      if (options.onlyIfMatch && (!current || current.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = `"${randomUUID()}"`;
      map.set(key, { data: structuredClone(data), etag, metadata: { ...(options.metadata ?? {}) } });
      return { modified: true, etag };
    },
    async delete(key) {
      map.delete(key);
    },
    async *list(prefix = '') {
      for (const key of [...map.keys()]) if (key.startsWith(prefix)) yield key;
    },
  };
}

/** @param {string} name @returns {KV} */
function blobsStore(name) {
  const store = getStore({ name, consistency: 'strong' });
  return {
    async get(key) {
      const r = await store.getWithMetadata(key, { type: 'json' });
      return r ? { data: r.data, etag: r.etag ?? '', metadata: r.metadata ?? {} } : null;
    },
    async set(key, data, options = {}) {
      /** @type {any} */
      const opts = { metadata: options.metadata ?? {} };
      if (options.onlyIfNew) opts.onlyIfNew = true;
      else if (options.onlyIfMatch) opts.onlyIfMatch = options.onlyIfMatch;
      return store.setJSON(key, data, opts);
    },
    async delete(key) {
      await store.delete(key);
    },
    async *list(prefix = '') {
      for await (const page of store.list({ prefix, paginate: true })) {
        for (const blob of page.blobs) yield blob.key;
      }
    },
  };
}

/** @param {'sync' | 'push' | 'share'} name @returns {KV} */
export function openStore(name) {
  return process.env.MENSTRUAPP_STORE === 'memory' ? memoryStore(`menstruapp-${name}`) : blobsStore(`menstruapp-${name}`);
}

/**
 * Visits every key under `prefix`, resuming after the last key the previous run reached, so a
 * store too large for one run's time budget is still covered completely over successive runs
 * (without a cursor every run would restart at the head and never reach the tail).
 * The cursor lives in the same store under `cursorKey`, which must be outside `prefix`.
 * @param {KV} store
 * @param {string} prefix
 * @param {string} cursorKey
 * @param {() => boolean} hasTime
 * @param {(key: string) => Promise<void>} visit
 * @returns {Promise<{ visited: number, total: number }>}
 */
export async function sweep(store, prefix, cursorKey, hasTime, visit) {
  /** @type {string[]} */
  const keys = [];
  for await (const key of store.list(prefix)) keys.push(key);
  keys.sort();
  const saved = String((await store.get(cursorKey))?.data?.after ?? '');
  const resumeAt = saved ? keys.findIndex((k) => k > saved) : 0;
  const start = resumeAt < 0 ? 0 : resumeAt;
  let visited = 0;
  let last = saved;
  while (visited < keys.length && hasTime()) {
    const key = keys[(start + visited) % keys.length];
    await visit(key);
    visited++;
    last = key;
  }
  // A complete pass starts again from the head next time; an interrupted one resumes after `last`.
  const after = visited === keys.length ? '' : last;
  if (after !== saved) await store.set(cursorKey, { after });
  return { visited, total: keys.length };
}

/** Test helper: wipes the in-memory stores. */
export function resetMemoryStores() {
  memory.clear();
}
