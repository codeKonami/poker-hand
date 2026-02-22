import { ranks, suits } from '../tables';
import type { Rank, Suit } from '../types';

/**
 * Convert a two-character card string (e.g. "KS") into a 32-bit integer
 * representation used by the Cactus Kev algorithm.
 */
export function cardToInt(card: string): number {
  const [order, prime] = ranks.get(card[0] as Rank)!;
  const suit = suits.get(card[1] as Suit)!;
  return prime | (order << 8) | suit | (1 << (16 + order));
}
