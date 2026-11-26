// Contrat v1 through import, from Node 12.17 (the first without a flag). Run by run.cjs.
// Expected values come from 1.0.1, as in compat/esm-import.test.ts.

import assert from 'assert';
import { createRequire } from 'module';
import * as pkg from 'poker-hand-evaluator';
// A default import: named imports from a CommonJS file need Node 12.20 or 14.13.
import harness from './harness.cjs';

const check = harness.check;
const thrown = harness.thrown;
const require = createRequire(import.meta.url);

// pkg.default is what `import PokerHand from 'poker-hand-evaluator'` binds. The namespace
// import keeps the other checks running when the default export is missing.
const PokerHand = typeof pkg.default === 'function' ? pkg.default : pkg.PokerHand;

check("import PokerHand from 'poker-hand-evaluator' is the PokerHand class", () => {
  assert.strictEqual(typeof pkg.default, 'function');
  assert.strictEqual(new pkg.default('AS KS QS JS TS').getScore(), 1);
});

// One class for import and require(), as in 1.0.1 (#45). 1.0.1 had no named exports: there,
// both sides are undefined.
check('import and require() give the same class and the same named exports', () => {
  const required = require('poker-hand-evaluator');
  assert.strictEqual(pkg.default, required);
  assert.ok(new pkg.default('AS KS QS JS TS') instanceof required);
  assert.ok(new required('AS KS QS JS TS') instanceof pkg.default);
  assert.strictEqual(pkg.PokerHand, required.PokerHand);
  assert.strictEqual(pkg.HandRank, required.HandRank);
  assert.strictEqual(pkg.CompareResult, required.CompareResult);
});

check('describe() returns hand, score and rank', () => {
  assert.deepStrictEqual(new PokerHand('AS KS QS JS TS').describe(), {
    hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
    score: 1,
    rank: 'ROYAL_FLUSH',
  });
});

check('scores, ranks and compareWith() match 1.0.1', () => {
  const pair = new PokerHand('KS 2H 5C KD AS');
  const worst = new PokerHand('7S 5H 4D 3C 2S');

  assert.strictEqual(pair.getScore(), 3597);
  assert.strictEqual(pair.getRank(), 'ONE_PAIR');
  assert.strictEqual(worst.getScore(), 7462);
  assert.strictEqual(pair.compareWith(worst), 1);
});

check('errors keep the 1.0.1 messages', () => {
  assert.deepStrictEqual(
    thrown(() => new PokerHand('AS AS QS JS TS')),
    { type: 'Error', message: 'Hand has duplicates' }
  );
});

// Deep paths of 1.0.1, with their .js, the form import resolved in 1.0.1 (#16, #29). import()
// rather than static imports, so that a path that fails fails its own check only. It is not
// ES2015, but every Node that runs this file has it; top-level await would need Node 14.8.

const DEEP_PATHS = [
  'index.js',
  'src/pokerhand.js',
  'src/arrays/flushes.js',
  'src/utils/eval-hand.js',
];

Promise.all(
  DEEP_PATHS.map((path) => import(`poker-hand-evaluator/${path}`).catch((error) => ({ error })))
)
  .then(([indexJs, pokerhandJs, flushes, evalHand]) => {
    [
      ['index.js', indexJs],
      ['src/pokerhand.js', pokerhandJs],
    ].forEach(([path, namespace]) => {
      check(`import from 'poker-hand-evaluator/${path}' is the class of the main entry`, () => {
        assert.strictEqual(namespace.error, undefined);
        assert.strictEqual(namespace.default, pkg.default);
        assert.strictEqual(namespace.default, require(`poker-hand-evaluator/${path}`));
      });
    });

    check("import from 'poker-hand-evaluator/src/arrays/flushes.js' is require()'s array", () => {
      assert.strictEqual(flushes.error, undefined);
      assert.strictEqual(flushes.default, require('poker-hand-evaluator/src/arrays/flushes.js'));
    });

    check("import from 'poker-hand-evaluator/src/utils/eval-hand.js' scores hands", () => {
      assert.strictEqual(evalHand.error, undefined);
      assert.strictEqual(evalHand.default(['AC', 'KC', 'QC', 'JC', 'TC']), 1);
    });
  })
  .then(harness.done);
