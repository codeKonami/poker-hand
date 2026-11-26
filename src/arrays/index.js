// Deprecated deep path of 1.0.1, served by every 1.x and removed in 2.0.0 (#16, #29).
// Written as in 1.0.1: `import` gets the same named exports, which Node finds by reading the code.
module.exports = {
  flushes: require('./flushes'),
  products: require('./products'),
  ranks: require('./ranks'),
  suits: require('./suits'),
  unique5: require('./unique5'),
  values: require('./values'),
};
