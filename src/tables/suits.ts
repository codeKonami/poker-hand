import type { Suit } from '../types';

/**
 * A Map of each suit: C = Clubs, D = Diamond, H = Heart, S = Spades
 */
export const suits = new Map<Suit, number>([
  ['C', 0x8000],
  ['D', 0x4000],
  ['H', 0x2000],
  ['S', 0x1000],
]);
