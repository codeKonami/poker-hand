import { describe, expect, it } from 'vitest';
import { PokerHand } from './poker-hand';

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

describe('Constructor', () => {
  describe('Errors', () => {
    it('Should throw "Incorrect hand" if not a valid hand passed', () => {
      expect(() => {
        new PokerHand('KS 2H 5C ZD WD');
      }).toThrow(/^Incorrect hand$/);
    });
  });

  describe('Instance properties', () => {
    it('exposes hand, score and rank', () => {
      const hand = new PokerHand('ks kh qc ah ad');
      expect(hand.hand).toEqual(['KS', 'KH', 'QC', 'AH', 'AD']);
      expect(hand.score).toBe(2468);
      expect(hand.rank).toBe('TWO_PAIRS');
    });

    it('has exactly hand, score and rank as own keys, so it serializes like 1.0.1', () => {
      const hand = new PokerHand('AC KC QC JC TC');
      expect(Object.keys(hand)).toEqual(['hand', 'score', 'rank']);
      expect(JSON.stringify(hand)).toBe(
        '{"hand":["AC","KC","QC","JC","TC"],"score":1,"rank":"ROYAL_FLUSH"}',
      );
    });

    it('reflects the new hand after update()', () => {
      const hand = new PokerHand('KS KH QC AH AD');
      hand.update('AC KC QC JC TC');
      expect(hand.hand).toEqual(['AC', 'KC', 'QC', 'JC', 'TC']);
      expect(hand.score).toBe(1);
      expect(hand.rank).toBe('ROYAL_FLUSH');
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

    it('Should throw "Incorrect hand" on invalid hand', () => {
      const hand = new PokerHand('KS KH QC AH AD');
      expect(() => hand.update('INVALID')).toThrow(/^Incorrect hand$/);
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
      it('Should throw "Incorrect hand to compare with" if not a PokerHand', () => {
        expect(() => {
          myPokerHand.compareWith('foo' as unknown as PokerHand);
        }).toThrow(/^Incorrect hand to compare with$/);
      });

      it('Should throw "Incorrect hand" when the other PokerHand has no comparable score', () => {
        const scoreless: PokerHand = Object.create(PokerHand.prototype);
        expect(() => myPokerHand.compareWith(scoreless)).toThrow(/^Incorrect hand$/);
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
