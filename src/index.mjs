// The ES module entry, a wrapper over the CommonJS build, as Node.js's docs advise against the
// dual package hazard: `import` and `require()` get one PokerHand class, as in 1.0.1 (#45).
// tsdown copies this file as is to dist/index.mjs, next to dist/index.cjs. Its types,
// dist/index.d.mts, come from src/index.ts.
//
// A default import only: named imports from a CommonJS file need Node.js 12.20 or 14.13, and
// `import` works from 12.17. Each named export is what require() gives under that name.
import PokerHandModule from './index.cjs';

export const { PokerHand, HandRank, CompareResult } = PokerHandModule;
export default PokerHandModule;
