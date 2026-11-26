import { evaluateHand } from './evaluate/evaluate';
import { scoreToRank } from './evaluate/rank';
import { parseHand } from './evaluate/validate';
import type { Card, Rank, Suit } from './types';
import { CompareResult, HandRank } from './types';

/** Lets update() reassign the fields that are read-only for consumers. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Set on PokerHand.prototype. Every copy of the package (CommonJS, ES module, UMD, another
 * install) gets the same registered symbol, so compareWith() accepts their hands where
 * `instanceof` would not (#12). The key is a promise kept across versions.
 */
const POKER_HAND = Symbol.for('poker-hand-evaluator.PokerHand');

function isPokerHand(value: unknown): value is PokerHand {
  return value != null && (value as { [POKER_HAND]?: unknown })[POKER_HAND] === true;
}

export class PokerHand {
  // Plain own data properties, declared and assigned in this order, so that
  // Object.keys() and JSON.stringify() of an instance match 1.0.1.
  readonly hand: readonly string[];
  readonly score: number;
  readonly rank: HandRank;

  constructor(hand: string) {
    this.hand = parseHand(hand);
    this.score = evaluateHand(this.hand);
    this.rank = scoreToRank(this.score);
  }

  describe(): { hand: string[]; score: number; rank: HandRank } {
    return {
      hand: [...this.hand],
      score: this.score,
      rank: this.rank,
    };
  }

  toString(): string {
    return this.hand.join(' ');
  }

  getScore(): number {
    return this.score;
  }

  getRank(): HandRank {
    return this.rank;
  }

  update(hand: string): void {
    const cards = parseHand(hand);
    const score = evaluateHand(cards);
    const rank = scoreToRank(score);
    const self = this as Mutable<PokerHand>;
    self.hand = cards;
    self.score = score;
    self.rank = rank;
  }

  compareWith(hand: PokerHand): CompareResult {
    if (!isPokerHand(hand)) {
      throw new Error('Incorrect hand to compare with');
    }

    if (this.score < hand.getScore()) {
      return CompareResult.Win;
    }

    if (this.score > hand.getScore()) {
      return CompareResult.Loss;
    }

    if (this.score === hand.getScore()) {
      return CompareResult.Tie;
    }

    // Scores that don't compare, e.g. a PokerHand that was never constructed.
    throw new Error('Incorrect hand');
  }
}

// On the prototype and not enumerable: instances keep hand, score and rank as their only keys.
Object.defineProperty(PokerHand.prototype, POKER_HAND, { value: true });

// Types side: the named exports are also members of the class. This is what lets
// index.d.cts end with `export = PokerHand` and still carry HandRank, Card, etc.
export declare namespace PokerHand {
  export type { Card, Rank, Suit };
  export { CompareResult, HandRank, PokerHand, PokerHand as default };
}

// Runtime side: what the namespace above promises, so that `require()` can return the
// class itself (as in 1.0.1) and still offer `const { HandRank } = require(...)`.
Object.assign(PokerHand, { PokerHand, default: PokerHand, HandRank, CompareResult });
