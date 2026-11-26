import { describe, expect, it } from 'vitest';
import { isReferenceRun, PACKAGE, pokerHandClass, target, thrown } from './consumer';

describe("require('poker-hand-evaluator')", () => {
  it('returns the PokerHand class itself', () => {
    const PokerHand = target.require(PACKAGE);

    expect(typeof PokerHand).toBe('function');
    expect(new PokerHand('AS KS QS JS TS').getScore()).toBe(1);
  });

  // A minifier or a bundler rename would change it (Vite's build made it one letter).
  it('the class is named PokerHand', () => {
    expect(pokerHandClass(target).name).toBe('PokerHand');
  });

  // Added after 1.0.1, whose entry is the class alone.
  describe.skipIf(isReferenceRun)('named exports on the class (new in 1.1.0)', () => {
    it('const { PokerHand, HandRank, CompareResult } = require() works', () => {
      const { PokerHand, HandRank, CompareResult } = target.require(PACKAGE);

      expect(new PokerHand('AS KS QS JS TS').getRank()).toBe(HandRank.RoyalFlush);
      expect(HandRank.Flush).toBe('FLUSH');
      expect([CompareResult.Win, CompareResult.Loss, CompareResult.Tie]).toEqual([1, 2, 3]);
    });

    // What TypeScript compiled to CommonJS reads for `import PokerHand from` (no esModuleInterop).
    it('.PokerHand and .default are the class itself', () => {
      const PokerHand = target.require(PACKAGE);

      expect(PokerHand.PokerHand).toBe(PokerHand);
      expect(PokerHand.default).toBe(PokerHand);
    });
  });
});

describe('PokerHand instance properties', () => {
  const PokerHand = pokerHandClass(target);

  it('exposes hand, score and rank', () => {
    const pokerHand = new PokerHand('KS 2H 5C KD AS');

    expect(pokerHand.hand).toEqual(['KS', '2H', '5C', 'KD', 'AS']);
    // Pairs of kings start at 3546 (KK AQJ); KK A52 is the 52nd kicker combination.
    expect(pokerHand.score).toBe(3597);
    expect(pokerHand.rank).toBe('ONE_PAIR');
  });

  it('has exactly hand, score and rank as own enumerable keys, so it serializes like 1.0.1', () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');

    expect(Object.keys(pokerHand)).toEqual(['hand', 'score', 'rank']);
    expect(JSON.stringify(pokerHand)).toBe(
      '{"hand":["AS","KS","QS","JS","TS"],"score":1,"rank":"ROYAL_FLUSH"}',
    );
  });

  it('reflects the new hand after update()', () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');
    pokerHand.update('7S 5H 4D 3C 2S');

    expect(pokerHand.hand).toEqual(['7S', '5H', '4D', '3C', '2S']);
    expect(pokerHand.score).toBe(7462);
    expect(pokerHand.rank).toBe('HIGH_CARD');
  });
});

describe('PokerHand methods', () => {
  const PokerHand = pokerHandClass(target);

  it('describe() returns hand, score and rank', () => {
    expect(new PokerHand('AS KS QS JS TS').describe()).toEqual({
      hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
      score: 1,
      rank: 'ROYAL_FLUSH',
    });
  });

  it('toString() joins the uppercased cards with spaces', () => {
    expect(new PokerHand('  as kh qd jc ts ').toString()).toBe('AS KH QD JC TS');
  });

  it('getScore() and getRank() return the score and the rank string', () => {
    const pokerHand = new PokerHand('2S 2H 2D 3C 3S');

    expect(pokerHand.getScore()).toBe(322);
    expect(pokerHand.getRank()).toBe('FULL_HOUSE');
  });

  it('update() replaces the hand and returns undefined', () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');

    expect(pokerHand.update('7s 5h 4d 3c 2s')).toBeUndefined();
    expect(pokerHand.describe()).toEqual({
      hand: ['7S', '5H', '4D', '3C', '2S'],
      score: 7462,
      rank: 'HIGH_CARD',
    });
  });

  it('compareWith() returns 1 for a win, 2 for a loss and 3 for a tie', () => {
    const flush = new PokerHand('AC KC QC JC 9C');
    const straight = new PokerHand('AS KH QD JC TS');

    expect(flush.compareWith(straight)).toBe(1);
    expect(straight.compareWith(flush)).toBe(2);
    expect(straight.compareWith(new PokerHand('AH KD QC JS TH'))).toBe(3);
  });
});

describe('PokerHand scores and ranks', () => {
  const PokerHand = pokerHandClass(target);

  // Boundaries of Cactus Kev's 7462 equivalence classes (1 = best, 7462 = worst).
  it.each([
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
  ])('%s scores %i (%s)', (hand, score, rank) => {
    expect(new PokerHand(hand).describe()).toMatchObject({ score, rank });
  });
});

describe('PokerHand errors', () => {
  const PokerHand = pokerHandClass(target);
  const error = (message: string) => ({ type: 'Error', message });

  // Checked in 1.0.1's order: falsy, type, length after trim, card count, duplicates, cards.
  it.each([
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
    [
      'duplicated invalid cards (duplicates are checked first)',
      'ZZ ZZ QS JS TS',
      'Hand has duplicates',
    ],
    ['an invalid rank', 'AS KS QS JS 1S', 'Incorrect hand'],
    ['an invalid suit', 'AS KS QS JS TX', 'Incorrect hand'],
  ])('new PokerHand(%s) throws', (_, hand, message) => {
    expect(thrown(() => new PokerHand(hand))).toEqual(error(message));
  });

  it('new PokerHand() without argument throws "Hand must be defined"', () => {
    expect(thrown(() => new PokerHand())).toEqual(error('Hand must be defined'));
  });

  it('update() throws the same errors and leaves the hand unchanged', () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');

    expect(thrown(() => pokerHand.update('AS KS QS JS 1S'))).toEqual(error('Incorrect hand'));
    expect(thrown(() => pokerHand.update(42))).toEqual(error('Hand must be a String'));
    expect(pokerHand.toString()).toBe('AS KS QS JS TS');
    expect(pokerHand.getScore()).toBe(1);
  });

  it.each([
    ['nothing', undefined],
    ['a hand string', 'AS KS QS JS TS'],
    ['a plain object', { score: 1, getScore: () => 1 }],
  ])('compareWith(%s) throws "Incorrect hand to compare with"', (_, other) => {
    const pokerHand = new PokerHand('AS KS QS JS TS');

    expect(thrown(() => pokerHand.compareWith(other))).toEqual(
      error('Incorrect hand to compare with'),
    );
  });

  it('compareWith() a PokerHand without a comparable score throws "Incorrect hand"', () => {
    const pokerHand = new PokerHand('AS KS QS JS TS');
    const scoreless = Object.create(PokerHand.prototype);

    expect(thrown(() => pokerHand.compareWith(scoreless))).toEqual(error('Incorrect hand'));
  });
});
