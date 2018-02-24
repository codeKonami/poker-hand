console.log('Evaluating all the possible combinations...');

const { performance } = require('perf_hooks');
const evalHand = require('../src/utils/eval-hand');

const cards = {
  cardOrder: ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'],
  suits: ['S', 'H', 'D', 'C'],
};

const totalCards = cards.cardOrder.length * cards.suits.length;

const deck =
  [...Array(totalCards)]
    .map((x, i) => {
      return cards.cardOrder[i % cards.cardOrder.length]
      + cards.suits[i % cards.suits.length];
    });

// This is known from the formula (52*51*50*49*48)/(5*4*3*2*1)
const totalCombinations = 2598960;

const start = performance.now();
const tenCombinations = [];
for (let i = 0; i < 52; i++) {
  for (let j = i; j < 52; j++) {
    for (let k = j; k < 52; k++) {
      for (let l = k; l < 52; l++) {
        for (let m = l; m < 52; m++) {
          if (new Set([i, j, k, l, m]).size !== 5) {
            continue;
          }
          evalHand([deck[i], deck[j], deck[k], deck[l], deck[m]]);

          // Get 10 combination randomly
          if (tenCombinations.length < 10 && Math.random() > .999991) {
            tenCombinations.push([
              deck[i], deck[j], deck[k], deck[l], deck[m]
            ]);
          }
        }
      }
    }
  }
}

const end = Math.round(
  (
    (((performance.now() - start) / 1000) + 0.0001) * 100)
  ) / 100;

console.log(`Took ${end}s to evaluate the ${totalCombinations} combinations\n`);
console.log('Here some random combinations\n');

const result =
  tenCombinations
    .reduce((acc, curr, i) => {
      if (i % 2 === 0) {
        acc.push([curr]);
      } else {
        acc[acc.length - 1].push(curr);
      }
      return acc;
    }, [])
    .map(x => {
      const leftHand = evalHand(x[0]);
      const rightHand = evalHand(x[1]);

      if (leftHand < rightHand) {
        return `${x[0].join(' ')} -- beats -- ${x[1].join(' ')}`;
      }

      if (leftHand > rightHand) {
        return `${x[1].join(' ')} -- beats -- ${x[0].join(' ')}`;
      }

      if (leftHand === rightHand) {
        return `${x[0].join(' ')} -- ties -- ${x[1].join(' ')}`;
      }

    })
    .join('\n');

console.log(result);
