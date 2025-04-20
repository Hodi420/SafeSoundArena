// test/communityBot.test.js
const assert = require('assert');
const sinon = require('sinon');
const CommunityBot = require('../aiClients/communityBot');

describe('CommunityBot', () => {
  it('should respond to Telegram messages using LLM', async () => {
    // יצירת mocks ל-Telegram ול-LLM
    const fakeTg = {
      getUpdates: sinon.stub().resolves([
        { update_id: 1, message: { chat: { id: 123 }, text: 'Hello bot!' } }
      ]),
      sendMessage: sinon.stub().resolves()
    };
    const fakeLlm = { ask: sinon.stub().resolves('Hi community!') };
    const bot = new CommunityBot({ tgConnector: fakeTg, llmConnector: fakeLlm });
    await bot.pollAndRespond();
    assert(fakeTg.sendMessage.calledWith(123, 'Hi community!'));
  });
});
