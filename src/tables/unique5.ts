import { rankPatternTable } from './rank-patterns';

/**
 * Table lookup for all non-flush hands consisting of five unique ranks
 * (i.e. either Straights or High Card hands), indexed by the 13-bit pattern
 * of the five ranks.
 *
 * Generated at import: straights score 1600 to 1609, high cards 6186 to 7462.
 */
export const unique5: readonly number[] = /* @__PURE__ */ rankPatternTable(1600, 6186);
