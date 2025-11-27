class CommunityBot {
  constructor({ tgConnector, llmConnector } = {}) {
    this.tg = tgConnector;
    this.llm = llmConnector;
  }

  async pollAndRespond() {
    if (!this.tg || !this.llm) throw new Error('connectors required');
    const updates = await this.tg.getUpdates();
    for (const u of updates || []) {
      const chatId = u.message && u.message.chat && u.message.chat.id;
      const text = u.message && u.message.text;
      const reply = await this.llm.ask(text);
      await this.tg.sendMessage(chatId, reply);
    }
  }
}

module.exports = CommunityBot;
