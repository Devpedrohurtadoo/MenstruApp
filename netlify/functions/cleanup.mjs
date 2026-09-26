// Scheduled daily: deletes expired share links, abandoned sync snapshots and inactive push devices.
// Data minimisation: nothing is kept longer than needed.

import { openStore, sweep } from './lib/store.mjs';

const DAY = 86_400_000;
const SYNC_TTL = 400 * DAY;
const PUSH_TTL = 90 * DAY;
const TIME_BUDGET_MS = 25_000;

/** @param {{ now?: number, clock?: () => number }} [opts] `clock` measures the time budget (tests). */
export async function cleanup(opts = {}) {
  const clock = opts.clock ?? Date.now;
  const started = clock();
  const now = opts.now ?? started;
  const counts = { share: 0, sync: 0, push: 0 };

  /** @type {Array<{ name: 'share' | 'sync' | 'push', prefix: string, expired: (data: any) => boolean }>} */
  const plan = [
    { name: 'share', prefix: 'x/', expired: (data) => data.expiresAt <= now },
    { name: 'sync', prefix: 's/', expired: (data) => now - (Number(data.updatedAt) || 0) > SYNC_TTL },
    {
      name: 'push',
      prefix: 'd/',
      expired: (data) => !(data.items ?? []).some((/** @type {any} */ it) => it.at > now) && now - (Number(data.updatedAt) || 0) > PUSH_TTL,
    },
  ];
  // Each store gets a fair share of the remaining time (one large store cannot starve the
  // others) and resumes tomorrow where it stopped today.
  for (let i = 0; i < plan.length; i++) {
    const { name, prefix, expired } = plan[i];
    const deadline = clock() + (started + TIME_BUDGET_MS - clock()) / (plan.length - i);
    const store = openStore(name);
    await sweep(
      store,
      prefix,
      'meta/cleanup',
      () => clock() < deadline,
      async (key) => {
        const e = await store.get(key);
        if (e && expired(e.data)) {
          await store.delete(key);
          counts[name]++;
        }
      },
    );
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
