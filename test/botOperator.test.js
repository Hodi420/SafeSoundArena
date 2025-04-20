// test/botOperator.test.js
const assert = require('assert');
const BotOperator = require('../aiClients/botOperator');

describe('BotOperator', () => {
  it('should set position correctly', () => {
    const bot = new BotOperator();
    bot.setPosition('B2');
    assert.strictEqual(bot.position, 'B2');
  });

  it('should add and remove components', () => {
    const bot = new BotOperator();
    bot.addComponent('vision');
    bot.addComponent('audio');
    assert.deepStrictEqual(bot.components, ['vision', 'audio']);
    bot.removeComponent('vision');
    assert.deepStrictEqual(bot.components, ['audio']);
  });

  it('should apply settings', () => {
    const bot = new BotOperator();
    bot.applySettings({ position: 'C3', active: false });
    assert.strictEqual(bot.position, 'C3');
    assert.strictEqual(bot.active, false);
  });

  it('should not operate when inactive', () => {
    const bot = new BotOperator({ active: false });
    let operated = false;
    bot.operate = () => { operated = true; };
    bot.active = false;
    bot.operate();
    assert.strictEqual(operated, false);
  });
});
