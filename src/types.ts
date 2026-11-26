// Objects `as const`, each with a union of its values under the same name (#30): the member
// names read as an enum's would (HandRank.Flush), and a literal fits too (`const r: HandRank =
// 'FLUSH'`). Unlike an enum, the syntax is erasable, and CompareResult has no reverse mapping.

export const HandRank = {
  RoyalFlush: 'ROYAL_FLUSH',
  StraightFlush: 'STRAIGHT_FLUSH',
  FourOfAKind: 'FOUR_OF_A_KIND',
  FullHouse: 'FULL_HOUSE',
  Flush: 'FLUSH',
  Straight: 'STRAIGHT',
  ThreeOfAKind: 'THREE_OF_A_KIND',
  TwoPairs: 'TWO_PAIRS',
  OnePair: 'ONE_PAIR',
  HighCard: 'HIGH_CARD',
} as const;
export type HandRank = (typeof HandRank)[keyof typeof HandRank];

export const CompareResult = {
  Win: 1,
  Loss: 2,
  Tie: 3,
} as const;
export type CompareResult = (typeof CompareResult)[keyof typeof CompareResult];

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;
