import { parseHand } from './evaluate/validate';
import { evaluateHand } from './evaluate/evaluate';
import { scoreToRank } from './evaluate/rank';
import { HandRank, CompareResult } from './types';

export class PokerHand {
  private cards: string[];
  private score: number;
  private handRank: HandRank;

  constructor(hand: string) {
    this.cards = parseHand(hand);
    this.score = evaluateHand(this.cards);
    this.handRank = scoreToRank(this.score);
  }

  describe(): { hand: string[]; score: number; rank: HandRank } {
    return {
      hand: this.cards,
      score: this.score,
      rank: this.handRank,
    };
  }

  toString(): string {
    return this.cards.join(' ');
  }

  getScore(): number {
    return this.score;
  }

  getRank(): HandRank {
    return this.handRank;
  }

  update(hand: string): void {
    this.cards = parseHand(hand);
    this.score = evaluateHand(this.cards);
    this.handRank = scoreToRank(this.score);
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

    return CompareResult.Tie;
  }
}
