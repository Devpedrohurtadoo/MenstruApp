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

/** Object stores of the current schema. */
const STORES = /** @type {const} */ (['meta', 'vaults', 'records', 'blobs', 'notifications']);

/** Creates whatever store is missing (idempotent, so it also repairs a damaged schema). @param {IDBDatabase} db */
function createStores(db) {
  if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  if (!db.objectStoreNames.contains('vaults')) db.createObjectStore('vaults', { keyPath: 'profileId' });
  if (!db.objectStoreNames.contains('records')) {
    const records = db.createObjectStore('records', { keyPath: 'id' });
    records.createIndex('profileId', 'profileId', { unique: false });
  }
  if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
  if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' });
}

/** @param {string} name @param {number} [version] @returns {Promise<IDBDatabase>} */
function openAt(name, version) {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(name) : indexedDB.open(name, version);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let blockedTimer;
    request.onupgradeneeded = () => createStores(request.result);
    request.onsuccess = () => {
      clearTimeout(blockedTimer);
      const db = request.result;
      // Another tab upgrading the schema, or "delete everything": release our connection.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => {
      clearTimeout(blockedTimer);
      reject(request.error);
    };
    // "blocked" is transient (another connection is being closed): keep waiting, and only
    // give up if it is never released.
    request.onblocked = () => {
      blockedTimer ??= setTimeout(() => reject(new Error('IndexedDB upgrade blocked by another tab')), 15_000);
    };
  });
}

/**
 * Opens the database, creating or repairing the schema when needed. It first opens whatever
 * version exists (so a newer database never fails with VersionError) and, if that version is
 * older than ours or some store is missing (e.g. an empty database created by devtools or an
 * extension), upgrades once more to create them.
 * @param {string} [name]
 * @returns {Promise<IDBDatabase>}
 */
export async function openDatabase(name = DB_NAME) {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
  const db = await openAt(name);
  if (db.version >= DB_VERSION && STORES.every((store) => db.objectStoreNames.contains(store))) return db;
  const version = Math.max(DB_VERSION, db.version + 1);
  db.close();
  return openAt(name, version);
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
