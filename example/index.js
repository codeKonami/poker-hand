const PokerHand = require('../');

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

console.log(myPokerHand.describe());
console.log(hisPokerHand.describe());

console.log(myPokerHand.getRank());
console.log(hisPokerHand.getRank());

console.log(myPokerHand.getScore());
console.log(hisPokerHand.getScore());

console.log(myPokerHand.toString());
console.log(hisPokerHand.toString());

console.log(myPokerHand.compareWith(hisPokerHand));
