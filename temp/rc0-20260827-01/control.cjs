'use strict';

// Host-side bounded control for this one scratch container only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const baseImage = 'sha256:bb264c2c70cecddaf517e2b548fb6217cc030b0a338b4d0fc3edf4cad9fa0837';
const preparedPath = path.join(__dirname, 'prepared-image.json');
const prepared = fs.existsSync(preparedPath) ? JSON.parse(fs.readFileSync(preparedPath, 'utf8')) : null;
const image = prepared ? prepared.image : baseImage;
const name = 'ssa-rc0-unit-20260827-03';
const label = 'unit-20260827-03';
if (prepared) {
  assert.equal(prepared.baseImage, baseImage);
  assert.match(prepared.image, /^sha256:[a-f0-9]{64}$/);
}
function docker(args, timeout = 45000) {
  return execFileSync('docker', ['--context', 'desktop-linux', ...args], {
    encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024,
  }).trim();
}
function inspected() {
  const state = JSON.parse(docker(['container', 'inspect', name], 10000))[0];
  assert.equal(state.Name, '/' + name);
  assert.equal(state.Config.Labels['local.safesoundarena.rc0'], label);
  assert.equal(state.Config.Image, image);
  assert.equal(state.Config.User, '65534:65534');
  assert.equal(state.HostConfig.NetworkMode, 'none');
  assert.equal(state.HostConfig.ReadonlyRootfs, true);
  assert.equal(state.HostConfig.Privileged, false);
  assert.equal(state.HostConfig.PublishAllPorts, false);
  assert.equal(Object.keys(state.HostConfig.PortBindings || {}).length, 0);
  assert.deepEqual(state.Config.Healthcheck.Test, ['NONE']);
  assert.deepEqual(state.Config.Entrypoint, ['/usr/local/bin/node']);
  assert.deepEqual(state.Config.Cmd, ['/check.cjs']);
  assert.equal(state.Config.WorkingDir, '/tmp');
  assert.equal(state.HostConfig.Memory, 536870912);
  assert.equal(state.HostConfig.MemorySwap, 536870912);
  assert.equal(state.HostConfig.NanoCpus, 1000000000);
  assert.equal(state.HostConfig.PidsLimit, 64);
  assert.equal(state.HostConfig.RestartPolicy.Name, 'no');
  assert(state.HostConfig.CapDrop.includes('ALL'));
  assert(state.HostConfig.SecurityOpt.includes('no-new-privileges:true'));
  assert.equal(state.Mounts.filter(mount => mount.Type !== 'tmpfs').length, 0, 'No host bind or volume is allowed.');
  assert.equal(state.HostConfig.Tmpfs['/app'], 'ro,nosuid,nodev,noexec,size=1048576,mode=0555');
  assert.equal(state.HostConfig.Tmpfs['/tmp'], 'rw,nosuid,nodev,noexec,size=134217728,mode=1777');
  assert(state.Config.Env.includes('NODE_OPTIONS=--max-old-space-size=384'));
  return state;
}
function record(file, value) {
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}

const phase = process.argv[2];
if (phase === 'package') {
  assert.equal(prepared, null, 'Refusing to replace a prepared image.');
  const prepName = 'ssa-rc0-package-20260827-01';
  const prepId = docker([
    'create', '--name', prepName, '--label', 'local.safesoundarena.rc0=package-20260827-01',
    '--pull', 'never', '--network', 'none', '--no-healthcheck', '--restart', 'no',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--user', '65534:65534',
    '--entrypoint', '/bin/false', baseImage,
  ]);
  assert.match(prepId, /^[a-f0-9]{64}$/);
  function verifyPackagingContainer() {
    const state = JSON.parse(docker(['container', 'inspect', prepId], 10000))[0];
    assert.equal(state.Id, prepId);
    assert.equal(state.Name, '/' + prepName);
    assert.equal(state.Config.Labels['local.safesoundarena.rc0'], 'package-20260827-01');
    assert.equal(state.State.Status, 'created', 'Packaging container must NEVER execute.');
    assert.equal(state.State.Running, false);
    assert.equal(state.HostConfig.NetworkMode, 'none');
    assert.equal(state.Mounts.length, 0);
    assert.equal(Object.keys(state.HostConfig.PortBindings || {}).length, 0);
    assert.deepEqual(state.Config.Entrypoint, ['/bin/false']);
    assert.deepEqual(state.Config.Healthcheck.Test, ['NONE']);
  }
  verifyPackagingContainer();
  for (const [source, destination] of [
    ['snapshot-02/source', '/input'], ['snapshot-02/deps', '/deps'], ['check.cjs', '/check.cjs'],
  ]) {
    docker(['cp', path.resolve(__dirname, source), prepId + ':' + destination]);
    verifyPackagingContainer();
  }
  const imageLines = docker(['commit', '--no-pause', prepId]).split('\n').filter(line => /^sha256:[a-f0-9]{64}$/.test(line));
  assert.equal(imageLines.length, 1, 'Expected one immutable local image ID.');
  const preparedImage = imageLines[0];
  verifyPackagingContainer();
  const evidence = { image: preparedImage, baseImage, prepId, prepName, neverStarted: true, noHostMounts: true, copyOnly: true };
  record('prepared-image.json', evidence);
  console.log(JSON.stringify(evidence, null, 2));
} else if (phase === 'create') {
  assert(prepared, 'A separately verified copy-only image is required.');
  const imageState = JSON.parse(docker(['image', 'inspect', image], 10000))[0];
  assert.equal(imageState.Id, image);
  assert.equal(Object.keys(imageState.Config.Volumes || {}).length, 0);
  const allowedKeys = ['PATH', 'NODE_VERSION', 'YARN_VERSION', 'NODE_ENV', 'NODE_OPTIONS'];
  assert(imageState.Config.Env.every(value => allowedKeys.includes(value.split('=', 1)[0])));
  const args = [
    'create', '--name', name, '--label', 'local.safesoundarena.rc0=' + label,
    '--pull', 'never', '--network', 'none', '--no-healthcheck', '--read-only',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--user', '65534:65534',
    '--memory', '512m', '--memory-swap', '512m', '--cpus', '1', '--pids-limit', '64', '--restart', 'no',
    '--tmpfs', '/app:ro,nosuid,nodev,noexec,size=1048576,mode=0555',
    '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=134217728,mode=1777',
    '--workdir', '/tmp', '--entrypoint', '/usr/local/bin/node',
  ];
  for (const value of [
    'NODE_ENV=production', 'NODE_OPTIONS=--max-old-space-size=384', 'NODE_PATH=/deps',
    'TMPDIR=/tmp', 'MOCHA_OPTIONS=', 'GLOBAL_AI_ENABLED=false', 'AI_CONTROL_ROOM_ENV=production',
    'AGENT_LEASE_MONITOR=false', 'MSHIX_ALLOW_UNAUTHENTICATED_DEV=false',
    'MSHIX_BRAIN_AUTO_ENRICH=false', 'MSHIX_BRAIN_STORE_PAYLOAD=false',
    'SAFESOUND_DATA_DIR=/tmp/rc0-data', 'AI_ADMIN_AUDIT_LOG_PATH=/tmp/rc0-audit.jsonl',
    'AI_ADMIN_RUNTIME_STATE_PATH=/tmp/rc0-runtime.json', 'MSHIX_BRAIN_STORE_PATH=/tmp/rc0-brain.jsonl',
    'MSHIX_OUTBOX_PATH=/tmp/rc0-outbox.jsonl', 'OLLAMA_BASE_URL=http://127.0.0.1:9',
  ]) args.push('--env', value);
  args.push(image, '/check.cjs');
  const id = docker(args);
  assert.match(id, /^[a-f0-9]{64}$/);
  const state = inspected();
  assert.equal(state.State.Status, 'created');
  const evidence = {
    id, name, image, state: state.State.Status,
    network: state.HostConfig.NetworkMode, readonlyRootfs: true, noHostMounts: true,
    healthcheckDisabled: true, publishedPorts: 0, uid: state.Config.User,
    cpuLimit: 1, memoryLimitMiB: 512, pidLimit: 64, noRestart: true, appMasked: true,
  };
  record('container-created-03.json', evidence);
  console.log(JSON.stringify(evidence, null, 2));
} else if (phase === 'copy') {
  assert(prepared && prepared.neverStarted && prepared.copyOnly);
  const before = inspected();
  assert.equal(before.State.Status, 'created');
  const after = inspected();
  assert.equal(after.Id, before.Id);
  assert.equal(after.State.Status, 'created');
  record('copy-complete.json', { id: after.Id, copiedOnlySanitizedScratch: true, state: 'created' });
  console.log('Copy-only input image verified; readonly test container has never been started.');
} else if (phase === 'run') {
  const before = inspected();
  assert.equal(before.State.Status, 'created');
  assert(fs.existsSync(path.join(__dirname, 'copy-complete.json')));
  let output = '';
  try {
    output = docker(['start', '--attach', before.Id], 45000);
  } catch (error) {
    // Only this verified, uniquely named scratch container can be stopped.
    const current = inspected();
    assert.equal(current.Id, before.Id);
    if (current.State.Running) docker(['stop', '--time', '2', current.Id], 10000);
    output = docker(['logs', before.Id], 10000);
    fs.writeFileSync(path.join(__dirname, 'unit-output.log'), output + '\n', { flag: 'wx' });
    console.log(output);
    throw new Error('Bounded unit run failed or reached its host deadline; no app-stack fallback was attempted.');
  }
  fs.writeFileSync(path.join(__dirname, 'unit-output.log'), output + '\n', { flag: 'wx' });
  const after = inspected();
  assert.equal(after.State.Running, false);
  assert.equal(after.State.OOMKilled, false);
  assert.equal(after.State.ExitCode, 0);
  const resultLine = output.split('\n').find(line => line.startsWith('RC0_RESULT '));
  assert(resultLine, 'Missing test evidence.');
  const result = JSON.parse(resultLine.slice('RC0_RESULT '.length));
  assert.equal(result.status, 'PASSED_BOUNDED_UNIT_GATE');
  record('unit-result.json', { ...result, id: after.Id, exited: true, exitCode: after.State.ExitCode, hostDeadlineSeconds: 45 });
  console.log(output);
} else {
  throw new Error('Choose one explicit phase: package, create, copy, run.');
}
