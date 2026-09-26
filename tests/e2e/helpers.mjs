// Shared helpers for the end-to-end tests.
import { expect } from '@playwright/test';

/** Collects page errors, console errors and CSP / Trusted Types violations. */
export async function watchErrors(/** @type {import('@playwright/test').Page} */ page) {
  /** @type {string[]} */
  const errors = [];
  await page.addInitScript(() => {
    // @ts-ignore
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      // @ts-ignore
      window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob')) {
      errors.push(`third-party request: ${r.url()}`);
    }
  });
  return {
    errors,
    async assertClean() {
      const csp = await page.evaluate(() => /** @type {any} */ (window).__cspViolations ?? []);
      expect([...errors, ...csp.map((/** @type {string} */ v) => `csp: ${v}`)]).toEqual([]);
    },
  };
}

/**
 * Completes the onboarding.
 * @param {import('@playwright/test').Page} page
 * @param {{ lock?: 'pin' | 'passphrase' | 'none', secret?: string, mode?: RegExp, name?: string, lastPeriodDaysAgo?: number,
 *   pregnancyDaysAgo?: number, lang?: 'es' | 'en' }} [o]
 * @returns {Promise<string | null>} the recovery code (when a lock was chosen)
 */
export async function onboard(page, o = {}) {
  const lock = o.lock ?? 'pin';
  const en = o.lang === 'en';
  await page.goto('/');
  if (en) await page.getByRole('radio', { name: 'English' }).click();
  await page.check('#consent');
  await page.getByRole('button', { name: en ? 'Get started' : 'Empezar' }).click();
  await page.getByRole('radio', { name: o.mode ?? (en ? /Track my cycle/ : /Seguir mi ciclo/) }).click();
  const next = () => page.getByRole('button', { name: en ? 'Continue' : 'Continuar' }).click();
  await next();
  if (o.lastPeriodDaysAgo !== undefined) await page.fill('#last-period', await localDate(page, -o.lastPeriodDaysAgo));
  if (o.pregnancyDaysAgo !== undefined) await page.fill('#preg-date', await localDate(page, -o.pregnancyDaysAgo));
  await next();
  if (o.name) await page.fill('#ob-name', o.name);
  await next();
  if (lock === 'none') {
    await page.getByRole('radio', { name: en ? 'No lock' : 'Sin bloqueo' }).click();
    await page.check('#none-ack');
  } else {
    if (lock === 'passphrase') await page.getByRole('radio', { name: en ? 'Passphrase' : 'Contraseña' }).click();
    const secret = o.secret ?? (lock === 'pin' ? '4827' : 'luna llena en marzo');
    await page.fill('#ob-secret', secret);
    await page.fill('#ob-secret2', secret);
  }
  await next();
  await page.getByRole('button', { name: en ? 'Create my profile' : 'Crear mi perfil' }).click();
  let recovery = null;
  if (lock !== 'none') {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    recovery = (await dialog.locator('.recovery-code code').innerText()).trim();
    await dialog.locator('input[type=checkbox]').check();
    await dialog.getByRole('button', { name: en ? 'Continue' : 'Continuar' }).click();
  }
  await page.getByRole('button', { name: en ? 'Open Menstruapp' : 'Entrar en Menstruapp' }).click();
  await expect(page.locator('.tabbar')).toBeVisible();
  return recovery;
}

/** Types a PIN on the lock screen keypad. @param {import('@playwright/test').Page} page @param {string} pin */
export async function typePin(page, pin) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

/**
 * YYYY-MM-DD in the *browser's* time zone (which may differ from the test runner's), offset by n days.
 * @param {import('@playwright/test').Page} page
 * @param {number} [offsetDays]
 */
export function localDate(page, offsetDays = 0) {
  return page.evaluate((n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, offsetDays);
}
