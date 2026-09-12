const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  JailTimeEventLog,
  isJailTimeEvent,
} = require('../backend/jailtime-events');

describe('JailTime event log', () => {
  it('persists lifecycle events and restores them from JSONL', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safesound-jailtime-'));
    const filePath = path.join(tempDir, 'jailtime-events.jsonl');
    const clock = () => new Date('2026-08-19T12:00:00.000Z');

    try {
      const log = new JailTimeEventLog({ filePath, clock });
      const stored = log.record({
        id: 'jail-event-1',
        type: 'jail.status.changed',
        source: 'backend.jail.scheduler',
        payload: { active: true },
      });

      assert.strictEqual(stored.schema, 'jailtime-event-v1');
      assert.strictEqual(stored.eventId, 'jail-event-1');
      assert.strictEqual(log.getStatus().count, 1);

      const restored = new JailTimeEventLog({ filePath, clock });
      assert.deepStrictEqual(restored.list(1)[0], stored);
      assert.strictEqual(restored.getStatus().status, 'ok');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps the log boundary limited to JailTime events', () => {
    assert.strictEqual(isJailTimeEvent({ type: 'jail.user.joined' }), true);
    assert.strictEqual(isJailTimeEvent({ source: 'backend.jail.socket', type: 'reward.preview.created' }), true);
    assert.strictEqual(isJailTimeEvent({ type: 'feature.event.joined' }), false);
  });
});
