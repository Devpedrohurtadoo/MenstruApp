// Scheduled daily: deletes expired share links, abandoned sync snapshots and inactive push devices.
// Data minimisation: nothing is kept longer than needed.

import { openStore } from './lib/store.mjs';

const DAY = 86_400_000;
const SYNC_TTL = 400 * DAY;
const PUSH_TTL = 90 * DAY;
const TIME_BUDGET_MS = 25_000;

/** @param {{ now?: number }} [opts] */
export async function cleanup(opts = {}) {
  const started = Date.now();
  const now = opts.now ?? started;
  const counts = { share: 0, sync: 0, push: 0 };
  const within = () => Date.now() - started < TIME_BUDGET_MS;

  const share = openStore('share');
  for await (const key of share.list('x/')) {
    if (!within()) break;
    const e = await share.get(key);
    if (e && e.data.expiresAt <= now) {
      await share.delete(key);
      counts.share++;
    }
  }
  const sync = openStore('sync');
  for await (const key of sync.list('s/')) {
    if (!within()) break;
    const e = await sync.get(key);
    if (e && now - (Number(e.data.updatedAt) || 0) > SYNC_TTL) {
      await sync.delete(key);
      counts.sync++;
    }
  }
  const push = openStore('push');
  for await (const key of push.list('d/')) {
    if (!within()) break;
    const e = await push.get(key);
    const hasFuture = (e?.data.items ?? []).some((/** @type {any} */ it) => it.at > now);
    if (e && !hasFuture && now - (Number(e.data.updatedAt) || 0) > PUSH_TTL) {
      await push.delete(key);
      counts.push++;
    }
  }
  return counts;
}

export default async function handler() {
  const c = await cleanup();
  console.log(`[cleanup] share=${c.share} sync=${c.sync} push=${c.push}`);
}

export const config = {
  schedule: '@daily',
};
