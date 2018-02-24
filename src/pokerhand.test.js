const PokerHand = require('./pokerhand');

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

describe('Constructor', () => {
  describe('Errors', () => {

    it('Should throw if not a valid hand passed', () => {
      expect(() => {
        const pokerHand = new PokerHand('KS 2H 5C ZD WD');
      }).toThrow();
    });

  });

  describe('Test Methods', () => {

    it('describe() should return an object', () => {
      expect(myPokerHand.describe()).toEqual({
        hand: [ 'KS', 'KH', 'QC', 'AH', 'AD' ],
        score: 2468,
        rank: 'TWO_PAIRS'
      });
    });

    it('toString() should return a string', () => {
      expect(myPokerHand.toString()).toEqual('KS KH QC AH AD');
    });

    it('getScore() should return the score', () => {
      expect(myPokerHand.getScore()).toEqual(2468);
    });

    it('getRank() should return the score', () => {
      expect(myPokerHand.getRank()).toEqual('TWO_PAIRS');
    });

  });

  describe('compareWith method', () => {
    describe('Errors', () => {

      it('Should throw if not a valid hand to compare with', () => {
        expect(() => {
          myPokerHand.compareWith('foo');
        }).toThrow();
      });

    });

    describe('CompareWith example', () => {
      it('Should return 1 on this example', () => {
        expect(myPokerHand.compareWith(hisPokerHand)).toEqual(1);
      });
    });

  });
});
