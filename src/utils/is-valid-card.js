// Deprecated deep path of 1.0.1, served by every 1.x and removed in 2.0.0 (#16, #29).
// An anonymous function, as in 1.0.1, over today's isValidCard.
const deepPaths = require('../../dist/deep-paths.cjs');

module.exports = (card) => deepPaths.isValidCard(card);
