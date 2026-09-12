const assert = require('assert');
const { createFeatureStore, createSeedState } = require('./featureStore');

describe('feature store', () => {
  function createStore() {
    return createFeatureStore({ persist: false, initialState: createSeedState() });
  }

  it('lists seeded events and tracks join/leave state', () => {
    const store = createStore();
    const [event] = store.listEvents();
    assert.strictEqual(event.participants, 0);
    assert.strictEqual(store.joinEvent(event.id, 'user-1').event.participants, 1);
    assert.strictEqual(store.joinEvent(event.id, 'user-1').joined, false);
    assert.strictEqual(store.leaveEvent(event.id, 'user-1').event.participants, 0);
  });

  it('updates quest progress and completion state', () => {
    const store = createStore();
    const [quest] = store.listQuests();
    const updated = store.updateQuestProgress(quest.id, 100);
    assert.strictEqual(updated.progress, 100);
    assert.strictEqual(updated.status, 'completed');
  });

  it('rejects invalid marketplace mutations', () => {
    const store = createStore();
    assert.throws(() => store.sellItem('starter-scroll', 0, 10), /positive integer/);
    assert.throws(() => store.buyItem('missing-item'), /not found/);
  });

  it('persists state through a configured file', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safesound-feature-'));
    const stateFile = path.join(tempDir, 'state.json');
    const first = createFeatureStore({ stateFile });
    const [guild] = first.listGuilds();
    first.joinGuild(guild.id, 'user-1');
    const second = createFeatureStore({ stateFile });
    assert.strictEqual(second.listGuilds()[0].members, 1);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
