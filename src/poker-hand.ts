import { evaluateHand } from './evaluate/evaluate';
import { scoreToRank } from './evaluate/rank';
import { parseHand } from './evaluate/validate';
import { CompareResult, type HandRank } from './types';

/** Lets update() reassign the fields that are read-only for consumers. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

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
    if (!(hand instanceof PokerHand)) {
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
