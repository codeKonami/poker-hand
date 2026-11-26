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

// Deep paths of 1.0.1, served by every 1.x (#16, #29), as in compat/deep-imports.test.ts.
// Node < 12.7 ignores "exports" and loads the files of the package; later versions go through
// "exports". The UMD build (dist/pokerhand.min) is #19's.

const crypto = require('crypto');

const deep = (path) => require(`poker-hand-evaluator/${path}`);
const digest = (value) => crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
const withAndWithoutJs = (path) => [`${path}.js`, path];

['index', 'src/pokerhand'].forEach((module) => {
  withAndWithoutJs(module).forEach((path) => {
    check(`require('poker-hand-evaluator/${path}') is the class of the main entry`, () => {
      assert.strictEqual(deep(path), entry);
    });
  });
});

[
  [
    'src/utils/sanitize',
    (sanitize) => {
      assert.deepStrictEqual(sanitize('JH QD 8S 5c 6d'), ['JH', 'QD', '8S', '5C', '6D']);
      assert.deepStrictEqual(
        thrown(() => sanitize('KS 2H 5C JD JD')),
        error('Hand has duplicates')
      );
    },
  ],
  [
    'src/utils/eval-hand',
    (evalHand) => {
      assert.strictEqual(evalHand(['AC', 'KC', 'QC', 'JC', 'TC']), 1);
      assert.strictEqual(evalHand(['KS', '2H', '5C', 'KD', 'AS']), 3597);
      // The message of this TypeError depends on the JavaScript engine.
      assert.strictEqual(thrown(() => evalHand(['ZS', 'KC', 'QC', 'JC', 'TC'])).type, 'TypeError');
    },
  ],
  [
    'src/utils/eval-rank',
    (evalRank) => {
      assert.deepStrictEqual([1, 2, 11, 167, 323, 1600, 1610, 2468, 3326, 6186].map(evalRank), [
        'ROYAL_FLUSH',
        'STRAIGHT_FLUSH',
        'FOUR_OF_A_KIND',
        'FULL_HOUSE',
        'FLUSH',
        'STRAIGHT',
        'THREE_OF_A_KIND',
        'TWO_PAIRS',
        'ONE_PAIR',
        'HIGH_CARD',
      ]);
    },
  ],
  [
    'src/utils/is-valid-card',
    (isValidCard) => {
      assert.deepStrictEqual(
        ['KH', 'kh', 'zm', 'AZZ', '', 2, undefined].map((card) => isValidCard(card)),
        [true, true, false, false, false, false, false]
      );
    },
  ],
  // 1.0.1's tables: length and sha1 of their JSON (of their entries, for a Map).
  [
    'src/arrays/flushes',
    (flushes) => {
      assert.strictEqual(flushes.length, 7937);
      assert.strictEqual(digest(flushes), '0fec3bb7ae68328a12f5fa6783a7df81564127b7');
    },
  ],
  [
    'src/arrays/unique5',
    (unique5) => {
      assert.strictEqual(unique5.length, 7937);
      assert.strictEqual(digest(unique5), '317f49dd0ec6e777786c2315ac61f1d1d8fd4674');
    },
  ],
  [
    'src/arrays/products',
    (products) => {
      assert.strictEqual(products.length, 4888);
      assert.strictEqual(digest(products), 'eedfcdd732c01039632c41f9665ade3ac0dcefcb');
    },
  ],
  [
    'src/arrays/values',
    (values) => {
      assert.strictEqual(values.length, 4888);
      assert.strictEqual(digest(values), '7b3a7bb1cdaaf278be30fe5260e758ea5cbe1597');
    },
  ],
  [
    'src/arrays/ranks',
    (ranks) => {
      assert.strictEqual(ranks.size, 13);
      assert.strictEqual(digest(Array.from(ranks)), 'cbf34adb7a6ec9737414cb7d4125475412cf8544');
    },
  ],
  [
    'src/arrays/suits',
    (suits) => {
      assert.strictEqual(suits.size, 4);
      assert.strictEqual(digest(Array.from(suits)), '9c5ef9726ff9a2dd35411f2196a62ff717b821f3');
    },
  ],
  [
    'src/arrays/hand-ranks',
    (handRanks) => {
      assert.deepStrictEqual(handRanks, {});
    },
  ],
  [
    'src/arrays/index',
    (arrays) => {
      assert.deepStrictEqual(Object.keys(arrays), [
        'flushes',
        'products',
        'ranks',
        'suits',
        'unique5',
        'values',
      ]);
      Object.keys(arrays).forEach((name) => {
        assert.strictEqual(arrays[name], deep(`src/arrays/${name}`), name);
      });
    },
  ],
].forEach(([module, verify]) => {
  withAndWithoutJs(module).forEach((path) => {
    check(`require('poker-hand-evaluator/${path}') works as in 1.0.1`, () => {
      verify(deep(path));
    });
  });
});

// Node 17+ prints its own DEP0155 for the trailing slash (DEP0148 on Node 16): see #29.
['src/arrays', 'src/arrays/'].forEach((path) => {
  check(`require('poker-hand-evaluator/${path}') is src/arrays/index.js`, () => {
    assert.strictEqual(deep(path), deep('src/arrays/index.js'));
  });
});

check("the deep-path tables are the evaluator's own: changing one changes the scores", () => {
  const flushes = deep('src/arrays/flushes');
  const saved = flushes[0x1f00];
  flushes[0x1f00] = 9999;
  try {
    assert.strictEqual(new PokerHand('AS KS QS JS TS').getScore(), 9999);
  } finally {
    flushes[0x1f00] = saved;
  }
  assert.strictEqual(new PokerHand('AS KS QS JS TS').getScore(), 1);
});

['package', 'package.json'].forEach((path) => {
  check(`require('poker-hand-evaluator/${path}') is the package.json`, () => {
    assert.strictEqual(deep(path).name, 'poker-hand-evaluator');
    assert.strictEqual(deep(path), deep('package.json'));
  });
});

check('the four forms of example are one module, which logs what it logged in 1.0.1', () => {
  const logs = [];
  const log = console.log;
  console.log = (...args) => {
    logs.push(args);
  };
  let exported;
  try {
    exported = ['example', 'example/', 'example/index', 'example/index.js'].map(deep);
  } finally {
    console.log = log;
  }

  assert.deepStrictEqual(exported, [{}, {}, {}, {}]);
  assert.strictEqual(exported[1], exported[0]);
  assert.strictEqual(
    JSON.stringify(logs),
    JSON.stringify([
      [{ hand: ['KS', 'KH', 'QC', 'AH', 'AD'], score: 2468, rank: 'TWO_PAIRS' }],
      [{ hand: ['KD', 'KC', 'AS', 'AH', 'TD'], score: 2470, rank: 'TWO_PAIRS' }],
      ['TWO_PAIRS'],
      ['TWO_PAIRS'],
      [2468],
      [2470],
      ['KS KH QC AH AD'],
      ['KD KC AS AH TD'],
      [1],
    ])
  );
});

harness.done();
