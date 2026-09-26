// Background services while the app is unlocked: server feature detection, reminder
// scheduling (local + optional push) and optional encrypted sync.

import { store, bus } from '../app.js';
import { debounce } from '../core/store.js';
import { serverFeatures } from './api.js';
import { upcomingOccurrences } from '../domain/reminders.js';
import { scheduleLocal } from './notifications.js';

let started = false;

export async function refreshReminders() {
  const { data, derived } = store.get();
  if (!data || !derived) return;
  const items = data.docs.reminders?.items ?? [];
  const occurrences = upcomingOccurrences(items, {
    now: Date.now(),
    today: derived.today,
    horizonDays: 30,
    prediction: derived.flags.predictions ? derived.analysis.prediction : null,
    current: derived.analysis.current,
    pregnancy: derived.pregnancy,
    contraception: derived.settings.contraception ?? null,
    flags: { fertility: derived.flags.fertility },
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
    bus.on('prefs-changed', () => scheduleReminders());
    bus.on('locked', () => {
      scheduleSync.flush();
    });
    window.addEventListener('online', async () => {
      await detectServer();
      scheduleSync();
    });
  }
  await detectServer();
  await refreshReminders();
  if (store.get().server.sync && store.get().data?.docs.sync?.enabled) {
    const { syncNow } = await import('./sync.js');
    syncNow({ silent: true });
  }
}

async function detectServer() {
  if (!navigator.onLine) return;
  const features = await serverFeatures();
  store.set({ server: { checked: true, ...features } });
}

/** Removes everything this device stored on the optional backend (push, sync, shares). */
export async function deleteRemoteData() {
  const tasks = [];
  tasks.push(import('./push.js').then((m) => m.deletePushData()));
  if (store.get().data?.docs.sync?.enabled) tasks.push(import('./sync.js').then((m) => m.deleteRemoteSync()));
  if (store.get().data?.docs.shares?.items?.length) tasks.push(import('./share.js').then((m) => m.revokeAllShares()));
  await Promise.allSettled(tasks);
}
