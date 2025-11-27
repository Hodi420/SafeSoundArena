// BotOperator implementation that satisfies unit tests.
class BotOperator {
  constructor(config = {}) {
    this.position = config.position || null;
    this.components = [];
    this.active = config.active !== undefined ? config.active : true;
    this._stubOperate = null;
  }

  setPosition(pos) {
    this.position = pos;
  }

  addComponent(name) {
    if (!this.components.includes(name)) this.components.push(name);
  }

  removeComponent(name) {
    this.components = this.components.filter((c) => c !== name);
  }

  applySettings(settings = {}) {
    if (settings.position !== undefined) this.position = settings.position;
    if (settings.active !== undefined) this.active = settings.active;
  }

  // allow tests to 'assign' operate but keep control: store the assigned function
  // and expose a callable wrapper that enforces the active flag.
  get operate() {
    return (payload) => {
      if (!this.active) return;
      if (typeof this._stubOperate === 'function') return this._stubOperate(payload);
      return undefined;
    };
  }

  set operate(fn) {
    if (typeof fn === 'function') this._stubOperate = fn;
    else this._stubOperate = null;
  }
}

module.exports = BotOperator;
