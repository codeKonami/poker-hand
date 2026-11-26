// CommonJS entry. A single default export, which tsdown turns into `module.exports = PokerHand`
// (and `export = PokerHand` in index.d.cts): `require()` returns the class, as in 1.0.1.
// The named exports are static properties of the class, set in ./poker-hand.
import { PokerHand } from './poker-hand';

export default PokerHand;
