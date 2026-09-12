'use strict';

// Copies an explicit, reviewed test surface. Never loads application code,
// package install scripts, .env files, workspace junctions, or runtime data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const repository = fs.realpathSync(path.resolve(__dirname, '../..'));
const dependenciesRoot = fs.realpathSync(path.join(repository, 'node_modules'));
const snapshot = path.join(__dirname, 'snapshot-02');
if (fs.existsSync(snapshot)) throw new Error('Refusing to reuse or overwrite a snapshot.');

const tests = [
  'backend/api/featureStore.test.js',
  'test/agentExecutionController.test.js',
  'test/agentLifecycle.test.js',
  'test/agentOrchestrator.test.js',
  'test/safetyGate1.test.js',
  'test/mshix.test.js',
  'test/mshixOutbox.test.js',
  'test/mshixBrainKernel.test.js',
  'test/jailtimeEvents.test.js',
  'test/pqs.test.js',
];
const sources = [
  'backend/api/featureStore.js',
  'backend/jailtime-events/index.js',
  'src/server/agentLifecycle.js',
  'src/server/agentOrchestrator.js',
  'src/server/agentExecutionController.js',
  'src/server/mshix/index.js',
  'src/server/mshix/mshix.js',
  'src/server/mshix/mshixRouter.js',
  'src/server/mshix/mshixOutbox.js',
  'src/server/mshix/brainMemoryStore.js',
  'src/server/mshix/brainKernel.js',
  'server/pqs/core/eventModel.js',
  'server/pqs/proof/matchProofSha512.js',
  'server/pqs/security/antiAbuseRules.js',
  'server/pqs/modes/carnival/simulation.js',
  'server/pqs/adapters/ipAdapter.interface.js',
  'server/pqs/adapters/mapleStoryWorldsAdapter.placeholder.js',
  'server/pqs/adapters/msuSdkAdapter.placeholder.js',
  'server/pqs/adapters/vibeIpAdapter.placeholder.js',
];
function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..' + path.sep)
    && relative !== '..' && !path.isAbsolute(relative);
}
function assertPlainPath(root, candidate) {
  if (!within(root, candidate)) throw new Error('Path escaped its approved root.');
  let current = candidate;
  while (current !== root) {
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Refusing a symlink/junction.');
    current = path.dirname(current);
  }
  if (!within(root, fs.realpathSync(candidate))) throw new Error('Resolved path escaped its root.');
}
function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function copyExclusive(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
}

// Preflight all source names against tracked files before creating the snapshot.
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], {
  cwd: repository, encoding: 'utf8', windowsHide: true,
}).split('\0'));
for (const relative of [...sources, ...tests]) {
  if (!tracked.has(relative)) throw new Error('Allowlisted source is not tracked: ' + relative);
  assertPlainPath(repository, path.join(repository, relative));
}
fs.mkdirSync(snapshot);
fs.mkdirSync(path.join(snapshot, 'source'));
fs.mkdirSync(path.join(snapshot, 'deps'));
const files = [...sources, ...tests].map(relative => {
  const source = path.join(repository, relative);
  copyExclusive(source, path.join(snapshot, 'source', relative));
  return { path: relative, sha256: digest(source) };
});

const packages = [];
const visited = new Set();
let dependencyBytes = 0;
let dependencyFileCount = 0;
function locatePackage(name, from) {
  if (!/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name)) throw new Error('Unexpected dependency name.');
  let current = from;
  while (current === repository || within(repository, current)) {
    const candidate = path.join(current, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      assertPlainPath(dependenciesRoot, candidate);
      return candidate;
    }
    if (current === repository) break;
    current = path.dirname(current);
  }
  throw new Error('Required installed dependency is absent: ' + name);
}
function copyPackageTree(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.env')) continue;
    const input = path.join(source, entry.name);
    const output = path.join(destination, entry.name);
    assertPlainPath(dependenciesRoot, input);
    if (entry.isDirectory()) {
      fs.mkdirSync(output, { recursive: true });
      copyPackageTree(input, output);
    } else if (entry.isFile()) {
      if (/\.(node|dll|exe|so|dylib)$/i.test(entry.name)) throw new Error('Native dependency is outside this validation scope.');
      copyExclusive(input, output);
      dependencyFileCount++;
      dependencyBytes += fs.statSync(input).size;
      if (dependencyBytes > 100 * 1024 * 1024) throw new Error('Dependency snapshot exceeded the 100 MiB limit.');
    } else {
      throw new Error('Non-regular dependency entry refused.');
    }
  }
}
function stagePackage(name, from) {
  const source = locatePackage(name, from);
  if (visited.has(source)) return;
  visited.add(source);
  const metadata = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  if (metadata.os || metadata.cpu) throw new Error('Platform-specific dependency refused: ' + name);
  const relative = path.relative(dependenciesRoot, source);
  const destination = path.join(snapshot, 'deps', relative);
  fs.mkdirSync(destination, { recursive: true });
  copyPackageTree(source, destination);
  packages.push({ name: metadata.name, version: metadata.version, path: relative.split(path.sep).join('/') });
  for (const dependency of Object.keys(metadata.dependencies || {})) stagePackage(dependency, source);
  // This installed pure-JS optional package was reviewed after the initial
  // preflight stopped. No optional download or platform substitution is allowed.
  for (const optional of Object.keys(metadata.optionalDependencies || {})) {
    if (name !== 'jackspeak' || metadata.version !== '3.4.3' || optional !== '@pkgjs/parseargs') {
      throw new Error('Optional dependency requires explicit review: ' + name);
    }
    const optionalPath = locatePackage(optional, source);
    const optionalMetadata = JSON.parse(fs.readFileSync(path.join(optionalPath, 'package.json'), 'utf8'));
    if (optionalMetadata.version !== '0.11.0') throw new Error('Reviewed optional dependency version changed.');
    stagePackage(optional, source);
  }
}
stagePackage('mocha', repository);
stagePackage('express', repository);

const manifest = {
  createdAt: new Date().toISOString(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8', windowsHide: true }).trim(),
  workingTree: execFileSync('git', ['status', '--porcelain'], { cwd: repository, encoding: 'utf8', windowsHide: true }).trim(),
  composeSha256: digest(path.join(repository, 'docker-compose.yml')),
  expectedTests: 46, tests, files, packages, dependencyBytes, dependencyFileCount,
};
fs.writeFileSync(path.join(snapshot, 'source', 'rc0-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  snapshot, revision: manifest.revision, sourceFiles: files.length,
  expectedTests: manifest.expectedTests, dependencyPackages: packages.length,
  dependencyFileCount, dependencyBytes, nativeAddons: 0, workspaceJunctions: 0,
}, null, 2));
