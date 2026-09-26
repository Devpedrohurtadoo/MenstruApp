// Feature journeys: Luna, languages, backups, deleting everything, pregnancy mode and the report.
import { test, expect } from './fixtures.mjs';
import fs from 'node:fs';
import { onboard } from './helpers.mjs';

test('Luna answers with personal data and puts red flags first', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 9 });
  await page.getByRole('link', { name: 'Aprende' }).click();
  await page.getByRole('link', { name: /Pregúntale a Luna/ }).click();
  await page.getByRole('button', { name: '¿Cuándo me viene la regla?' }).click();
  await expect(page.locator('.msg--luna').last()).toContainText('Según tus registros, tu próxima regla');
  await page.fill('#luna-input', 'empapo una compresa cada hora y tengo cólicos');
  await page.keyboard.press('Enter');
  const reply = page.locator('.msg--luna').last();
  await expect(reply).toHaveClass(/msg--urgent/);
  await expect(reply.locator('p').first()).toContainText('112');
});

test('with the combined pill the app speaks of withdrawal bleeds and shows no fertile days', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 10 });
  await page.goto('/#/settings/mode');
  // Only the combined pill asks for a pill-free week; the minipill is taken every day.
  await page.getByRole('button', { name: /^Minipíldora/ }).click();
  await expect(page.getByRole('group', { name: 'Pauta de la píldora' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Píldora combinada' }).click();
  await expect(page.getByRole('group', { name: 'Pauta de la píldora' })).toBeVisible();

  await page.goto('/#/home');
  await expect(page.getByText(/^Próximo sangrado por privación/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Me ha venido el sangrado' })).toBeVisible();
  await expect(page.getByText(/Próxima regla/)).toHaveCount(0);

  await page.goto('/#/luna');
  await page.fill('#luna-input', '¿estoy en mis días fértiles?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.msg--luna').last()).toContainText('no hay una ovulación natural');
});

test('English everywhere, persisted after reload', async ({ page }) => {
  await onboard(page, { lang: 'en', lock: 'none', lastPeriodDaysAgo: 3 });
  await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
  await expect(page.locator('.ring__day')).toHaveText('Day 4');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Insights' })).toBeVisible();
  await page.goto('/#/settings/language');
  await page.getByRole('radio', { name: 'Español' }).click();
  await expect(page.getByRole('link', { name: 'Calendario' })).toBeVisible();
});

test('encrypted backup, delete everything and restore', async ({ page }, testInfo) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 15, name: 'Copia' });
  await page.goto('/#/settings/data');
  await page.getByRole('button', { name: /Copia de seguridad cifrada/ }).click();
  const ask = page.getByRole('dialog');
  await ask.getByLabel('Contraseña de la copia').fill('clave-de-prueba-9');
  const [download] = await Promise.all([page.waitForEvent('download'), ask.getByRole('button', { name: /Continuar|Confirmar|Descargar/ }).last().click()]);
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.format).toBe('menstruapp-encrypted-backup');
  expect(JSON.stringify(backup)).not.toContain('Copia');

  // Delete everything (two confirmations, typed word).
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();
  const confirm = page.getByRole('dialog');
  // The confirmation word is typed in a visible text field, not a password field.
  await expect(confirm.getByLabel('Escribe BORRAR para confirmar')).toHaveAttribute('type', 'text');
  await confirm.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await confirm.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu ciclo, tus datos' })).toBeVisible();
  // The fresh start recreates an empty database: no vaults, no records.
  const counts = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('menstruapp');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const count = (/** @type {string} */ name) =>
      new Promise((res) => {
        const idb = /** @type {IDBDatabase} */ (db);
        if (!idb.objectStoreNames.contains(name)) return res(0);
        const r = idb.transaction(name).objectStore(name).count();
        r.onsuccess = () => res(r.result);
      });
    const result = { vaults: await count('vaults'), records: await count('records') };
    /** @type {IDBDatabase} */ (db).close();
    return result;
  });
  expect(counts).toEqual({ vaults: 0, records: 0 });

  // Start again and restore the backup.
  await onboard(page, { lock: 'none' });
  await page.goto('/#/settings/data');
  await expect(page.getByRole('heading', { name: 'Importar' })).toBeVisible();
  // A buffer rather than a path: Chromium's file chooser cannot read some non-ASCII paths.
  await page.setInputFiles('#import-file', { name: 'menstruapp-backup.json', mimeType: 'application/json', buffer: fs.readFileSync(file) });
  const pass = page.getByRole('dialog');
  await pass.getByLabel('Contraseña de la copia').fill('clave-de-prueba-9');
  await pass.getByRole('button', { name: /Continuar|Confirmar/ }).last().click();
  const importDialog = page.getByRole('dialog');
  await expect(importDialog.getByText(/Días con datos en la copia/)).toBeVisible();
  await importDialog.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/Importados? \d+ registros?/)).toBeVisible();
  await page.goto('/#/home');
  await expect(page.locator('.ring__day')).toHaveText('Día 16');
});

test('pregnancy mode: early weeks show the weekly guide and when the tools arrive', async ({ page }) => {
  await onboard(page, { lock: 'none', mode: /^Embarazo/, pregnancyDaysAgo: 75 });
  await expect(page.locator('.preg__weeks')).toContainText('10+5 semanas');
  await page.getByRole('button', { name: 'Tu embarazo semana a semana' }).click();
  await expect(page.getByRole('heading', { name: 'Semana 10' })).toBeVisible();
  await expect(page.getByText(/Desde la semana 24 podrás usar aquí el contador/)).toBeVisible();
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Semana 11' })).toBeVisible();
});

test('pregnancy mode: kick counter and contraction timer in the third trimester', async ({ page }) => {
  await onboard(page, { lock: 'none', mode: /^Embarazo/, pregnancyDaysAgo: 200 });
  await expect(page.locator('.preg__weeks')).toContainText('28+4 semanas');
  await page.getByRole('button', { name: 'Pataditas y contracciones' }).click();
  await page.getByRole('button', { name: 'Empezar a contar' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: /Toca con cada movimiento/ }).click();
  await expect(page.getByText(/¡10 movimientos en \d+ min!/)).toBeVisible();
  await expect(page.getByText(/Última sesión .*10 movimientos/)).toBeVisible();
  // Two contractions give a duration and an interval.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Empieza una contracción' }).click();
    await page.getByRole('button', { name: 'Terminó' }).click();
  }
  await expect(page.getByText(/2 contracciones · duración media/)).toBeVisible();
});

test('PDF report for the doctor', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 20 });
  await page.goto('/#/report');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
  const path = await download.path();
  const head = fs.readFileSync(/** @type {string} */ (path)).subarray(0, 8).toString();
  expect(head).toBe('%PDF-1.4');
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
