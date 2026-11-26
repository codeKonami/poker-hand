import { ranks, suits } from '../tables';
import type { Rank, Suit } from '../types';

/**
 * Convert a two-character card string (e.g. "KS") into a 32-bit integer
 * representation used by the Cactus Kev algorithm.
 */
export function cardToInt(card: string): number {
  const rankEntry = ranks.get(card[0] as Rank);
  if (!rankEntry) {
    throw new Error(`Invalid card rank: "${card[0]}"`);
  }
  const suit = suits.get(card[1] as Suit);
  if (suit === undefined) {
    throw new Error(`Invalid card suit: "${card[1]}"`);
  }
  const [order, prime] = rankEntry;
  return prime | (order << 8) | suit | (1 << (16 + order));
}
