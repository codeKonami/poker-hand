import { minify, transform } from '@swc/core';
import { defineConfig, type Rolldown, type UserConfig } from 'tsdown';

const shared: UserConfig = {
  // Node builds are ES2015, like 1.0.1's main (#15); es-check verifies it.
  target: 'es2015',
  // TypeScript 7.0 has no declaration-emit API: Oxc generates the types.
  // It needs explicit types on everything public, and fails the build otherwise.
  dts: { generator: 'oxc' },
};

const GLOBAL_NAME = 'PokerHand';

/**
 * 1.0.1's UMD wrapper, from webpack 3 (`libraryTarget: 'umd'`, `library: 'PokerHand'`), with
 * the same four branches in the same order. Rolldown's own wrapper lacks the third one,
 * `exports.PokerHand =`, which is also where Node's ES module loader finds a named export.
 */
const webpackUmd = (factoryBody: string) => `
(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define([], factory);
  else if (typeof exports === 'object')
    exports["${GLOBAL_NAME}"] = factory();
  else
    root["${GLOBAL_NAME}"] = factory();
})(typeof self !== 'undefined' ? self : this, function () {
${factoryBody}
});
`;

/**
 * Turns Rolldown's IIFE (`"use strict"; var PokerHand = (function () { ... })();`) into
 * 1.0.1's UMD file, in ES5 (#15): Rolldown stops at ES2015. It runs in generateBundle, after
 * the Oxc minifier, which would otherwise put template literals back. es-check verifies it.
 */
function webpackUmdInEs5(): Rolldown.Plugin {
  return {
    name: 'webpack-umd-in-es5',
    async generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        // A script, not a module: SWC adds no "use strict" or import of its own.
        const lowered = await transform(chunk.code, {
          isModule: false,
          jsc: { target: 'es5', parser: { syntax: 'ecmascript' } },
        });
        // The factory's body: "use strict" comes first, and `var PokerHand` and SWC's helpers
        // (_class_call_check...), declared at the top of the script, become its locals. The
        // wrapper is already ES5, and the only global it sets is PokerHand.
        const { code } = await minify(webpackUmd(`${lowered.code}\nreturn ${GLOBAL_NAME};`), {
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
    // dist/index.cjs: `module.exports = PokerHand`.
    // dist/deep-paths.cjs: what the CommonJS shims of 1.0.1's deep paths read (#29).
    // Both are thin entries over one chunk, dist/poker-hand.cjs, which Node loads once: a shim
    // gets the very tables the evaluator of dist/index.cjs reads, generated once.
    entry: { index: 'src/index.cjs.ts', 'deep-paths': 'src/deep-paths.ts' },
    format: 'cjs',
    // dist/index.d.cts only (`export = PokerHand`): the shims are untyped, as in 1.0.1.
    dts: { ...shared.dts, entry: 'src/index.cjs.ts' },
    // Stable file names: the shims require dist/deep-paths.cjs by name.
    hash: false,
    outputOptions: {
      // The CommonJS files open with "use strict", like the Vite build did.
      strict: true,
      // The library code, not its declarations, which stay whole in dist/index.d.cts.
      codeSplitting: {
        groups: [{ name: 'poker-hand', test: (id) => /[\\/]src[\\/].*(?<!\.d)\.ts$/.test(id) }],
      },
    },
  },
  {
    // dist/pokerhand.min.js, at 1.0.1's path, for <script> tags (window.PokerHand), require()
    // and AMD. The CommonJS entry, so that all of them get the class itself.
    entry: { pokerhand: 'src/index.cjs.ts' },
    // An IIFE that the plugin wraps in 1.0.1's UMD wrapper.
    format: 'iife',
    globalName: GLOBAL_NAME,
    platform: 'browser',
    target: 'es2015',
    minify: true,
    plugins: [webpackUmdInEs5()],
    // A .js file: the package is "type": "commonjs", so require() reads it as CommonJS.
    // Strict mode, as in each module of 1.0.1's webpack build.
    outputOptions: { entryFileNames: '[name].min.js', strict: true },
  },
]);
