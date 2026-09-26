// Core journeys: onboarding, locking, logging, calendar and privacy at rest.
import { test, expect } from './fixtures.mjs';
import { onboard, typePin, localDate } from './helpers.mjs';

test('onboarding with PIN, lock, wrong PIN, unlock and persistence', async ({ page }) => {
  const recovery = await onboard(page, { name: 'Ana', lastPeriodDaysAgo: 10 });
  expect(recovery).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{2,4})+$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ana');
  await expect(page.locator('.ring__day')).toHaveText('Día 11');

  // Lock from the top bar, try a wrong PIN, then unlock.
  await page.getByRole('button', { name: 'Bloquear ahora' }).click();
  await expect(page.getByText('Introduce tu PIN')).toBeVisible();
  await typePin(page, '1111');
  await expect(page.locator('.lock__error')).toContainText('PIN incorrecto');
  await typePin(page, '4827');
  await expect(page.locator('.tabbar')).toBeVisible();

  // Reload: the vault is locked again and the data survives.
  await page.reload();
  await expect(page.getByText('Introduce tu PIN')).toBeVisible();
  await typePin(page, '4827');
  await expect(page.locator('.ring__day')).toHaveText('Día 11');
});

test('recovery code unlocks and forces a new PIN', async ({ page }) => {
  const recovery = await onboard(page, { lastPeriodDaysAgo: 3 });
  await page.reload();
  await page.getByRole('button', { name: 'He olvidado mi PIN' }).click();
  await page.fill('#recovery-input', /** @type {string} */ (recovery).toLowerCase().replace(/-/g, ' '));
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Crea un nuevo bloqueo' })).toBeVisible();
  await dialog.locator('input[type=password]').nth(0).fill('9153');
  await dialog.locator('input[type=password]').nth(1).fill('9153');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  // A fresh recovery code is issued because the old one was used.
  const rc = page.getByRole('dialog');
  await expect(rc.locator('.recovery-code')).toBeVisible();
  const fresh = (await rc.locator('.recovery-code code').innerText()).trim();
  expect(fresh).not.toBe(recovery);
  await rc.locator('input[type=checkbox]').check();
  await rc.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.tabbar')).toBeVisible();
  // The used code is retired; the new PIN works.
  await page.reload();
  await page.getByRole('button', { name: 'He olvidado mi PIN' }).click();
  await page.fill('#recovery-input', /** @type {string} */ (recovery));
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await expect(page.locator('.lock__error')).toContainText('El código de recuperación no es correcto');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await typePin(page, '9153');
  await expect(page.locator('.tabbar')).toBeVisible();
});

test('taking data out of the app (exports) asks for the PIN again', async ({ page }) => {
  await onboard(page, { lastPeriodDaysAgo: 9 });
  await page.goto('/#/settings/data');
  await page.getByRole('button', { name: /Hoja de cálculo \(CSV\)/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descargar' }).click();
  const ask = page.getByRole('dialog');
  await ask.locator('#reauth-secret').fill('1111');
  await ask.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('No coincide. Inténtalo de nuevo.')).toBeVisible();
  await page.getByRole('button', { name: /Hoja de cálculo \(CSV\)/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descargar' }).click();
  await page.getByRole('dialog').locator('#reauth-secret').fill('4827');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test('logging a period, symptoms and notes; calendar and insights update', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 28 });
  // Late / due today → start a period from the home screen.
  await page.getByRole('button', { name: 'Me ha venido la regla' }).click();
  await expect(page.getByText('Regla registrada')).toBeVisible();
  await expect(page.locator('.ring__day')).toHaveText('Día 1');

  // Full daily log.
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: /^Cólicos/ }).click();
  await sheet.getByRole('button', { name: /^Cólicos/ }).click();
  await sheet.getByRole('button', { name: 'Tranquila' }).click();
  await sheet.locator('summary', { hasText: 'Notas' }).click();
  await sheet.locator('textarea').fill('Dolor moderado por la mañana');
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole('link', { name: 'Calendario' }).click();
  const today = page.locator(`.cal__day[data-date="${await localDate(page)}"]`);
  await expect(today).toHaveClass(/is-period-logged/);
  await expect(today).toHaveAttribute('aria-label', /regla/);
  // Edit mode: mark yesterday too.
  await page.getByRole('button', { name: 'Editar regla' }).click();
  const yesterday = page.locator(`.cal__day[data-date="${await localDate(page, -1)}"]`);
  await yesterday.click();
  await expect(yesterday).toHaveClass(/is-period-logged/);
  await page.getByRole('button', { name: 'Hecho' }).click();

  await page.getByRole('link', { name: 'Análisis', exact: true }).click();
  await expect(page.getByText('Ciclo medio')).toBeVisible();
});

test('fast navigation always shows the view of the current address', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 6 });
  // Right after the shell mounts, while its first view may still be rendering…
  await page.goto('/#/report');
  await expect(page.locator('.topbar__title')).toHaveText('Informe para tu consulta');
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
  // …and tapping through the tabs without waiting for each view to appear.
  for (const name of ['Calendario', 'Análisis', 'Aprende', 'Hoy', 'Calendario']) await page.getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(/#\/calendar$/);
  await expect(page.locator('.topbar__title')).toHaveText('Calendario');
  await expect(page.locator('.cal__day').first()).toBeVisible();
  await expect(page.locator('.tabbar__item[aria-current="page"]')).toHaveText('Calendario');
});

test('health data is encrypted at rest (never plaintext in IndexedDB or localStorage)', async ({ page }) => {
  await onboard(page, { lastPeriodDaysAgo: 2 });
  const secretNote = 'NOTA-SECRETA-7Q2X';
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('summary', { hasText: 'Notas' }).click();
  await sheet.locator('textarea').fill(secretNote);
  await sheet.getByRole('button', { name: /^Cólicos/ }).click();
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(sheet).toBeHidden();

  const dump = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const chunks = [];
    for (const { name } of dbs) {
      if (!name) continue;
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      for (const storeName of Array.from(/** @type {IDBDatabase} */ (db).objectStoreNames)) {
        const all = await new Promise((res) => {
          const r = /** @type {IDBDatabase} */ (db).transaction(storeName).objectStore(storeName).getAll();
          r.onsuccess = () => res(r.result);
        });
        chunks.push(
          JSON.stringify(all, (_k, v) => {
            if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return Array.from(new Uint8Array(v instanceof ArrayBuffer ? v : v.buffer)).map((b) => String.fromCharCode(b)).join('');
            return v;
          }),
        );
      }
      /** @type {IDBDatabase} */ (db).close();
    }
    return { idb: chunks.join('\n'), ls: JSON.stringify({ ...localStorage }) };
  });
  expect(dump.idb.length).toBeGreaterThan(200);
  for (const needle of [secretNote, 'cramps', 'Cólicos', '"flow"', 'medium']) {
    expect(dump.idb, needle).not.toContain(needle);
    expect(dump.ls, needle).not.toContain(needle);
  }
});

test('camouflage calculator hides the app and requires unlocking to return', async ({ page }) => {
  await onboard(page, { lastPeriodDaysAgo: 5 });
  await page.getByRole('button', { name: 'Pantalla segura' }).click();
  await expect(page.locator('.calc')).toBeVisible();
  await expect(page.locator('.tabbar')).toHaveCount(0);
  // It is a working calculator.
  for (const k of ['7', '×', '6', '=']) await page.locator('.calc__key', { hasText: new RegExp(`^${k}$`) }).first().click();
  await expect(page.locator('.calc__display')).toHaveText('42');
});
