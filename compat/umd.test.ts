import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { isReferenceRun, PACKAGE, pokerHandClass, target } from './consumer';

const UMD = 'dist/pokerhand.min.js';

/**
 * The ES2015+ built-ins that 1.0.1's UMD runs without. It does need Map and Set, built
 * from an iterable. es-check only sees part of this list (it misses Object.assign, for
 * instance), so the browser floor is checked by running the file without them.
 */
const BUILT_INS_1_0_1_RUNS_WITHOUT = [
  'Symbol',
  'Promise',
  'WeakMap',
  'WeakSet',
  'Proxy',
  'Reflect',
  'globalThis',
  'Object.assign',
  'Object.is',
  'Object.setPrototypeOf',
  'Object.getOwnPropertySymbols',
  'Object.values',
  'Object.entries',
  'Array.from',
  'Array.of',
  'Array.prototype.fill',
  'Array.prototype.find',
  'Array.prototype.findIndex',
  'Array.prototype.includes',
  'String.prototype.includes',
  'String.prototype.startsWith',
  'String.prototype.endsWith',
  'String.prototype.repeat',
  'String.prototype.padStart',
  'String.prototype.padEnd',
  'Number.isInteger',
  'Number.isNaN',
  'Number.isFinite',
  'Math.trunc',
  'Math.sign',
  'Math.imul',
  'Math.clz32',
];

/** A page that loads the UMD file with a <script> tag, after the `before` script if any. */
function page(before?: string) {
  const { window } = new JSDOM('<!doctype html><body></body>', { runScripts: 'dangerously' });
  const run = (source: string) => {
    const script = window.document.createElement('script');
    script.textContent = source;
    window.document.body.appendChild(script);
  };
  if (before) {
    run(before);
  }
  const globals = new Set(Object.getOwnPropertyNames(window));
  run(readFileSync(target.packageFile(UMD), 'utf8'));
  return {
    // biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
    PokerHand: (window as unknown as { PokerHand: any }).PokerHand,
    addedGlobals: Object.getOwnPropertyNames(window).filter((name) => !globals.has(name)),
  };
}

describe(`UMD build ${UMD}`, () => {
  it('is published', () => {
    expect(existsSync(target.packageFile(UMD))).toBe(true);
  });

  it('a <script> tag exposes window.PokerHand', () => {
    const { PokerHand } = page();

    expect(typeof PokerHand).toBe('function');
    expect(new PokerHand('as ks qs js ts').describe()).toEqual({
      hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
      score: 1,
      rank: 'ROYAL_FLUSH',
    });
  });

  it('a <script> tag adds no global but PokerHand', () => {
    expect(page().addedGlobals).toEqual(['PokerHand']);
  });

  it('runs without the ES2015+ built-ins that 1.0.1 runs without', () => {
    const { PokerHand } = page(
      BUILT_INS_1_0_1_RUNS_WITHOUT.map((name) =>
        name.includes('.') ? `delete ${name};` : `delete window.${name};`,
      ).join('\n'),
    );
    const hand = new PokerHand('AC KC QC JC 9C');
    const straight = new PokerHand('AS KH QD JC TS');

    expect([hand.getRank(), hand.compareWith(straight), straight.compareWith(hand)]).toEqual([
      'FLUSH',
      1,
      2,
    ]);

    hand.update('kd kc as ah td');

    expect(hand.describe()).toEqual({
      hand: ['KD', 'KC', 'AS', 'AH', 'TD'],
      score: 2470,
      rank: 'TWO_PAIRS',
    });
    expect(hand.compareWith(straight)).toBe(2);
    expect(String(straight)).toBe('AS KH QD JC TS');
    expect(() => new PokerHand('AS AS QD JC TS')).toThrow('Hand has duplicates');
    expect(() => new PokerHand('AS KS QS JS 1S')).toThrow('Incorrect hand');
  });

  // In a "type": "module" package Node reads this .js file as an ES module:
  // require() then returns {} (Node 22) or throws ERR_REQUIRE_ESM (Node 20).
  it(`require('${PACKAGE}/${UMD}') returns the PokerHand class`, () => {
    const PokerHand = target.require(`${PACKAGE}/${UMD}`);

    expect(typeof PokerHand).toBe('function');
    expect(new PokerHand('AS KS QS JS TS').getScore()).toBe(1);
  });

  // 1.0.1 checks `instanceof`, and its UMD file holds a second copy of the class, so it
  // throws "Incorrect hand to compare with". 1.1.0 recognizes a hand from any copy (#12).
  describe.skipIf(isReferenceRun)('relaxation (new in 1.1.0)', () => {
    it('compareWith() compares a hand from the UMD file with a hand from the main entry', () => {
      const UmdPokerHand = target.require(`${PACKAGE}/${UMD}`);
      const flush = new UmdPokerHand('AC KC QC JC 9C');
      const straight = new (pokerHandClass(target))('AS KH QD JC TS');

      expect([flush.compareWith(straight), straight.compareWith(flush)]).toEqual([1, 2]);
    });
  });
});
