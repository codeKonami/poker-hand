/**
 * A Map <k,v> containing the card rank letter an retrieve his order plus his
 * prime number associated
 * Example "9" returns is the array [7, 19]
 * 7 is the order
 * 19 his prime number
 */

module.exports = new Map([
  ['2', [0, 2]],
  ['3', [1, 3]],
  ['4', [2, 5]],
  ['5', [3, 7]],
  ['6', [4, 11]],
  ['7', [5, 13]],
  ['8', [6, 17]],
  ['9', [7, 19]],
  ['T', [8, 23]],
  ['J', [9, 29]],
  ['Q', [10, 31]],
  ['K', [11, 37]],
  ['A', [12, 41]],
]);
