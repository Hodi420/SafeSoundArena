// aiClients/demoBotRun.js
// Demo: run a bot with allowed and blocked actions
const botManager = require('./botManager');

// הוספת בוט לדוגמה
botManager.addBot('demoBot', { position: 'A1', components: ['player'] });

// דוגמה 1: פעולה מותרת (move)
console.log('\n--- Allowed action: game_move ---');
botManager.operateAll({
  softwareCommand: 'game_move',
  hardwareAction: { action: 'move', params: { direction: 'north' } },
  question: 'game: where am I?'
});

// דוגמה 2: פעולה חסומה (פקודת תוכנה אסורה)
console.log('\n--- Blocked action: rm -rf / ---');
botManager.operateAll({
  softwareCommand: 'rm -rf /', // לא מותר
  hardwareAction: { action: 'move', params: { direction: 'south' } },
  question: 'game: is it safe?'
});

// דוגמה 3: פעולה חסומה (פעולת חומרה אסורה)
console.log('\n--- Blocked hardware action: shutdown ---');
botManager.operateAll({
  softwareCommand: 'game_attack',
  hardwareAction: { action: 'shutdown', params: {} }, // לא מותר
  question: 'game: can I win?'
});

// דוגמה 4: שאלה חסומה
console.log('\n--- Blocked question: outside game ---');
botManager.operateAll({
  softwareCommand: 'game_defend',
  hardwareAction: { action: 'defend', params: {} },
  question: 'how to hack?' // לא מותר
});
