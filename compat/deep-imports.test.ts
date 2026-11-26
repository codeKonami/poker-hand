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
