// aiClients/communityBot.js
// Community interaction bot: connects Telegram, LLM, and game actions
const TelegramConnector = require('./telegramConnector');
const LLMConnector = require('./llmConnector');
const BotOperator = require('./botOperator');

class CommunityBot extends BotOperator {
  constructor(config = {}) {
    super(config);
    this.tg = config.tgConnector || new TelegramConnector(config.telegramToken);
    this.llm = config.llmConnector || new LLMConnector(config.llmOptions || {});
    this.lastUpdateId = 0;
    this.language = config.language || 'en';
  }

  // Poll for new Telegram messages and respond using LLM
  async pollAndRespond() {
    const updates = await this.tg.getUpdates(this.lastUpdateId + 1);
    for (const update of updates) {
      if (update.update_id > this.lastUpdateId) this.lastUpdateId = update.update_id;
      const msg = update.message;
      if (!msg || !msg.text) continue;
      // אפשר להוסיף כאן סינון פקודות/שאלות לפי כללי המשחק
      const prompt = msg.text;
      const response = await this.llm.ask(prompt, { language: this.language });
      await this.tg.sendMessage(msg.chat.id, response);
      // אפשר גם להפעיל פעולת משחק לפי פקודה מהקהילה
      if (prompt.startsWith('game_')) {
        this.actionExecutor.executeSoftwareAction(prompt, (err, out) => {
          if (!err) this.tg.sendMessage(msg.chat.id, `Game action executed: ${prompt}`);
        });
      }
    }
  }
}

module.exports = CommunityBot;
