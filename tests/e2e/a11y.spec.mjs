// Automated accessibility audit (axe-core, WCAG 2.1 A/AA) of the main screens in both themes.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboard } from './helpers.mjs';

/** @param {import('@playwright/test').Page} page @param {string} label */
async function audit(page, label) {
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${label}: ${v.id} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(serious).toEqual([]);
}

for (const scheme of /** @type {const} */ (['dark', 'light'])) {
  test(`main screens have no serious accessibility violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await audit(page, 'welcome');
    await onboard(page, { lastPeriodDaysAgo: 12, name: 'Eva' });
    for (const route of ['home', 'calendar', 'analysis', 'learn', 'learn/article/sop', 'luna', 'settings', 'settings/appearance', 'settings/privacy', 'report']) {
      await page.goto(`/#/${route}`);
      await audit(page, route);
    }
    await page.goto('/#/home');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await audit(page, 'daylog');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Bloquear ahora' }).click();
    await audit(page, 'lock');
  });
}
