import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { type Consumer, PACKAGE, reference, target, thrown } from './consumer';

/*
 * Characterization only: which of these paths stay public is decided by
 * "Imports profonds de la 1.0.1 : lesquels font partie du contrat public ?"
 * (https://github.com/codeKonami/poker-hand/issues/16).
 *
 * Every module 1.0.1 published (tests, example and build files aside) is required
 * from both packages and observed the same way; the observations must match.
 */

const digest = (value: unknown) => createHash('sha1').update(JSON.stringify(value)).digest('hex');

/** What a consumer can see of a module, small enough to diff. */
// biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
type Observe = (exported: any, of: Consumer) => unknown;

const pokerHandClass: Observe = (PokerHand, of) => ({
  type: typeof PokerHand,
  describe: new PokerHand('as kh qd jc ts').describe(),
  isMainEntry: PokerHand === of.require(PACKAGE),
});

const table: Observe = (value) =>
  value instanceof Map
    ? { type: 'Map', entries: [...value] }
    : Array.isArray(value)
      ? { type: 'Array', length: value.length, sha1: digest(value) }
      : { type: typeof value, keys: Object.keys(value) };

const DEEP_MODULES: [path: string, observe: Observe][] = [
  ['index', pokerHandClass],
  ['src/pokerhand', pokerHandClass],
  [
    'src/utils/sanitize',
    (sanitize) => [
      sanitize('JH QD 8S 5c 6d'),
      ...[undefined, 42, 'KS 2H 5C JD', 'KS 2H 5C JD JD', 'KS 2H 5C ZK WS'].map((hand) =>
        thrown(() => sanitize(hand)),
      ),
    ],
  ],
  [
    'src/utils/eval-hand',
    (evalHand) => [
      evalHand(['AC', 'KC', 'QC', 'JC', 'TC']),
      evalHand(['KS', '2H', '5C', 'KD', 'AS']),
      evalHand(['7S', '5H', '4D', '3C', '2S']),
    ],
  ],
  [
    'src/utils/eval-rank',
    (evalRank) => [1, 2, 10, 11, 167, 323, 1600, 1610, 2468, 3326, 6186, 7462].map(evalRank),
  ],
  [
    'src/utils/is-valid-card',
    (isValidCard) => ['KH', 'kh', 'zm', 'AZZ', '', 2, undefined].map(isValidCard),
  ],
  [
    'src/arrays/index',
    (arrays, of) => Object.fromEntries(Object.entries(arrays).map(([k, v]) => [k, table(v, of)])),
  ],
  ['src/arrays/flushes', table],
  ['src/arrays/hand-ranks', table],
  ['src/arrays/products', table],
  ['src/arrays/ranks', table],
  ['src/arrays/suits', table],
  ['src/arrays/unique5', table],
  ['src/arrays/values', table],
];

function observation(of: Consumer, specifier: string, observe: Observe) {
  try {
    return { ok: true, value: observe(of.require(specifier), of) };
  } catch (error) {
    const { code, message } = error as NodeJS.ErrnoException;
    return { ok: false, error: code ?? message };
  }
}

describe('deep imports published in 1.0.1 (characterization)', () => {
  describe.each(DEEP_MODULES)('%s', (path, observe) => {
    it.each([`${PACKAGE}/${path}.js`, `${PACKAGE}/${path}`])('require(%s)', (specifier) => {
      const expected = observation(reference, specifier, observe);
      expect(expected.ok, 'the 1.0.1 observation itself failed').toBe(true);

      expect(observation(target, specifier, observe)).toEqual(expected);
    });
  });
});

// eval-hand takes cards that sanitize has already checked. On an invalid card 1.0.1 failed with
// a TypeError, whose message depended on the JavaScript engine, so only the type is compared.
// Not covered: an invalid suit (AX). 1.0.1 read it as no suit and returned a score (1600 for
// AX KC QC JC TC); 1.1.0 throws the TypeError, as decided in #16.
describe('src/utils/eval-hand on cards it was not meant for (characterization)', () => {
  it.each([
    ['an invalid rank', ['ZS', 'KC', 'QC', 'JC', 'TC']],
    ['lowercase cards', ['as', 'kc', 'qc', 'jc', 'tc']],
    ['four cards', ['AS', 'KS', 'QS', 'JS']],
  ])('%s', (_, hand) => {
    const observe = (of: Consumer) => {
      const error = thrown(() => of.require(`${PACKAGE}/src/utils/eval-hand`)(hand));
      return typeof error === 'object' && error.type === 'TypeError' ? error.type : error;
    };

    expect(observe(target)).toEqual(observe(reference));
  });
});

// biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
type Change = (table: any, of: Consumer) => () => void;

/**
 * Sets `table[key]` (an array index or a Map key) and returns how to restore it.
 * The key can depend on the consumer's own tables.
 */
const set =
  (key: number | string | ((of: Consumer) => number), value: unknown): Change =>
  (table, of) => {
    const at = typeof key === 'function' ? key(of) : key;
    if (table instanceof Map) {
      const saved = table.get(at);
      table.set(at, value);
      return () => table.set(at, saved);
    }
    const saved = table[at];
    table[at] = value;
    return () => {
      table[at] = saved;
    };
  };

// The primes of A, A, K, Q and J: the key of AS AH KD QC JS in products, and so in values.
const ACES_UP_PRODUCT = 41 * 41 * 37 * 31 * 29;
const acesUpIndex = (of: Consumer): number =>
  of.require(`${PACKAGE}/src/arrays/products`).indexOf(ACES_UP_PRODUCT);

const TABLE_CHANGES: [path: string, hand: string, change: Change][] = [
  ['src/arrays/flushes', 'AS KS QS JS TS', set(0x1f00, 9999)],
  ['src/arrays/unique5', 'AS KH QD JC TS', set(0x1f00, 9999)],
  ['src/arrays/values', 'AS AH KD QC JS', set(acesUpIndex, 9999)],
  // The binary search no longer finds the hand.
  ['src/arrays/products', 'AS AH KD QC JS', set(acesUpIndex, 1)],
  // The ace takes the order and prime of the king.
  ['src/arrays/ranks', 'AS KH QD JC TS', set('A', [11, 37])],
  // Spades become clubs.
  ['src/arrays/suits', 'AS KS QS JS TC', set('S', 0x8000)],
];

function scoreOf(of: Consumer, hand: string) {
  let score: unknown;
  const error = thrown(() => {
    score = new (of.require(PACKAGE))(hand).getScore();
  });
  return error === 'no error' ? score : error;
}

// In 1.0.1 a deep path gave the very table the evaluator reads: changing it changed the scores.
// The tables are now generated at import (#33), so a shim must return the main entry's own
// tables, not a second copy generated next to them.
describe("deep-path tables are the evaluator's own (characterization)", () => {
  it.each(TABLE_CHANGES)('changing %s changes the score of %s', (path, hand, change) => {
    const observe = (of: Consumer) => {
      const before = scoreOf(of, hand);
      const restore = change(of.require(`${PACKAGE}/${path}`), of);
      try {
        return { before, changed: scoreOf(of, hand) };
      } finally {
        restore();
      }
    };

    const expected = observe(reference);
    expect(expected.changed, 'the change has no effect on 1.0.1').not.toEqual(expected.before);
    expect(observe(target)).toEqual(expected);
  });

  it('src/arrays/index holds the same tables as their own paths', () => {
    const observe = (of: Consumer) =>
      Object.entries(of.require(`${PACKAGE}/src/arrays/index`)).map(([name, table]) => [
        name,
        table === of.require(`${PACKAGE}/src/arrays/${name}`),
      ]);

    expect(observe(target)).toEqual(observe(reference));
  });
});
