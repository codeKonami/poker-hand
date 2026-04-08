import { describe, it, expect } from 'vitest';
import { cardToInt } from './card';

describe('cardToInt', () => {
  it('should encode the prime number in the lowest 8 bits', () => {
    expect(cardToInt('AS') & 0xff).toBe(41); // Ace prime = 41
    expect(cardToInt('KH') & 0xff).toBe(37); // King prime = 37
    expect(cardToInt('2C') & 0xff).toBe(2);  // Two prime = 2
  });

  it('should encode the rank order in bits 8-11', () => {
    expect((cardToInt('2C') >> 8) & 0xf).toBe(0);  // Two = order 0
    expect((cardToInt('AC') >> 8) & 0xf).toBe(12);  // Ace = order 12
    expect((cardToInt('TD') >> 8) & 0xf).toBe(8);   // Ten = order 8
  });

  it('should encode the suit in bits 12-15', () => {
    expect(cardToInt('AC') & 0xf000).toBe(0x8000); // Clubs
    expect(cardToInt('AD') & 0xf000).toBe(0x4000); // Diamonds
    expect(cardToInt('AH') & 0xf000).toBe(0x2000); // Hearts
    expect(cardToInt('AS') & 0xf000).toBe(0x1000); // Spades
  });

  it('should set the rank bit in the upper 16 bits', () => {
    expect(cardToInt('2C') & (1 << 16)).not.toBe(0); // bit 16 for rank 0
    expect(cardToInt('AC') & (1 << 28)).not.toBe(0); // bit 28 for rank 12
  });

  it('should produce different integers for different suits of the same rank', () => {
    const ac = cardToInt('AC');
    const ad = cardToInt('AD');
    const ah = cardToInt('AH');
    const as = cardToInt('AS');
    expect(new Set([ac, ad, ah, as]).size).toBe(4);
  });

  it('should throw for an invalid rank', () => {
    expect(() => cardToInt('ZS')).toThrow('Invalid card rank');
  });

  it('should throw for an invalid suit', () => {
    expect(() => cardToInt('AX')).toThrow('Invalid card suit');
  });
});
