const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createProofLayer } = require('../server/proofLayer');

describe('ProofLayer', () => {
  let tempDir;
  let proofLayer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safesoundarena-proof-'));
    proofLayer = createProofLayer({ dataDir: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('chains activity, checkpoints, and bot responses with previousHash', () => {
    const first = proofLayer.logActivity({ event: 'command.create' }, { actor: 'admin', requestId: 'req-1' });
    const second = proofLayer.logCheckpoint({ label: 'post-build' }, { actor: 'admin', requestId: 'req-2' });
    const third = proofLayer.logBotResponse({ commandId: 'cmd-1', data: { ok: true } }, { actor: 'bot', requestId: 'req-3' });

    assert.strictEqual(first.previousHash, null);
    assert.strictEqual(second.previousHash, first.hash);
    assert.strictEqual(third.previousHash, second.hash);
    assert.deepStrictEqual(proofLayer.verifyChain(), {
      ok: true,
      count: 3,
      head: third.hash,
      failures: []
    });
  });

  it('supports SHA-512 checkpoints', () => {
    const checkpoint = proofLayer.logCheckpoint(
      { label: 'sha512-checkpoint', hashAlgorithm: 'sha512' },
      { actor: 'agent', requestId: 'req-4' },
      { algorithm: 'sha512' }
    );

    assert.strictEqual(checkpoint.algorithm, 'sha512');
    assert.strictEqual(checkpoint.hash.length, 128);
    assert.strictEqual(proofLayer.verifyChain().ok, true);
  });
});
