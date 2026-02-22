import type { Rank } from '../types';

/**
 * A Map containing the card rank letter to retrieve its order plus its
 * prime number associated.
 * Example: "9" returns [7, 19] where 7 is the order and 19 is the prime.
 */
export const ranks = new Map<Rank, [order: number, prime: number]>([
  ['2', [0, 2]],
  ['3', [1, 3]],
  ['4', [2, 5]],
  ['5', [3, 7]],
  ['6', [4, 11]],
  ['7', [5, 13]],
  ['8', [6, 17]],
  ['9', [7, 19]],
  ['T', [8, 23]],
  ['J', [9, 29]],
  ['Q', [10, 31]],
  ['K', [11, 37]],
  ['A', [12, 41]],
]);
