// Reminder delivery on the device.
//  1. While the app is open: precise timers.
//  2. Installed PWA on Chromium: Periodic Background Sync wakes the service worker ~daily to
//     show that day's date-based reminders (period soon, appointments...).
//  3. Optional Web Push through the Netlify backend (pwa/push.js) for exact times with the app
//     closed. Push payloads are encrypted on the device with a key the server never sees.
// Notification texts become neutral when "discreet notifications" is enabled.

import { t, fmtDate } from '../core/i18n.js';
import { isISODate, diffDays } from '../core/dates.js';
import { get, put, clearStore, putMany } from '../data/idb.js';
import { generateAesKey, encryptJSON, toB64Url } from '../security/crypto.js';
import { store } from '../app.js';
import { tipOfTheDay } from '../content/tips.js';
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

/** Device key (HMAC, non-extractable) for opaque reminder tags. */
async function tagKey() {
  const db = store.get().db;
  if (!db) throw new Error('db');
  let key = await get(db, 'meta', 'notifTagKey');
  if (!key) {
    key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    await put(db, 'meta', key, 'notifTagKey');
  }
  return /** @type {CryptoKey} */ (key);
}

/**
 * Stable but opaque id of a reminder occurrence: what is stored in clear (row ids, the list of
 * reminders already shown) never names the reminder ("pregnancy_week:2026-09-29" → "r3fQ…").
 * @param {string} occurrenceKey
 */
export async function opaqueTag(occurrenceKey) {
  const sig = await crypto.subtle.sign('HMAC', await tagKey(), new TextEncoder().encode(occurrenceKey));
  return `r${toB64Url(new Uint8Array(sig).subarray(0, 16))}`;
}

/**
 * Renders the visible text for an occurrence.
 * @param {Occurrence} o
 * @param {boolean} discreet
 */
export function renderText(o, discreet) {
  if (discreet) return { title: t('notifications.discreetTitle'), body: t('notifications.discreetBody') };
  const raw = o.params ?? {};
  if (o.type === 'daily_tip') return { title: t('notifications.daily_tip.title'), body: tipOfTheDay(String(raw.topic ?? 'general'), o.date) || t('notifications.daily_tip.body') };
  /** @type {Record<string, string | number>} */
  const params = { count: Number(raw.days ?? raw.week ?? 0) };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && isISODate(v)) params[k] = fmtDate(v, 'dayMonth');
    else if (typeof v === 'string' || typeof v === 'number') params[k] = v;
  }
  // When a dated reminder falls, from the day it is shown: "today", "tomorrow" or "on 3 Oct".
  if (typeof raw.date === 'string' && isISODate(raw.date)) {
    const lead = diffDays(o.date, raw.date);
    params.when = lead === 0 ? t('notifications.when.today') : lead === 1 ? t('notifications.when.tomorrow') : t('notifications.when.onDate', { date: fmtDate(raw.date, 'dayMonth') });
  }
  const title = t(`notifications.${o.type}.title`, params);
  let body = t(`notifications.${o.type}.body`, params);
  if ((o.type === 'pill' || o.type === 'patch' || o.type === 'ring') && raw.action) body = t(`notifications.actions.${raw.action}`);
  if ((o.type === 'appointment' || o.type === 'custom' || o.type === 'checkup' || o.type === 'backup') && raw.title) {
    body = t('notifications.titledBody', { title: String(raw.title).slice(0, 80), when: String(params.when ?? '') });
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
  /** @type {Map<string, string>} */
  const tags = new Map();
  for (const o of occurrences.slice(0, 300)) {
    const text = renderText(o, discreet);
    const tag = await opaqueTag(o.key);
    tags.set(o.key, tag);
    // In clear only what the service worker needs to know *when* to show it.
    rows.push({ id: tag, at: o.at, date: o.date, dateOnly: DATE_ONLY.has(o.type), payload: await encryptJSON(key, { ...text, tag }) });
  }
  await clearStore(db, 'notifications');
  if (rows.length) await putMany(db, 'notifications', rows);

  const now = Date.now();
  for (const o of occurrences) {
    const delay = o.at - now;
    const tag = tags.get(o.key);
    if (!tag || delay <= 0 || delay > 24 * 3600_000) continue;
    const text = renderText(o, discreet);
    timers.push(setTimeout(() => show(text.title, text.body, tag), delay));
  }
  registerPeriodicSync();
}

/** Reminder types that make sense to deliver any time during their day (periodic sync). */
const DATE_ONLY = new Set(['period_soon', 'period_late', 'fertile_start', 'ovulation', 'appointment', 'checkup', 'custom', 'injection', 'pregnancy_week', 'backup', 'daily_tip']);

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
    // (Entries with ":" are readable tags from older versions: drop them.)
    const shown = /** @type {string[]} */ ((await get(db, 'meta', 'notifShown')) ?? []).filter((x) => !x.includes(':'));
    if (shown.includes(tag)) return;
    await put(db, 'meta', [...shown, tag].slice(-300), 'notifShown');
  }
  await reg.showNotification(title, { body, tag, icon: '/assets/icons/icon-192.png', badge: '/assets/icons/badge-96.png', data: { url: '/#/home' } });
}

/** Stops this page's reminder timers and forgets the stored reminders (e.g. profile deleted). */
export async function clearLocalReminders() {
  timers.forEach(clearTimeout);
  timers = [];
  const db = store.get().db;
  if (db) await clearStore(db, 'notifications');
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
