// Encrypted per-profile repository.
//
// Every record (one per logged day, plus a few documents like settings) is stored as
// { id, profileId, iv, ct }. The id is an HMAC of the record's logical key, so the database
// never reveals *which* dates have entries, and the ciphertext is bound to its id (AES-GCM
// additional data) so records cannot be swapped or replayed into another slot.
// Deletions are kept as encrypted tombstones so they can propagate through sync.

import { decryptJSON, encryptJSON, hmac, toB64Url } from '../security/crypto.js';
import { validate } from '../core/validate.js';
import { dayEntrySchema, DOC_SCHEMAS } from './schema.js';
import { deleteByIndex, getAll, put, putMany } from './idb.js';
import { isISODate } from '../core/dates.js';

/**
 * @typedef {{ kind: 'day' | 'doc', key: string, value?: any, updatedAt: number, deleted?: boolean }} PlainRecord
 * @typedef {{ days: Record<string, any>, docs: Record<string, any>, clock: Record<string, number>, unreadable: number }} ProfileData
 */

export class ProfileRepo {
  /**
   * @param {IDBDatabase} db
   * @param {string} profileId
   * @param {{ encKey: CryptoKey, idKey: CryptoKey }} keys
   */
  constructor(db, profileId, keys) {
    this.db = db;
    this.profileId = profileId;
    this.encKey = keys.encKey;
    this.idKey = keys.idKey;
    /** @type {Map<string, string>} */
    this.idCache = new Map();
  }

  /** @param {'day' | 'doc'} kind @param {string} key */
  async recordId(kind, key) {
    const logical = `${kind}:${key}`;
    const cached = this.idCache.get(logical);
    if (cached) return cached;
    const mac = await hmac(this.idKey, logical);
    const id = `${this.profileId}:${toB64Url(mac.subarray(0, 18))}`;
    this.idCache.set(logical, id);
    return id;
  }

  /** @param {PlainRecord} record */
  async encryptRecord(record) {
    const id = await this.recordId(record.kind, record.key);
    const payload = await encryptJSON(this.encKey, record, id);
    return { id, profileId: this.profileId, iv: payload.iv, ct: payload.ct };
  }

  /**
   * Loads and decrypts every record of the profile.
   * @returns {Promise<ProfileData>}
   */
  async loadAll() {
    const rows = await getAll(this.db, 'records', { index: 'profileId', query: this.profileId });
    /** @type {ProfileData} */
    const data = { days: {}, docs: {}, clock: {}, unreadable: 0 };
    const results = await Promise.allSettled(rows.map(async (row) => /** @type {PlainRecord} */ (await decryptJSON(this.encKey, { iv: row.iv, ct: row.ct }, row.id))));
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        data.unreadable++;
        continue;
      }
      const rec = result.value;
      const clockKey = `${rec.kind}:${rec.key}`;
      data.clock[clockKey] = rec.updatedAt;
      if (rec.deleted) continue;
      if (rec.kind === 'day') {
        const checked = isISODate(rec.key) ? validate(dayEntrySchema, rec.value) : null;
        if (checked?.ok) data.days[rec.key] = checked.value;
        else data.unreadable++;
      } else if (rec.kind === 'doc' && rec.key in DOC_SCHEMAS) {
        const checked = validate(DOC_SCHEMAS[/** @type {keyof typeof DOC_SCHEMAS} */ (rec.key)], rec.value);
        if (checked.ok) data.docs[rec.key] = checked.value;
        else data.unreadable++;
      }
    }
    return data;
  }

  /**
   * @param {string} iso
   * @param {any} entry validated day entry (empty object = delete)
   * @param {number} [updatedAt]
   */
  async saveDay(iso, entry, updatedAt = Date.now()) {
    if (!isISODate(iso)) throw new RangeError('Invalid date');
    const empty = !entry || Object.keys(entry).filter((k) => k !== 'updatedAt').length === 0;
    const record = empty
      ? { kind: /** @type {const} */ ('day'), key: iso, deleted: true, updatedAt }
      : { kind: /** @type {const} */ ('day'), key: iso, value: { ...entry, updatedAt }, updatedAt };
    await put(this.db, 'records', await this.encryptRecord(record));
    return updatedAt;
  }

  /**
   * @param {string} name
   * @param {any} value (null = delete)
   * @param {number} [updatedAt]
   */
  async saveDoc(name, value, updatedAt = Date.now()) {
    if (!(name in DOC_SCHEMAS)) throw new RangeError(`Unknown document ${name}`);
    const record =
      value === null || value === undefined
        ? { kind: /** @type {const} */ ('doc'), key: name, deleted: true, updatedAt }
        : { kind: /** @type {const} */ ('doc'), key: name, value, updatedAt };
    await put(this.db, 'records', await this.encryptRecord(record));
    return updatedAt;
  }

  /**
   * Writes many records at once (import, sync merge, migration).
   * @param {PlainRecord[]} records
   */
  async saveMany(records) {
    const rows = [];
    for (const rec of records) rows.push(await this.encryptRecord(rec));
    await putMany(this.db, 'records', rows);
  }

  /** Removes every record of this profile. */
  async wipe() {
    this.idCache.clear();
    return deleteByIndex(this.db, 'records', 'profileId', this.profileId);
  }
}
