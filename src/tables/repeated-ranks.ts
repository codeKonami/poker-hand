/** The prime of each rank, from the deuce (index 0) to the ace (index 12), as in ranks.ts. */
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

/**
 * A class key packs the prime product of a hand class and its score into one number,
 * `product * SCORE_RANGE + score`, so that sorting keys sorts classes by product.
 * Keys are exact: products are below 2^27 and scores below 2^13, so keys stay below 2^40.
 */
const SCORE_RANGE = 8192;

/**
 * The 4,888 hand classes with a repeated rank (four of a kind, full house,
 * three of a kind, two pairs, one pair), as class keys sorted by product.
 */
function sortedClassKeys(): number[] {
  const p = PRIMES;
  const keys: number[] = [];
  let score = 0;
  const add = (product: number) => {
    keys.push(product * SCORE_RANGE + score++);
  };

  // Within each category, classes come from the best to the worst: ranks are
  // enumerated from the ace (12) down, the most significant one first.
  score = 11; // Four of a kind: 11 to 166 (the quad rank, then the kicker).
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--) if (b !== a) add(p[a] * p[a] * p[a] * p[a] * p[b]);
  // Full house: 167 to 322 (the trips rank, then the pair rank).
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--) if (b !== a) add(p[a] * p[a] * p[a] * p[b] * p[b]);
  // Flushes and straights score 323 to 1609: see rank-patterns.ts.
  score = 1610; // Three of a kind: 1610 to 2467 (the trips rank, then two kickers).
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--)
      for (let c = b - 1; c >= 0; c--)
        if (b !== a && c !== a) add(p[a] * p[a] * p[a] * p[b] * p[c]);
  // Two pairs: 2468 to 3325 (the high pair, the low pair, then the kicker).
  for (let a = 12; a >= 0; a--)
    for (let b = a - 1; b >= 0; b--)
      for (let c = 12; c >= 0; c--) if (c !== a && c !== b) add(p[a] * p[a] * p[b] * p[b] * p[c]);
  // One pair: 3326 to 6185 (the pair rank, then three kickers).
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--)
      for (let c = b - 1; c >= 0; c--)
        for (let d = c - 1; d >= 0; d--)
          if (b !== a && c !== a && d !== a) add(p[a] * p[a] * p[b] * p[c] * p[d]);

  keys.sort((x, y) => x - y);
  return keys;
}

/** The hand classes with a repeated rank, sorted by product. */
export const classKeys: readonly number[] = /* @__PURE__ */ sortedClassKeys();

export function productOf(key: number): number {
  return Math.floor(key / SCORE_RANGE);
}

export function scoreOf(key: number): number {
  return key % SCORE_RANGE;
}
