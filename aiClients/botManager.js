// Minimal BotManager implementation used by tests.
// This removes the dependency on backend/backend_tmp and provides the
// small API that the unit tests exercise.

const api = {
  bots: {},
  lastActionTimestamps: {},
  actionCooldownMs: 0,

  addBot(id, info) {
    this.bots[id] = Object.assign({ active: true }, info);
    return this.bots[id];
  },

  removeBot(id) {
    delete this.bots[id];
  },

  updateBot(id, updates) {
    if (!this.bots[id]) return;
    Object.assign(this.bots[id], updates);
  },

  // Simple whitelist: allow game_* software commands and basic 'move' hardware action.
  _isWhitelisted(payload) {
    if (!payload) return false;
    const sc = payload.softwareCommand;
    const ha = payload.hardwareAction && payload.hardwareAction.action;
    if (typeof sc === 'string' && sc.startsWith('game_')) return true;
    if (ha === 'move') return true;
    return false;
  },

  operateAll(payload) {
    const now = Date.now();
    for (const id of Object.keys(this.bots)) {
      const bot = this.bots[id];
      if (!bot || bot.active === false) continue;
      const last = this.lastActionTimestamps[id] || 0;
      if (this.actionCooldownMs && now - last < this.actionCooldownMs) continue;
      if (!this._isWhitelisted(payload)) continue;
      if (typeof bot.operate === 'function') {
        try {
          bot.operate(payload);
        } catch (e) {
          /* ignore errors from test stubs */
        }
        this.lastActionTimestamps[id] = Date.now();
      }
    }
  },
};

module.exports = api;
