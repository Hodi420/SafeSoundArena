'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { MshixOutbox } = require('../src/server/mshix/mshixOutbox');

describe('MSHIX durable outbox', () => {
  it('persists pending events and deduplicates them after reload', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mshix-outbox-'));
    const filePath = path.join(tempRoot, 'outbox.jsonl');
    const event = { id: 'evt-outbox-1', type: 'feature.event.joined', source: 'feature-api', payload: { safe: true } };
    const first = new MshixOutbox({ filePath });
    const entry = first.enqueue(event);
    const reloaded = new MshixOutbox({ filePath });
    const duplicate = reloaded.enqueue(event);

    assert.strictEqual(entry.id, duplicate.id);
    assert.strictEqual(duplicate.status, 'pending');
    assert.strictEqual(reloaded.getStatus().count, 1);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('retries a failed delivery after its backoff window', async () => {
    let now = Date.parse('2026-08-19T00:00:00.000Z');
    const outbox = new MshixOutbox({
      filePath: null,
      clock: () => now,
      retryBaseMs: 10,
      dispatchLeaseMs: 100,
      maxAttempts: 3,
    });
    const entry = outbox.enqueue({ id: 'evt-outbox-2', type: 'feature.event.joined', source: 'feature-api' });

    const failed = await outbox.dispatch(entry.id, async () => ({ status: 'failed' }));
    assert.strictEqual(failed.status, 'failed');
    assert.strictEqual(outbox.get(entry.id).attempts, 1);
    assert.strictEqual(outbox.listDue().length, 0);
    const deferred = await outbox.dispatch(entry.id, async () => ({ status: 'delivered' }));
    assert.strictEqual(deferred.deferred, true);

    now += 11;
    const replay = await outbox.replay(async (event, context) => ({
      status: 'delivered',
      eventId: event.id,
      replay: context.replay,
    }));

    assert.strictEqual(replay[0].status, 'delivered');
    assert.strictEqual(replay[0].attempts, 2);
    assert.strictEqual(outbox.get(entry.id).status, 'delivered');
  });

  it('marks an entry dead-letter after the attempt limit', async () => {
    const outbox = new MshixOutbox({ filePath: null, retryBaseMs: 1, maxAttempts: 1 });
    const entry = outbox.enqueue({ id: 'evt-outbox-3', type: 'feature.event.joined', source: 'feature-api' });
    const result = await outbox.dispatch(entry.id, async () => { throw new Error('permanent failure'); });

    assert.strictEqual(result.status, 'dead_letter');
    assert.strictEqual(outbox.get(entry.id).lastError.message, 'permanent failure');
  });
});
