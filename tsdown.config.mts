import { minify, transform } from '@swc/core';
import type { Plugin } from 'rolldown';
import { defineConfig, type UserConfig } from 'tsdown';

const shared: UserConfig = {
  // Node builds are ES2015, like 1.0.1's main (#15); es-check verifies it.
  target: 'es2015',
  // TypeScript 7.0 has no declaration-emit API: Oxc generates the types.
  // It needs explicit types on everything public, and fails the build otherwise.
  dts: { generator: 'oxc' },
};

/**
 * Lowers the UMD file to ES5, like 1.0.1's (#15): Rolldown stops at ES2015.
 * It runs in generateBundle, after the Oxc minifier, which would otherwise put template
 * literals back. es-check verifies the result.
 */
function es5(): Plugin {
  return {
    name: 'es5',
    async generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const lowered = await transform(chunk.code, {
          // A script, not a module: no "use strict" or import on top of the UMD wrapper.
          isModule: false,
          jsc: {
            target: 'es5',
            parser: { syntax: 'ecmascript' },
            // ES5 has no globalThis: the wrapper falls back to `this || self`, where 1.0.1's
            // used `self || this`. Both are window under a <script> tag.
            transform: { optimizer: { globals: { typeofs: { globalThis: 'undefined' } } } },
          },
        });
        // SWC declares its helpers (_class_call_check...) at the top of the script.
        // A function scope keeps them off window, which only gets PokerHand.
        const { code } = await minify(`(function(){${lowered.code}}).call(this);`, {
          ecma: 5,
          compress: true,
          mangle: true,
        });
        chunk.code = code;
      }
    },
  };
}

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
  {
    // dist/pokerhand.min.js, at 1.0.1's path, for <script> tags (window.PokerHand) and
    // require(). The CommonJS entry, so that both get the class itself.
    entry: { pokerhand: 'src/index.cjs.ts' },
    format: 'umd',
    globalName: 'PokerHand',
    platform: 'browser',
    target: 'es2015',
    minify: true,
    plugins: [es5()],
    // A .js file: the package is "type": "commonjs", so require() reads it as CommonJS.
    // "use strict" inside the factory, as in each module of 1.0.1's webpack build.
    outputOptions: { entryFileNames: '[name].min.js', strict: true },
  },
]);
