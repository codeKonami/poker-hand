import { flushes, products, unique5, values } from '../tables';
import { cardToInt } from './card';

/**
 * Binary search for a product key in the products table.
 */
function findIt(key: number): number {
  let low = 0;
  let high = 4887;
  let mid: number;

  while (low <= high) {
    mid = (high + low) >> 1;
    if (key < products[mid]) {
      high = mid - 1;
    } else if (key > products[mid]) {
      low = mid + 1;
    } else {
      return mid;
    }
  }
  throw new Error('Impossible hand');
}

/**
 * Evaluate a five-card poker hand and return a numeric score.
 * Lower scores represent stronger hands.
 *
 * Credit to Cactus Kev's algorithm:
 * http://suffe.cool/poker/code/pokerlib.c
 */
export function evaluateHand(hand: readonly string[]): number {
  return evaluateCards(hand.map(cardToInt));
}

/**
 * The score of five cards in the representation of cardToInt. The deprecated
 * src/utils/eval-hand path converts its cards as 1.0.1 did, then calls this (#29).
 *
 * As in 1.0.1, a missing card reads as 0 (fewer than five cards throw "Impossible hand"),
 * and cards after the fifth are ignored.
 */
export function evaluateCards(cards: readonly number[]): number {
  const q = (cards[0] | cards[1] | cards[2] | cards[3] | cards[4]) >> 16;

  // Check for flushes and straight flushes
  if (cards[0] & cards[1] & cards[2] & cards[3] & cards[4] & 0xf000) {
    return flushes[q];
  }

  // Check for straights and high card hands
  const s = unique5[q];
  if (s) {
    return s;
  }

  // Do it the hard way — multiply primes and binary search
  const l =
    (cards[0] & 0xff) *
    (cards[1] & 0xff) *
    (cards[2] & 0xff) *
    (cards[3] & 0xff) *
    (cards[4] & 0xff);
  const m = findIt(l);
  return values[m];
}
