const evalHand = require('./eval-hand');

describe('Rank scoring examples', () => {
  it('Clubs Royal Flush should return 1', () => {
    expect(evalHand(['AC', 'KC', 'QC', 'JC', 'TC'])).toBe(1);
  });

  it('Heart Royal Flush should return 1', () => {
    expect(evalHand(['AH', 'KH', 'QH', 'JH', 'TH'])).toBe(1);
  });

  it('King Straight Flush should return 2', () => {
    expect(evalHand(['9H', 'KH', 'QH', 'JH', 'TH'])).toBe(2);
  });
  
});
