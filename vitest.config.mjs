import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{js,mjs}'],
    setupFiles: ['tests/unit/setup.mjs'],
    testTimeout: 30_000,
  },
});
