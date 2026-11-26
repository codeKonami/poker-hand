# poker-hand-evaluator

Evaluate and compare five-card poker hands in JavaScript, with
[Cactus Kev's algorithm](http://suffe.cool/poker/evaluator.html).

Each hand gets a score from 1 (a royal flush) to 7462 (the weakest high card): the lower, the
better. Compare two hands to find out who wins, or whether it's a tie.

It runs on Node.js 6 and later, in bundlers and in the browser, and ships its TypeScript types.

## Install

```sh
npm install poker-hand-evaluator
```

## Usage

### CommonJS

```js
const PokerHand = require('poker-hand-evaluator');

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

console.log(myPokerHand.describe());
// {
//   hand: [ 'KS', 'KH', 'QC', 'AH', 'AD' ],
//   score: 2468,
//   rank: 'TWO_PAIRS'
// }

console.log(myPokerHand.getRank()); // TWO_PAIRS
console.log(myPokerHand.getScore()); // 2468
console.log(hisPokerHand.getScore()); // 2470
console.log(myPokerHand.toString()); // KS KH QC AH AD

// 1: my hand wins, 2: it loses, 3: it's a tie
console.log(myPokerHand.compareWith(hisPokerHand)); // 1
```

The named exports are also properties of the class:

```js
const { CompareResult, HandRank } = require('poker-hand-evaluator');
```

### ES modules

```js
import PokerHand, { CompareResult, HandRank } from 'poker-hand-evaluator';
// or: import { PokerHand } from 'poker-hand-evaluator';

const myPokerHand = new PokerHand('KS KH QC AH AD');
const hisPokerHand = new PokerHand('KD KC AS AH TD');

console.log(myPokerHand.getRank() === HandRank.TwoPairs); // true
console.log(myPokerHand.compareWith(hisPokerHand) === CompareResult.Win); // true
```

In a minified bundle that uses `PokerHand`, the package takes about 3.8 kB (1.7 kB gzipped).

### TypeScript

The types ship with the package.

```ts
import PokerHand, { CompareResult, HandRank } from 'poker-hand-evaluator';
import type { Card } from 'poker-hand-evaluator';

const myPokerHand = new PokerHand('KS KH QC AH AD');

const rank: HandRank = myPokerHand.getRank(); // 'TWO_PAIRS'
const flush: HandRank = 'FLUSH'; // a string literal is a HandRank too
const result: CompareResult = myPokerHand.compareWith(new PokerHand('KD KC AS AH TD')); // 1
const card: Card = 'KS';
```

`HandRank` and `CompareResult` are each a value, a plain object (`HandRank.Flush === 'FLUSH'`),
and a type, the union of that object's values. In a CommonJS project written with
`import … = require()`, the same names are members of the class:

```ts
import PokerHand = require('poker-hand-evaluator');

const rank: PokerHand.HandRank = new PokerHand('KS KH QC AH AD').getRank();
```

### Browser

`dist/pokerhand.min.js` is a UMD file. A `<script>` tag defines a global `PokerHand`, the class:

```html
<script src="https://unpkg.com/poker-hand-evaluator@1/dist/pokerhand.min.js"></script>
<!-- or https://cdn.jsdelivr.net/npm/poker-hand-evaluator@1/dist/pokerhand.min.js -->
<script>
  var myPokerHand = new PokerHand('KS KH QC AH AD');
  var hisPokerHand = new PokerHand('KD KC AS AH TD');
  console.log(myPokerHand.getRank()); // TWO_PAIRS
  console.log(myPokerHand.compareWith(hisPokerHand)); // 1
</script>
```

`@1` serves the latest 1.x. Pin an exact version, such as `@1.1.0`, to keep the file from changing.
The file is ES5 and weighs 5.6 kB (2.4 kB gzipped). It also loads with `require()` and as an AMD
module.

## API

### `new PokerHand(hand)`

`hand` is a string of five cards separated by single spaces, such as `'KS KH QC AH AD'`. A card is
a rank (`2` to `9`, `T`, `J`, `Q`, `K` or `A`) followed by a suit (`C`, `D`, `H` or `S`).
Lowercase works too, and spaces around the hand are ignored. An invalid hand throws an
[error](#errors).

### Methods and properties

| Member                  | Returns                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `describe()`            | `{ hand, score, rank }`, with a new copy of the `hand` array on each call                                |
| `toString()`            | the cards in uppercase, separated by spaces: `'KS KH QC AH AD'`                                          |
| `getScore()`            | the score, from `1` to `7462`: the lower, the better                                                     |
| `getRank()`             | the [rank](#ranks), such as `'TWO_PAIRS'`                                                                |
| `update(hand)`          | nothing. It replaces the cards, with the constructor's checks. After an error, the hand is unchanged     |
| `compareWith(other)`    | `1` if this hand beats `other`, `2` if it loses to `other`, `3` on a tie                                 |
| `hand`, `score`, `rank` | the values of `describe()`, as properties. The types mark them `readonly`: use `update()` to change them |

`compareWith()` also accepts a hand that comes from another copy of the package, such as the UMD
file or a second install.

### Ranks

| `getRank()`         | `HandRank` member | Scores    |
| ------------------- | ----------------- | --------- |
| `'ROYAL_FLUSH'`     | `RoyalFlush`      | 1         |
| `'STRAIGHT_FLUSH'`  | `StraightFlush`   | 2–10      |
| `'FOUR_OF_A_KIND'`  | `FourOfAKind`     | 11–166    |
| `'FULL_HOUSE'`      | `FullHouse`       | 167–322   |
| `'FLUSH'`           | `Flush`           | 323–1599  |
| `'STRAIGHT'`        | `Straight`        | 1600–1609 |
| `'THREE_OF_A_KIND'` | `ThreeOfAKind`    | 1610–2467 |
| `'TWO_PAIRS'`       | `TwoPairs`        | 2468–3325 |
| `'ONE_PAIR'`        | `OnePair`         | 3326–6185 |
| `'HIGH_CARD'`       | `HighCard`        | 6186–7462 |

### `HandRank` and `CompareResult`

Two plain objects, exported by name and also set as static properties of the class:

```js
const { CompareResult, HandRank } = require('poker-hand-evaluator');

console.log(HandRank.Flush); // FLUSH
console.log(CompareResult); // { Win: 1, Loss: 2, Tie: 3 }
```

### Errors

Every error is a plain `Error`, with the same message as in 1.0.1:

| Message                          | Thrown by                  | When                                                    |
| -------------------------------- | -------------------------- | ------------------------------------------------------- |
| `Hand must be defined`           | constructor and `update()` | the hand is missing or empty: `undefined`, `null`, `''` |
| `Hand must be a String`          | constructor and `update()` | the hand is not a string                                |
| `Incorrect hand`                 | constructor and `update()` | not five valid cards separated by single spaces         |
| `Hand has duplicates`            | constructor and `update()` | the same card appears twice                             |
| `Incorrect hand to compare with` | `compareWith()`            | the argument is not a `PokerHand`                       |

## Supported runtimes

- **Node.js 6 and later** (`"engines": { "node": ">=6" }`), as with 1.0.1. `require()` works on
  every version, and `import` from Node.js 12.17. CI tests Node.js 6 to 26.
- **Browsers**, through `dist/pokerhand.min.js`. The file is ES5, but needs native `Map` and `Set`
  that accept an iterable, as 1.0.1 did: Chrome 38, Firefox 13, Safari 9, Edge 12 or later.
  Internet Explorer 11 is not supported, and 1.0.1 did not work there either.
- **Bundlers** read the `exports` map: `import` gets the ES module build, and `require()` the
  CommonJS build.

## Upgrading from 1.0.1

1.1.0 keeps 1.0.1's API, its error messages and the score of each of the 2,598,960 hands, and
drops no Node.js version or browser. Code written for 1.0.1 needs no change, except in the rare
cases that [CHANGELOG.md](https://github.com/codeKonami/poker-hand/blob/master/CHANGELOG.md)
lists as limits: for instance, `require('poker-hand-evaluator/')`, with a trailing slash, no longer
resolves. Drop the slash.

You may also notice that:

- `describe().hand` is now a copy: changing it no longer changes the hand;
- `Object.keys(PokerHand)` lists the new static properties: `PokerHand`, `default`, `HandRank` and
  `CompareResult`;
- `compareWith()` accepts a hand from another copy of the package, where 1.0.1 threw;
- 1.0.1's deep paths still work, but are [deprecated](#deprecated-deep-paths).

## Deprecated deep paths

1.0.1 had no `exports` map, so any of its files could be loaded by path. 1.1.0 still serves each of
them, through `require()` and `import`, with or without `.js`, and each gives what it gave in 1.0.1.
Under `poker-hand-evaluator/`:

- `index` and `src/pokerhand`: the `PokerHand` class;
- `src/utils/sanitize`, `src/utils/eval-hand`, `src/utils/eval-rank` and `src/utils/is-valid-card`:
  1.0.1's helper functions;
- `src/arrays`, the directory, and `src/arrays/index`, `flushes`, `hand-ranks`, `products`, `ranks`,
  `suits`, `unique5` and `values`: the evaluator's lookup tables (`hand-ranks` is empty, as in
  1.0.1);
- `example`: 1.0.1's example, which prints to the console.

These paths are deprecated: every 1.x keeps serving them, and they are slated for removal in 2.0.0.
Prefer `poker-hand-evaluator` itself. The deprecation is documented only: the package prints no
warning at runtime. Only the forms with a trailing slash, such as `src/arrays/`, get Node.js's own
deprecation warning.

`poker-hand-evaluator/package.json` and `poker-hand-evaluator/dist/pokerhand.min.js` are not
deprecated.

## Development

The published package runs on Node.js 6 and later, but the development tools need Node.js
`^22.22.2 || ^24.15.0 || >=26`.

```sh
git clone https://github.com/codeKonami/poker-hand.git
cd poker-hand
npm ci
```

The sources are TypeScript, in `src/`. tsdown builds them into `dist/`.

| Command                             | What it does                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                       | serves the `index.html` demo with Vite: type two hands and find the winner                  |
| `npm run build`                     | builds `dist/` with tsdown: CommonJS, ES module, type declarations and the UMD file         |
| `npm test`                          | runs the unit tests with Vitest (`npm run test:watch` to watch)                             |
| `npm run bench`                     | evaluates the 2,598,960 hands, then prints the time it took and a few random comparisons    |
| `npm run typecheck`                 | type-checks `src/` with TypeScript                                                          |
| `npm run lint`                      | checks formatting and lint rules with Biome (`npm run lint:fix` or `npm run format` to fix) |
| `npm run es-check`                  | checks, after a build, that `dist/` is ES2015 for Node.js and ES5 for the UMD file          |
| `npm run compat`                    | runs the `compat/` safety net against a tarball of this repo                                |
| `npm run compat:lint`               | builds, then checks the package with publint and attw                                       |
| `npm run compat:smoke -- <tarball>` | smoke-tests a tarball on the current Node.js                                                |

For example, on a laptop:

```text
$ npm run bench
Evaluating all the possible combinations...
Took 0.47s to evaluate the 2598960 combinations

Here some random combinations

KH KC 3H 4H 3D -- beats -- AS 4C 8S JD 9S
JC 2S JS 7H 5S -- beats -- TS 2S KD 7H TC
8D 9D 8S AC 7D -- beats -- 6S 2S 8S AC 6C
5H 2S QC 5C 3D -- beats -- 5H 7S KC TD 9C
2S QC 9D JH 7D -- beats -- 3C 2H 4S 7D 5S
```

### The `compat/` safety net

`compat/` tests the packed tarball against 1.0.1, the npm tarball of 2018, the way a user reaches
the package: `require()`, `import`, a `<script>` tag, the deep paths, TypeScript projects, and the
score of each of the 2,598,960 hands. `COMPAT_TARGET=reference npm run compat` runs the same suite
against 1.0.1 itself, and it must pass. See
[`compat/README.md`](https://github.com/codeKonami/poker-hand/blob/master/compat/README.md).

CI runs on every push: lint, type check, unit tests, es-check, `compat/` on Node.js 22, 24 and 26,
`compat:lint`, and a smoke test of the tarball on Node.js 6 to 20.

### Changes and releases

A change to the published package comes with a changeset: run `npx changeset`.
`changeset version` turns the changesets into the next version number and into `CHANGELOG.md`.
The maintainer publishes releases from GitHub Actions.

## To do

- [ ] Load Cactus Kev's C code directly in Node.js, to compare its results with this library's.
- [ ] Add Paul Senzee's optimisation, mentioned in the blog post
      [here](http://www.paulsenzee.com/2006/06/some-perfect-hash.html).

## Credits

The algorithm and its lookup tables are Cactus Kev's, described in
[his blog post](http://suffe.cool/poker/evaluator.html). Parts of
[his C code](http://suffe.cool/poker/code/) are ported here.

## License

MIT
