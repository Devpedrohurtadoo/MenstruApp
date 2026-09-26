// App updates: a new deploy never reloads the app by surprise; it waits for the user.
// The test serves a copy of public/ and publishes a "new version" of sw.js mid-test.
import { test, expect, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onboard } from './helpers.mjs';

/** @param {string} url */
async function waitForServer(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start: ${url}`);
}

test('a new version waits for "Actualizar" and then reloads without losing data', async ({ browser }, testInfo) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'menstruapp-update-'));
  fs.cpSync('public', dir, { recursive: true });
  const port = 8800 + testInfo.workerIndex;
  const server = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port), '--root', dir], {
    stdio: 'ignore',
    env: { ...process.env, MENSTRUAPP_STORE: 'memory' },
  });
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${port}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    serviceWorkers: 'allow',
  });
  try {
    await waitForServer(`http://localhost:${port}/api/health`);
    const page = await context.newPage();
    // First visit: the service worker installs and takes control without reloading.
    await onboard(page, { lock: 'none', lastPeriodDaysAgo: 3 });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    // While the page reloads there is no context to evaluate in: report that as "reloading".
    const caches = () => page.evaluate(async () => (await globalThis.caches.keys()).filter((k) => k.startsWith('menstruapp-'))).catch(() => ['reloading']);
    const [original] = await caches();
    expect(original).toMatch(/^menstruapp-[0-9a-f]{16}$/);

    // Deploy a new version and let the app notice it.
    const sw = path.join(dir, 'sw.js');
    fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSION = '[^']+';/, "const VERSION = 'e2e-new-version';"));
    await page.evaluate(() => {
      /** @type {any} */ (window).__beforeUpdate = true;
      return navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    });
    await expect(page.getByText('Hay una nueva versión disponible.')).toBeVisible();
    // Nothing is replaced until the user accepts: same page, same cache.
    expect(await page.evaluate(() => /** @type {any} */ (window).__beforeUpdate)).toBe(true);
    expect(await caches()).toContain(original);

    await page.getByRole('button', { name: 'Actualizar' }).click();
    // The page reloads under the new version, the old cache is gone and the data is intact.
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__beforeUpdate ?? null).catch(() => 'reloading')).toBeNull();
    await expect.poll(caches).toEqual(['menstruapp-e2e-new-version']);
    await expect(page.locator('.ring__day')).toHaveText('Día 4');
    await expect(page.getByText('Hay una nueva versión disponible.')).toHaveCount(0);
  } finally {
    await context.close();
    server.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
