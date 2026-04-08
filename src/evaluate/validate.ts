import { ranks, suits } from '../tables';
import type { Rank, Suit } from '../types';

/**
 * Check whether a two-character string is a valid card.
 */
function isValidCard(card: unknown): boolean {
  if (!card || typeof card !== 'string' || card.length !== 2) {
    return false;
  }
  if (ranks.get(card[0].toUpperCase() as Rank) === undefined) {
    return false;
  }
  if (suits.get(card[1].toUpperCase() as Suit) === undefined) {
    return false;
  }
  return true;
}

/**
 * Validate and parse a hand string into an array of five uppercase card strings.
 * Throws on any invalid input.
 */
export function parseHand(hand: unknown): string[] {
  if (!hand) {
    throw new Error('Hand must be defined');
  }

  if (typeof hand !== 'string') {
    throw new Error('Hand must be a String');
  }

  if (hand.trim().length !== 14) {
    throw new Error('Incorrect hand: expected 14 characters (5 cards separated by spaces)');
  }

  const handAsArray = hand.toUpperCase().trim().split(' ');

  if (handAsArray.length !== 5) {
    throw new Error('Incorrect hand: expected exactly 5 cards');
  }

  if (new Set(handAsArray).size !== 5) {
    throw new Error('Hand has duplicates');
  }

  if (handAsArray.filter(isValidCard).length !== 5) {
    throw new Error('Incorrect hand: one or more cards are invalid');
  }

  return handAsArray;
}
