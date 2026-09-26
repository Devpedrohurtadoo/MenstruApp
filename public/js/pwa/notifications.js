// Reminder delivery on the device.
//  1. While the app is open: precise timers.
//  2. Installed PWA on Chromium: Periodic Background Sync wakes the service worker ~daily to
//     show that day's date-based reminders (period soon, appointments...).
//  3. Optional Web Push through the Netlify backend (pwa/push.js) for exact times with the app
//     closed. Push payloads are encrypted on the device with a key the server never sees.
// Notification texts become neutral when "discreet notifications" is enabled.

import { t, fmtDate } from '../core/i18n.js';
import { isISODate } from '../core/dates.js';
import { get, put, clearStore, putMany } from '../data/idb.js';
import { generateAesKey, encryptJSON } from '../security/crypto.js';
import { store } from '../app.js';
import { getRegistration } from './sw-register.js';

/** @typedef {import('../domain/reminders.js').Occurrence} Occurrence */

export function notificationStatus() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (notificationStatus() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Device-level key used to encrypt reminder texts for the service worker and push. */
export async function notificationKey() {
  const db = store.get().db;
  if (!db) throw new Error('db');
  let key = await get(db, 'meta', 'notifKey');
  if (!key) {
    key = await generateAesKey();
    await put(db, 'meta', key, 'notifKey');
  }
  return /** @type {CryptoKey} */ (key);
}

/**
 * Renders the visible text for an occurrence.
 * @param {Occurrence} o
 * @param {boolean} discreet
 */
export function renderText(o, discreet) {
  if (discreet) return { title: t('notifications.discreetTitle'), body: t('notifications.discreetBody') };
  const raw = o.params ?? {};
  /** @type {Record<string, string | number>} */
  const params = { count: Number(raw.days ?? raw.week ?? 0) };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && isISODate(v)) params[k] = fmtDate(v, 'dayMonth');
    else if (typeof v === 'string' || typeof v === 'number') params[k] = v;
  }
  const title = t(`notifications.${o.type}.title`, params);
  let body = t(`notifications.${o.type}.body`, params);
  if ((o.type === 'pill' || o.type === 'patch' || o.type === 'ring') && raw.action) body = t(`notifications.actions.${raw.action}`);
  if ((o.type === 'appointment' || o.type === 'custom' || o.type === 'checkup' || o.type === 'backup') && raw.title) {
    body = t('notifications.titledBody', { title: String(raw.title).slice(0, 80), date: String(params.date ?? '') });
  }
  return { title, body };
}

/** @type {Array<ReturnType<typeof setTimeout>>} */
let timers = [];

/**
 * Stores the upcoming reminders (encrypted) for the service worker and arms in-page timers.
 * @param {Occurrence[]} occurrences
 * @param {boolean} discreet
 */
export async function scheduleLocal(occurrences, discreet) {
  const db = store.get().db;
  if (!db) return;
  timers.forEach(clearTimeout);
  timers = [];
  const key = await notificationKey();
  const rows = [];
  for (const o of occurrences.slice(0, 300)) {
    const text = renderText(o, discreet);
    rows.push({ id: o.key, at: o.at, date: o.date, dateOnly: DATE_ONLY.has(o.type), payload: await encryptJSON(key, { ...text, tag: o.key }) });
  }
  await clearStore(db, 'notifications');
  if (rows.length) await putMany(db, 'notifications', rows);

  const now = Date.now();
  for (const o of occurrences) {
    const delay = o.at - now;
    if (delay <= 0 || delay > 24 * 3600_000) continue;
    const text = renderText(o, discreet);
    timers.push(setTimeout(() => show(text.title, text.body, o.key), delay));
  }
  registerPeriodicSync();
}

/** Reminder types that make sense to deliver any time during their day (periodic sync). */
const DATE_ONLY = new Set(['period_soon', 'period_late', 'fertile_start', 'ovulation', 'appointment', 'checkup', 'custom', 'injection', 'pregnancy_week', 'backup']);

/**
 * @param {string} title
 * @param {string} body
 * @param {string} tag
 */
async function show(title, body, tag) {
  if (notificationStatus() !== 'granted') return;
  const reg = await getRegistration();
  if (!reg) return;
  const db = store.get().db;
  // The service worker may already have shown this one (periodic sync / push): never duplicate.
  if (db && tag !== 'menstruapp-test') {
    const shown = /** @type {string[]} */ ((await get(db, 'meta', 'notifShown')) ?? []);
    if (shown.includes(tag)) return;
    await put(db, 'meta', [...shown, tag].slice(-300), 'notifShown');
  }
  await reg.showNotification(title, { body, tag, icon: '/assets/icons/icon-192.png', badge: '/assets/icons/badge-96.png', data: { url: '/#/home' } });
}

export async function testNotification() {
  const discreet = Boolean(store.get().derived?.settings.security.discreetNotifications);
  await show(discreet ? t('notifications.discreetTitle') : t('notifications.test.title'), discreet ? t('notifications.discreetBody') : t('notifications.test.body'), 'menstruapp-test');
}

async function registerPeriodicSync() {
  try {
    const reg = /** @type {any} */ (await getRegistration());
    if (!reg?.periodicSync) return;
    const status = await navigator.permissions.query(/** @type {any} */ ({ name: 'periodic-background-sync' }));
    if (status.state !== 'granted') return;
    await reg.periodicSync.register('menstruapp-reminders', { minInterval: 12 * 3600_000 });
  } catch {
    /* not supported */
  }
}

export async function periodicSyncSupported() {
  try {
    const reg = /** @type {any} */ (await getRegistration());
    if (!reg?.periodicSync) return false;
    const status = await navigator.permissions.query(/** @type {any} */ ({ name: 'periodic-background-sync' }));
    return status.state === 'granted';
  } catch {
    return false;
  }
}

/** How reminders will reach the user on this device (shown in settings). */
export async function deliveryInfo() {
  const server = store.get().server;
  const db = store.get().db;
  const pushClient = db ? await get(db, 'meta', 'pushClient') : null;
  const pushEnabled = Boolean(pushClient?.token);
  const permission = notificationStatus();
  const periodic = await periodicSyncSupported();
  /** @type {'push' | 'periodic' | 'foreground' | 'none'} */
  let mode = 'foreground';
  if (permission !== 'granted') mode = 'none';
  else if (pushEnabled) mode = 'push';
  else if (periodic) mode = 'periodic';
  return { mode, pushEnabled, canEnablePush: server.push && !pushEnabled && permission !== 'denied' && 'PushManager' in window };
}
