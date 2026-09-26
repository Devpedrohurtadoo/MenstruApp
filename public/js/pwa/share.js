// Read-only share links (optional; needs the Netlify backend).
// The snapshot is encrypted on the device with a random key that only travels inside the link's
// #fragment (never sent to any server). Links expire and can be revoked at any time.

import * as C from '../security/crypto.js';
import { api, ApiError } from './api.js';
import { store, saveDoc } from '../app.js';
import { addDays } from '../core/dates.js';
import { frequencies } from '../domain/insights.js';
import { getLanguage } from '../core/i18n.js';

/** @typedef {'predictions' | 'cycles' | 'symptoms' | 'notes'} ShareScope */

/**
 * Builds the limited, read-only snapshot for the chosen scopes. It contains exactly what the
 * shared page shows for those scopes and nothing else (no mode, moods or other fields).
 * @param {ShareScope[]} scope
 * @param {{ includeName: boolean }} opts
 */
export function buildShareSnapshot(scope, opts) {
  const { data, derived } = store.get();
  if (!data || !derived) throw new Error('locked');
  const a = derived.analysis;
  /** @type {Record<string, any>} */
  const snap = { v: 1, createdAt: Date.now(), lang: getLanguage() };
  if (opts.includeName && derived.profile.name) snap.name = derived.profile.name;
  if (scope.includes('predictions') && a.prediction) {
    snap.predictions = {
      nextPeriodStart: a.prediction.nextPeriodStart,
      margin: a.prediction.margin,
      phaseToday: a.current?.phase ?? null,
      fertile: derived.flags.fertility ? { start: a.prediction.fertileStart, end: a.prediction.fertileEnd } : null,
      asOf: derived.today,
    };
  }
  if (scope.includes('cycles')) {
    snap.cycles = a.cycles.slice(-12).map((c) => ({ start: c.start, length: c.length, periodLength: c.periodLength }));
    if (a.stats.cycle) snap.stats = { cycle: { mean: a.stats.cycle.mean } };
  }
  if (scope.includes('symptoms')) {
    const f = frequencies(data.days, addDays(derived.today, -90), derived.today);
    snap.symptoms = f.symptoms.slice(0, 12).map((x) => ({ id: x.id, count: x.count }));
  }
  if (scope.includes('notes')) {
    snap.notes = Object.keys(data.days)
      .filter((d) => d >= addDays(derived.today, -90) && data.days[d].notes)
      .sort()
      .slice(-60)
      .map((d) => ({ date: d, text: data.days[d].notes }));
  }
  return snap;
}

/**
 * @param {{ scope: ShareScope[], days: number, label?: string, includeName: boolean }} o
 */
export async function createShare(o) {
  const snapshot = buildShareSnapshot(o.scope, { includeName: o.includeName });
  const id = C.toB64Url(C.randomBytes(18));
  const keyBytes = C.randomBytes(32);
  const deleteToken = C.toB64Url(C.randomBytes(32));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const { iv, ct } = await C.encryptJSON(key, snapshot, `menstruapp-share-v1:${id}`);
  const expiresAt = Date.now() + o.days * 86_400_000;
  await api('/api/share', { method: 'POST', body: { id, iv, ct, expiresAt, deleteToken } });
  const item = { id, deleteToken, key: C.toB64Url(keyBytes), createdAt: Date.now(), expiresAt, scope: o.scope, label: o.label || undefined };
  const items = (store.get().data?.docs.shares?.items ?? []).filter((/** @type {{ expiresAt: number }} */ s) => s.expiresAt > Date.now());
  await saveDoc('shares', { items: [...items, item].slice(-50) });
  C.wipe(keyBytes);
  return shareUrl(item);
}

/** @param {{ id: string, key: string }} item */
export function shareUrl(item) {
  return `${location.origin}/share.html#${item.id}.${item.key}`;
}

/**
 * Deletes a link on the server. Resolves when it is gone (also if it had already expired);
 * throws otherwise — the local copy of its delete token must then be kept to retry.
 * @param {{ id: string, deleteToken: string }} item
 */
async function deleteOnServer(item) {
  for (let attempt = 0; ; attempt++) {
    try {
      await api(`/api/share/${encodeURIComponent(item.id)}`, { method: 'DELETE', token: item.deleteToken });
      return;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return;
      if (err instanceof ApiError && err.status === 429 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Revokes one link. The link is only forgotten locally once the server confirmed it is gone.
 * @param {string} id
 */
export async function revokeShare(id) {
  const item = (store.get().data?.docs.shares?.items ?? []).find((/** @type {{ id: string }} */ s) => s.id === id);
  if (item) await deleteOnServer(item);
  const latest = store.get().data?.docs.shares?.items ?? [];
  await saveDoc('shares', { items: latest.filter((/** @type {{ id: string }} */ s) => s.id !== id) });
}

/** Revokes every link; the ones that could not be deleted stay listed. Throws if any failed. */
export async function revokeAllShares() {
  const items = store.get().data?.docs.shares?.items ?? [];
  /** @type {string[]} */
  const done = [];
  for (const item of items) {
    try {
      await deleteOnServer(item);
      done.push(item.id);
    } catch {
      /* keep it to retry */
    }
  }
  const latest = store.get().data?.docs.shares?.items ?? [];
  await saveDoc('shares', { items: latest.filter((/** @type {{ id: string }} */ s) => !done.includes(s.id)) });
  if (done.length < items.length) throw new Error('share-revoke-failed');
}
