// End-to-end tests in a real mobile Chromium against the local server (which serves public/
// with the production headers and the API with an in-memory store).
import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined);
const PORT = Number(process.env.E2E_PORT ?? 8787);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    colorScheme: 'dark',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: executablePath ? { executablePath } : {} } }],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { MENSTRUAPP_STORE: 'memory', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' },
  },
});
