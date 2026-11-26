/**
 * The ten straights as 13-bit rank patterns (bit 0 is the deuce, bit 12 the ace),
 * from the best (ace high) to the worst (the wheel, 5-4-3-2-A).
 */
const STRAIGHTS = [0x1f00, 0x0f80, 0x07c0, 0x03e0, 0x01f0, 0x00f8, 0x007c, 0x003e, 0x001f, 0x100f];

/**
 * A table indexed by the 13-bit pattern of five distinct ranks, from 0 to
 * A-K-Q-J-T (0x1f00). Indexes that are not such a pattern hold 0.
 *
 * The straights score `straightScore` (ace high) to `straightScore + 9` (the wheel).
 * The other 1,277 patterns score `otherScore` (A-K-Q-J-9) to `otherScore + 1276` (7-5-4-3-2).
 */
export function rankPatternTable(straightScore: number, otherScore: number): number[] {
  const table: number[] = [];
  for (let pattern = 0; pattern <= 0x1f00; pattern++) {
    table.push(0);
  }
  for (let i = 0; i < STRAIGHTS.length; i++) {
    table[STRAIGHTS[i]] = straightScore + i;
  }

  // Ranks are enumerated from the ace (12) down, the highest one first, so the
  // patterns come from the best hand to the worst.
  let score = otherScore;
  for (let a = 12; a >= 4; a--)
    for (let b = a - 1; b >= 3; b--)
      for (let c = b - 1; c >= 2; c--)
        for (let d = c - 1; d >= 1; d--)
          for (let e = d - 1; e >= 0; e--) {
            const pattern = (1 << a) | (1 << b) | (1 << c) | (1 << d) | (1 << e);
            if (table[pattern] === 0) table[pattern] = score++;
          }
  return table;
}
