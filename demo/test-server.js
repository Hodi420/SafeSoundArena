const WebSocket = require('ws');

console.log('Testing WebSocket server...');

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', function open() {
  console.log('Connected to server');

  // Test connection message
  ws.send(
    JSON.stringify({
      type: 'test',
      payload: { message: 'Hello Server!' },
    })
  );
});

ws.on('message', function incoming(data) {
  console.log('Received:', data.toString());

  // Close the connection after receiving a message
  ws.close();
});

ws.on('close', function close() {
  console.log('Connection closed');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
