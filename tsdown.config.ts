import { defineConfig } from 'tsdown';

// Library build: dist/index.mjs (+ index.d.mts) and dist/index.cjs.
export default defineConfig({
  entry: ['src/index.ts'],
  // Node builds are ES2015, like 1.0.1's main (#15); es-check verifies it.
  target: 'es2015',
  format: {
    esm: { dts: true },
    // A single declaration file, as before; the CommonJS types belong to #28.
    cjs: { dts: false },
  },
  // The CommonJS file opens with "use strict", like the Vite build did.
  outputOptions: { strict: true },
});
