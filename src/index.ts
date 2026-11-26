// ES module entry: the named exports, plus the class as default export, which is what
// `import PokerHand from 'poker-hand-evaluator'` got from 1.0.1's CommonJS entry.
import { PokerHand } from './poker-hand';

export type { Card, Rank, Suit } from './types';
export { CompareResult, HandRank } from './types';
export { PokerHand };
export default PokerHand;
