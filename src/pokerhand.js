const sanitize = require('./utils/sanitize');
const evalHand = require('./utils/eval-hand');
const evalRank = require('./utils/eval-rank');

/**
 * Represents a Poker Hand.
 * @constructor
 * @param {string} hand - The poker hand in string format.
 */
class PokerHand {

  constructor(hand) {
    // Verify the hand passed is clean
    this.hand = sanitize(hand);

    // Evaluate the hand score
    this.score = evalHand(this.hand);

    // Get the hand rank
    this.rank = evalRank(this.score);
  }

  /**
   * describe
   *
   * @return {object}  return the detail the hand in an object
   */
  describe() {
    return {
      hand: this.hand,
      score: this.score,
      rank: this.rank,
    };
  }

  /**
   * toString
   *
   * @return {string}  return the cards as string with a space seperator
   */
  toString() {
    return this.hand.join(' ');
  }

  /**
   * getScore
   *
   * @return {int}  return the Cactus Kev's score
   *                of the hand (the less the better)
   */
  getScore() {
    return this.score;
  }

  /**
   * getRank
   *
   * @return {string}  return the rank of the hand
   */
  getRank() {
    return this.rank;
  }


  /**
   * update - update the hand
   *
   * @param  {string} hand The poker hand in string format.
   * @return {void}
   */
  update(hand) {
    this.hand = sanitize(hand);
    this.score = evalHand(this.hand);
    this.rank = evalRank(this.score);
  }

  /**
   * compareWith
   *
   * @param  {Hand} hand a hand instace
   * @return {integer}      return result for this
   *                        instance {0: Win, 1: Fail, 2: Draw}
   */
  compareWith(hand) {
    if (hand instanceof PokerHand === false) {
      throw new Error('Incorrect hand to compare with');
    }

    // Instance hand is better than the one we compare to
    // It's a win
    if (this.score < hand.getScore()) {
      return 1;
    }

    // It's a loss
    if (this.score > hand.getScore()) {
      return 2;
    }

    // It's a tie
    if (this.score === hand.getScore()) {
      return 3;
    }

    // Something wrong but unknown with the hand
    throw new Error('Incorrect hand');
  }
}

module.exports = PokerHand;
