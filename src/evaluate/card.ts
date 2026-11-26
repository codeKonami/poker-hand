import { ranks, suits } from '../tables';
import type { Rank, Suit } from '../types';

/**
 * Convert a two-character card string (e.g. "KS") into a 32-bit integer
 * representation used by the Cactus Kev algorithm.
 *
 * Throws a TypeError on a string that is not a card. PokerHand checks its cards first, so only
 * the deprecated src/utils/eval-hand path can get there, and 1.0.1 threw a TypeError too (#16).
 */
export function cardToInt(card: string): number {
  const rankEntry = ranks.get(card[0] as Rank);
  if (!rankEntry) {
    throw new TypeError(`Invalid card rank: "${card[0]}"`);
  }
  const suit = suits.get(card[1] as Suit);
  if (suit === undefined) {
    throw new TypeError(`Invalid card suit: "${card[1]}"`);
  }
  const [order, prime] = rankEntry;
  return prime | (order << 8) | suit | (1 << (16 + order));
}
