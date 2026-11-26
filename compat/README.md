# compat/: backward-compatibility safety net

Characterization tests of the published package against **poker-hand-evaluator 1.0.1**,
the 2018 npm tarball (`fixtures/poker-hand-evaluator-1.0.1.tgz`, sha1 checked on every run).

Each tarball is unpacked into a throwaway CommonJS consumer project, and the tests only
reach it the way a user would: `require()`, `import`, a `<script>` tag, or a deep path.

## Commands

| Command                                      | What it does                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run compat`                             | builds, `npm pack`s this repo and runs the suite against that tarball                            |
| `COMPAT_TARGET=reference npm run compat`     | runs the suite against 1.0.1 itself: **must be all green** (tests added after 1.0.1 are skipped) |
| `COMPAT_TARGET=path/to/x.tgz npm run compat` | runs the suite against any tarball                                                               |
| `npm run compat:lint`                        | builds, then `publint --strict` and `attw --pack .` (also `compat:publint`, `compat:attw`)       |

## Files

| File                   | Seam                                      | Catches                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `require-api.test.ts`  | `require('poker-hand-evaluator')`         | entry point, class name, `hand`/`score`/`rank` properties, methods, sample scores, exact error messages; named exports on the class (new in 1.1.0)                                      |
| `esm-import.test.ts`   | `import` from an ES module (child `node`) | default import, class name, `compareWith()` across `import` and `require()`; named exports (new in 1.1.0)                                                                               |
| `types.test.ts`        | TypeScript projects that use the package  | the shipped `.d.cts`/`.d.mts` under node16 (CommonJS and ES module) and bundler (new in 1.1.0)                                                                                          |
| `exhaustive.test.ts`   | both packages side by side                | any score or rank drift over the 2,598,960 five-card hands                                                                                                                              |
| `umd.test.ts`          | `dist/pokerhand.min.js`                   | `window.PokerHand` from a `<script>` (jsdom), `require()` of the file                                                                                                                   |
| `deep-imports.test.ts` | `require('poker-hand-evaluator/src/...')` | 1.0.1's deep paths, compared with what 1.0.1 exports; characterization only, the decision belongs to [Imports profonds de la 1.0.1](https://github.com/codeKonami/poker-hand/issues/16) |

## Rules

- Write a new test against 1.0.1 first (`COMPAT_TARGET=reference`): if 1.0.1 doesn't pass it, the test is wrong.
- Expected values come from 1.0.1 or from an independent source (Cactus Kev's tables), never from the code under test.
- Changing or removing an expectation is a contract change: it needs a decision on the
  [wayfinder map](https://github.com/codeKonami/poker-hand/issues/9) (or a v2.0.0).
