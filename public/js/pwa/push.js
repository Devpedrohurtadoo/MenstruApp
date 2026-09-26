// Optional Web Push through the Netlify backend. The server only stores: the push subscription,
// a random device token (hashed) and a list of { time, encrypted payload }. The reminder text is
// encrypted on the device with a key that never leaves it, so the server cannot read it.

import { t } from '../core/i18n.js';
import { get, put, del } from '../data/idb.js';
import { randomBytes, toB64Url, encryptJSON, fromB64Url } from '../security/crypto.js';
import { store } from '../app.js';
import { api } from './api.js';
import { getRegistration } from './sw-register.js';
import { notificationKey, renderText, requestNotificationPermission, opaqueTag } from './notifications.js';
import { toast } from '../ui/toast.js';

/** @returns {Promise<{ token: string } | null>} */
async function client() {
  const db = store.get().db;
  return db ? (await get(db, 'meta', 'pushClient')) ?? null : null;
}

export async function enablePush() {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      toast(t('settings.reminders.deniedTitle'), { type: 'error' });
      return false;
    }
    const { json } = await api('/api/push/key');
    const reg = await getRegistration();
    if (!reg || !json?.publicKey) throw new Error('unavailable');
    const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64Url(json.publicKey) });
    const token = toB64Url(randomBytes(32));
    await api('/api/push/subscription', { method: 'PUT', token, body: { subscription: subscription.toJSON() } });
    const db = store.get().db;
    if (db) await put(db, 'meta', { token, createdAt: Date.now() }, 'pushClient');
    toast(t('settings.reminders.pushOn'), { type: 'success' });
    const { refreshReminders } = await import('./services.js');
    await refreshReminders();
    return true;
  } catch (err) {
    console.error('[push]', err);
    toast(t('settings.reminders.pushError'), { type: 'error' });
    return false;
  }
}

export async function disablePush() {
  const c = await client();
  try {
    if (c) await api('/api/push', { method: 'DELETE', token: c.token });
  } catch {
    /* server data expires anyway */
  }
  try {
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* ignore */
  }
  const db = store.get().db;
  if (db) await del(db, 'meta', 'pushClient');
  toast(t('settings.reminders.pushOff'));
}

/**
 * Uploads the next reminders as encrypted payloads.
 * @param {import('../domain/reminders.js').Occurrence[]} occurrences
 * @param {boolean} discreet
 */
export async function syncPushSchedule(occurrences, discreet) {
  const c = await client();
  if (!c) return;
  const key = await notificationKey();
  const items = [];
  for (const o of occurrences.slice(0, 200)) {
    const payload = await encryptJSON(key, { ...renderText(o, discreet), tag: await opaqueTag(o.key) });
    items.push({ at: o.at, payload: JSON.stringify(payload) });
  }
  await api('/api/push/schedule', { method: 'PUT', token: c.token, body: { items } });
}

/** Deletes this device's push registration and schedule from the server. Throws on failure. */
export async function deletePushData() {
  const c = await client();
  if (!c) return;
  await api('/api/push', { method: 'DELETE', token: c.token });
  const db = store.get().db;
  if (db) await del(db, 'meta', 'pushClient');
}

/** Empties the scheduled reminders on the server, keeping the device registered. Throws on failure. */
export async function clearPushSchedule() {
  const c = await client();
  if (!c) return;
  await api('/api/push/schedule', { method: 'PUT', token: c.token, body: { items: [] } });
}
