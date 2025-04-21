// aiClients/botManager.js
// BotManager for SafeSoundArena - handles dynamic bot creation, removal, update, and operation

const BotOperator = require('./botOperator');

const ALLOWED_ACTIONS = [
  'move', 'attack', 'defend', 'use-item', 'chat',
  'heal', 'trade', 'equip', 'unequip', 'scan', 'build', 'upgrade',
  'interact', 'collect', 'explore', 'navigate', 'broadcast',
  'emote', 'ping', 'defuse', 'revive', 'assist',
  // ניתן להוסיף כאן פעולות נוספות בעתיד
];

class BotManager {
  constructor() {
    this.bots = {};
    this.lastActionTimestamps = {}; // תזמון אחרון לכל בוט
    this.actionCooldownMs = 500; // מניעת הצפה: 500ms בין פעולות
  }

  addBot(name, config = {}) {
    if (!this.bots[name]) {
      this.bots[name] = new BotOperator(config);
    }
  }

  removeBot(name) {
    delete this.bots[name];
  }

  updateBot(name, settings) {
    if (this.bots[name]) {
      this.bots[name].applySettings(settings);
    }
  }

  setBotPosition(name, position) {
    if (this.bots[name]) {
      this.bots[name].setPosition(position);
    }
  }

  addBotComponent(name, component) {
    if (this.bots[name]) {
      this.bots[name].addComponent(component);
    }
  }

  removeBotComponent(name, component) {
    if (this.bots[name]) {
      this.bots[name].removeComponent(component);
    }
  }

  activateBot(name) {
    if (this.bots[name]) {
      this.bots[name].active = true;
    }
  }

  deactivateBot(name) {
    if (this.bots[name]) {
      this.bots[name].active = false;
    }
  }

  operateAll(context) {
    Object.entries(this.bots).forEach(([name, bot]) => {
      // בקרת תזמון – מניע הצפה
      const now = Date.now();
      if (!this.lastActionTimestamps[name]) this.lastActionTimestamps[name] = 0;
      if (now - this.lastActionTimestamps[name] < this.actionCooldownMs) {
        // דילוג – מוקדם מדי
        return;
      }
      // סינון פקודות/שאלות – רק מה שמותר במשחק
      if (context) {
        // בדיקת פקודת תוכנה
        if (context.softwareCommand && !this.isAllowedSoftwareCommand(context.softwareCommand)) {
          console.warn(`Bot ${name}: software command not allowed:`, context.softwareCommand);
          return;
        }
        // בדיקת פעולה בחומרה
        if (context.hardwareAction && !ALLOWED_ACTIONS.includes(context.hardwareAction.action)) {
          console.warn(`Bot ${name}: hardware action not allowed:`, context.hardwareAction.action);
          return;
        }
        // בדיקת סוג שאלה/תקשורת (דוגמה: רק שאלות שמתחילות ב-"game:")
        if (context.question && !this.isAllowedQuestion(context.question)) {
          console.warn(`Bot ${name}: question not allowed:`, context.question);
          return;
        }
      }
      // הכל תקין – הפעל את הבוט
      bot.operate(context);
      this.lastActionTimestamps[name] = now;
    });
  }

  // בדיקת פקודות תוכנה מותרות (דוגמה: רק פקודות שמתחילות ב-game_)
  isAllowedSoftwareCommand(cmd) {
    // אפשר להחמיר/להקל לפי הצורך
    return typeof cmd === 'string' && cmd.startsWith('game_');
  }

  // בדיקת שאלות מותרות (דוגמה: רק שאלות שמתחילות ב-'game:' או שמכילות מילים מסוימות)
  isAllowedQuestion(q) {
    if (typeof q !== 'string') return false;
    return q.trim().toLowerCase().startsWith('game:');
  }

  getBot(name) {
    return this.bots[name];
  }

  listBots() {
    return Object.keys(this.bots);
  }
}

module.exports = new BotManager();
