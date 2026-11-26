import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { PACKAGE, target } from './consumer';

const UMD = 'dist/pokerhand.min.js';

describe(`UMD build ${UMD}`, () => {
  it('is published', () => {
    expect(existsSync(target.packageFile(UMD))).toBe(true);
  });

  it('a <script> tag exposes window.PokerHand', () => {
    const source = readFileSync(target.packageFile(UMD), 'utf8');
    const { window } = new JSDOM('<!doctype html><body></body>', { runScripts: 'dangerously' });
    const script = window.document.createElement('script');
    script.textContent = source;
    window.document.body.appendChild(script);
    // biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
    const { PokerHand } = window as unknown as { PokerHand: any };

    expect(typeof PokerHand).toBe('function');
    expect(new PokerHand('as ks qs js ts').describe()).toEqual({
      hand: ['AS', 'KS', 'QS', 'JS', 'TS'],
      score: 1,
      rank: 'ROYAL_FLUSH',
    });
  });

  // In a "type": "module" package Node reads this .js file as an ES module:
  // require() then returns {} (Node 22) or throws ERR_REQUIRE_ESM (Node 20).
  it(`require('${PACKAGE}/${UMD}') returns the PokerHand class`, () => {
    const PokerHand = target.require(`${PACKAGE}/${UMD}`);

    expect(typeof PokerHand).toBe('function');
    expect(new PokerHand('AS KS QS JS TS').getScore()).toBe(1);
  });
});
