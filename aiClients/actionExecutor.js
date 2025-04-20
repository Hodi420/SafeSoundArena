// aiClients/actionExecutor.js
// Universal executor for software and hardware actions
const { exec } = require('child_process');

class ActionExecutor {
  // Software action: run OS command
  executeSoftwareAction(command, callback) {
    exec(command, (error, stdout, stderr) => {
      if (callback) callback(error, stdout, stderr);
    });
  }

  // Hardware action: example for Arduino (requires serialport)
  async executeHardwareAction(action, params) {
    if (action === 'arduino-led') {
      try {
        const SerialPort = require('serialport');
        const port = new SerialPort(params.port, { baudRate: 9600 });
        port.write(params.data, () => port.close());
      } catch (e) {
        console.error('Arduino action failed:', e);
      }
    }
    // Extend here: add more hardware actions (GPIO, camera, sensors, etc)
  }
}

module.exports = new ActionExecutor();
