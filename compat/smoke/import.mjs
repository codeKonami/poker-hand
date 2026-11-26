// Contrat v1 through import, from Node 12.17 (the first without a flag). Run by run.cjs.
// Expected values come from 1.0.1, as in compat/esm-import.test.ts.

import assert from 'assert';
import * as pkg from 'poker-hand-evaluator';
// A default import: named imports from a CommonJS file need Node 12.20 or 14.13.
import harness from './harness.cjs';

const check = harness.check;
const thrown = harness.thrown;

// pkg.default is what `import PokerHand from 'poker-hand-evaluator'` binds. The namespace
// import keeps the other checks running when the default export is missing.
const PokerHand = typeof pkg.default === 'function' ? pkg.default : pkg.PokerHand;

check("import PokerHand from 'poker-hand-evaluator' is the PokerHand class", () => {
  assert.strictEqual(typeof pkg.default, 'function');
  assert.strictEqual(new pkg.default('AS KS QS JS TS').getScore(), 1);
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

harness.done();
