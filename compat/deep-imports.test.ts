import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  type Consumer,
  type EsmRun,
  isReferenceRun,
  PACKAGE,
  reference,
  target,
  thrown,
} from './consumer';

/*
 * The deep paths of 1.0.1. "Imports profonds de la 1.0.1"
 * (https://github.com/codeKonami/poker-hand/issues/16) keeps serving all of them in 1.x, `pkg/`
 * aside. All but package.json and the UMD build are deprecated, in the docs only.
 *
 * Every module 1.0.1 published (tests and build files aside), and every other form 1.0.1
 * resolved, is required and imported from both packages and observed the same way; the
 * observations must match. A form that only resolves in 1.1.0 (an import without `.js`, say)
 * must behave like the 1.0.1 form it stands for.
 */

const digest = (value: unknown) => createHash('sha1').update(JSON.stringify(value)).digest('hex');

/** What a consumer can see of a module, small enough to diff. */
// biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
type Observe = (exported: any, of: Consumer) => unknown;

const pokerHandClass: Observe = (PokerHand, of) => ({
  type: typeof PokerHand,
  describe: new PokerHand('as kh qd jc ts').describe(),
  isMainEntry: PokerHand === of.require(PACKAGE),
});

const table: Observe = (value) =>
  value instanceof Map
    ? { type: 'Map', entries: [...value] }
    : Array.isArray(value)
      ? { type: 'Array', length: value.length, sha1: digest(value) }
      : { type: typeof value, keys: Object.keys(value) };

const tables: Observe = (arrays, of) =>
  Object.fromEntries(Object.entries(arrays).map(([k, v]) => [k, table(v, of)]));

const DEEP_MODULES: [path: string, observe: Observe][] = [
  ['index', pokerHandClass],
  ['src/pokerhand', pokerHandClass],
  [
    'src/utils/sanitize',
    (sanitize) => [
      sanitize('JH QD 8S 5c 6d'),
      ...[undefined, 42, 'KS 2H 5C JD', 'KS 2H 5C JD JD', 'KS 2H 5C ZK WS'].map((hand) =>
        thrown(() => sanitize(hand)),
      ),
    ],
  ],
  [
    'src/utils/eval-hand',
    (evalHand) => [
      evalHand(['AC', 'KC', 'QC', 'JC', 'TC']),
      evalHand(['KS', '2H', '5C', 'KD', 'AS']),
      evalHand(['7S', '5H', '4D', '3C', '2S']),
    ],
  ],
  [
    'src/utils/eval-rank',
    (evalRank) => [1, 2, 10, 11, 167, 323, 1600, 1610, 2468, 3326, 6186, 7462].map(evalRank),
  ],
  [
    'src/utils/is-valid-card',
    (isValidCard) => ['KH', 'kh', 'zm', 'AZZ', '', 2, undefined].map(isValidCard),
  ],
  ['src/arrays/index', tables],
  ['src/arrays/flushes', table],
  ['src/arrays/hand-ranks', table],
  ['src/arrays/products', table],
  ['src/arrays/ranks', table],
  ['src/arrays/suits', table],
  ['src/arrays/unique5', table],
  ['src/arrays/values', table],
];

function observation(of: Consumer, specifier: string, observe: Observe) {
  try {
    return { ok: true, value: observe(of.require(specifier), of) };
  } catch (error) {
    const { code, message } = error as NodeJS.ErrnoException;
    return { ok: false, error: code ?? message };
  }
}

/**
 * How an ES module sees a deep path, in a child `node`:
 * - `class`: the PokerHand class, by its use and by whether it is the main entry's default
 *   import. 1.0.1 had one class; 1.1.0 gives its ES module class to `import` (#16).
 * - `module`: anything else, which must be the very object require() returns, under the same
 *   export names (Node finds the names of a CommonJS module by reading its code).
 * - `json`: package.json, which needs an import attribute.
 */
type ImportKind = 'class' | 'module' | 'json';

const importObservations = new Map<string, EsmRun>();

function importObservation(of: Consumer, specifier: string, kind: ImportKind): EsmRun {
  const key = [of.dir, specifier, kind].join(' ');
  const source =
    kind === 'class'
      ? `
        import * as namespace from '${specifier}';
        import main from '${PACKAGE}';
        const value = namespace.default;
        console.log(JSON.stringify({
          type: typeof value,
          describe: new value('as kh qd jc ts').describe(),
          isMainImport: value === main,
        }));`
      : `
        import { createRequire } from 'node:module';
        import * as namespace from '${specifier}'${kind === 'json' ? " with { type: 'json' }" : ''};
        const value = namespace.default;
        console.log(JSON.stringify({
          names: Object.keys(namespace),
          isRequired: value === createRequire(import.meta.url)('${specifier}'),
          ${kind === 'json' ? 'name: value.name,' : ''}
        }));`;
  if (!importObservations.has(key)) importObservations.set(key, of.runEsm(source));
  return importObservations.get(key) as EsmRun;
}

describe('deep imports published in 1.0.1 (characterization)', () => {
  describe.each(DEEP_MODULES)('%s', (path, observe) => {
    const kind = observe === pokerHandClass ? 'class' : 'module';

    it.each([`${PACKAGE}/${path}.js`, `${PACKAGE}/${path}`])('require(%s)', (specifier) => {
      const expected = observation(reference, specifier, observe);
      expect(expected.ok, 'the 1.0.1 observation itself failed').toBe(true);

      expect(observation(target, specifier, observe)).toEqual(expected);
    });

    it(`import(${PACKAGE}/${path}.js)`, () => {
      const expected = importObservation(reference, `${PACKAGE}/${path}.js`, kind);
      expect(expected.ok, 'the 1.0.1 observation itself failed').toBe(true);

      expect(importObservation(target, `${PACKAGE}/${path}.js`, kind)).toEqual(expected);
    });

    // 1.0.1 had no "exports", and import, unlike require(), needed the file extension.
    it.skipIf(isReferenceRun)(`import(${PACKAGE}/${path}) (new in 1.1.0)`, () => {
      expect(importObservation(target, `${PACKAGE}/${path}`, kind)).toEqual(
        importObservation(reference, `${PACKAGE}/${path}.js`, kind),
      );
    });
  });
});

// The other forms 1.0.1 resolved: a directory with or without its trailing slash, package.json
// with or without its extension, the UMD build without its extension, and the example. The UMD
// build itself (dist/pokerhand.min.js) belongs to umd.test.ts and #19.
const OTHER_REQUIRES: [path: string, sameAs: string, observe: Observe][] = [
  ['src/arrays', 'src/arrays/index.js', tables],
  ['package', 'package.json', (manifest) => manifest.name],
  ['package.json', 'package.json', (manifest) => manifest.name],
  ['dist/pokerhand.min', 'dist/pokerhand.min.js', pokerHandClass],
];

// [path, the 1.0.1 form it must import like, how to observe it]. The path resolved under import
// in 1.0.1 when it is its own 1.0.1 form; otherwise it is new in 1.1.0 (#16).
const OTHER_IMPORTS: [path: string, like: string, kind: ImportKind][] = [
  ['src/arrays', 'src/arrays/index.js', 'module'],
  ['src/arrays/', 'src/arrays/index.js', 'module'],
  ['package.json', 'package.json', 'json'],
  ['package', 'package.json', 'json'],
  ['dist/pokerhand.min.js', 'dist/pokerhand.min.js', 'class'],
  ['dist/pokerhand.min', 'dist/pokerhand.min.js', 'class'],
];

const EXAMPLES = ['example', 'example/', 'example/index', 'example/index.js'];

/** What the example prints when a CommonJS script requires it, or an ES module imports it. */
function exampleRun(of: Consumer, specifier: string, system: 'require' | 'import') {
  const { status, stdout } =
    system === 'require'
      ? of.runScript(`console.log(JSON.stringify(require('${specifier}')));`, '.cjs')
      : of.runScript(`import '${specifier}';`, '.mjs');
  return { status, stdout };
}

describe('other forms of the deep paths (characterization)', () => {
  it.each(OTHER_REQUIRES)(`require(${PACKAGE}/%s)`, (path, sameAs, observe) => {
    const observeAs: Observe = (value, of) => ({
      isSameAs: value === of.require(`${PACKAGE}/${sameAs}`),
      value: observe(value, of),
    });
    const expected = observation(reference, `${PACKAGE}/${path}`, observeAs);
    expect(expected.ok, 'the 1.0.1 observation itself failed').toBe(true);

    expect(observation(target, `${PACKAGE}/${path}`, observeAs)).toEqual(expected);
  });

  // In a child node: Node warns about this form (see "runtime warnings" below).
  it(`require(${PACKAGE}/src/arrays/)`, () => {
    const isIndex = (of: Consumer) =>
      of.runCjs(`
        const arrays = require('${PACKAGE}/src/arrays/');
        console.log(JSON.stringify(arrays === require('${PACKAGE}/src/arrays/index.js')));
      `);

    expect(isIndex(reference)).toEqual({ ok: true, value: true });
    expect(isIndex(target)).toEqual(isIndex(reference));
  });

  it.each(EXAMPLES)(`require(${PACKAGE}/%s) runs the example, logs included`, (path) => {
    const expected = exampleRun(reference, `${PACKAGE}/${path}`, 'require');
    expect(expected.status, 'the 1.0.1 example itself failed').toBe(0);

    expect(exampleRun(target, `${PACKAGE}/${path}`, 'require')).toEqual(expected);
  });

  it.each(OTHER_IMPORTS.filter(([path, like]) => path === like))(
    `import(${PACKAGE}/%s)`,
    (path, _, kind) => {
      const expected = importObservation(reference, `${PACKAGE}/${path}`, kind);
      expect(expected.ok, 'the 1.0.1 observation itself failed').toBe(true);

      expect(importObservation(target, `${PACKAGE}/${path}`, kind)).toEqual(expected);
    },
  );

  it.skipIf(isReferenceRun).each(OTHER_IMPORTS.filter(([path, like]) => path !== like))(
    `import(${PACKAGE}/%s) is like %s (new in 1.1.0)`,
    (path, like, kind) => {
      expect(importObservation(target, `${PACKAGE}/${path}`, kind)).toEqual(
        importObservation(reference, `${PACKAGE}/${like}`, kind),
      );
    },
  );

  it(`import(${PACKAGE}/example/index.js) runs the example, logs included`, () => {
    const expected = exampleRun(reference, `${PACKAGE}/example/index.js`, 'import');
    expect(expected.status, 'the 1.0.1 example itself failed').toBe(0);

    expect(exampleRun(target, `${PACKAGE}/example/index.js`, 'import')).toEqual(expected);
  });

  it.skipIf(isReferenceRun).each(EXAMPLES.filter((path) => path !== 'example/index.js'))(
    `import(${PACKAGE}/%s) runs the example, logs included (new in 1.1.0)`,
    (path) => {
      expect(exampleRun(target, `${PACKAGE}/${path}`, 'import')).toEqual(
        exampleRun(reference, `${PACKAGE}/example/index.js`, 'import'),
      );
    },
  );
});

// Every deep path, in every form (all forms of a module, the other forms, the UMD build).
const ALL_FORMS = [
  ...DEEP_MODULES.flatMap(([path]) => [path, `${path}.js`]),
  ...OTHER_IMPORTS.map(([path]) => path),
  ...EXAMPLES,
];
const TRAILING_SLASH = ALL_FORMS.filter((path) => path.endsWith('/'));
const WITHOUT_TRAILING_SLASH = ALL_FORMS.filter((path) => !path.endsWith('/'));

/**
 * Loads each path in a child node and returns what it wrote to stderr. A path that fails to
 * load is skipped: the tests above check it. With `throwDeprecation`, a deprecation warning
 * ends the process, as with --throw-deprecation.
 */
function loadAll(
  of: Consumer,
  paths: string[],
  system: 'require' | 'import',
  throwDeprecation: boolean,
) {
  const specifiers = JSON.stringify(paths.map((path) => `${PACKAGE}/${path}`));
  const { status, stderr } =
    system === 'require'
      ? of.runScript(
          `process.throwDeprecation = ${throwDeprecation};
          for (const specifier of ${specifiers}) {
            try { require(specifier); } catch {}
          }`,
          '.cjs',
        )
      : of.runScript(
          `process.throwDeprecation = ${throwDeprecation};
          for (const specifier of ${specifiers}) {
            const options = /package/.test(specifier) ? { with: { type: 'json' } } : undefined;
            try { await import(specifier, options); } catch {}
          }`,
          '.mjs',
        );
  return { status, stderr };
}

// The deprecation of the deep paths is documented only (#16). A runtime warning would end a
// process run with --throw-deprecation, and no try/catch around require() could stop it.
describe('runtime warnings of the deep paths', () => {
  it.each(['require', 'import'] as const)(
    '%s of any deep path warns nothing, even under --throw-deprecation',
    (system) => {
      expect(loadAll(reference, WITHOUT_TRAILING_SLASH, system, true)).toEqual({
        status: 0,
        stderr: '',
      });
      expect(loadAll(target, WITHOUT_TRAILING_SLASH, system, true)).toEqual({
        status: 0,
        stderr: '',
      });
    },
  );

  // 1.1.0 serves a trailing slash through a "./*/" pattern, and Node itself warns about that:
  // DEP0155 from Node 17 (and DEP0148 on Node 16, through the exact keys of package.json).
  it.each(['require', 'import'] as const)(
    "%s with a trailing slash gets nothing but Node's own DEP0155",
    (system) => {
      const otherOutput = (of: Consumer) =>
        loadAll(of, TRAILING_SLASH, system, false)
          .stderr.split('\n')
          .filter(
            (line) =>
              line && !/\[DEP0155\] DeprecationWarning/.test(line) && !/--trace-/.test(line),
          );

      expect(otherOutput(reference)).toEqual([]);
      expect(otherOutput(target)).toEqual([]);
    },
  );
});

// eval-hand takes cards that sanitize has already checked. On an invalid card 1.0.1 failed with
// a TypeError, whose message depended on the JavaScript engine, so only the type is compared.
// Not covered: an invalid suit (AX). 1.0.1 read it as no suit and returned a score (1600 for
// AX KC QC JC TC); 1.1.0 throws the TypeError, as decided in #16.
describe('src/utils/eval-hand on cards it was not meant for (characterization)', () => {
  it.each([
    ['an invalid rank', ['ZS', 'KC', 'QC', 'JC', 'TC']],
    ['lowercase cards', ['as', 'kc', 'qc', 'jc', 'tc']],
    ['four cards', ['AS', 'KS', 'QS', 'JS']],
  ])('%s', (_, hand) => {
    const observe = (of: Consumer) => {
      const error = thrown(() => of.require(`${PACKAGE}/src/utils/eval-hand`)(hand));
      return typeof error === 'object' && error.type === 'TypeError' ? error.type : error;
    };

    expect(observe(target)).toEqual(observe(reference));
  });
});

// biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
type Change = (table: any, of: Consumer) => () => void;

/**
 * Sets `table[key]` (an array index or a Map key) and returns how to restore it.
 * The key can depend on the consumer's own tables.
 */
const set =
  (key: number | string | ((of: Consumer) => number), value: unknown): Change =>
  (table, of) => {
    const at = typeof key === 'function' ? key(of) : key;
    if (table instanceof Map) {
      const saved = table.get(at);
      table.set(at, value);
      return () => table.set(at, saved);
    }
    const saved = table[at];
    table[at] = value;
    return () => {
      table[at] = saved;
    };
  };

// The primes of A, A, K, Q and J: the key of AS AH KD QC JS in products, and so in values.
const ACES_UP_PRODUCT = 41 * 41 * 37 * 31 * 29;
const acesUpIndex = (of: Consumer): number =>
  of.require(`${PACKAGE}/src/arrays/products`).indexOf(ACES_UP_PRODUCT);

const TABLE_CHANGES: [path: string, hand: string, change: Change][] = [
  ['src/arrays/flushes', 'AS KS QS JS TS', set(0x1f00, 9999)],
  ['src/arrays/unique5', 'AS KH QD JC TS', set(0x1f00, 9999)],
  ['src/arrays/values', 'AS AH KD QC JS', set(acesUpIndex, 9999)],
  // The binary search no longer finds the hand.
  ['src/arrays/products', 'AS AH KD QC JS', set(acesUpIndex, 1)],
  // The ace takes the order and prime of the king.
  ['src/arrays/ranks', 'AS KH QD JC TS', set('A', [11, 37])],
  // Spades become clubs.
  ['src/arrays/suits', 'AS KS QS JS TC', set('S', 0x8000)],
];

function scoreOf(of: Consumer, hand: string) {
  let score: unknown;
  const error = thrown(() => {
    score = new (of.require(PACKAGE))(hand).getScore();
  });
  return error === 'no error' ? score : error;
}

// In 1.0.1 a deep path gave the very table the evaluator reads: changing it changed the scores.
// The tables are now generated at import (#33), so a shim must return the main entry's own
// tables, not a second copy generated next to them.
describe("deep-path tables are the evaluator's own (characterization)", () => {
  it.each(TABLE_CHANGES)('changing %s changes the score of %s', (path, hand, change) => {
    const observe = (of: Consumer) => {
      const before = scoreOf(of, hand);
      const restore = change(of.require(`${PACKAGE}/${path}`), of);
      try {
        return { before, changed: scoreOf(of, hand) };
      } finally {
        restore();
      }
    };

    const expected = observe(reference);
    expect(expected.changed, 'the change has no effect on 1.0.1').not.toEqual(expected.before);
    expect(observe(target)).toEqual(expected);
  });

  it('src/arrays/index holds the same tables as their own paths', () => {
    const observe = (of: Consumer) =>
      Object.entries(of.require(`${PACKAGE}/src/arrays/index`)).map(([name, table]) => [
        name,
        table === of.require(`${PACKAGE}/src/arrays/${name}`),
      ]);

    expect(observe(target)).toEqual(observe(reference));
  });
});
