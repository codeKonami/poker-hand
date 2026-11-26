import { expect, it } from 'vitest';
import { pokerHandClass, reference, target } from './consumer';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['C', 'D', 'H', 'S'];
const DECK = RANKS.flatMap((rank) => SUITS.map((suit) => rank + suit));

function* everyFiveCardHand() {
  for (let a = 0; a < 52; a++)
    for (let b = a + 1; b < 52; b++)
      for (let c = b + 1; c < 52; c++)
        for (let d = c + 1; d < 52; d++)
          for (let e = d + 1; e < 52; e++)
            yield `${DECK[a]} ${DECK[b]} ${DECK[c]} ${DECK[d]} ${DECK[e]}`;
}

it(
  'scores and ranks all 2,598,960 five-card hands exactly like 1.0.1',
  { timeout: 300_000 },
  () => {
    const Reference = pokerHandClass(reference);
    const Target = pokerHandClass(target);
    let count = 0;
    const mismatches: string[] = [];

    for (const hand of everyFiveCardHand()) {
      count++;
      const expected = new Reference(hand);
      const actual = new Target(hand);
      if (actual.getScore() !== expected.getScore() || actual.getRank() !== expected.getRank()) {
        mismatches.push(
          `${hand}: ${actual.getScore()} ${actual.getRank()}, expected ${expected.getScore()} ${expected.getRank()}`,
        );
        if (mismatches.length === 20) break;
      }
    }

    expect(mismatches).toEqual([]);
    expect(count).toBe(2_598_960);
  },
);
