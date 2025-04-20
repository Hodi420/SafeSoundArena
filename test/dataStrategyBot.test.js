// test/dataStrategyBot.test.js
const assert = require('assert');
const DataStrategyBot = require('../aiClients/dataStrategyBot');

describe('DataStrategyBot', () => {
  it('should load and process data from array', async () => {
    const bot = new DataStrategyBot();
    let context = {
      data: [[10], [20], [30]],
      strategy: { name: 'sum' }
    };
    await bot.operate(context);
    const lastResult = bot.testResults[bot.testResults.length - 1];
    assert.strictEqual(lastResult.summary.total, 60);
    assert.strictEqual(lastResult.summary.count, 3);
    assert.strictEqual(lastResult.summary.avg, 20);
    assert.strictEqual(lastResult.summary.strategyUsed, 'sum');
  });

  it('should warn if no data provided', async () => {
    const bot = new DataStrategyBot();
    let warned = false;
    const origWarn = console.warn;
    console.warn = () => { warned = true; };
    await bot.operate({});
    console.warn = origWarn;
    assert.strictEqual(warned, true);
  });
});
