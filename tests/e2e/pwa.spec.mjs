// PWA behaviour: installability, service worker precache, offline start and headers.
import { test, expect } from '@playwright/test';
import { onboard, typePin } from './helpers.mjs';

test('the manifest and service worker make the app installable', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  // Playwright contexts are incognito-like; that is the only acceptable "error".
  expect(installabilityErrors.filter((e) => e.errorId !== 'in-incognito')).toEqual([]);
  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
});

test('works fully offline after the first visit', async ({ page, context }) => {
  await onboard(page, { lastPeriodDaysAgo: 4 });
  // Wait until the service worker has precached the whole app and controls the page.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    return reg.active?.state;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Introduce tu PIN')).toBeVisible();
  await typePin(page, '4827');
  await expect(page.locator('.ring__day')).toHaveText('Día 5');
  // Lazy-loaded views and content also come from the cache.
  await page.getByRole('link', { name: 'Aprende' }).click();
  await expect(page.getByRole('link', { name: /Tu ciclo/ })).toBeVisible();
  await page.goto('/#/learn/article/dolor-menstrual');
  await expect(page.getByRole('heading', { name: 'Dolor menstrual: cómo aliviarlo' })).toBeVisible();
  await page.goto('/#/luna');
  await page.fill('#luna-input', 'tengo cólicos');
  await page.keyboard.press('Enter');
  await expect(page.locator('.msg--luna').last()).toContainText('prostaglandinas');
  await context.setOffline(false);
});

test('responses carry the security headers', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("require-trusted-types-for 'script'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('no-referrer');
  const api = await request.get('/api/health');
  expect(api.headers()['cache-control']).toBe('no-store');
});
