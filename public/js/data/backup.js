// Export / import of the user's data: plain JSON, password-encrypted backups and CSV.
// Every imported file is treated as untrusted input and validated against the schemas.

import { validate } from '../core/validate.js';
import * as C from '../security/crypto.js';
import { toCSV, parseCSV } from '../lib/csv.js';
import { BACKUP_FORMAT, ENCRYPTED_BACKUP_FORMAT, backupSchema, encryptedBackupSchema, dayEntrySchema } from './schema.js';
import { isISODate } from '../core/dates.js';
import { SYMPTOM_IDS, MOODS } from '../domain/catalog.js';

export const APP_VERSION = '3.0.0';
const MAX_FILE_BYTES = 60 * 1024 * 1024;

export class BackupError extends Error {
  /** @param {'invalid' | 'needsPassword' | 'wrongPassword' | 'tooLarge'} code */
  constructor(code) {
    super(code);
    this.name = 'BackupError';
    this.code = code;
  }
}

/**
 * @param {{ days: Record<string, any>, docs: Record<string, any> }} data
 */
export function buildBackup(data) {
  /** @type {Record<string, any>} */
  const payload = { days: data.days };
  for (const name of ['profile', 'settings', 'reminders', 'pregnancy', 'gamification']) {
    if (data.docs[name]) payload[name] = data.docs[name];
  }
  return { format: BACKUP_FORMAT, version: 3, exportedAt: new Date().toISOString(), app: APP_VERSION, data: payload };
}

/** @param {{ days: Record<string, any>, docs: Record<string, any> }} data */
export function backupBlob(data) {
  return new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' });
}

/**
 * @param {{ days: Record<string, any>, docs: Record<string, any> }} data
 * @param {string} password
 */
export async function encryptedBackupBlob(data, password) {
  const salt = C.randomBytes(16);
  const iterations = C.PBKDF2_ITERATIONS;
  const key = await C.pbkdf2Key(password.normalize('NFC'), salt, iterations);
  const { iv, ct } = await C.encryptJSON(key, buildBackup(data), ENCRYPTED_BACKUP_FORMAT);
  const file = {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: C.toB64(salt) },
    iv,
    ct,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/**
 * Parses a backup file (plain or encrypted).
 * @param {string} text
 * @param {string} [password]
 * @returns {Promise<{ days: Record<string, any>, docs: Record<string, any>, encrypted: boolean }>}
 */
export async function readBackup(text, password) {
  if (text.length > MAX_FILE_BYTES) throw new BackupError('tooLarge');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  let encrypted = false;
  if (parsed?.format === ENCRYPTED_BACKUP_FORMAT) {
    const envelope = validate(encryptedBackupSchema, parsed);
    if (!envelope.ok) throw new BackupError('invalid');
    if (!password) throw new BackupError('needsPassword');
    const { kdf, iv, ct } = envelope.value;
    try {
      const key = await C.pbkdf2Key(password.normalize('NFC'), C.fromB64(kdf.salt), kdf.iterations);
      parsed = await C.decryptJSON(key, { iv, ct }, ENCRYPTED_BACKUP_FORMAT);
    } catch {
      throw new BackupError('wrongPassword');
    }
    encrypted = true;
  }
  const checked = validate(backupSchema, parsed);
  if (!checked.ok) throw new BackupError('invalid');
  const { days, ...docs } = checked.value.data;
  if (docs.pregnancy === null) delete docs.pregnancy;
  return { days, docs, encrypted };
}

const CSV_COLUMNS = [
  'date',
  'flow',
  'flow_color',
  'clots',
  'symptoms',
  'moods',
  'energy',
  'libido',
  'sex',
  'bbt_celsius',
  'bbt_disturbed',
  'cervical_mucus',
  'ovulation_test',
  'pregnancy_test',
  'contraception_taken',
  'medications',
  'weight_kg',
  'sleep_hours',
  'water_glasses',
  'exercise',
  'notes',
];

/** @param {Record<string, any>} days */
export function daysToCSV(days) {
  const rows = [CSV_COLUMNS];
  for (const iso of Object.keys(days).sort()) {
    const d = days[iso];
    rows.push([
      iso,
      d.flow ?? '',
      d.flowColor ?? '',
      d.clots ?? '',
      Object.entries(d.symptoms ?? {})
        .map(([id, n]) => `${id}:${n}`)
        .join('|'),
      (d.moods ?? []).join('|'),
      d.energy ?? '',
      d.libido ?? '',
      d.sex ?? '',
      d.bbt ?? '',
      d.bbtDisturbed ? 'yes' : '',
      d.mucus ?? '',
      d.lh ?? '',
      d.pregnancyTest ?? '',
      d.contraceptionTaken === undefined ? '' : d.contraceptionTaken ? 'yes' : 'no',
      (d.meds ?? []).map((/** @type {any} */ m) => (m.dose ? `${m.name} ${m.dose}` : m.name)).join('|'),
      d.weight ?? '',
      d.sleepHours ?? '',
      d.water ?? '',
      d.exercise ?? '',
      d.notes ?? '',
    ]);
  }
  return toCSV(rows);
}

/** @param {Record<string, any>} days */
export function csvBlob(days) {
  // Leading BOM so spreadsheet apps detect UTF-8 (accents in notes).
  return new Blob(['﻿', daysToCSV(days)], { type: 'text/csv;charset=utf-8' });
}

/**
 * Parses a CSV previously exported by Menstruapp (round-trip).
 * @param {string} text
 * @returns {Record<string, any> | null} days, or null if the header is not ours
 */
export function csvToDays(text) {
  const rows = parseCSV(text);
  if (!rows.length || rows[0][0] !== 'date' || rows[0][1] !== 'flow') return null;
  const header = rows[0];
  const col = (/** @type {string} */ name) => header.indexOf(name);
  /** @type {Record<string, any>} */
  const days = {};
  for (const r of rows.slice(1)) {
    const iso = r[col('date')];
    if (!isISODate(iso)) continue;
    const g = (/** @type {string} */ name) => (col(name) >= 0 ? (r[col(name)] ?? '').replace(/^'/, '') : '');
    /** @type {Record<string, any>} */
    const e = {};
    const setIf = (/** @type {string} */ key, /** @type {any} */ value) => {
      if (value !== '' && value !== undefined && !Number.isNaN(value)) e[key] = value;
    };
    setIf('flow', g('flow'));
    setIf('flowColor', g('flow_color'));
    setIf('clots', g('clots'));
    const symptoms = Object.fromEntries(
      g('symptoms')
        .split('|')
        .map((p) => p.split(':'))
        .filter(([id, n]) => SYMPTOM_IDS.includes(id) && /^[123]$/.test(n))
        .map(([id, n]) => [id, Number(n)]),
    );
    if (Object.keys(symptoms).length) e.symptoms = symptoms;
    const moods = g('moods')
      .split('|')
      .filter((m) => /** @type {readonly string[]} */ (MOODS).includes(m));
    if (moods.length) e.moods = moods;
    if (g('energy')) setIf('energy', Number(g('energy')));
    setIf('libido', g('libido'));
    setIf('sex', g('sex'));
    if (g('bbt_celsius')) setIf('bbt', Number(g('bbt_celsius')));
    if (g('bbt_disturbed') === 'yes') e.bbtDisturbed = true;
    setIf('mucus', g('cervical_mucus'));
    setIf('lh', g('ovulation_test'));
    setIf('pregnancyTest', g('pregnancy_test'));
    if (g('contraception_taken')) e.contraceptionTaken = g('contraception_taken') === 'yes';
    const meds = g('medications')
      .split('|')
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((name) => ({ name: name.slice(0, 80) }));
    if (meds.length) e.meds = meds;
    if (g('weight_kg')) setIf('weight', Number(g('weight_kg')));
    if (g('sleep_hours')) setIf('sleepHours', Number(g('sleep_hours')));
    if (g('water_glasses')) setIf('water', Number(g('water_glasses')));
    setIf('exercise', g('exercise'));
    setIf('notes', g('notes'));
    const checked = validate(dayEntrySchema, e);
    if (checked.ok && Object.keys(checked.value).length) days[iso] = checked.value;
  }
  return days;
}
