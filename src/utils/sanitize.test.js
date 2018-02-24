const sanitize = require('./sanitize');

describe('Sanitize', () => {
  describe('Errors', () => {

    it('Should throw if nothing passed', () => {
      expect(() => {
        sanitize();
      }).toThrow();
    });

    it('Should throw if empty (\'\') is passed', () => {
      expect(() => {
        sanitize('');
      }).toThrow();
    });

    it('Should throw if an integer is passed', () => {
      expect(() => {
        sanitize(2);
      }).toThrow();
    });

    it('Should throw if a string with a length !== 14 is passed', () => {
      expect(() => {
        sanitize('KS 2H 5C JD');
      }).toThrow();
    });

    it('Should throw if we can\'t find 5 cards', () => {
      expect(() => {
        sanitize('KSD 2HD D5C JD');
      }).toThrow();
    });

    it('Should throw if there are duplicates', () => {
      expect(() => {
        sanitize('KS 2H 5C JD JD');
      }).toThrow();
    });

    it('Should throw if there are impossible cards', () => {
      expect(() => {
        sanitize('KS 2H 5C ZK WS');
      }).toThrow();
    });

  });

  describe('Valid Hands', () => {

    it('Should return an array of cards', () => {
      expect(sanitize('KS 2H 5C KD AS'))
        .toEqual(['KS', '2H', '5C', 'KD', 'AS']);
    });

    it('Should return an array of cards in UpperCase', () => {
      expect(sanitize('JH QD 8S 5c 6d'))
        .toEqual(['JH', 'QD', '8S', '5C', '6D']);
    });

  });
});
