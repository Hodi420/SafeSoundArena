// aiClients/telegramConnector.js
// Basic Telegram bot connector for SafeSoundArena
const fetch = require('node-fetch');

class TelegramConnector {
  constructor(botToken) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  // Send a message to a chat
  async sendMessage(chatId, text) {
    await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  }

  // Get updates (basic polling)
  async getUpdates(offset = 0) {
    const res = await fetch(`${this.apiUrl}/getUpdates?offset=${offset}`);
    const data = await res.json();
    return data.result || [];
  }
}

module.exports = TelegramConnector;
