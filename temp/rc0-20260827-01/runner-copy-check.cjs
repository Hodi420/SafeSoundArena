'use strict';

// Unit checks only. The host must verify Docker's isolation before starting
// this runner. These guards add detection; they do not replace that isolation.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

assert.equal(process.getuid(), 65534, 'Runner must be non-root.');
assert.match(process.version, /^v24\./);
assert.equal(process.cwd(), '/tmp');
assert.equal(process.env.NODE_PATH, '/deps');
assert.deepEqual(fs.readdirSync('/app'), [], 'Image application/data must be masked.');
assert(Object.values(os.networkInterfaces()).flat().every(address => address.internal), 'Unexpected network interface.');
assert(!fs.readFileSync('/proc/net/route', 'utf8').trim().split('\n').slice(1).some(row => row.trim()), 'Unexpected IPv4 route.');
assert(!fs.existsSync('/input/.env'));

for (const target of ['/input/.rc0-readonly-probe', '/deps/.rc0-readonly-probe', '/app/.rc0-readonly-probe']) {
  assert.throws(() => fs.writeFileSync(target, 'probe', { flag: 'wx' }), error => ['EROFS', 'EACCES'].includes(error.code));
}
const manifest = JSON.parse(fs.readFileSync('/input/rc0-manifest.json', 'utf8'));
assert.equal(manifest.files.length, 29);
assert.equal(manifest.tests.length, 10);
assert.equal(manifest.expectedTests, 46);
for (const file of manifest.files) {
  assert(!file.path.includes('..') && file.path.endsWith('.js'));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join('/input', file.path))).digest('hex');
  assert.equal(hash, file.sha256, 'Source snapshot differs from recorded input.');
}

const networkAttempts = [];
function deny(operation) {
  return () => {
    networkAttempts.push(operation);
    throw Object.assign(new Error('RC0_NETWORK_OR_PROCESS_DENIED: ' + operation), { code: 'RC0_NETWORK_OR_PROCESS_DENIED' });
  };
}
globalThis.fetch = deny('fetch');
const net = require('node:net');
net.connect = deny('net.connect');
net.createConnection = deny('net.createConnection');
net.Socket.prototype.connect = deny('Socket.connect');
net.Server.prototype.listen = deny('Server.listen');
const tls = require('node:tls');
tls.connect = deny('tls.connect');
for (const moduleName of ['node:http', 'node:https']) {
  const module = require(moduleName);
  module.request = deny(moduleName + '.request');
  module.get = deny(moduleName + '.get');
}
require('node:dgram').createSocket = deny('dgram.createSocket');
const dns = require('node:dns');
for (const method of ['lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'reverse']) {
  dns[method] = deny('dns.' + method);
  if (dns.promises[method]) dns.promises[method] = deny('dns.promises.' + method);
}
const children = require('node:child_process');
for (const method of ['exec', 'execFile', 'execSync', 'execFileSync', 'fork', 'spawn', 'spawnSync']) children[method] = deny('child_process.' + method);

const watchdog = setTimeout(() => {
  console.error('RC0_DEADLINE_EXCEEDED');
  process.exit(124);
}, 60000);
watchdog.unref();

console.log('RC0_ISOLATION_PRECHECK ' + JSON.stringify({
  node: process.version, uid: process.getuid(), networkInterfaces: Object.keys(os.networkInterfaces()),
  imageApplicationMasked: true, inputReadOnly: true, dependenciesReadOnly: true,
  sourceFilesVerified: manifest.files.length, noApplicationEntrypoint: true,
}));

const Mocha = require('/deps/mocha');
const mocha = new Mocha({ reporter: 'spec', timeout: 5000, parallel: false, color: false, forbidOnly: true, forbidPending: true });
for (const test of manifest.tests) mocha.addFile(path.join('/input', test));
const runner = mocha.run(failures => {
  clearTimeout(watchdog);
  const stats = runner.stats;
  const valid = failures === 0 && stats.tests === manifest.expectedTests && stats.pending === 0 && networkAttempts.length === 0;
  console.log('RC0_RESULT ' + JSON.stringify({
    revision: manifest.revision, tests: stats.tests, passes: stats.passes,
    failures: stats.failures, pending: stats.pending,
    networkOrProcessAttempts: networkAttempts, durationMs: stats.duration,
    status: valid ? 'PASSED_BOUNDED_UNIT_GATE' : 'INCOMPLETE_OR_FAILED',
    appServersStarted: false, publishedPorts: 0,
    note: 'Unit/storage fixtures only; not HTTP/UI, Compose runtime, model, CI, or deployment validation.',
  }));
  process.exitCode = valid ? 0 : 1;
});
