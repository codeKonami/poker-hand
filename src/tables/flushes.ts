import { rankPatternTable } from './rank-patterns';

/**
 * Table lookup for all "flush" hands (both flushes and straight-flushes),
 * indexed by the 13-bit pattern of the five ranks.
 * Entries containing a zero mean that combination is not possible with
 * a five-card flush hand.
 *
 * Generated at import: straight flushes score 1 to 10, the other flushes 323 to 1599.
 */
export const flushes: readonly number[] = /* @__PURE__ */ rankPatternTable(1, 323);
