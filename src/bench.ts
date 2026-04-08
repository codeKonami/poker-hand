import { performance } from 'node:perf_hooks';
import { evaluateHand } from './evaluate/evaluate';

console.log('Evaluating all the possible combinations...');

const cardOrder = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const suitList = ['S', 'H', 'D', 'C'];
const totalCards = cardOrder.length * suitList.length;

const deck = [...Array(totalCards)].map(
  (_, i) => cardOrder[i % cardOrder.length] + suitList[i % suitList.length],
);

const totalCombinations = 2598960;

const start = performance.now();
const tenCombinations: string[][] = [];

for (let i = 0; i < 52; i++) {
  for (let j = i; j < 52; j++) {
    for (let k = j; k < 52; k++) {
      for (let l = k; l < 52; l++) {
        for (let m = l; m < 52; m++) {
          if (new Set([i, j, k, l, m]).size !== 5) {
            continue;
          }
          evaluateHand([deck[i], deck[j], deck[k], deck[l], deck[m]]);

          if (tenCombinations.length < 10 && Math.random() > 0.999991) {
            tenCombinations.push([deck[i], deck[j], deck[k], deck[l], deck[m]]);
          }
        }
      }
    }
  }
}

const end = Math.round(((performance.now() - start) / 1000 + 0.0001) * 100) / 100;

console.log(`Took ${end}s to evaluate the ${totalCombinations} combinations\n`);
console.log('Here some random combinations\n');

const result = tenCombinations
  .reduce<string[][][]>((acc, curr, i) => {
    if (i % 2 === 0) {
      acc.push([curr]);
    } else {
      acc[acc.length - 1].push(curr);
    }
    return acc;
  }, [])
  .map((x) => {
    const leftHand = evaluateHand(x[0]);
    const rightHand = evaluateHand(x[1]);

    if (leftHand < rightHand) {
      return `${x[0].join(' ')} -- beats -- ${x[1].join(' ')}`;
    }
    if (leftHand > rightHand) {
      return `${x[1].join(' ')} -- beats -- ${x[0].join(' ')}`;
    }
    return `${x[0].join(' ')} -- ties -- ${x[1].join(' ')}`;
  })
  .join('\n');

console.log(result);
