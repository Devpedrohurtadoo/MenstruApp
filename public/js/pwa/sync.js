// End-to-end encrypted sync between devices (optional; needs the Netlify backend).
//
// A random 256-bit sync code is created on the first device and typed/pasted on the others.
// From it we derive (HKDF) an access token for the server and a separate AES-GCM key for the
// data. The server stores one opaque encrypted snapshot and never sees the key or the content.
// Conflicts are resolved per record (each day / document) with "latest change wins".

import { h, downloadBlob, replace } from '../core/dom.js';
import { t, fmtDateTime } from '../core/i18n.js';
import * as C from '../security/crypto.js';
import { validate, v } from '../core/validate.js';
import { api, ApiError } from './api.js';
import { store, saveDoc, localRecords, applyRemoteRecords, sessionGuard } from '../app.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { button, notice } from '../ui/components.js';
import { toast } from '../ui/toast.js';

const AAD = 'menstruapp-sync-v1';
/** Generates a new sync code (52 Crockford base32 characters = 260 bits, 256 used). */
export function newSyncCode() {
  return C.toBase32(C.randomBytes(32)).slice(0, 52);
}

/** @param {string} code */
export async function deriveSyncKeys(code) {
  const normalized = C.normalizeBase32(code);
  if (!/^[0-9A-Z]{52}$/.test(normalized)) throw new Error('invalid-code');
  const bytes = C.fromBase32(normalized).subarray(0, 32);
  const base = await C.hkdfBase(bytes);
  const token = C.toB64Url(await C.deriveBytes(base, 'menstruapp:sync-token:v1', 32));
  const key = await C.deriveAesKey(base, 'menstruapp:sync-data:v1');
  return { token, key, code: normalized };
}

/**
 * @param {string} code
 * @returns {Promise<null | { version: number, records: any[] }>}
 */
export async function fetchRemote(code) {
  const { token, key } = await deriveSyncKeys(code);
  let json;
  try {
    ({ json } = await api('/api/sync', { token, timeoutMs: 20_000 }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
  const records = await C.decryptJSON(key, { iv: json.iv, ct: json.ct }, AAD);
  if (!Array.isArray(records)) throw new Error('invalid-remote');
  // Structural check here; field-level validation happens in applyRemoteRecords().
  const shape = validate(v.array(v.object({ kind: v.enum(['day', 'doc']), key: v.string({ max: 40 }), updatedAt: v.number({ integer: true, min: 0 }) }), { max: 80_000 }), records.map((r) => ({ kind: r?.kind, key: r?.key, updatedAt: r?.updatedAt })));
  if (!shape.ok) throw new Error('invalid-remote');
  return { version: Number(json.version) || 0, records };
}

/**
 * @param {string} code
 * @param {any[]} records
 * @param {number} baseVersion
 */
async function upload(code, records, baseVersion) {
  const { token, key } = await deriveSyncKeys(code);
  const { iv, ct } = await C.encryptJSON(key, records, AAD);
  const { json } = await api('/api/sync', { method: 'PUT', token, body: { iv, ct, baseVersion }, timeoutMs: 30_000 });
  return Number(json?.version) || baseVersion + 1;
}

/**
 * Last-writer-wins merge per record. A remote timestamp in the future (a device with a wrong
 * clock, or a tampered snapshot) counts as "now": otherwise it would win every later merge and
 * silently revert newer edits.
 * @param {any[]} local
 * @param {any[]} remote
 * @param {number} [now]
 */
export function mergeRecords(local, remote, now = Date.now()) {
  /** @type {Map<string, any>} */
  const byKey = new Map();
  for (const r of local) byKey.set(`${r.kind}:${r.key}`, { rec: r, from: 'local' });
  const toApplyLocally = [];
  let remoteMissingSomething = false;
  const remoteKeys = new Set();
  for (const original of remote) {
    const r = original.updatedAt > now ? { ...original, updatedAt: now } : original;
    if (r !== original) remoteMissingSomething = true; // re-upload with the corrected clock
    const k = `${r.kind}:${r.key}`;
    remoteKeys.add(k);
    const mine = byKey.get(k);
    if (!mine || r.updatedAt > mine.rec.updatedAt) {
      byKey.set(k, { rec: r, from: 'remote' });
      toApplyLocally.push(r);
    } else if (r.updatedAt < mine.rec.updatedAt) {
      remoteMissingSomething = true;
    }
  }
  for (const k of byKey.keys()) if (!remoteKeys.has(k)) remoteMissingSomething = true;
  return { merged: Array.from(byKey.values()).map((x) => x.rec), toApplyLocally, remoteNeedsUpdate: remoteMissingSomething };
}

/** @type {Promise<boolean> | null} */
let running = null;
/** Bumped when sync is turned off or reconfigured: a sync in flight must then stop. */
let generation = 0;

/**
 * Synchronises the open profile. A sync belongs to the session and configuration it started
 * with: if the profile is locked/switched or sync is turned off meanwhile, it stops before
 * touching anything (it never writes one profile's data into another).
 * @param {{ silent?: boolean }} [opts]
 */
export function syncNow(opts = {}) {
  if (running) return running;
  running = runSync(opts).finally(() => {
    running = null;
  });
  return running;
}

/** @param {{ silent?: boolean }} opts */
async function runSync(opts) {
  const state = store.get().data?.docs.sync;
  if (!state?.enabled || !state.secret || !navigator.onLine) return false;
  const guard = sessionGuard();
  const gen = generation;
  const current = () => guard.valid && gen === generation;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remote = await fetchRemote(state.secret);
      if (!current()) return false;
      const { merged, toApplyLocally, remoteNeedsUpdate } = mergeRecords(localRecords(), remote?.records ?? []);
      if (toApplyLocally.length) await applyRemoteRecords(toApplyLocally, guard);
      if (!current()) return false;
      let version = remote?.version ?? 0;
      if (remoteNeedsUpdate || !remote) {
        try {
          version = await upload(state.secret, merged, remote?.version ?? 0);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409 && attempt === 0) continue;
          throw err;
        }
      }
      // Re-read the configuration: never re-enable sync or bring back an old code.
      const latest = store.get().data?.docs.sync;
      if (!current() || !latest?.enabled || latest.secret !== state.secret) return false;
      await saveDoc('sync', { ...latest, lastSyncAt: Date.now(), remoteVersion: version });
      if (!opts.silent) toast(t('sync.done'), { type: 'success' });
      return true;
    }
    return false;
  } catch (err) {
    if (!current()) return false;
    console.error('[sync]', err);
    if (!opts.silent) toast(t('sync.error'), { type: 'error' });
    return false;
  }
}

/**
 * Deletes a sync snapshot from the server. Throws when the server cannot be reached.
 * @param {string} secret
 */
async function deleteSnapshot(secret) {
  const { token } = await deriveSyncKeys(secret);
  try {
    await api('/api/sync', { method: 'DELETE', token });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }
}

/**
 * Turns sync off on this device and deletes the server copy. A sync in flight is awaited first
 * (it would otherwise re-create the copy). Offline, the deletion is retried later.
 * @returns {Promise<boolean>} whether the server copy is already deleted
 */
export async function disableSync() {
  generation++;
  await running;
  const state = store.get().data?.docs.sync;
  const secret = state?.secret ?? state?.pendingDelete;
  if (!secret) {
    await saveDoc('sync', { enabled: false });
    return true;
  }
  try {
    await deleteSnapshot(secret);
    await saveDoc('sync', { enabled: false });
    return true;
  } catch {
    await saveDoc('sync', { enabled: false, pendingDelete: secret });
    return false;
  }
}

/** Retries deleting a server copy left behind by turning sync off offline. */
export async function retryPendingDeletion() {
  const state = store.get().data?.docs.sync;
  if (!state?.pendingDelete || !navigator.onLine) return;
  try {
    await deleteSnapshot(state.pendingDelete);
    const latest = store.get().data?.docs.sync;
    if (latest?.pendingDelete === state.pendingDelete) await saveDoc('sync', { enabled: Boolean(latest.enabled), ...(latest.secret ? { secret: latest.secret } : {}) });
  } catch {
    /* next time */
  }
}

/** Deletes this profile's server copy (used by "delete profile" / "delete everything"). Throws on failure. */
export async function deleteRemoteSync() {
  generation++;
  await running;
  const state = store.get().data?.docs.sync;
  for (const secret of new Set([state?.secret, state?.pendingDelete].filter(Boolean))) await deleteSnapshot(/** @type {string} */ (secret));
}

/** Settings dialog for enabling, linking and disabling sync. */
export function openSyncSettings() {
  const box = h('div', { class: 'stack' });
  const draw = () => {
    const state = store.get().data?.docs.sync;
    if (state?.enabled) {
      replace(box,
        h('p', { text: t('sync.enabledText', { date: state.lastSyncAt ? fmtDateTime(state.lastSyncAt) : '—' }) }),
        button({ label: t('sync.now'), icon: 'refresh-cw', variant: 'primary', full: true, onClick: async () => { await syncNow(); draw(); } }),
        button({
          label: t('sync.showCode'),
          icon: 'key-round',
          variant: 'soft',
          full: true,
          onClick: async () => {
            const { confirmIdentity } = await import('../views/security-flows.js');
            if (await confirmIdentity(t('sync.reauth'))) showCode(/** @type {string} */ (state.secret));
          },
        }),
        button({
          label: t('sync.disable'),
          variant: 'ghost',
          full: true,
          onClick: async () => {
            const ok = await confirmDialog({ title: t('sync.disable'), message: t('sync.disableText'), confirmLabel: t('sync.disableConfirm'), danger: true });
            if (!ok) return;
            const deleted = await disableSync();
            toast(t(deleted ? 'sync.disabled' : 'sync.disabledOffline'), { duration: deleted ? undefined : 8000 });
            draw();
          },
        }),
      );
      return;
    }
    const consent = h('input', { type: 'checkbox', id: 'sync-consent' });
    const codeInput = h('input', { class: 'input input--code', id: 'sync-code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, maxLength: 80 });
    replace(box,
      h('p', { text: t('sync.intro') }),
      h('ul', { class: 'bullets' }, ['what1', 'what2', 'what3'].map((k) => h('li', { text: t(`sync.${k}`) }))),
      h('label', { class: 'check', for: 'sync-consent' }, consent, h('span', { text: t('sync.consent') })),
      button({
        label: t('sync.enable'),
        icon: 'cloud',
        variant: 'primary',
        full: true,
        onClick: async () => {
          if (!consent.checked) return toast(t('sync.needConsent'), { type: 'error' });
          // Someone holding the unlocked phone must not be able to copy the data to their devices.
          const { confirmIdentity } = await import('../views/security-flows.js');
          if (!(await confirmIdentity(t('sync.reauthEnable')))) return;
          const secret = newSyncCode();
          await saveDoc('sync', { enabled: true, secret });
          const ok = await syncNow({ silent: true });
          if (!ok) {
            await saveDoc('sync', { enabled: false });
            return toast(t('sync.error'), { type: 'error' });
          }
          showCode(secret);
          draw();
        },
      }),
      h('hr'),
      h('label', { class: 'field__label', for: 'sync-code', text: t('sync.haveCode') }),
      codeInput,
      button({
        label: t('sync.link'),
        icon: 'link',
        variant: 'soft',
        full: true,
        onClick: async () => {
          if (!consent.checked) return toast(t('sync.needConsent'), { type: 'error' });
          const { confirmIdentity } = await import('../views/security-flows.js');
          if (!(await confirmIdentity(t('sync.reauthEnable')))) return;
          try {
            const { code } = await deriveSyncKeys(codeInput.value);
            const remote = await fetchRemote(code);
            if (!remote) return toast(t('sync.notFound'), { type: 'error' });
            await saveDoc('sync', { enabled: true, secret: code });
            await syncNow();
            draw();
          } catch {
            toast(t('sync.invalidCode'), { type: 'error' });
          }
        },
      }),
    );
  };
  draw();
  openModal({ title: t('sync.title'), content: box, variant: 'dialog' });
}

/** @param {string} code */
function showCode(code) {
  const grouped = C.groupCode(code);
  openModal({
    title: t('sync.codeTitle'),
    variant: 'dialog',
    content: h(
      'div',
      { class: 'stack' },
      h('p', { text: t('sync.codeText') }),
      h('div', { class: 'recovery-code' }, h('code', { text: grouped })),
      h(
        'div',
        { class: 'btn-row' },
        button({ label: t('common.copy'), icon: 'copy', variant: 'soft', onClick: () => navigator.clipboard.writeText(grouped).then(() => toast(t('common.copied'), { type: 'success' }), () => toast(t('common.copyFailed'), { type: 'error' })) }),
        button({ label: t('common.download'), icon: 'download', variant: 'soft', onClick: () => downloadBlob(new Blob([`${t('sync.fileHeader')}\n\n${grouped}\n`], { type: 'text/plain' }), 'menstruapp-codigo-sincronizacion.txt') }),
      ),
      notice({ level: 'consult', title: t('sync.codeWarningTitle'), text: t('sync.codeWarning') }),
    ),
  });
}
