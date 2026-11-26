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

  it('the default import is named PokerHand', () => {
    const run = target.runEsm(`
      import PokerHand from 'poker-hand-evaluator';
      console.log(JSON.stringify(PokerHand.name));
    `);

    expect(run).toEqual({ ok: true, value: 'PokerHand' });
  });

  // An ES module app with a CommonJS dependency that also uses the package. 1.0.1 had one
  // CommonJS file, which import reached through Node.js's CommonJS interop, so both got one
  // class. 1.1.0 keeps one class: its ES module entry wraps the CommonJS build (#45).
  it('import and require() give the same class', () => {
    const run = target.runEsm(`
      import { createRequire } from 'node:module';
      import PokerHand from 'poker-hand-evaluator';
      const RequiredPokerHand = createRequire(import.meta.url)('poker-hand-evaluator');
      console.log(JSON.stringify(PokerHand === RequiredPokerHand));
    `);

    expect(run).toEqual({ ok: true, value: true });
  });

  it('a hand from import is an instance of the class from require(), and the other way round', () => {
    const run = target.runEsm(`
      import { createRequire } from 'node:module';
      import PokerHand from 'poker-hand-evaluator';
      const RequiredPokerHand = createRequire(import.meta.url)('poker-hand-evaluator');
      console.log(JSON.stringify({
        importedIsRequired: new PokerHand('AS KS QS JS TS') instanceof RequiredPokerHand,
        requiredIsImported: new RequiredPokerHand('AS KS QS JS TS') instanceof PokerHand,
      }));
    `);

    expect(run).toEqual({
      ok: true,
      value: { importedIsRequired: true, requiredIsImported: true },
    });
  });

  it('compareWith() compares a hand from import with a hand from require()', () => {
    const run = target.runEsm(`
      import { createRequire } from 'node:module';
      import PokerHand from 'poker-hand-evaluator';
      const RequiredPokerHand = createRequire(import.meta.url)('poker-hand-evaluator');
      const flush = new PokerHand('AC KC QC JC 9C');
      const straight = new RequiredPokerHand('AS KH QD JC TS');
      console.log(JSON.stringify([flush.compareWith(straight), straight.compareWith(flush)]));
    `);

    expect(run).toEqual({ ok: true, value: [1, 2] });
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

    it('each named export is the property of that name of the class from require()', () => {
      const run = target.runEsm(`
        import { createRequire } from 'node:module';
        import { PokerHand, HandRank, CompareResult } from 'poker-hand-evaluator';
        const required = createRequire(import.meta.url)('poker-hand-evaluator');
        console.log(JSON.stringify({
          PokerHand: PokerHand === required.PokerHand,
          HandRank: HandRank === required.HandRank,
          CompareResult: CompareResult === required.CompareResult,
        }));
      `);

      expect(run).toEqual({
        ok: true,
        value: { PokerHand: true, HandRank: true, CompareResult: true },
      });
    });
  });
});
