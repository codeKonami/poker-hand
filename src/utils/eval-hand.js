const { suits, ranks, products, flushes, unique5, values } = require('../arrays');

const cardInt = (card) => {
  const [order, prime] = ranks.get(card[0]);
  const suit = suits.get(card[1]);
  return prime | (order << 8) | suit | (1 << (16 + order));
}

const findIt = (key) => {
    let low = 0;
    let high = 4887;
    let mid;

    while (low <= high) {
      // Divide by two
      mid = (high+low) >> 1;
      if (key < products[mid]) {
          high = mid - 1;
      } else if (key > products[mid]) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    throw new Error('Impossible hand');
};

/**
 * Credit to Cactus Kev's algorithm
 * http://suffe.cool/poker/code/pokerlib.c
 */
module.exports = (hand) => {
  const cards = hand.map(cardInt);
  const q =
    (cards[0] | cards[1] | cards[2] | cards[3] | cards[4]) >> 16;

  // Check for flushes and straight flushes
  if (cards[0] & cards[1] & cards[2] & cards[3] & cards[4] & 0xF000) {
    // TODO: If flushes[q] === 0 it means the hand is not correct
    // We could throw an error here
    return flushes[q];
  }

  // Check for straights and high card hands
  const s = unique5[q];
  if (s) {
    return s;
  }

  // let's do it the hard way
  const l =
    (cards[0] & 0xFF) *
    (cards[1] & 0xFF) *
    (cards[2] & 0xFF) *
    (cards[3] & 0xFF) *
    (cards[4] & 0xFF);
  const m = findIt(l);
  return values[m];
};
