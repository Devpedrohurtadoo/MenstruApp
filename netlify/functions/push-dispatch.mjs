// Scheduled every 5 minutes: sends due reminders. Payloads were encrypted on the device with a
// key the server never sees; this function only forwards them to the browser push service.

import { openStore } from './lib/store.mjs';
import { vapidConfig, sendPush } from './lib/push.mjs';

const TIME_BUDGET_MS = 22_000;
const STALE_MS = 3 * 3600_000;

/** @param {{ now?: number }} [opts] */
export async function dispatch(opts = {}) {
  const vapid = vapidConfig();
  if (!vapid) return { devices: 0, sent: 0, removed: 0 };
  const started = Date.now();
  const now = opts.now ?? started;
  const store = openStore('push');
  let devices = 0;
  let sent = 0;
  let removed = 0;
  for await (const key of store.list('d/')) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    devices++;
    const entry = await store.get(key);
    if (!entry) continue;
    const { subscription, items = [], sentUntil = 0 } = entry.data;
    const due = items.filter((/** @type {any} */ it) => it.at <= now && it.at > sentUntil);
    if (!due.length) continue;
    // Skip reminders that are too old to be useful (e.g. after an outage), but still mark them.
    const fresh = due.filter((/** @type {any} */ it) => now - it.at <= STALE_MS).slice(-3);
    let gone = false;
    for (const it of fresh) {
      const result = await sendPush(subscription, it.payload, vapid);
      if (result === 'gone') {
        gone = true;
        break;
      }
      if (result === 'sent') sent++;
    }
    if (gone) {
      await store.delete(key);
      removed++;
      continue;
    }
    const remaining = items.filter((/** @type {any} */ it) => it.at > now);
    const r = await store.set(key, { ...entry.data, items: remaining, sentUntil: now }, { onlyIfMatch: entry.etag });
    if (!r.modified) {
      // The device uploaded a new schedule meanwhile: only advance the watermark.
      const latest = await store.get(key);
      if (latest) await store.set(key, { ...latest.data, sentUntil: now }, { onlyIfMatch: latest.etag });
    }
  }
  return { devices, sent, removed };
}

export default async function handler() {
  const result = await dispatch();
  console.log(`[push-dispatch] devices=${result.devices} sent=${result.sent} removed=${result.removed}`);
}

export const config = {
  schedule: '*/5 * * * *',
};
