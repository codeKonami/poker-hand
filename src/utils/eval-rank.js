/**
 * evalRank
 *
 * @return {string}  return the rank of the hand (PAIR, FULLHOUSE, etc...)
 */
module.exports = (score) => {
  if (score > 6185) return 'HIGH_CARD';        // 1277 high card
  if (score > 3325) return 'ONE_PAIR';         // 2860 one pair
  if (score > 2467) return 'TWO_PAIRS';        // 858 two pair
  if (score > 1609) return 'THREE_OF_A_KIND';  // 858 three-kind
  if (score > 1599) return 'STRAIGHT';         // 10 straights
  if (score > 322)  return 'FLUSH';            // 1277 flushes
  if (score > 166)  return 'FULL_HOUSE';       // 156 full house
  if (score > 10)   return 'FOUR_OF_A_KIND';   // 156 four-kind
  if (score > 1) return 'STRAIGHT_FLUSH';      // 9 straight-flushes
  return 'ROYAL_FLUSH';                        // 1 royal-flushes
};
