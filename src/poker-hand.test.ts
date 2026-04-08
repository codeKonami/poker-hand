import { describe, it, expect } from 'vitest';
import { PokerHand } from './poker-hand';

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

describe('Constructor', () => {
  describe('Errors', () => {
    it('Should throw if not a valid hand passed', () => {
      expect(() => {
        new PokerHand('KS 2H 5C ZD WD');
      }).toThrow();
    });
  });

  describe('Test Methods', () => {
    it('describe() should return an object', () => {
      expect(myPokerHand.describe()).toEqual({
        hand: ['KS', 'KH', 'QC', 'AH', 'AD'],
        score: 2468,
        rank: 'TWO_PAIRS',
      });
    });

    it('toString() should return a string', () => {
      expect(myPokerHand.toString()).toEqual('KS KH QC AH AD');
    });

    it('getScore() should return the score', () => {
      expect(myPokerHand.getScore()).toEqual(2468);
    });

    it('getRank() should return the rank', () => {
      expect(myPokerHand.getRank()).toEqual('TWO_PAIRS');
    });
  });

  describe('update method', () => {
    it('Should update hand, score and rank', () => {
      const hand = new PokerHand('KS KH QC AH AD');
      hand.update('AC KC QC JC TC');
      expect(hand.getRank()).toEqual('ROYAL_FLUSH');
      expect(hand.getScore()).toEqual(1);
    });

    it('Should throw on invalid hand', () => {
      const hand = new PokerHand('KS KH QC AH AD');
      expect(() => hand.update('INVALID')).toThrow();
      // Original state should be preserved after failed update
      expect(hand.getRank()).toEqual('TWO_PAIRS');
    });
  });

  describe('describe method encapsulation', () => {
    it('Should not allow mutation of internal state via describe()', () => {
      const hand = new PokerHand('KS KH QC AH AD');
      const desc = hand.describe();
      desc.hand[0] = 'FAKE';
      expect(hand.describe().hand[0]).toEqual('KS');
    });
  });

  describe('compareWith method', () => {
    describe('Errors', () => {
      it('Should throw if not a valid hand to compare with', () => {
        expect(() => {
          myPokerHand.compareWith('foo' as unknown as PokerHand);
        }).toThrow();
      });
    });

    it('Should return Win (1) when this hand is better', () => {
      expect(myPokerHand.compareWith(hisPokerHand)).toEqual(1);
    });

    it('Should return Loss (2) when the other hand is better', () => {
      expect(hisPokerHand.compareWith(myPokerHand)).toEqual(2);
    });

    it('Should return Tie (3) when both hands are equal', () => {
      const hand1 = new PokerHand('KS KH QC AH AD');
      const hand2 = new PokerHand('KD KC QS AC AH');
      expect(hand1.compareWith(hand2)).toEqual(3);
    });
  });
});
