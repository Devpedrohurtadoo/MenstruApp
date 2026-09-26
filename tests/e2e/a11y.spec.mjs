// Automated accessibility audit (axe-core): WCAG 2.2 A/AA plus axe best practices, violations of
// ANY impact fail. Every screen, the dialogs and the discreet screens, in light and dark themes and
// with the "more contrast" setting.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboard } from './helpers.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** @param {import('@playwright/test').Page} page @param {string} label */
async function audit(page, label) {
  await page.waitForTimeout(350);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = results.violations.map((v) => `${label}: ${v.id} (${v.impact}) — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(found).toEqual([]);
}

const SCREENS = [
  'home',
  'calendar',
  'analysis',
  'learn',
  'learn/article/sop',
  'learn/faq',
  'learn/glossary',
  'learn/consult',
  'luna',
  'report',
  'settings',
  'settings/profile',
  'settings/cycle',
  'settings/mode',
  'settings/appearance',
  'settings/privacy',
  'settings/reminders',
  'settings/data',
  'settings/language',
  'settings/share',
  'settings/about',
];

for (const scheme of /** @type {const} */ (['dark', 'light'])) {
  test(`every screen and dialog passes axe (${scheme})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await audit(page, 'welcome');
    // Onboarding steps other than the welcome screen.
    await page.check('#consent');
    await page.getByRole('button', { name: 'Empezar' }).click();
    await audit(page, 'onboarding:mode');
    await page.getByRole('radio', { name: /Seguir mi ciclo/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await audit(page, 'onboarding:basics');

    await onboard(page, { lastPeriodDaysAgo: 12, name: 'Eva' });
    for (const route of SCREENS) {
      await page.goto(`/#/${route}`);
      await audit(page, route);
    }
    // Luna with a conversation.
    await page.goto('/#/luna');
    await page.fill('#luna-input', 'tengo cólicos fuertes');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg--luna')).toHaveCount(2);
    await audit(page, 'luna:conversation');
    // Dialogs.
    await page.goto('/#/home');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await audit(page, 'dialog:daylog');
    await page.keyboard.press('Escape');
    await page.goto('/#/settings/data');
    await page.getByRole('button', { name: /Hoja de cálculo \(CSV\)/ }).click();
    await audit(page, 'dialog:confirm');
    await page.keyboard.press('Escape');
    await page.goto('/#/settings/about');
    await page.getByRole('button', { name: 'Política de privacidad' }).click();
    await audit(page, 'dialog:privacy');
    await page.keyboard.press('Escape');
    // Lock screen and the discreet calculator.
    await page.goto('/#/home');
    await page.getByRole('button', { name: 'Bloquear ahora' }).click();
    await audit(page, 'lock');
    await page.getByRole('button', { name: 'He olvidado mi PIN' }).click();
    await audit(page, 'lock:recovery');
  });
}

test('the "more contrast" setting passes axe too', async ({ page }) => {
  await onboard(page, { lock: 'none', lastPeriodDaysAgo: 5 });
  await page.goto('/#/settings/appearance');
  await page.locator('label.switch', { hasText: 'Alto contraste' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  for (const route of ['home', 'calendar', 'settings/appearance']) {
    await page.goto(`/#/${route}`);
    await audit(page, `more-contrast:${route}`);
  }
});

test('pregnancy tools and the safe screen pass axe', async ({ page }) => {
  await onboard(page, { mode: /^Embarazo/, pregnancyDaysAgo: 200 });
  await page.goto('/#/pregnancy');
  await audit(page, 'pregnancy');
  await page.getByRole('button', { name: 'Pantalla segura' }).click();
  await expect(page.locator('.calc')).toBeVisible();
  await audit(page, 'calculator');
});
