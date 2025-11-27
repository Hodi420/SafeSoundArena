// examples/communityBotDemo-mock.js
// Safe mock demo for CommunityBot — runs locally without Telegram/OpenAI keys.
const CommunityBot = require('../aiClients/communityBot');

const fakeTg = {
  getUpdates: async () => {
    return [{ update_id: 1, message: { chat: { id: 123 }, text: 'Hello bot (mock)!' } }];
  },
  sendMessage: async (chatId, msg) => {
    console.log(`[mock] sendMessage -> chatId=${chatId} msg=${msg}`);
  },
};

const fakeLlm = {
  ask: async (text) => {
    return `MockLLM reply to: ${text}`;
  },
};

async function runMock() {
  const bot = new CommunityBot({ tgConnector: fakeTg, llmConnector: fakeLlm });
  console.log('Running CommunityBot mock demo — polling once and responding...');
  await bot.pollAndRespond();
  console.log('Mock demo finished.');
}

runMock().catch((err) => {
  console.error('Mock demo error:', err);
  process.exit(1);
});
