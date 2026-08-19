'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JsonlMemoryStore } = require('../src/server/mshix/brainMemoryStore');
const { MshixBrainKernel } = require('../src/server/mshix/brainKernel');

function event(overrides = {}) {
  return {
    id: 'evt-brain-1',
    type: 'feature.event.joined',
    source: 'feature-api',
    actor: { type: 'user', id: 'user-1' },
    occurredAt: '2026-08-19T00:00:00.000Z',
    execution: false,
    risk: 'low',
    payload: { memoryText: 'User joined the Carnival Arena.', secret: 'never store this by default' },
    ...overrides,
  };
}

describe('MSHIX Brain Kernel', () => {
  it('stores bounded observations without requiring Ollama or payload persistence', () => {
    const store = new JsonlMemoryStore({ filePath: null, maxMemories: 2 });
    const brain = new MshixBrainKernel({ memoryStore: store });
    const receipt = brain.ingest(event());

    assert.strictEqual(receipt.acknowledged, true);
    assert.strictEqual(receipt.enrichment, 'disabled');
    const memory = store.get(receipt.memoryId);
    assert.strictEqual(memory.status, 'observed');
    assert.strictEqual(memory.text, 'User joined the Carnival Arena.');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(memory, 'payload'), false);
    assert.strictEqual(brain.getStatus().store.count, 1);
  });

  it('deduplicates replayed events using stable event-derived memory identity', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mshix-brain-replay-'));
    const filePath = path.join(tempRoot, 'memory.jsonl');
    const store = new JsonlMemoryStore({ filePath });
    const brain = new MshixBrainKernel({ memoryStore: store });

    const first = brain.ingest(event());
    const reloadedStore = new JsonlMemoryStore({ filePath });
    const reloadedBrain = new MshixBrainKernel({ memoryStore: reloadedStore });
    const replay = reloadedBrain.ingest(event());

    assert.strictEqual(replay.duplicate, true);
    assert.strictEqual(replay.memoryId, first.memoryId);
    assert.strictEqual(reloadedStore.getStatus().count, 1);
    assert.strictEqual(reloadedBrain.getStatus().metrics.observed, 0);
    assert.strictEqual(reloadedBrain.getStatus().metrics.duplicates, 1);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('does not publish an in-memory revision when the durable append fails', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mshix-brain-'));
    const blockedParent = path.join(tempRoot, 'blocked');
    fs.writeFileSync(blockedParent, 'not-a-directory', 'utf8');
    const store = new JsonlMemoryStore({ filePath: path.join(blockedParent, 'memory.jsonl') });

    assert.throws(() => store.upsert({ id: 'memory-1', text: 'must not be visible' }));
    assert.strictEqual(store.getStatus().count, 0);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('enriches and retrieves memories through injected local-model boundaries', async () => {
    const store = new JsonlMemoryStore({ filePath: null });
    const provider = {
      chatModel: 'fake-chat',
      embeddingModel: 'fake-embed',
      chatJson: async () => ({ summary: 'Arena join recorded', facts: ['A user joined'], tags: ['arena'], importance: 2 }),
      embed: async (input) => (input.toLowerCase().includes('arena') ? [1, 0] : [0, 1]),
    };
    const brain = new MshixBrainKernel({ memoryStore: store, provider, autoEnrich: true });
    const receipt = brain.ingest(event());
    await brain.drain();

    const memory = store.get(receipt.memoryId);
    assert.strictEqual(memory.status, 'enriched');
    assert.strictEqual(memory.model, 'fake-chat');
    assert.deepStrictEqual(memory.embedding, [1, 0]);
    const results = await brain.search('arena', 5);
    assert.strictEqual(results[0].id, receipt.memoryId);
    assert.strictEqual(brain.getStatus().metrics.enriched, 1);
  });

  it('keeps ingestion available when enrichment fails', async () => {
    const store = new JsonlMemoryStore({ filePath: null });
    const brain = new MshixBrainKernel({
      memoryStore: store,
      provider: { chatModel: 'offline', chatJson: async () => { throw new Error('offline'); } },
      autoEnrich: true,
    });
    const receipt = brain.ingest(event({ id: 'evt-brain-2' }));
    await brain.drain();

    assert.strictEqual(store.get(receipt.memoryId).status, 'enrichment_failed');
    assert.strictEqual(brain.getStatus().metrics.observed, 1);
    assert.strictEqual(brain.getStatus().metrics.enrichmentFailed, 1);
  });

  it('keeps successful partial enrichment when the second model operation fails', async () => {
    const store = new JsonlMemoryStore({ filePath: null });
    const provider = {
      chatModel: 'fake-chat',
      embeddingModel: 'fake-embed',
      async chatJson() {
        return { summary: 'persisted summary', tags: ['persisted'] };
      },
      async embed() {
        throw Object.assign(new Error('embedding unavailable'), { code: 'EMBED_UNAVAILABLE' });
      },
    };
    const brain = new MshixBrainKernel({ memoryStore: store, provider, autoEnrich: true });

    const receipt = brain.ingest(event({ id: 'evt-brain-partial' }));
    await brain.drain();
    const memory = store.get(receipt.memoryId);

    assert.strictEqual(memory.status, 'enriched_partial');
    assert.strictEqual(memory.summary, 'persisted summary');
    assert.strictEqual(memory.enrichmentError.code, 'EMBED_UNAVAILABLE');
    assert.strictEqual(brain.getStatus().metrics.enriched, 1);
    assert.strictEqual(brain.getStatus().metrics.enrichmentFailed, 1);
  });
});
