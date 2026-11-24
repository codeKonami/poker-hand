import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { inject } from 'vitest';
import type { CompatConsumer } from './global-setup';

export const PACKAGE = 'poker-hand-evaluator';

export interface Consumer extends CompatConsumer {
  /** Node's real `require`, resolving from the consumer project, as a CommonJS user would. */
  require: (specifier: string) => any;
  /** Path of a file inside the installed package. */
  packageFile: (path: string) => string;
  /**
   * Runs `source` as an ES module of the consumer project in a child `node`
   * and returns what it printed with `console.log(JSON.stringify(...))`.
   */
  runEsm: (source: string) => EsmRun;
}

export type EsmRun = { ok: true; value: any } | { ok: false; error: string };

let probeCount = 0;

function consumer(provided: CompatConsumer): Consumer {
  const require = createRequire(join(provided.dir, 'consumer.cjs'));
  return {
    ...provided,
    require,
    packageFile: (path) => join(provided.dir, 'node_modules', PACKAGE, path),
    runEsm(source) {
      const file = join(provided.dir, `probe-${process.pid}-${probeCount++}.mjs`);
      writeFileSync(file, source);
      const child = spawnSync(process.execPath, [file], { cwd: provided.dir, encoding: 'utf8' });
      if (child.status !== 0) {
        const error = child.stderr.split('\n').find((line) => /Error/.test(line)) ?? child.stderr;
        return { ok: false, error: error.trim() };
      }
      return { ok: true, value: JSON.parse(child.stdout) };
    },
  };
}

export const reference = consumer(inject('reference'));
export const target = consumer(inject('target'));

/** True when the suite runs against 1.0.1 itself (COMPAT_TARGET=reference). */
export const isReferenceRun = target.version === reference.version;

/**
 * The PokerHand class of a consumer, wherever its entry point puts it.
 * Tests of the class itself use this so that a broken `require()` (asserted on its own)
 * doesn't hide every other regression behind "is not a constructor".
 */
export function pokerHandClass(of: Consumer): any {
  const entry = of.require(PACKAGE);
  return typeof entry === 'function' ? entry : entry.PokerHand;
}

/** The error a call throws, reduced to what a consumer can observe. */
export function thrown(fn: () => unknown): { type: string; message: string } | 'no error' {
  try {
    fn();
  } catch (error) {
    const { constructor, message } = error as Error;
    return { type: constructor.name, message };
  }
  return 'no error';
}
