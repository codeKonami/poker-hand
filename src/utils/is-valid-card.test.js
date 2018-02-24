const isValidCard = require('./is-valid-card');

describe('card validation', () => {
  describe('Errors', () => {
    it('Should be false if nothing is passed', () => {
      expect(isValidCard()).toBe(false);
    });

    it('Should be false if \'\' is passed', () => {
      expect(isValidCard('')).toBe(false);
    });

    it('Should be false if integer is passed', () => {
      expect(isValidCard(2)).toBe(false);
    });

    it('Should be false if a string <> 2 length is passed', () => {
      expect(isValidCard('AZZ')).toBe(false);
    });
  });

  describe('Some examples', () => {

    it('Should be True for an uppercase combination', () => {
      expect(isValidCard('KH')).toBe(true);
    });

    it('Should be True for a lowercase combination', () => {
      expect(isValidCard('kh')).toBe(true);
    });

    it('Should be false for an impossible combination', () => {
      expect(isValidCard('zm')).toBe(false);
    });

  });
});
