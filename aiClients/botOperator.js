// aiClients/botOperator.js
// Generic Operator Bot for SafeSoundArena

const actionExecutor = require('./actionExecutor');

class BotOperator {
  constructor(config = {}) {
    this.position = config.position || null;
    this.components = config.components || [];
    this.active = true;
    this.actionExecutor = actionExecutor;
  }

  setPosition(newPosition) {
    this.position = newPosition;
  }

  addComponent(component) {
    if (!this.components.includes(component)) {
      this.components.push(component);
    }
  }

  removeComponent(component) {
    this.components = this.components.filter(c => c !== component);
  }

  applySettings(settings) {
    Object.assign(this, settings);
  }

  operate(context) {
    if (!this.active) return;
    // Example logic: log current state
    console.log(`Bot at position: ${this.position}, components: ${this.components.join(', ')}`);
    // Example: run a software action if requested in context
    if (context && context.softwareCommand) {
      this.actionExecutor.executeSoftwareAction(context.softwareCommand, (err, out, errout) => {
        if (err) console.error('Command failed:', err);
        else console.log('Command output:', out);
      });
    }
    // Example: run a hardware action if requested in context
    if (context && context.hardwareAction) {
      this.actionExecutor.executeHardwareAction(context.hardwareAction.action, context.hardwareAction.params);
    }
    // Add your operational logic here
  }
}


module.exports = BotOperator;
