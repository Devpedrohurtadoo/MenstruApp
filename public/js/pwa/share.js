// Read-only share links (optional; needs the Netlify backend).
// The snapshot is encrypted on the device with a random key that only travels inside the link's
// #fragment (never sent to any server). Links expire and can be revoked at any time.

import * as C from '../security/crypto.js';
import { api } from './api.js';
import { store, saveDoc } from '../app.js';
import { addDays } from '../core/dates.js';
import { frequencies } from '../domain/insights.js';
import { getLanguage } from '../core/i18n.js';

/** @typedef {'predictions' | 'cycles' | 'symptoms' | 'notes'} ShareScope */

/**
 * Builds the limited, read-only snapshot for the chosen scopes.
 * @param {ShareScope[]} scope
 * @param {{ includeName: boolean }} opts
 */
export function buildShareSnapshot(scope, opts) {
  const { data, derived } = store.get();
  if (!data || !derived) throw new Error('locked');
  const a = derived.analysis;
  /** @type {Record<string, any>} */
  const snap = { v: 1, createdAt: Date.now(), lang: getLanguage(), mode: derived.settings.mode };
  if (opts.includeName && derived.profile.name) snap.name = derived.profile.name;
  if (scope.includes('predictions') && a.prediction) {
    snap.predictions = {
      nextPeriodStart: a.prediction.nextPeriodStart,
      margin: a.prediction.margin,
      periodLength: a.prediction.periodLength,
      phaseToday: a.current?.phase ?? null,
      cycleDay: a.current?.cycleDay ?? null,
      fertile: derived.flags.fertility ? { start: a.prediction.fertileStart, end: a.prediction.fertileEnd } : null,
      asOf: derived.today,
    };
  }
  if (scope.includes('cycles')) {
    snap.cycles = a.cycles.slice(-12).map((c) => ({ start: c.start, length: c.length, periodLength: c.periodLength }));
    snap.stats = { cycle: a.stats.cycle, period: a.stats.period };
  }
  if (scope.includes('symptoms')) {
    const f = frequencies(data.days, addDays(derived.today, -90), derived.today);
    snap.symptoms = f.symptoms.slice(0, 12);
    snap.moods = f.moods.slice(0, 8);
    snap.loggedDays = f.loggedDays;
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

/** @param {string} id */
export async function revokeShare(id) {
  const items = store.get().data?.docs.shares?.items ?? [];
  const item = items.find((/** @type {{ id: string }} */ s) => s.id === id);
  if (item) await api(`/api/share/${encodeURIComponent(id)}`, { method: 'DELETE', token: item.deleteToken }).catch(() => undefined);
  await saveDoc('shares', { items: items.filter((/** @type {{ id: string }} */ s) => s.id !== id) });
}

export async function revokeAllShares() {
  const items = store.get().data?.docs.shares?.items ?? [];
  for (const item of items) await api(`/api/share/${encodeURIComponent(item.id)}`, { method: 'DELETE', token: item.deleteToken }).catch(() => undefined);
}
