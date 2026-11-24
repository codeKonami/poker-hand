import { describe, expect, it } from 'vitest';
import { isReferenceRun, target } from './consumer';

const RANKS = [
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
];

describe("import from 'poker-hand-evaluator' (ES module consumer)", () => {
  it('the default import is the PokerHand class', () => {
    const run = target.runEsm(`
      import PokerHand from 'poker-hand-evaluator';
      const hand = new PokerHand('AS KS QS JS TS');
      console.log(JSON.stringify({ type: typeof PokerHand, describe: hand.describe() }));
    `);

    expect(run).toEqual({
      ok: true,
      value: {
        type: 'function',
        describe: { hand: ['AS', 'KS', 'QS', 'JS', 'TS'], score: 1, rank: 'ROYAL_FLUSH' },
      },
    });
  });

  // Added after 1.0.1, whose CommonJS entry exposes no named exports to ES modules.
  describe.skipIf(isReferenceRun)('named exports (new in 1.1.0)', () => {
    it('exports PokerHand, HandRank and CompareResult', () => {
      const run = target.runEsm(`
        import { PokerHand, HandRank, CompareResult } from 'poker-hand-evaluator';
        console.log(JSON.stringify({
          score: new PokerHand('AS KS QS JS TS').getScore(),
          ranks: Object.values(HandRank).sort(),
          compare: [CompareResult.Win, CompareResult.Loss, CompareResult.Tie],
        }));
      `);

      expect(run).toEqual({
        ok: true,
        value: { score: 1, ranks: [...RANKS].sort(), compare: [1, 2, 3] },
      });
    });

    it('the named PokerHand is the default export', () => {
      const run = target.runEsm(`
        import PokerHand, { PokerHand as Named } from 'poker-hand-evaluator';
        console.log(JSON.stringify(PokerHand === Named));
      `);

      expect(run).toEqual({ ok: true, value: true });
    });
  });
});
