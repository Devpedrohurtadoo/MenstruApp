// Application service layer: session (lock/unlock, auto-lock), decrypted in-memory data,
// validated saves and derived computations. Views only talk to the app through this module.

import { createStore, createBus, uid } from './core/store.js';
import { todayISO, ageFromProfile, addDays } from './core/dates.js';
import { validate, ValidationError } from './core/validate.js';
import { openDatabase, get, put, del, deleteDatabase } from './data/idb.js';
import { ProfileRepo } from './data/repo.js';
import { dayEntrySchema, DOC_SCHEMAS, defaultSettings, PORTABLE_DOCS } from './data/schema.js';
import { loadPrefs, savePrefs, clearPrefs, clearWebStorage } from './data/prefs.js';
import { clearLegacyData } from './data/legacy.js';
import {
  createVault,
  unlockVault,
  deriveProfileKeys,
  describeVault,
  setPrimaryLock,
  regenerateRecovery,
  addWebAuthnLock,
  removeLock,
  WrongSecretError,
} from './security/vault.js';
import { wipe } from './security/crypto.js';
import { lockStatus, registerFailure, initialLockout } from './security/lockout.js';
import { registerBiometric, unlockWithBiometric } from './security/webauthn.js';
import { analyze } from './domain/cycle.js';
import { computeNotices } from './domain/insights.js';
import { modeFlags } from './domain/modes.js';
import { pregnancyInfo } from './domain/pregnancy.js';
import { loggingStreak, newAchievements } from './domain/streaks.js';
import { defaultReminders } from './domain/reminders.js';

/**
 * @typedef {{ id: string, avatar: string, color: string, label: string, createdAt: number }} ProfileMeta
 * @typedef {{ days: Record<string, any>, docs: Record<string, any>, clock: Record<string, number>, unreadable: number }} Data
 * @typedef {ReturnType<typeof computeDerived>} Derived
 * @typedef {{ prefs: import('./data/prefs.js').Prefs, db: IDBDatabase | null, profiles: ProfileMeta[],
 *   session: null | { profileId: string, vaultInfo: ReturnType<typeof describeVault> }, data: Data | null, derived: Derived | null,
 *   version: number, online: boolean, server: { checked: boolean, push: boolean, sync: boolean, share: boolean },
 *   install: { canPrompt: boolean, ios: boolean, standalone: boolean }, updateReady: boolean }} AppState
 */

export const bus = createBus();

/** @type {ReturnType<typeof createStore<AppState>>} */
export const store = createStore(
  /** @type {AppState} */ ({
    prefs: loadPrefs(),
    db: null,
    profiles: [],
    session: null,
    data: null,
    derived: null,
    version: 0,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    server: { checked: false, push: false, sync: false, share: false },
    install: { canPrompt: false, ios: false, standalone: false },
    updateReady: false,
  }),
);

/** @type {ProfileRepo | null} */
let repo = null;
/** @type {Set<string>} */
const events = new Set();

// ---------------------------------------------------------------------------------------------
// Boot

export async function initApp() {
  const db = await openDatabase();
  const profiles = /** @type {ProfileMeta[]} */ ((await get(db, 'meta', 'profiles')) ?? []);
  store.set({ db, profiles });
  scheduleMidnightRefresh();
  return { hasProfiles: profiles.length > 0 };
}

function db() {
  const d = store.get().db;
  if (!d) throw new Error('Database not ready');
  return d;
}

/** @param {ProfileMeta[]} profiles */
async function saveProfiles(profiles) {
  await put(db(), 'meta', profiles, 'profiles');
  store.set({ profiles });
}

/** @param {string} profileId */
export async function getVault(profileId) {
  return get(db(), 'vaults', profileId);
}

// ---------------------------------------------------------------------------------------------
// Derived state

/** @param {Data} data */
export function computeDerived(data) {
  const today = todayISO();
  const settings = { ...defaultSettings(), ...(data.docs.settings ?? {}) };
  settings.features = { ...defaultSettings().features, ...(data.docs.settings?.features ?? {}) };
  settings.security = { ...defaultSettings().security, ...(data.docs.settings?.security ?? {}) };
  const preg = data.docs.pregnancy;
  /** @type {Array<[string, string]>} */
  const ranges = (preg?.history ?? []).map((/** @type {{ from: string, to: string }} */ r) => [r.from, r.to]);
  const pregnancy = preg?.active ? pregnancyInfo(preg, today) : null;
  if (pregnancy) ranges.push([pregnancy.lmp, today]);
  const analysis = analyze(data.days, { today, settings, excludeRanges: ranges });
  const flags = modeFlags(settings);
  const profile = data.docs.profile ?? {};
  const age = ageFromProfile(profile, today);
  const notices = computeNotices(analysis, data.days, {
    today,
    mode: settings.mode,
    age,
    experience: settings.experience,
    modeSince: settings.modeSince ?? null,
    postpartumBirthDate: settings.postpartum?.birthDate ?? null,
  });
  const streak = loggingStreak(data.days, today);
  return { today, settings, profile, flags, analysis, notices, streak, pregnancy, age };
}

function refresh() {
  const { data, version } = store.get();
  if (!data) return;
  store.set({ derived: computeDerived(data), version: version + 1 });
}

function scheduleMidnightRefresh() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => {
    refresh();
    bus.emit('day-changed');
    scheduleMidnightRefresh();
  }, next.getTime() - now.getTime());
}

// ---------------------------------------------------------------------------------------------
// Profiles & vaults

const PROFILE_COLORS = ['#e0668f', '#9b7be8', '#2aa283', '#3a8fd6', '#d99a2b', '#ee7a64'];

/**
 * Creates a new profile with its encrypted vault and initial documents, and opens a session.
 * @param {{ name?: string, birthYear?: number | null, avatar?: string, lock: { method: 'pin' | 'passphrase' | 'none', secret?: string },
 *   settings: Record<string, any>, days?: Record<string, any>, reminders?: any[], importLegacy?: boolean, pregnancy?: Record<string, any> | null }} opts
 */
export async function createProfile(opts) {
  const profileId = uid();
  const { vault, master, recoveryCode } = await createVault(profileId, opts.lock);
  const keys = await deriveProfileKeys(master);
  wipe(master);
  await put(db(), 'vaults', vault);
  const newRepo = new ProfileRepo(db(), profileId, keys);
  const now = Date.now();
  const profileDoc = validDoc('profile', { name: opts.name || undefined, birthYear: opts.birthYear ?? null, avatar: opts.avatar, createdAt: now });
  const settingsDoc = validDoc('settings', { ...defaultSettings(opts.settings.mode), ...opts.settings, onboardedAt: now, modeSince: todayISO() });
  const reminderItems = mergeReminders(defaultReminders(settingsDoc.mode), opts.reminders ?? []);
  /** @type {Array<import('./data/repo.js').PlainRecord>} */
  const records = [
    { kind: 'doc', key: 'profile', value: profileDoc, updatedAt: now },
    { kind: 'doc', key: 'settings', value: settingsDoc, updatedAt: now },
    { kind: 'doc', key: 'reminders', value: validDoc('reminders', { items: reminderItems }), updatedAt: now },
    { kind: 'doc', key: 'gamification', value: { achievements: {} }, updatedAt: now },
  ];
  if (opts.pregnancy) records.push({ kind: 'doc', key: 'pregnancy', value: validDoc('pregnancy', opts.pregnancy), updatedAt: now });
  for (const [iso, entry] of Object.entries(opts.days ?? {})) {
    const checked = validate(dayEntrySchema, entry);
    if (checked.ok) records.push({ kind: 'day', key: iso, value: { ...checked.value, updatedAt: now }, updatedAt: now });
  }
  await newRepo.saveMany(records);
  if (opts.importLegacy) clearLegacyData();
  const meta = {
    id: profileId,
    avatar: opts.avatar ?? '🌙',
    color: PROFILE_COLORS[store.get().profiles.length % PROFILE_COLORS.length],
    label: (opts.name ?? '').slice(0, 40),
    createdAt: now,
  };
  await saveProfiles([...store.get().profiles, meta]);
  store.set({ prefs: savePrefs({ lastProfileId: profileId }) });
  await openSession(profileId, newRepo, vault);
  requestPersistentStorage();
  return { recoveryCode, profileId };
}

/**
 * @param {any[]} defaults
 * @param {any[]} chosen
 */
function mergeReminders(defaults, chosen) {
  const byId = new Map(defaults.map((r) => [r.id, r]));
  for (const r of chosen) byId.set(r.id, { ...(byId.get(r.id) ?? {}), ...r });
  return Array.from(byId.values());
}

/**
 * @param {string} name
 * @param {any} value
 */
function validDoc(name, value) {
  const schema = DOC_SCHEMAS[/** @type {keyof typeof DOC_SCHEMAS} */ (name)];
  const cleaned = JSON.parse(JSON.stringify(value));
  const checked = validate(schema, cleaned);
  if (!checked.ok) throw new ValidationError(checked.errors);
  return checked.value;
}

/**
 * @param {string} profileId
 * @param {ProfileRepo} newRepo
 * @param {import('./security/vault.js').Vault} vault
 */
async function openSession(profileId, newRepo, vault) {
  const data = await newRepo.loadAll();
  repo = newRepo;
  store.set({ session: { profileId, vaultInfo: describeVault(vault) }, data, derived: computeDerived(data), version: store.get().version + 1 });
  startAutoLock();
  bus.emit('unlocked', { profileId });
}

/** @param {string} profileId */
async function getLockout(profileId) {
  return (await get(db(), 'meta', `lockout:${profileId}`)) ?? initialLockout();
}

/** @param {string} profileId */
export async function lockoutStatus(profileId) {
  return lockStatus(await getLockout(profileId));
}

/**
 * Unlocks a profile. Throws WrongSecretError (after recording the failed attempt) or a
 * `{ locked: true, remainingMs }` object when throttled.
 * @param {string} profileId
 * @param {{ type: 'pin' | 'passphrase' | 'recovery' | 'device' | 'webauthn', secret?: string }} attempt
 */
export async function unlock(profileId, attempt) {
  const vault = await getVault(profileId);
  if (!vault) throw new Error('Unknown profile');
  const status = lockStatus(await getLockout(profileId));
  if (status.locked && attempt.type !== 'device') throw Object.assign(new Error('throttled'), { throttled: true, remainingMs: status.remainingMs });
  /** @type {Uint8Array<ArrayBuffer>} */
  let master;
  try {
    if (attempt.type === 'webauthn') {
      const lock = describeVault(vault).biometric;
      if (!lock) throw new WrongSecretError();
      const prfOutput = await unlockWithBiometric(/** @type {any} */ (lock));
      master = await unlockVault(vault, { type: 'webauthn', prfOutput });
    } else {
      master = await unlockVault(vault, attempt);
    }
  } catch (err) {
    if (err instanceof WrongSecretError && attempt.type !== 'device' && attempt.type !== 'webauthn') {
      const next = registerFailure(await getLockout(profileId));
      await put(db(), 'meta', next, `lockout:${profileId}`);
      throw Object.assign(err, { status: lockStatus(next) });
    }
    throw err;
  }
  await put(db(), 'meta', initialLockout(), `lockout:${profileId}`);
  const keys = await deriveProfileKeys(master);
  wipe(master);
  store.set({ prefs: savePrefs({ lastProfileId: profileId }) });
  await openSession(profileId, new ProfileRepo(db(), profileId, keys), vault);
}

/**
 * Re-verifies the current user before a sensitive change and returns the master secret.
 * @param {{ type: 'pin' | 'passphrase' | 'recovery' | 'device' | 'webauthn', secret?: string }} attempt
 */
async function reauth(attempt) {
  const session = requireSession();
  const vault = await getVault(session.profileId);
  if (attempt.type === 'webauthn') {
    const lock = describeVault(vault).biometric;
    const prfOutput = await unlockWithBiometric(/** @type {any} */ (lock));
    return { vault, master: await unlockVault(vault, { type: 'webauthn', prfOutput }) };
  }
  return { vault, master: await unlockVault(vault, attempt) };
}

/** @param {'manual' | 'auto' | 'hidden' | 'switch' | 'camouflage' | 'guest'} [reason] */
export function lock(reason = 'manual') {
  if (!store.get().session) return;
  repo = null;
  stopAutoLock();
  store.set({ session: null, data: null, derived: null });
  bus.emit('locked', { reason });
}

export function isUnlocked() {
  return Boolean(store.get().session && repo);
}

function requireSession() {
  const s = store.get().session;
  if (!s || !repo) throw new Error('Locked');
  return s;
}

function requireRepo() {
  requireSession();
  return /** @type {ProfileRepo} */ (repo);
}

// ---------------------------------------------------------------------------------------------
// Saving data

/**
 * @param {string} iso
 * @param {Record<string, any>} entry
 */
export async function saveDay(iso, entry) {
  const r = requireRepo();
  if (iso > todayISO()) throw new RangeError('future');
  const cleaned = Object.fromEntries(
    Object.entries(entry).filter(([k, v]) => k !== 'updatedAt' && v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)),
  );
  const checked = validate(dayEntrySchema, cleaned);
  if (!checked.ok) throw new ValidationError(checked.errors);
  const updatedAt = await r.saveDay(iso, checked.value);
  const data = /** @type {Data} */ (store.get().data);
  const days = { ...data.days };
  if (Object.keys(checked.value).length) days[iso] = { ...checked.value, updatedAt };
  else delete days[iso];
  store.set({ data: { ...data, days, clock: { ...data.clock, [`day:${iso}`]: updatedAt } } });
  refresh();
  const unlocked = await checkAchievements();
  bus.emit('data-changed', { kind: 'day', iso });
  return { achievements: unlocked };
}

/**
 * @param {string} name
 * @param {any} value null deletes the document
 */
export async function saveDoc(name, value) {
  const r = requireRepo();
  const cleaned = value === null ? null : validDoc(name, value);
  const updatedAt = await r.saveDoc(name, cleaned);
  const data = /** @type {Data} */ (store.get().data);
  const docs = { ...data.docs };
  if (cleaned === null) delete docs[name];
  else docs[name] = cleaned;
  store.set({ data: { ...data, docs, clock: { ...data.clock, [`doc:${name}`]: updatedAt } } });
  refresh();
  bus.emit('data-changed', { kind: 'doc', name });
}

/** @param {Record<string, any>} patch */
export async function updateSettings(patch) {
  const current = store.get().data?.docs.settings ?? defaultSettings();
  const next = { ...current, ...patch };
  if (patch.mode && patch.mode !== current.mode) next.modeSince = todayISO();
  await saveDoc('settings', next);
}

/** @param {Record<string, any>} patch */
export async function updateProfile(patch) {
  const current = store.get().data?.docs.profile ?? {};
  await saveDoc('profile', { ...current, ...patch });
  if ('name' in patch || 'avatar' in patch) {
    const session = requireSession();
    const profiles = store.get().profiles.map((p) =>
      p.id === session.profileId ? { ...p, label: String(patch.name ?? p.label ?? '').slice(0, 40), avatar: patch.avatar ?? p.avatar } : p,
    );
    await saveProfiles(profiles);
  }
}

/** @param {import('./domain/reminders.js').Reminder[]} items */
export async function saveReminders(items) {
  await saveDoc('reminders', { items });
}

/** @param {Partial<import('./data/prefs.js').Prefs>} patch */
export function setPrefs(patch) {
  const prefs = savePrefs(patch);
  store.set({ prefs });
  bus.emit('prefs-changed', prefs);
  return prefs;
}

/** @param {string} name e.g. 'reportExported', 'backupDone' */
export async function recordEvent(name) {
  events.add(name);
  return checkAchievements();
}

async function checkAchievements() {
  const { derived, data } = store.get();
  if (!derived || !data) return [];
  if (derived.settings.features?.streaks === false) return [];
  const unlocked = data.docs.gamification?.achievements ?? {};
  const completed = derived.analysis.cycles.filter((c) => c.length !== null).length;
  const bbt = derived.analysis.cycles.filter((c) => c.ovulation?.method === 'bbt').length;
  const fresh = newAchievements({ streak: derived.streak, completedCycles: completed, bbtConfirmed: bbt, events }, unlocked);
  if (!fresh.length) return [];
  const achievements = { ...unlocked };
  for (const id of fresh) achievements[id] = derived.today;
  await saveDoc('gamification', { achievements });
  return fresh;
}

/**
 * Imports days and documents. "merge" keeps existing days not present in the import and lets
 * imported values win; "replace" deletes everything first.
 * @param {{ days: Record<string, any>, docs?: Record<string, any> }} payload
 * @param {'merge' | 'replace'} strategy
 */
export async function importData(payload, strategy) {
  const r = requireRepo();
  const data = /** @type {Data} */ (store.get().data);
  const now = Date.now();
  /** @type {Array<import('./data/repo.js').PlainRecord>} */
  const records = [];
  if (strategy === 'replace') {
    for (const iso of Object.keys(data.days)) if (!(iso in payload.days)) records.push({ kind: 'day', key: iso, deleted: true, updatedAt: now });
  }
  let imported = 0;
  for (const [iso, entry] of Object.entries(payload.days)) {
    const merged = strategy === 'merge' ? { ...(data.days[iso] ?? {}), ...entry } : entry;
    const checked = validate(dayEntrySchema, merged);
    if (!checked.ok) continue;
    records.push({ kind: 'day', key: iso, value: { ...checked.value, updatedAt: now }, updatedAt: now });
    imported++;
  }
  for (const name of PORTABLE_DOCS) {
    const value = payload.docs?.[name];
    if (!value) continue;
    const checked = validate(DOC_SCHEMAS[name], value);
    if (checked.ok) records.push({ kind: 'doc', key: name, value: checked.value, updatedAt: now });
  }
  await r.saveMany(records);
  const fresh = await r.loadAll();
  store.set({ data: fresh });
  refresh();
  bus.emit('data-changed', { kind: 'import' });
  return { imported };
}

// ---------------------------------------------------------------------------------------------
// Sync support (records with clocks, used by pwa/sync.js)

/** Portable records of the active profile, including deletion tombstones. */
export function localRecords() {
  const data = store.get().data;
  if (!data) return [];
  /** @type {Array<import('./data/repo.js').PlainRecord>} */
  const out = [];
  const portable = new Set(PORTABLE_DOCS);
  for (const [clockKey, updatedAt] of Object.entries(data.clock)) {
    const [kind, key] = /** @type {['day' | 'doc', string]} */ ([clockKey.slice(0, 3), clockKey.slice(4)]);
    if (kind === 'day') {
      const value = data.days[key];
      out.push(value ? { kind, key, value, updatedAt } : { kind, key, deleted: true, updatedAt });
    } else if (kind === 'doc' && portable.has(/** @type {any} */ (key))) {
      const value = data.docs[key];
      out.push(value ? { kind, key, value, updatedAt } : { kind, key, deleted: true, updatedAt });
    }
  }
  return out;
}

/**
 * Applies records received from another device (already decrypted), after validation.
 * @param {Array<import('./data/repo.js').PlainRecord>} records
 */
export async function applyRemoteRecords(records) {
  const r = requireRepo();
  const portable = new Set(PORTABLE_DOCS);
  /** @type {Array<import('./data/repo.js').PlainRecord>} */
  const valid = [];
  for (const rec of records) {
    if (typeof rec?.updatedAt !== 'number' || !Number.isFinite(rec.updatedAt)) continue;
    if (rec.kind === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(rec.key)) {
      if (rec.deleted) valid.push({ kind: 'day', key: rec.key, deleted: true, updatedAt: rec.updatedAt });
      else {
        const checked = validate(dayEntrySchema, rec.value);
        if (checked.ok) valid.push({ kind: 'day', key: rec.key, value: { ...checked.value, updatedAt: rec.updatedAt }, updatedAt: rec.updatedAt });
      }
    } else if (rec.kind === 'doc' && portable.has(/** @type {any} */ (rec.key))) {
      if (rec.deleted) valid.push({ kind: 'doc', key: rec.key, deleted: true, updatedAt: rec.updatedAt });
      else {
        const checked = validate(DOC_SCHEMAS[/** @type {keyof typeof DOC_SCHEMAS} */ (rec.key)], rec.value);
        if (checked.ok) valid.push({ kind: 'doc', key: rec.key, value: checked.value, updatedAt: rec.updatedAt });
      }
    }
  }
  if (!valid.length) return 0;
  await r.saveMany(valid);
  store.set({ data: await r.loadAll() });
  refresh();
  bus.emit('data-changed', { kind: 'sync' });
  return valid.length;
}

// ---------------------------------------------------------------------------------------------
// Security settings

/**
 * @param {{ type: any, secret?: string }} current
 * @param {{ method: 'pin' | 'passphrase' | 'none', secret?: string }} next
 */
export async function changeLock(current, next) {
  const session = requireSession();
  const { vault, master } = await reauth(current);
  try {
    let { vault: updated, recoveryCode } = await setPrimaryLock(vault, master, next);
    // A recovery code that has just been used may have been seen or typed elsewhere: rotate it.
    if (current.type === 'recovery' && next.method !== 'none') {
      const rotated = await regenerateRecovery(updated, master);
      updated = rotated.vault;
      recoveryCode = rotated.recoveryCode;
    }
    await put(db(), 'vaults', updated);
    store.set({ session: { ...session, vaultInfo: describeVault(updated) } });
    startAutoLock();
    return { recoveryCode };
  } finally {
    wipe(master);
  }
}

/** @param {{ type: any, secret?: string }} current */
export async function newRecoveryCode(current) {
  const session = requireSession();
  const { vault, master } = await reauth(current);
  try {
    const result = await regenerateRecovery(vault, master);
    await put(db(), 'vaults', result.vault);
    store.set({ session: { ...session, vaultInfo: describeVault(result.vault) } });
    return result.recoveryCode;
  } finally {
    wipe(master);
  }
}

/** @param {{ type: any, secret?: string }} current */
export async function enableBiometric(current) {
  const session = requireSession();
  const { vault, master } = await reauth(current);
  try {
    const label = `Menstruapp · ${store.get().data?.docs.profile?.name ?? ''}`.trim();
    const cred = await registerBiometric({ label: label.slice(0, 60) });
    const next = await addWebAuthnLock(vault, master, cred);
    wipe(cred.prfOutput);
    await put(db(), 'vaults', next);
    store.set({ session: { ...session, vaultInfo: describeVault(next) } });
  } finally {
    wipe(master);
  }
}

export async function disableBiometric() {
  const session = requireSession();
  const vault = await getVault(session.profileId);
  const next = removeLock(vault, 'webauthn');
  await put(db(), 'vaults', next);
  store.set({ session: { ...session, vaultInfo: describeVault(next) } });
}

/** @param {{ type: any, secret?: string }} current */
export async function verifyCurrentUser(current) {
  const { master } = await reauth(current);
  wipe(master);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Auto-lock

/** @type {ReturnType<typeof setTimeout> | undefined} */
let idleTimer;
let hiddenAt = 0;
const HIDE_GRACE_MS = 30_000;

function autoLockConfig() {
  const { session, derived } = store.get();
  if (!session?.vaultInfo.needsSecret || !derived) return null;
  return derived.settings.security;
}

function resetIdle() {
  clearTimeout(idleTimer);
  const cfg = autoLockConfig();
  if (!cfg || !cfg.autoLockMinutes) return;
  idleTimer = setTimeout(() => lock('auto'), cfg.autoLockMinutes * 60_000);
}

const onActivity = () => resetIdle();
const onVisibility = () => {
  const cfg = autoLockConfig();
  if (!cfg) return;
  if (document.hidden) {
    hiddenAt = Date.now();
  } else if (cfg.lockOnHide && hiddenAt && Date.now() - hiddenAt > HIDE_GRACE_MS) {
    lock('hidden');
  } else {
    resetIdle();
  }
};

function startAutoLock() {
  stopAutoLock();
  if (!autoLockConfig()) return;
  for (const evt of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(evt, onActivity, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  resetIdle();
}

function stopAutoLock() {
  clearTimeout(idleTimer);
  hiddenAt = 0;
  for (const evt of ['pointerdown', 'keydown', 'touchstart']) document.removeEventListener(evt, onActivity);
  document.removeEventListener('visibilitychange', onVisibility);
}

bus.on('data-changed', (/** @type {{ kind: string, name?: string }} */ p) => {
  if (p?.kind === 'doc' && p.name === 'settings') startAutoLock();
});

// ---------------------------------------------------------------------------------------------
// Deletion

/** Deletes the active profile and its vault (other profiles are untouched). */
export async function deleteCurrentProfile() {
  const session = requireSession();
  await requireRepo().wipe();
  await del(db(), 'vaults', session.profileId);
  await del(db(), 'meta', `lockout:${session.profileId}`);
  const profiles = store.get().profiles.filter((p) => p.id !== session.profileId);
  await saveProfiles(profiles);
  lock('switch');
  bus.emit('profile-deleted', { profileId: session.profileId });
  return profiles.length;
}

/**
 * Deletes a profile from the lock screen when its secret and recovery code are lost.
 * No key is needed: the encrypted records are simply removed.
 * @param {string} profileId
 */
export async function wipeLockedProfile(profileId) {
  const { deleteByIndex } = await import('./data/idb.js');
  await deleteByIndex(db(), 'records', 'profileId', profileId);
  await del(db(), 'vaults', profileId);
  await del(db(), 'meta', `lockout:${profileId}`);
  const profiles = store.get().profiles.filter((p) => p.id !== profileId);
  await saveProfiles(profiles);
  if (store.get().prefs.lastProfileId === profileId) store.set({ prefs: savePrefs({ lastProfileId: profiles[0]?.id ?? null }) });
  return profiles.length;
}

/** Deletes absolutely everything stored by the app on this device. */
export async function deleteEverything() {
  bus.emit('before-delete-everything');
  lock('manual');
  store.get().db?.close();
  store.set({ db: null, profiles: [] });
  await deleteDatabase();
  clearPrefs();
  clearLegacyData();
  clearWebStorage();
  if ('caches' in window) {
    for (const key of await caches.keys()) await caches.delete(key);
  }
  const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
  for (const reg of regs) await reg.unregister();
}

// ---------------------------------------------------------------------------------------------
// Pregnancy lifecycle

/** @param {{ basis: 'lmp' | 'due' | 'conception', date: string }} opts */
export async function startPregnancy(opts) {
  const prev = store.get().data?.docs.pregnancy;
  await saveDoc('pregnancy', { active: true, basis: opts.basis, date: opts.date, startedAt: Date.now(), history: prev?.history ?? [] });
  await updateSettings({ mode: 'pregnant' });
}

/**
 * @param {{ outcome: 'birth' | 'loss' | 'other', date: string, nextMode: string, breastfeeding?: 'exclusive' | 'partial' | 'no' }} opts
 */
export async function endPregnancy(opts) {
  const derived = store.get().derived;
  const preg = store.get().data?.docs.pregnancy;
  if (!preg || !derived?.pregnancy) return;
  const history = [...(preg.history ?? []), { from: derived.pregnancy.lmp, to: opts.date }].slice(-20);
  await saveDoc('pregnancy', { ...preg, active: false, endedOn: opts.date, outcome: opts.outcome, history });
  /** @type {Record<string, any>} */
  const patch = { mode: opts.nextMode };
  if (opts.nextMode === 'postpartum') patch.postpartum = { birthDate: opts.date, breastfeeding: opts.breastfeeding ?? 'partial', periodReturned: false };
  await updateSettings(patch);
}

// ---------------------------------------------------------------------------------------------
// Storage durability

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist?.();
  } catch {
    /* ignore */
  }
}

export async function storageStatus() {
  try {
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    const estimate = (await navigator.storage?.estimate?.()) ?? {};
    return { persisted, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return { persisted: false, usage: 0, quota: 0 };
  }
}

/** Convenience getters for views. */
export const current = () => {
  const { data, derived } = store.get();
  return { data, derived };
};

/** @param {number} days */
export const daysAgo = (days) => addDays(todayISO(), -days);
