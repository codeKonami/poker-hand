import { HandRank } from '../types';

/**
 * Map a numeric hand score to its HandRank.
 */
export function scoreToRank(score: number): HandRank {
  if (score > 6185) return HandRank.HighCard;
  if (score > 3325) return HandRank.OnePair;
  if (score > 2467) return HandRank.TwoPairs;
  if (score > 1609) return HandRank.ThreeOfAKind;
  if (score > 1599) return HandRank.Straight;
  if (score > 322) return HandRank.Flush;
  if (score > 166) return HandRank.FullHouse;
  if (score > 10) return HandRank.FourOfAKind;
  if (score > 1) return HandRank.StraightFlush;
  return HandRank.RoyalFlush;
}
