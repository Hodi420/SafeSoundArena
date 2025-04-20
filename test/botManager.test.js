// test/botManager.test.js
const assert = require('assert');
const botManager = require('../aiClients/botManager');
const BotOperator = require('../aiClients/botOperator');

describe('BotManager', () => {
  beforeEach(() => {
    // איפוס בוטים לפני כל בדיקה
    botManager.bots = {};
    botManager.lastActionTimestamps = {};
  });

  it('should add and remove bots', () => {
    botManager.addBot('test1', { position: 'A1' });
    assert.ok(botManager.bots['test1']);
    botManager.removeBot('test1');
    assert.ok(!botManager.bots['test1']);
  });

  it('should update bot settings', () => {
    botManager.addBot('test2', { position: 'B2' });
    botManager.updateBot('test2', { position: 'C3', active: false });
    assert.strictEqual(botManager.bots['test2'].position, 'C3');
    assert.strictEqual(botManager.bots['test2'].active, false);
  });

  it('should only allow whitelisted actions', () => {
    botManager.addBot('test3', { position: 'D4' });
    let operated = false;
    botManager.bots['test3'].operate = () => { operated = true; };
    // פעולה מותרת
    botManager.operateAll({ softwareCommand: 'game_move', hardwareAction: { action: 'move' }, question: 'game: hi' });
    assert.strictEqual(operated, true);
    // פעולה אסורה
    operated = false;
    botManager.operateAll({ softwareCommand: 'rm -rf /', hardwareAction: { action: 'shutdown' }, question: 'how to hack?' });
    assert.strictEqual(operated, false);
  });

  it('should respect action cooldown', (done) => {
    botManager.addBot('test4', { position: 'E5' });
    let count = 0;
    botManager.bots['test4'].operate = () => { count++; };
    botManager.actionCooldownMs = 100; // 100ms
    botManager.operateAll({ softwareCommand: 'game_move', hardwareAction: { action: 'move' }, question: 'game: hi' });
    botManager.operateAll({ softwareCommand: 'game_move', hardwareAction: { action: 'move' }, question: 'game: hi' });
    setTimeout(() => {
      botManager.operateAll({ softwareCommand: 'game_move', hardwareAction: { action: 'move' }, question: 'game: hi' });
      assert.strictEqual(count, 2);
      done();
    }, 120);
  });
});
