export enum HandRank {
  RoyalFlush = 'ROYAL_FLUSH',
  StraightFlush = 'STRAIGHT_FLUSH',
  FourOfAKind = 'FOUR_OF_A_KIND',
  FullHouse = 'FULL_HOUSE',
  Flush = 'FLUSH',
  Straight = 'STRAIGHT',
  ThreeOfAKind = 'THREE_OF_A_KIND',
  TwoPairs = 'TWO_PAIRS',
  OnePair = 'ONE_PAIR',
  HighCard = 'HIGH_CARD',
}

export enum CompareResult {
  Win = 1,
  Loss = 2,
  Tie = 3,
}

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;
