const evalRank = require('./eval-rank');

describe('Ranking Hand examples', () => {

  it('1 should return ROYAL_FLUSH', () => {
    expect(evalRank(1)).toBe('ROYAL_FLUSH');
  });

  it('2 should return STRAIGHT_FLUSH', () => {
    expect(evalRank(2)).toBe('STRAIGHT_FLUSH');
  });

  it('170 should return FULL_HOUSE', () => {
    expect(evalRank(170)).toBe('FULL_HOUSE');
  });

  it('6185 should return HIGH_CARD', () => {
    expect(evalRank(6190)).toBe('HIGH_CARD');
  });

  it('3330 should return ONE_PAIR', () => {
    expect(evalRank(3330)).toBe('ONE_PAIR');
  });

  it('2470 should return TWO_PAIRS', () => {
    expect(evalRank(2470)).toBe('TWO_PAIRS');
  });

  it('1612 should return THREE_OF_A_KIND', () => {
    expect(evalRank(1612)).toBe('THREE_OF_A_KIND');
  });

  it('1600 should return STRAIGHT', () => {
    expect(evalRank(1600)).toBe('STRAIGHT');
  });

  it('323 should return FLUSH', () => {
    expect(evalRank(323)).toBe('FLUSH');
  });
  
});
