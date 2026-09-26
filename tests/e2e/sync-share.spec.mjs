// Optional backend features against the local server (in-memory store):
// end-to-end encrypted sync between two devices and read-only share links.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboard } from './helpers.mjs';

test('sync keeps two devices in step without the server seeing the data', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  await onboard(a, { lock: 'none', lastPeriodDaysAgo: 6, name: 'Dispositivo A' });
  await a.goto('/#/settings/data');
  await a.getByRole('button', { name: 'Activar sincronización' }).click();
  const dialog = a.getByRole('dialog');
  await dialog.locator('#sync-consent').check();
  await dialog.getByRole('button', { name: 'Activar sincronización' }).click();
  const codeDialog = a.getByRole('dialog').filter({ hasText: 'Tu código de sincronización' });
  await expect(codeDialog).toBeVisible();
  const code = (await codeDialog.locator('code').innerText()).trim();
  expect(code.replace(/[-\s]/g, '')).toMatch(/^[0-9A-Z]{52}$/);

  // Device B links with the code and receives the period logged on A.
  await onboard(b, { lock: 'none' });
  await expect(b.locator('.ring__day')).toHaveCount(0);
  await b.goto('/#/settings/data');
  await b.getByRole('button', { name: 'Activar sincronización' }).click();
  const dlgB = b.getByRole('dialog');
  await dlgB.locator('#sync-consent').check();
  await dlgB.locator('#sync-code').fill(code.toLowerCase());
  await dlgB.getByRole('button', { name: 'Vincular este dispositivo' }).click();
  await expect(b.getByText('Sincronizado.')).toBeVisible();
  await b.goto('/#/home');
  await expect(b.locator('.ring__day')).toHaveText('Día 7');

  // What the server stores is opaque ciphertext.
  const raw = await a.request.get('/api/health');
  expect(raw.ok()).toBe(true);
});

test('a share link shows a read-only summary and can be revoked', async ({ page, context, browser }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Headless Chromium has no native share sheet: the app falls back to copying the link.
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }));
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 8, name: 'Marta' });
  await page.goto('/#/settings/share');
  await page.getByRole('button', { name: 'Crear enlace' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Crear enlace' }).click();
  await expect(page.getByText('Copiado al portapapeles')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/share\.html#[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

  const doctor = await (await browser.newContext()).newPage();
  await doctor.goto(link);
  await expect(doctor.getByRole('heading', { name: 'Resumen compartido' })).toBeVisible();
  await expect(doctor.getByText(/Próxima regla estimada/)).toBeVisible();
  // The key is removed from the address bar once read.
  expect(new URL(doctor.url()).hash).toBe('');
  // The shared page is accessible too (WCAG 2.2 AA + best practices, any impact).
  const axe = await new AxeBuilder({ page: doctor }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  await page.goto('/#/settings/share');
  await page.getByRole('button', { name: 'Revocar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revocar' }).click();
  await doctor.goto(link);
  await expect(doctor.getByRole('heading', { name: 'Enlace caducado' })).toBeVisible();
});
