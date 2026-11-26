import { classKeys, productOf } from './repeated-ranks';

/**
 * Prime products of the 4,888 hand classes with a repeated rank, in increasing
 * order, for the binary search in evaluateHand: `values[i]` is the score of `products[i]`.
 *
 * Generated at import.
 */
export const products: readonly number[] = /* @__PURE__ */ classKeys.map(productOf);
