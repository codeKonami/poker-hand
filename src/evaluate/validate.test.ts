import { describe, it, expect } from 'vitest';
import { parseHand } from './validate';

describe('parseHand', () => {
  describe('Errors', () => {
    it('Should throw if nothing passed', () => {
      expect(() => {
        parseHand(undefined);
      }).toThrow();
    });

    it("Should throw if empty ('') is passed", () => {
      expect(() => {
        parseHand('');
      }).toThrow();
    });

    it('Should throw if an integer is passed', () => {
      expect(() => {
        parseHand(2);
      }).toThrow();
    });

    it('Should throw if a string with a length !== 14 is passed', () => {
      expect(() => {
        parseHand('KS 2H 5C JD');
      }).toThrow();
    });

    it("Should throw if we can't find 5 cards", () => {
      expect(() => {
        parseHand('KSD 2HD D5C JD');
      }).toThrow();
    });

    it('Should throw if there are duplicates', () => {
      expect(() => {
        parseHand('KS 2H 5C JD JD');
      }).toThrow();
    });

    it('Should throw if there are impossible cards', () => {
      expect(() => {
        parseHand('KS 2H 5C ZK WS');
      }).toThrow();
    });
  });

  describe('Valid Hands', () => {
    it('Should return an array of cards', () => {
      expect(parseHand('KS 2H 5C KD AS')).toEqual(['KS', '2H', '5C', 'KD', 'AS']);
    });

    it('Should return an array of cards in UpperCase', () => {
      expect(parseHand('JH QD 8S 5c 6d')).toEqual(['JH', 'QD', '8S', '5C', '6D']);
    });
  });
});
