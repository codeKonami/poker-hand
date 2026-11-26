// Deprecated deep path of 1.0.1, served by every 1.x and removed in 2.0.0 (#16, #29).
// Cards are read with 1.0.1's own cardInt, below, so that any input gives what it gave in 1.0.1:
// an unknown suit counts as no suit, and an unknown rank throws the engine's TypeError. Then
// today's evaluator scores them, with the tables it reads itself. PokerHand checks its cards
// before it scores them, so only this path ever sees such cards.
const deepPaths = require('../../dist/deep-paths.cjs');

const ranks = deepPaths.ranks;
const suits = deepPaths.suits;

const cardInt = (card) => {
  const [order, prime] = ranks.get(card[0]);
  const suit = suits.get(card[1]);
  return prime | (order << 8) | suit | (1 << (16 + order));
};

module.exports = (hand) => deepPaths.evaluateCards(hand.map(cardInt));
