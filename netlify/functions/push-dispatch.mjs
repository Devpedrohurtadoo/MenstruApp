// Scheduled every 5 minutes: sends due reminders. Payloads were encrypted on the device with a
// key the server never sees; this function only forwards them to the browser push service.

import { openStore, sweep } from './lib/store.mjs';
import { vapidConfig, sendPush } from './lib/push.mjs';

const TIME_BUDGET_MS = 22_000;
/** Reminders older than this are dropped instead of sent (e.g. after an outage). */
const STALE_MS = 3 * 3600_000;
/** At most this many overdue reminders are sent at once per device (no notification floods). */
const MAX_PER_RUN = 3;

/** @param {{ at: number, payload: string }} it */
const itemKey = (it) => `${it.at}|${it.payload}`;

/**
 * The record after a dispatch round: sent and skipped reminders are gone, reminders that failed
 * for a transient reason stay (and are retried until they become stale), future ones are kept.
 * @param {any} data
 * @param {Set<string>} sentKeys
 * @param {Array<{ at: number, payload: string }>} failed
 * @param {number} now
 */
function afterRound(data, sentKeys, failed, now) {
  const failedKeys = new Set(failed.map(itemKey));
  const items = (data.items ?? []).filter((/** @type {any} */ it) => !sentKeys.has(itemKey(it)) && (it.at > now || failedKeys.has(itemKey(it))));
  const sentUntil = failed.length ? Math.min(...failed.map((it) => it.at)) - 1 : now;
  return { ...data, items, sentUntil };
}

/** @param {{ now?: number, clock?: () => number }} [opts] `clock` measures the time budget (tests). */
export async function dispatch(opts = {}) {
  const vapid = vapidConfig();
  if (!vapid) return { devices: 0, sent: 0, removed: 0, failed: 0 };
  const clock = opts.clock ?? Date.now;
  const started = clock();
  const now = opts.now ?? started;
  const store = openStore('push');
  let sent = 0;
  let removed = 0;
  let failedCount = 0;
  const { visited } = await sweep(
    store,
    'd/',
    'meta/dispatch',
    () => clock() - started < TIME_BUDGET_MS,
    async (key) => {
      const entry = await store.get(key);
      if (!entry) return;
      const { subscription, items = [], sentUntil = 0 } = entry.data;
      const due = items.filter((/** @type {any} */ it) => it.at <= now && it.at > sentUntil);
      if (!due.length) return;
      const fresh = due.filter((/** @type {any} */ it) => now - it.at <= STALE_MS).slice(-MAX_PER_RUN);
      /** @type {Set<string>} */
      const sentKeys = new Set();
      /** @type {Array<{ at: number, payload: string }>} */
      const failed = [];
      for (const it of fresh) {
        const result = await sendPush(subscription, it.payload, vapid);
        if (result === 'gone') {
          await store.delete(key);
          removed++;
          return;
        }
        if (result === 'sent') {
          sent++;
          sentKeys.add(itemKey(it));
        } else failed.push(it);
      }
      failedCount += failed.length;
      // Conditional write; if the device uploaded a new schedule meanwhile, apply the same
      // outcome to it (so nothing already sent is sent twice).
      let current = entry;
      for (let attempt = 0; attempt < 3 && current; attempt++) {
        const r = await store.set(key, afterRound(current.data, sentKeys, failed, now), { onlyIfMatch: current.etag });
        if (r.modified) return;
        current = await store.get(key);
      }
    },
  );
  return { devices: visited, sent, removed, failed: failedCount };
}

export default async function handler() {
  const r = await dispatch();
  console.log(`[push-dispatch] devices=${r.devices} sent=${r.sent} failed=${r.failed} removed=${r.removed}`);
}

export const config = {
  schedule: '*/5 * * * *',
};
