import { describe, expect, it } from 'vitest';
import { parseHand } from './validate';

describe('parseHand', () => {
  describe('Errors', () => {
    it('Should throw "Hand must be defined" if nothing passed', () => {
      expect(() => {
        parseHand(undefined);
      }).toThrow(/^Hand must be defined$/);
    });

    it('Should throw "Hand must be defined" if empty (\'\') is passed', () => {
      expect(() => {
        parseHand('');
      }).toThrow(/^Hand must be defined$/);
    });

    it('Should throw "Hand must be a String" if an integer is passed', () => {
      expect(() => {
        parseHand(2);
      }).toThrow(/^Hand must be a String$/);
    });

    it('Should throw "Incorrect hand" if a string with a length !== 14 is passed', () => {
      expect(() => {
        parseHand('KS 2H 5C JD');
      }).toThrow(/^Incorrect hand$/);
    });

    it('Should throw "Incorrect hand" if we can\'t find 5 cards', () => {
      expect(() => {
        parseHand('KSD 2HD D5C JD');
      }).toThrow(/^Incorrect hand$/);
    });

    it('Should throw "Hand has duplicates" if there are duplicates', () => {
      expect(() => {
        parseHand('KS 2H 5C JD JD');
      }).toThrow(/^Hand has duplicates$/);
    });

    it('Should throw "Incorrect hand" if there are impossible cards', () => {
      expect(() => {
        parseHand('KS 2H 5C ZK WS');
      }).toThrow(/^Incorrect hand$/);
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
