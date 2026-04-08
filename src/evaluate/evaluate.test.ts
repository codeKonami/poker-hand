import { describe, expect, it } from 'vitest';
import { evaluateHand } from './evaluate';

describe('Rank scoring examples', () => {
  it('Clubs Royal Flush should return 1', () => {
    expect(evaluateHand(['AC', 'KC', 'QC', 'JC', 'TC'])).toBe(1);
  });

  it('Heart Royal Flush should return 1', () => {
    expect(evaluateHand(['AH', 'KH', 'QH', 'JH', 'TH'])).toBe(1);
  });

  it('King Straight Flush should return 2', () => {
    expect(evaluateHand(['9H', 'KH', 'QH', 'JH', 'TH'])).toBe(2);
  });
});
