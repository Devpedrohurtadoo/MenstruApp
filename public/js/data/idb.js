// Small promise wrapper around IndexedDB (no third-party dependency).

export const DB_NAME = 'menstruapp';
export const DB_VERSION = 1;

/** @typedef {'meta' | 'vaults' | 'records' | 'blobs' | 'notifications'} StoreName */

/**
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
export function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @param {IDBTransaction} tx @returns {Promise<void>} */
export function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

/** @param {string} [name] @returns {Promise<IDBDatabase>} */
export function openDatabase(name = DB_NAME) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('vaults')) db.createObjectStore('vaults', { keyPath: 'profileId' });
      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('profileId', 'profileId', { unique: false });
      }
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema: release our connection instead of blocking it.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
}

/**
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {IDBValidKey} key
 */
export async function get(db, store, key) {
  const tx = db.transaction(store, 'readonly');
  return promisify(tx.objectStore(store).get(key));
}

/**
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {any} value
 * @param {IDBValidKey} [key]
 */
export async function put(db, store, value, key) {
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  if (key === undefined) os.put(value);
  else os.put(value, key);
  await done(tx);
}

/**
 * Writes several values atomically.
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {any[]} values
 */
export async function putMany(db, store, values) {
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const value of values) os.put(value);
  await done(tx);
}

/**
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {IDBValidKey} key
 */
export async function del(db, store, key) {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await done(tx);
}

/**
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {{ index?: string, query?: IDBValidKey | IDBKeyRange }} [opts]
 * @returns {Promise<any[]>}
 */
export async function getAll(db, store, opts = {}) {
  const tx = db.transaction(store, 'readonly');
  const os = tx.objectStore(store);
  const source = opts.index ? os.index(opts.index) : os;
  return promisify(source.getAll(opts.query));
}

/**
 * Deletes every row whose index matches a value.
 * @param {IDBDatabase} db
 * @param {StoreName} store
 * @param {string} index
 * @param {IDBValidKey} value
 */
export async function deleteByIndex(db, store, index, value) {
  const tx = db.transaction(store, 'readwrite');
  const keys = await promisify(tx.objectStore(store).index(index).getAllKeys(value));
  for (const key of keys) tx.objectStore(store).delete(key);
  await done(tx);
  return keys.length;
}

/** @param {IDBDatabase} db @param {StoreName} store */
export async function clearStore(db, store) {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await done(tx);
}

/** Deletes the whole database (used by "delete all my data"). @param {string} [name] */
export function deleteDatabase(name = DB_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve(undefined);
  });
}
