import { defineConfig, type UserConfig } from 'tsdown';

const shared: UserConfig = {
  // Node builds are ES2015, like 1.0.1's main (#15); es-check verifies it.
  target: 'es2015',
  // TypeScript 7.0 has no declaration-emit API: Oxc generates the types.
  // It needs explicit types on everything public, and fails the build otherwise.
  dts: { generator: 'oxc' },
};

// Two entries: a CommonJS file can only be `module.exports = PokerHand` when its entry has
// nothing but a default export (#11).
export default defineConfig([
  {
    ...shared,
    // dist/index.mjs + index.d.mts: the named exports and `export default PokerHand`.
    entry: { index: 'src/index.ts' },
    format: 'esm',
  },
  {
    ...shared,
    // dist/index.cjs + index.d.cts: `module.exports = PokerHand` and `export = PokerHand`.
    entry: { index: 'src/index.cjs.ts' },
    format: 'cjs',
    // The CommonJS file opens with "use strict", like the Vite build did.
    outputOptions: { strict: true },
  },
]);
