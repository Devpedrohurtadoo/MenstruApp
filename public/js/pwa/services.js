// Background services while the app is unlocked: server feature detection, reminder
// scheduling (local + optional push) and optional encrypted sync.

import { store, bus } from '../app.js';
import { debounce } from '../core/store.js';
import { serverFeatures } from './api.js';
import { upcomingOccurrences } from '../domain/reminders.js';
import { calendarMarks } from '../domain/cycle.js';
import { tipTopic } from '../domain/modes.js';
import { addDays, rangeISO } from '../core/dates.js';
import { scheduleLocal } from './notifications.js';

let started = false;

export async function refreshReminders() {
  const { data, derived } = store.get();
  if (!data || !derived) return;
  const items = data.docs.reminders?.items ?? [];
  const horizonDays = 30;
  // The predicted phase of each day picks its tip (the one the home screen shows that day).
  const marks = items.some((r) => r.type === 'daily_tip' && r.enabled)
    ? calendarMarks(derived.analysis, data.days, rangeISO(derived.today, addDays(derived.today, horizonDays)), { showFertility: false, showPredictions: derived.flags.predictions })
    : {};
  const occurrences = upcomingOccurrences(items, {
    now: Date.now(),
    today: derived.today,
    horizonDays,
    prediction: derived.flags.predictions ? derived.analysis.prediction : null,
    current: derived.analysis.current,
    pregnancy: derived.pregnancy,
    contraception: derived.settings.contraception ?? null,
    flags: { fertility: derived.flags.fertility },
    tipTopic: (d) => tipTopic(derived.flags, marks[d]?.phase),
  });
  const discreet = Boolean(derived.settings.security.discreetNotifications);
  await scheduleLocal(occurrences, discreet).catch((err) => console.warn('[reminders]', err));
  if (store.get().server.push) {
    const { syncPushSchedule } = await import('./push.js');
    await syncPushSchedule(occurrences, discreet).catch((err) => console.warn('[push]', err));
  }
}

const scheduleReminders = debounce(() => refreshReminders(), 1500);
const scheduleSync = debounce(async () => {
  if (!store.get().server.sync || !store.get().data?.docs.sync?.enabled) return;
  const { syncNow } = await import('./sync.js');
  await syncNow({ silent: true });
}, 15_000);

export async function startServices() {
  if (!started) {
    started = true;
    bus.on('data-changed', (/** @type {{ kind: string, name?: string }} */ e) => {
      if (e?.kind === 'doc' && (e.name === 'sync' || e.name === 'shares')) return;
      scheduleReminders();
      if (e?.kind !== 'sync') scheduleSync();
    });
    bus.on('day-changed', () => scheduleReminders());
    // A deleted profile's reminders must not keep firing on this device.
    bus.on('profile-deleted', () => import('./notifications.js').then((m) => m.clearLocalReminders()).catch(() => undefined));
    bus.on('prefs-changed', () => scheduleReminders());
    bus.on('locked', () => {
      scheduleSync.flush();
    });
    window.addEventListener('online', async () => {
      await detectServer();
      scheduleSync();
      retryServerCleanup();
    });
  }
  await detectServer();
  await refreshReminders();
  retryServerCleanup();
  if (store.get().server.sync && store.get().data?.docs.sync?.enabled) {
    const { syncNow } = await import('./sync.js');
    syncNow({ silent: true });
  }
}

/** Finishes server deletions that could not be done offline (e.g. turning sync off). */
function retryServerCleanup() {
  if (store.get().data?.docs.sync?.pendingDelete) import('./sync.js').then((m) => m.retryPendingDeletion()).catch(() => undefined);
}

async function detectServer() {
  if (!navigator.onLine) return;
  const features = await serverFeatures();
  store.set({ server: { checked: true, ...features } });
}

/**
 * Removes what the open profile stored on the optional backend: its sync copy and share links,
 * plus this device's push registration (`scope: 'device'`) or only the profile's scheduled
 * push reminders (`scope: 'profile'`, other profiles keep using push). Other, locked profiles'
 * server data cannot be reached without their keys: it expires on its own.
 * @param {{ scope: 'device' | 'profile' }} opts
 * @returns {Promise<Array<'push' | 'sync' | 'share'>>} the parts that could not be deleted
 */
export async function deleteRemoteData(opts) {
  /** @type {Array<'push' | 'sync' | 'share'>} */
  const failed = [];
  /** @param {'push' | 'sync' | 'share'} part @param {() => Promise<unknown>} fn */
  const attempt = async (part, fn) => {
    try {
      await fn();
    } catch (err) {
      console.warn(`[server-cleanup] ${part}`, err);
      failed.push(part);
    }
  };
  const push = await import('./push.js');
  await attempt('push', () => (opts.scope === 'device' ? push.deletePushData() : push.clearPushSchedule()));
  const sync = store.get().data?.docs.sync;
  if (sync?.enabled || sync?.pendingDelete) await attempt('sync', () => import('./sync.js').then((m) => m.deleteRemoteSync()));
  if (store.get().data?.docs.shares?.items?.length) await attempt('share', () => import('./share.js').then((m) => m.revokeAllShares()));
  return failed;
}
