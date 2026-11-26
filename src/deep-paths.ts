// What the CommonJS shims of 1.0.1's deep paths return (src/utils/*.js, src/arrays/*.js; #29).
// tsdown builds it into dist/deep-paths.cjs, next to dist/index.cjs and from the same chunk, so
// the shims get the evaluator's own tables, not a second copy generated next to them.
// Not a public entry: the paths that read it are deprecated, and go away in 2.0.0 (#16).
export { evaluateCards } from './evaluate/evaluate';
export { scoreToRank } from './evaluate/rank';
export { isValidCard, parseHand } from './evaluate/validate';
export { flushes, products, ranks, suits, unique5, values } from './tables';
