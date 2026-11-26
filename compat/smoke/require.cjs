'use strict';

// Contrat v1 through require(), on every Node version from 6. Run by run.cjs.
// Expected values come from 1.0.1, as in compat/require-api.test.ts.

const assert = require('assert');
const harness = require('./harness.cjs');

const check = harness.check;
const thrown = harness.thrown;

const entry = require('poker-hand-evaluator');
// The class wherever the entry puts it, so that a broken require() (checked on its own)
// doesn't hide every other check behind "is not a constructor", as in compat/consumer.ts.
const PokerHand = typeof entry === 'function' ? entry : entry.PokerHand;

check("require('poker-hand-evaluator') returns the PokerHand class itself", () => {
  assert.strictEqual(typeof entry, 'function');
  assert.strictEqual(new entry('AS KS QS JS TS').getScore(), 1);
});

// API

check('instances expose hand, score and rank', () => {
  const pokerHand = new PokerHand('KS 2H 5C KD AS');

  assert.deepStrictEqual(pokerHand.hand, ['KS', '2H', '5C', 'KD', 'AS']);
  assert.strictEqual(pokerHand.score, 3597);
  assert.strictEqual(pokerHand.rank, 'ONE_PAIR');
});

check('instances have exactly hand, score and rank as own keys, and serialize like 1.0.1', () => {
  const pokerHand = new PokerHand('AS KS QS JS TS');

  assert.deepStrictEqual(Object.keys(pokerHand), ['hand', 'score', 'rank']);
  assert.strictEqual(
    JSON.stringify(pokerHand),
    '{"hand":["AS","KS","QS","JS","TS"],"score":1,"rank":"ROYAL_FLUSH"}'
  );
});

check('describe() returns hand, score and rank', () => {
  assert.deepStrictEqual(new PokerHand('AS KS QS JS TS').describe(), {
    hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
    score: 1,
    rank: 'ROYAL_FLUSH',
  });
});

check('toString() joins the uppercased cards with spaces', () => {
  assert.strictEqual(new PokerHand('  as kh qd jc ts ').toString(), 'AS KH QD JC TS');
});

check('getScore() and getRank() return the score and the rank string', () => {
  const pokerHand = new PokerHand('2S 2H 2D 3C 3S');

  assert.strictEqual(pokerHand.getScore(), 322);
  assert.strictEqual(pokerHand.getRank(), 'FULL_HOUSE');
});

check('update() replaces the hand and returns undefined', () => {
  const pokerHand = new PokerHand('AS KS QS JS TS');

  assert.strictEqual(pokerHand.update('7s 5h 4d 3c 2s'), undefined);
  assert.deepStrictEqual(pokerHand.describe(), {
    hand: ['7S', '5H', '4D', '3C', '2S'],
    score: 7462,
    rank: 'HIGH_CARD',
  });
  assert.strictEqual(pokerHand.score, 7462);
});

check('compareWith() returns 1 for a win, 2 for a loss and 3 for a tie', () => {
  const flush = new PokerHand('AC KC QC JC 9C');
  const straight = new PokerHand('AS KH QD JC TS');

  assert.strictEqual(flush.compareWith(straight), 1);
  assert.strictEqual(straight.compareWith(flush), 2);
  assert.strictEqual(straight.compareWith(new PokerHand('AH KD QC JS TH')), 3);
});

// Sample of scores: boundaries of Cactus Kev's 7462 equivalence classes (1 = best).

[
  ['AS KS QS JS TS', 1, 'ROYAL_FLUSH'],
  ['KH QH JH TH 9H', 2, 'STRAIGHT_FLUSH'],
  ['5D 4D 3D 2D AD', 10, 'STRAIGHT_FLUSH'],
  ['AS AH AD AC KS', 11, 'FOUR_OF_A_KIND'],
  ['2S 2H 2D 2C 3S', 166, 'FOUR_OF_A_KIND'],
  ['AS AH AD KC KS', 167, 'FULL_HOUSE'],
  ['2S 2H 2D 3C 3S', 322, 'FULL_HOUSE'],
  ['AC KC QC JC 9C', 323, 'FLUSH'],
  ['7D 5D 4D 3D 2D', 1599, 'FLUSH'],
  ['AS KH QD JC TS', 1600, 'STRAIGHT'],
  ['5S 4H 3D 2C AH', 1609, 'STRAIGHT'],
  ['AS AH AD KC QS', 1610, 'THREE_OF_A_KIND'],
  ['2S 2H 2D 4C 3S', 2467, 'THREE_OF_A_KIND'],
  ['AS AH KD KC QS', 2468, 'TWO_PAIRS'],
  ['3S 3H 2D 2C 4S', 3325, 'TWO_PAIRS'],
  ['AS AH KD QC JS', 3326, 'ONE_PAIR'],
  ['2S 2H 5D 4C 3S', 6185, 'ONE_PAIR'],
  ['AS KH QD JC 9S', 6186, 'HIGH_CARD'],
  ['7S 5H 4D 3C 2S', 7462, 'HIGH_CARD'],
].forEach(([cards, score, rank]) => {
  check(`${cards} scores ${score} (${rank})`, () => {
    const pokerHand = new PokerHand(cards);

    assert.strictEqual(pokerHand.getScore(), score);
    assert.strictEqual(pokerHand.getRank(), rank);
  });
});

// Errors: same cases, same type, same messages as 1.0.1.

const error = (message) => ({ type: 'Error', message });

[
  ['undefined', undefined, 'Hand must be defined'],
  ['null', null, 'Hand must be defined'],
  ["''", '', 'Hand must be defined'],
  ['a number', 42, 'Hand must be a String'],
  ['an array of cards', ['AS', 'KS', 'QS', 'JS', 'TS'], 'Hand must be a String'],
  ['4 cards', 'AS KS QS JS', 'Incorrect hand'],
  ['6 cards', 'AS KS QS JS TS 9S', 'Incorrect hand'],
  ['14 characters that are not 5 cards', 'ASKSQSJSTS 9S8', 'Incorrect hand'],
  ['the same card twice', 'AS AS QS JS TS', 'Hand has duplicates'],
  ['the same card twice in different cases', 'as AS QS JS TS', 'Hand has duplicates'],
  ['duplicated invalid cards', 'ZZ ZZ QS JS TS', 'Hand has duplicates'],
  ['an invalid rank', 'AS KS QS JS 1S', 'Incorrect hand'],
  ['an invalid suit', 'AS KS QS JS TX', 'Incorrect hand'],
].forEach(([label, hand, message]) => {
  check(`new PokerHand(${label}) throws "${message}"`, () => {
    assert.deepStrictEqual(
      thrown(() => new PokerHand(hand)),
      error(message)
    );
  });
});

check('new PokerHand() without argument throws "Hand must be defined"', () => {
  assert.deepStrictEqual(
    thrown(() => new PokerHand()),
    error('Hand must be defined')
  );
});

check('update() throws the same errors and leaves the hand unchanged', () => {
  const pokerHand = new PokerHand('AS KS QS JS TS');

  assert.deepStrictEqual(
    thrown(() => pokerHand.update('AS KS QS JS 1S')),
    error('Incorrect hand')
  );
  assert.deepStrictEqual(
    thrown(() => pokerHand.update(42)),
    error('Hand must be a String')
  );
  assert.strictEqual(pokerHand.toString(), 'AS KS QS JS TS');
  assert.strictEqual(pokerHand.getScore(), 1);
});

[
  ['nothing', undefined],
  ['a hand string', 'AS KS QS JS TS'],
  ['a plain object', { score: 1, getScore: () => 1 }],
].forEach(([label, other]) => {
  check(`compareWith(${label}) throws "Incorrect hand to compare with"`, () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');

    assert.deepStrictEqual(
      thrown(() => pokerHand.compareWith(other)),
      error('Incorrect hand to compare with')
    );
  });
});

check('compareWith() a PokerHand without a comparable score throws "Incorrect hand"', () => {
  const pokerHand = new PokerHand('AS KS QS JS TS');
  const scoreless = Object.create(PokerHand.prototype);

  assert.deepStrictEqual(
    thrown(() => pokerHand.compareWith(scoreless)),
    error('Incorrect hand')
  );
});

harness.done();
