'use strict';

// Smoke test of a tarball on old Node versions, down to Node 6 (#15):
//
//   node compat/smoke/run.cjs <tarball>
//
// Installs the tarball into a throwaway CommonJS consumer project, then runs require.cjs,
// and import.mjs from Node 12.17. Node 6 only has npm 3, without `npm ci`, so the package
// is unpacked by hand. It has no dependencies, so that is all `npm install` would do.
//
// Every file here runs on Node 6: ES2015 only, no trailing commas in calls, no `node:` prefix.

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tarball = process.argv[2];
if (!tarball) {
  console.error('usage: node compat/smoke/run.cjs <tarball>');
  process.exit(2);
}

// Outside the repo, so that `poker-hand-evaluator` can only resolve to node_modules.
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-hand-smoke-'));
const packageDir = path.join(consumer, 'node_modules', 'poker-hand-evaluator');
fs.mkdirSync(path.join(consumer, 'node_modules'));
fs.mkdirSync(packageDir);
fs.writeFileSync(
  path.join(consumer, 'package.json'),
  '{ "name": "smoke-consumer", "private": true }\n'
);
childProcess.execFileSync('tar', [
  '-xzf',
  path.resolve(tarball),
  '-C',
  packageDir,
  '--strip-components=1',
]);
['harness.cjs', 'require.cjs', 'import.mjs'].forEach((file) => {
  fs.writeFileSync(path.join(consumer, file), fs.readFileSync(path.join(__dirname, file)));
});

const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
console.log(`# ${manifest.name} ${manifest.version} (${tarball}) on Node ${process.version}`);

function run(file) {
  console.log(`# ${file}`);
  const child = childProcess.spawnSync(process.execPath, [file], {
    cwd: consumer,
    stdio: 'inherit',
  });
  return child.status === 0;
}

// `import` works without a flag from Node 12.17.
const versionParts = process.versions.node.split('.').map(Number);
const hasEsm = versionParts[0] > 12 || (versionParts[0] === 12 && versionParts[1] >= 17);

let passed = run('require.cjs');
if (hasEsm) {
  passed = run('import.mjs') && passed;
} else {
  console.log('# import.mjs skipped: Node < 12.17 has no ES modules without a flag');
}

childProcess.execFileSync('rm', ['-rf', consumer]);
process.exit(passed ? 0 : 1);
