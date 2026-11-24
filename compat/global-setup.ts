import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { GlobalSetupContext } from 'vitest/node';

/**
 * Installs two tarballs into throwaway consumer projects:
 * - `reference`: poker-hand-evaluator 1.0.1 as published on npm in 2018 (the contract);
 * - `target`: the tarball under test, chosen with COMPAT_TARGET:
 *     unset        → `npm run build` + `npm pack` of this repo (default);
 *     "reference"  → 1.0.1 itself (self-check: the whole suite must be green);
 *     <path.tgz>   → any other tarball.
 */

const REPO_ROOT = resolve(__dirname, '..');
const REFERENCE_TARBALL = join(__dirname, 'fixtures', 'poker-hand-evaluator-1.0.1.tgz');
// `npm view poker-hand-evaluator@1.0.1 dist.shasum`
const REFERENCE_SHASUM = 'be97cf9f993d1dc46ab839190f640aa7a70e2fc5';

export interface CompatConsumer {
  /** Consumer project root; the package lives in `<dir>/node_modules/poker-hand-evaluator`. */
  dir: string;
  version: string;
  tarball: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    reference: CompatConsumer;
    target: CompatConsumer;
  }
}

const run = (command: string, args: string[], cwd: string) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
  });

function verifyReference() {
  const shasum = createHash('sha1').update(readFileSync(REFERENCE_TARBALL)).digest('hex');
  if (shasum !== REFERENCE_SHASUM) {
    throw new Error(`${REFERENCE_TARBALL} is not the npm 1.0.1 tarball (sha1 ${shasum})`);
  }
}

function packCurrent(destination: string): string {
  run('npm', ['run', 'build', '--silent'], REPO_ROOT);
  const [{ filename }] = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', destination], REPO_ROOT),
  ) as { filename: string }[];
  return join(destination, filename);
}

function install(tarball: string, dir: string): CompatConsumer {
  const packageDir = join(dir, 'node_modules', 'poker-hand-evaluator');
  mkdirSync(packageDir, { recursive: true });
  // A CommonJS consumer project, like most 2018 users of 1.0.1.
  writeFileSync(join(dir, 'package.json'), '{ "name": "compat-consumer", "private": true }\n');
  // The package has no dependencies: unpacking it is what `npm install <tarball>` does.
  run('tar', ['-xzf', tarball, '-C', packageDir, '--strip-components=1'], dir);
  const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  return { dir, version, tarball };
}

export default function setup({ provide }: GlobalSetupContext) {
  verifyReference();
  const workdir = mkdtempSync(join(tmpdir(), 'poker-hand-compat-'));

  const choice = process.env.COMPAT_TARGET;
  const targetTarball =
    choice === 'reference'
      ? REFERENCE_TARBALL
      : choice
        ? resolve(choice)
        : packCurrent(workdir);

  const reference = install(REFERENCE_TARBALL, join(workdir, 'reference'));
  const target = install(targetTarball, join(workdir, 'target'));
  provide('reference', reference);
  provide('target', target);
  console.log(`compat: target ${target.version} (${target.tarball}) against reference 1.0.1`);

  return () => rmSync(workdir, { recursive: true, force: true });
}
