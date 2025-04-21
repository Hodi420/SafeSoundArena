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

  async operate(context) {
    if (!this.active) return;
    // Example logic: log current state
    console.log(`Bot at position: ${this.position}, components: ${this.components.join(', ')}`);
    // 1. תקשורת עם מנגנון קונצנזוס אם נדרש
    if (context && context.consensusPrompt) {
      await this.applyConsensusDecision(context.consensusPrompt, context);
      return;
    }
    // 2. פעולה רגילה: פקודות תוכנה
    if (context && context.softwareCommand) {
      this.actionExecutor.executeSoftwareAction(context.softwareCommand, (err, out, errout) => {
        if (err) console.error('Command failed:', err);
        else console.log('Command output:', out);
      });
    }
    // 3. פעולה רגילה: פקודות חומרה
    if (context && context.hardwareAction) {
      this.actionExecutor.executeHardwareAction(context.hardwareAction.action, context.hardwareAction.params);
    }
    // Add your operational logic here
  }

  /**
   * מבצע פעולה/עריכה לפי החלטת הקונצנזוס
   * @param {string} prompt - השאלה/הנחיה שעליה יתקבל קונצנזוס
   * @param {object} context - קונטקסט נוסף (אופציונלי)
   */
  async applyConsensusDecision(prompt, context = {}) {
    try {
      const { getConsensus } = require('../consensus');
      const result = await getConsensus(prompt);
      if (result && result.consensus) {
        // דוגמה: אם התשובה היא פעולה תוכנתית
        if (result.consensus.startsWith('game_')) {
          this.actionExecutor.executeSoftwareAction(result.consensus, (err, out, errout) => {
            if (err) console.error('Consensus action failed:', err);
            else console.log('Consensus action output:', out);
          });
        } else if (result.consensus.startsWith('edit:')) {
          // דוגמה: עריכת קובץ או תוכן לפי החלטת הקונצנזוס
          const editInstruction = result.consensus.slice(5).trim();
          console.log('Consensus edit instruction:', editInstruction);
          // כאן אפשר להרחיב ל-edit בפועל בקבצים/DB וכו'
        } else {
          console.log('Consensus decision:', result.consensus);
        }
      } else {
        console.warn('No consensus decision could be applied.');
      }
    } catch (e) {
      console.error('Consensus integration error:', e);
    }
  }
}


module.exports = BotOperator;
