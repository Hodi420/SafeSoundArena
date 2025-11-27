console.log('Node.js test successful!');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

// Try to create a simple HTTP server
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Node.js!');
});

const PORT = 3001;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});

// Close server after 5 seconds
setTimeout(() => {
  console.log('Closing test server');
  server.close();
  process.exit(0);
}, 5000);
