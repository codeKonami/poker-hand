const isValidCard = require('./is-valid-card');

/**
 * sanitize - verify the hand string passed is correct
 * otherwise it throws an error
 *
 * @param  {string} hand string representing a five cards hand
 * @return {array}      return an array with 5 cars in UpperCase
 */
module.exports = (hand) => {
  if (!hand) {
    throw new Error('Hand must be defined');
  }

  if (typeof(hand) !== 'string') {
    throw new Error('Hand must be a String');
  }

  if (hand.trim().length !== 14) {
    throw new Error('Incorrect hand');
  }

  const handAsArray = hand.toUpperCase().trim().split(' ');

  if (handAsArray.length !== 5) {
    throw new Error('Incorrect hand');
  }

  // Check if duplicates
  if (new Set(handAsArray).size !== 5) {
    throw new Error('Hand has duplicates')
  }

  // Check if each card exists
  if (handAsArray.filter(isValidCard).length !== 5) {
    throw new Error('Incorrect hand');
  }

  return handAsArray;
};
