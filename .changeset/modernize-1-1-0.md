---
"poker-hand-evaluator": minor
---

Modernize the package (TypeScript, ES module and CommonJS builds, bundled types, CI) while staying backward compatible with 1.0.1: the same API, the same error messages, the same score for each of the 2,598,960 hands, and no Node.js version or browser dropped. Full diff: [v1.0.1...v1.1.0](https://github.com/codeKonami/poker-hand/compare/v1.0.1...v1.1.0).

#### What's new

- **ES module entry.** `import PokerHand from 'poker-hand-evaluator'` now loads an ES module, `dist/index.mjs`. It is a thin wrapper over the CommonJS build, so `import` and `require()` give the same `PokerHand` class, as in 1.0.1, in Node.js and in bundlers: `instanceof` holds across them. The named exports `PokerHand`, `HandRank` and `CompareResult` are new: `import { PokerHand, HandRank } from 'poker-hand-evaluator'`. With `require()`, they are static properties of the class, the same objects: `const { HandRank } = require('poker-hand-evaluator')`.
- **TypeScript types**, for `import` (`dist/index.d.mts`) and for `require()` (`dist/index.d.cts`). `HandRank` and `CompareResult` are plain objects, and each is also the type of its values, so a literal fits where a rank is expected: `const r: HandRank = 'FLUSH'`. `Card`, `Rank` and `Suit` are exported as types.
- **Much smaller bundles.** The four lookup tables are generated when the package loads, instead of shipping as data. A minified bundle that uses `PokerHand` drops from about 100 kB to 4.1–5.3 kB (37 kB to 1.8–2.2 kB gzipped), depending on the bundler (webpack 5, esbuild, Rollup 4 with `@rollup/plugin-commonjs`, Vite 8). The size is the same whichever export you import: bundlers keep the CommonJS build whole, as they kept 1.0.1's. `dist/pokerhand.min.js` drops from 101.7 kB to 5.6 kB (37.8 kB to 2.4 kB gzipped). Loading the package takes about 1 ms longer, and the scores are unchanged.

#### Documented behaviour changes

None of these breaks code written for 1.0.1.

- `describe().hand` returns a copy. In 1.0.1, it was the instance's own `hand` array, so changing it changed `hand` and `toString()`.
- `Object.keys(PokerHand)` returns `['PokerHand', 'default', 'HandRank', 'CompareResult']` instead of `[]`. These static properties are enumerable on purpose: the `import` interop helpers of TypeScript and Babel only copy enumerable keys.
- `import { PokerHand } from 'poker-hand-evaluator/dist/pokerhand.min.js'` gives the class, instead of `undefined`.
- `import` of the deep paths `index` and `src/pokerhand` gives the main entry. Its default export is the class, the one `require()` gives, as in 1.0.1, and its namespace also has the named exports `PokerHand`, `HandRank` and `CompareResult`.
- `package.json` has an `exports` map, and still no `module` field, as in 1.0.1. Tools that read `exports` give `import` the ES module wrapper and `require()` the CommonJS build, and the others keep `main`, the CommonJS build. Without a `module` field, webpack 4 still gives `require()` the class.
- `package.json` declares `"type": "commonjs"`, which is Node.js's default and so 1.0.1's: every published `.js` file is still CommonJS.
- `package.json` declares `"sideEffects": ["./example/index.js"]`, so bundlers can drop the package when nothing of it is used. A bundler can also drop a bare `import` of `dist/pokerhand.min.js`, but under a bundler that import set no `window.PokerHand` with 1.0.1 either. `example` keeps printing its logs.

#### Relaxations

Inputs that threw in 1.0.1 and are now accepted:

- `compareWith()` accepts a hand from another copy of the package, such as `dist/pokerhand.min.js` or a second install, where 1.0.1 threw `Incorrect hand to compare with`. Anything else that is not a `PokerHand` still throws it.
- `import` of a deep path without `.js` (`poker-hand-evaluator/src/utils/sanitize`), of the `src/arrays` directory, or of `poker-hand-evaluator/package` now resolves. 1.0.1 resolved these forms through `require()` only.

#### Deprecated deep paths

1.0.1's files are still served by path, through `require()` and `import`, with or without `.js`, and each gives what it gave in 1.0.1:

- `index` and `src/pokerhand`;
- `src/utils/sanitize`, `src/utils/eval-hand`, `src/utils/eval-rank` and `src/utils/is-valid-card`;
- `src/arrays`, and `src/arrays/index`, `flushes`, `hand-ranks`, `products`, `ranks`, `suits`, `unique5` and `values`;
- `example`.

They are deprecated: every 1.x keeps serving them, and they are slated for removal in 2.0.0. The deprecation is documented only, with no runtime warning. `package.json` and `dist/pokerhand.min.js` are not deprecated.

#### Not dropped

- **Node.js 6 and later**, now declared in `"engines": { "node": ">=6" }`. `require()` returns the class on every version, and `import` works from Node.js 12.17.
- **The ES5 UMD build**, `dist/pokerhand.min.js`, at the same path. A `<script>` tag still defines `window.PokerHand`, and `require()` of the file still returns the class. Browsers need native `Map` and `Set` that accept an iterable, as with 1.0.1.

#### Exclusions and limits

- `require('poker-hand-evaluator/')`, the package name with a trailing slash, no longer resolves (`ERR_PACKAGE_PATH_NOT_EXPORTED`): no `exports` key can serve it. Drop the slash.
- The deep paths with a trailing slash, `src/arrays/` and `example/`, still resolve, but print Node.js's own deprecation warning: DEP0155, or DEP0148 on Node.js 16. The other forms print nothing.
