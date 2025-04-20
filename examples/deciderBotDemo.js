// examples/deciderBotDemo.js
// Demo: DeciderBot as the authoritative consensus enforcer
require('dotenv').config({ path: '../.env' });
const DeciderBot = require('../aiClients/deciderBot');

const decider = new DeciderBot({ name: 'DeciderBot' });

(async () => {
  // דוגמה: קבלת החלטה קונצנזוסית והפעלה
  await decider.operate({ consensusPrompt: 'game_move north' });
  await decider.operate({ consensusPrompt: 'edit: README.md הוסף קרדיט לצוות הפיתוח' });

  // הצגת לוג החלטות
  console.log('Decision log:', decider.getDecisionLog());
})();
