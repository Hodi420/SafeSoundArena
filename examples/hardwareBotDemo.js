// examples/hardwareBotDemo.js
// Demo: BotOperator controlling a mock hardware action (e.g. Arduino)
const BotOperator = require('../aiClients/botOperator');
const ActionExecutor = require('../aiClients/actionExecutor');

const bot = new BotOperator({
  name: 'HardwareDemoBot',
  actionExecutor: new ActionExecutor()
});

// דוגמה לפעולה חומרתית (פקודת shell או שליחת פקודה לארדואינו)
bot.actionExecutor.executeHardwareAction({
  action: 'led_on',
  device: 'arduino',
  params: { pin: 13 }
}, (err, result) => {
  if (err) {
    console.error('Hardware action failed:', err);
  } else {
    console.log('Hardware action result:', result);
  }
});

console.log('HardwareDemoBot tried to turn on LED on Arduino (mocked).');
