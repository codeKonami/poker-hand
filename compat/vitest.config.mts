import { defineConfig } from 'vitest/config';

// Backward-compatibility safety net against the npm 1.0.1 tarball. See compat/README.md.
export default defineConfig({
  test: {
    root: __dirname,
    include: ['**/*.test.ts'],
    globalSetup: ['./global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
