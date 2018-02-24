const { ranks, suits } = require('../arrays');

/**
 * Check is valid card
 * @param {string} card - A string containing two characters.
 * @return {bool} true if exists false instead
 */
module.exports = (card) => {

  // Check some errors
  if (!card || card === '' || typeof(card) !== 'string' || card.length !== 2) {
    return false;
  }

  // Check that the first letter is a card character
  if (ranks.get(card[0].toUpperCase()) === undefined) {
    return false;
  }

  // Check that the second letter is a suit character
  if (suits.get(card[1].toUpperCase()) === undefined) {
    return false;
  }

  return true;
};
