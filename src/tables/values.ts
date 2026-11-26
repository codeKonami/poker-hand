import { classKeys, scoreOf } from './repeated-ranks';

/**
 * Scores of the 4,888 hand classes with a repeated rank: `values[i]` is the score
 * of the hands whose prime product is `products[i]`.
 *
 * Generated at import.
 */
export const values: readonly number[] = /* @__PURE__ */ classKeys.map(scoreOf);
