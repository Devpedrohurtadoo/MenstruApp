// Every end-to-end test fails on page errors, console errors, CSP / Trusted Types violations and
// requests to third parties, not only the tests that look for them. A test that provokes an error
// on purpose (e.g. going offline) lists the messages it expects with `test.use({ allowedErrors })`.
import { test as base, expect } from '@playwright/test';
import { watchErrors } from './helpers.mjs';

/** @type {import('@playwright/test').TestType<import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & { allowedErrors: RegExp[] }, import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions>} */
export const test = base.extend({
  allowedErrors: [[], { option: true }],
  page: async ({ page, allowedErrors }, use) => {
    const watch = await watchErrors(page, allowedErrors);
    await use(page);
    await watch.assertClean();
  },
});

export { expect };
