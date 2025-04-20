// examples/communityBotDemo.js
// Demo: CommunityBot integration with Telegram and LLM (mocked)
require('dotenv').config({ path: '../.env' });
const CommunityBot = require('../aiClients/communityBot');

const bot = new CommunityBot({
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  llmOptions: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4.1' },
  language: 'he'
});

// Poll Telegram every 2 seconds
timer = setInterval(() => bot.pollAndRespond(), 2000);

console.log('CommunityBot is running! Send a message to your Telegram bot to see it in action.');
