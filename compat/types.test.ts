import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isReferenceRun, target } from './consumer';

/*
 * The declaration files of the package, as TypeScript projects that use it see them.
 * Each project is compiled by this repo's TypeScript with skipLibCheck off, so the
 * published .d.cts and .d.mts are type-checked too.
 */

const TSC = join(dirname(createRequire(__filename).resolve('typescript/package.json')), 'bin/tsc');

// `const PokerHand = require('poker-hand-evaluator')`, typed: the class, with the rest on it.
const IMPORT_REQUIRE = `
import PokerHand = require('poker-hand-evaluator');

const hand: PokerHand = new PokerHand('AS KS QS JS TS');
const rank: PokerHand.HandRank = hand.getRank();
const flush: PokerHand.HandRank = 'FLUSH';
const isFlush: boolean = rank === PokerHand.HandRank.Flush;
const result: PokerHand.CompareResult = hand.compareWith(new PokerHand.PokerHand('7S 5H 4D 3C 2S'));
const win: boolean = result === PokerHand.CompareResult.Win;
const card: PokerHand.Card = 'KS';
const Default: typeof PokerHand = PokerHand.default;
// @ts-expect-error not a rank
const wrong: PokerHand.HandRank = 'FLUSHES';
`;

const IMPORT_FROM = `
import PokerHand, { CompareResult, HandRank, PokerHand as Named } from 'poker-hand-evaluator';
import type { Card, Rank, Suit } from 'poker-hand-evaluator';

const hand: Named = new PokerHand('AS KS QS JS TS');
const flush: HandRank = 'FLUSH';
const rank: HandRank = hand.getRank();
const isFlush: boolean = rank === HandRank.Flush;
const result: CompareResult = hand.compareWith(new Named('7S 5H 4D 3C 2S'));
const win: boolean = result === CompareResult.Win;
const card: Card = 'KS';
const suit: Suit = 'S';
const value: Rank = 'K';
// @ts-expect-error not a rank
const wrong: HandRank = 'FLUSHES';
// @ts-expect-error a hand is a string
new PokerHand(['AS', 'KS', 'QS', 'JS', 'TS']);
`;

interface Project {
  /** The project's package.json "type", which decides how node16 reads its .ts files. */
  type: 'commonjs' | 'module';
  compilerOptions: Record<string, unknown>;
  files: Record<string, string>;
}

const PROJECTS: [name: string, project: Project][] = [
  [
    'node16, CommonJS project',
    {
      type: 'commonjs',
      compilerOptions: { module: 'node16' },
      files: { 'require.ts': IMPORT_REQUIRE, 'import.ts': IMPORT_FROM },
    },
  ],
  [
    'node16, ES module project',
    {
      type: 'module',
      compilerOptions: { module: 'node16' },
      files: { 'import.ts': IMPORT_FROM },
    },
  ],
  [
    'bundler',
    {
      type: 'commonjs',
      // `preserve` implies moduleResolution bundler, and allows `import = require()`.
      compilerOptions: { module: 'preserve' },
      files: { 'require.ts': IMPORT_REQUIRE, 'import.ts': IMPORT_FROM },
    },
  ],
];

function typeCheck(name: string, { type, compilerOptions, files }: Project) {
  const dir = join(target.dir, 'types', name.replace(/\W+/g, '-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type }));
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        target: 'es2020',
        types: [],
        ...compilerOptions,
      },
      files: Object.keys(files),
    }),
  );
  for (const [file, source] of Object.entries(files)) {
    // Each file is a module, so that the constants of one don't clash with the other's.
    writeFileSync(join(dir, file), `${source}\nexport {};\n`);
  }
  const tsc = spawnSync(process.execPath, [TSC, '-p', '.', '--pretty', 'false'], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { status: tsc.status, diagnostics: `${tsc.stdout}${tsc.stderr}`.trim() };
}

// Added after 1.0.1, which shipped no types.
describe.skipIf(isReferenceRun)('TypeScript types (new in 1.1.0)', () => {
  it.each(PROJECTS)('a %s compiles', (name, project) => {
    expect(typeCheck(name, project)).toEqual({ status: 0, diagnostics: '' });
  });
});
