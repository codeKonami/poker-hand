import { defineConfig } from 'vitest/config';

// Vite serves the index.html demo (`npm run dev`) and Vitest runs the unit tests.
// The library itself is built by tsdown: see tsdown.config.ts.
export default defineConfig({
  test: {
    // compat/ runs against packed tarballs: `npm run compat`.
    include: ['src/**/*.test.ts'],
  },
});
