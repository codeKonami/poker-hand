// Loads each file as a <script> in jsdom and checks window.PokerHand, as compat/umd.test.ts does.
// verify-published.yml runs it on the dist/pokerhand.min.js that each CDN serves:
//
//   node compat/published/script-tag.mjs <file.js>...
//
// Expected values come from 1.0.1. Needs jsdom from the repo's devDependencies (npm ci).

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

// Values from another realm (the jsdom window) fail deepStrictEqual on their prototype.
const plain = (value) => JSON.parse(JSON.stringify(value));

function check(file) {
  // An error thrown by the script goes to the virtual console, not to the caller.
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));
  const { window } = new JSDOM('<!doctype html><body></body>', {
    runScripts: 'dangerously',
    virtualConsole,
  });
  const script = window.document.createElement('script');
  script.textContent = readFileSync(file, 'utf8');
  window.document.body.appendChild(script);
  const { PokerHand } = window;

  assert.deepStrictEqual(
    errors.map((error) => String(error.cause ?? error)),
    [],
    'the script runs without errors',
  );
  assert.strictEqual(typeof PokerHand, 'function', 'window.PokerHand is a constructor');
  assert.deepStrictEqual(plain(new PokerHand('as ks qs js ts').describe()), {
    hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
    score: 1,
    rank: 'ROYAL_FLUSH',
  });
  const pair = new PokerHand('KS 2H 5C KD AS');
  assert.strictEqual(pair.getScore(), 3597);
  assert.strictEqual(pair.getRank(), 'ONE_PAIR');
  assert.strictEqual(new PokerHand('7S 5H 4D 3C 2S').getScore(), 7462);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node compat/published/script-tag.mjs <file.js>...');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  try {
    check(file);
    console.log(`ok - ${file}: a <script> exposes window.PokerHand, which scores like 1.0.1`);
  } catch (error) {
    failed = true;
    console.log(`not ok - ${file}`);
    console.log(String(error?.message ?? error).replace(/^/gm, '    '));
  }
}
process.exitCode = failed ? 1 : 0;
