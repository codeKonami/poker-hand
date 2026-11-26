import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { inject } from 'vitest';
import type { CompatConsumer } from './global-setup';

export const PACKAGE = 'poker-hand-evaluator';

export interface Consumer extends CompatConsumer {
  /** Node's real `require`, resolving from the consumer project, as a CommonJS user would. */
  // biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
  require: (specifier: string) => any;
  /** Path of a file inside the installed package. */
  packageFile: (path: string) => string;
  /**
   * Runs `source` as an ES module of the consumer project in a child `node`
   * and returns what it printed with `console.log(JSON.stringify(...))`.
   */
  runEsm: (source: string) => EsmRun;
  /** The same as `runEsm`, for a CommonJS script. */
  runCjs: (source: string) => EsmRun;
  /** Runs `source` as a script of the consumer project in a child `node`, and returns its output as is. */
  runScript: (source: string, extension: '.cjs' | '.mjs') => ScriptRun;
}

export type EsmRun = { ok: true; value: unknown } | { ok: false; error: string };

export interface ScriptRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

let probeCount = 0;

function consumer(provided: CompatConsumer): Consumer {
  const require = createRequire(join(provided.dir, 'consumer.cjs'));

  const runScript = (source: string, extension: '.cjs' | '.mjs'): ScriptRun => {
    const file = join(provided.dir, `probe-${process.pid}-${probeCount++}${extension}`);
    writeFileSync(file, source);
    const { status, stdout, stderr } = spawnSync(process.execPath, [file], {
      cwd: provided.dir,
      encoding: 'utf8',
    });
    return { status, stdout, stderr };
  };

  const runJson = (source: string, extension: '.cjs' | '.mjs'): EsmRun => {
    const child = runScript(source, extension);
    if (child.status !== 0) {
      const error = child.stderr.split('\n').find((line) => /Error/.test(line)) ?? child.stderr;
      return { ok: false, error: error.trim() };
    }
    return { ok: true, value: JSON.parse(child.stdout) };
  };

  return {
    ...provided,
    require,
    packageFile: (path) => join(provided.dir, 'node_modules', PACKAGE, path),
    runEsm: (source) => runJson(source, '.mjs'),
    runCjs: (source) => runJson(source, '.cjs'),
    runScript,
  };
}

export const reference = consumer(inject('reference'));
export const target = consumer(inject('target'));

const sha1 = (file: string) => createHash('sha1').update(readFileSync(file)).digest('hex');

/**
 * True when the suite runs against 1.0.1 itself: COMPAT_TARGET=reference, or any copy of its
 * tarball, such as the one `npm pack poker-hand-evaluator@1.0.1` downloads from the registry.
 * Compares tarball contents, not versions: the repo stays at 1.0.1 until changesets bumps it.
 */
export const isReferenceRun = sha1(target.tarball) === sha1(reference.tarball);

/**
 * The PokerHand class of a consumer, wherever its entry point puts it.
 * Tests of the class itself use this so that a broken `require()` (asserted on its own)
 * doesn't hide every other regression behind "is not a constructor".
 */
// biome-ignore lint/suspicious/noExplicitAny: the package under test is untyped on purpose
export function pokerHandClass(of: Consumer): any {
  const entry = of.require(PACKAGE);
  return typeof entry === 'function' ? entry : entry.PokerHand;
}

/** The error a call throws, reduced to what a consumer can observe. */
export function thrown(fn: () => unknown): { type: string; message: string } | 'no error' {
  try {
    fn();
  } catch (error) {
    const { constructor: errorClass, message } = error as Error;
    return { type: errorClass.name, message };
  }
  return 'no error';
}
