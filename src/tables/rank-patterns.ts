/**
 * The ten straights as 13-bit rank patterns (bit 0 is the deuce, bit 12 the ace),
 * from the best (ace high) to the worst (the wheel, 5-4-3-2-A).
 */
const STRAIGHTS = [0x1f00, 0x0f80, 0x07c0, 0x03e0, 0x01f0, 0x00f8, 0x007c, 0x003e, 0x001f, 0x100f];

function bitCount(n: number): number {
  let count = 0;
  for (; n; n &= n - 1) {
    count++;
  }
  return count;
}

/**
 * A table indexed by the 13-bit pattern of five distinct ranks, from 0 to
 * A-K-Q-J-T (0x1f00). Indexes that are not such a pattern hold 0.
 *
 * The straights score `straightScore` (ace high) to `straightScore + 9` (the wheel).
 * The other 1,277 patterns score from `otherScore` (A-K-Q-J-9) to
 * `otherScore + 1276` (7-5-4-3-2): between two of them, the larger pattern is the
 * stronger hand, since comparing them as numbers compares the highest rank first.
 */
export function rankPatternTable(straightScore: number, otherScore: number): number[] {
  const table: number[] = [];
  for (let pattern = 0; pattern <= 0x1f00; pattern++) {
    table.push(0);
  }
  for (let i = 0; i < STRAIGHTS.length; i++) {
    table[STRAIGHTS[i]] = straightScore + i;
  }
  let score = otherScore;
  for (let pattern = 0x1f00; pattern > 0; pattern--) {
    if (table[pattern] === 0 && bitCount(pattern) === 5) {
      table[pattern] = score++;
    }
  }
  return table;
}
