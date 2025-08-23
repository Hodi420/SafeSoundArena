const { createServer } = require('http');
const { spawn } = require('child_process');
const assert = require('assert');

// Configuration
const PORT = 3000;
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

// Start the server
const serverProcess = spawn('node', ['server.js'], {
  env: { 
    ...process.env, 
    PORT,
    NODE_ENV: 'test',
    LOG_LEVEL: 'error' // Only show errors during tests
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

// Store server output
let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

// Wait for server to start
function waitForServer() {
  return new Promise((resolve) => {
    const checkServer = setInterval(() => {
      if (serverOutput.includes(`Server running at http://0.0.0.0:${PORT}`)) {
        clearInterval(checkServer);
        resolve();
      }
    }, 100);
  });
}

// Make HTTP request
async function makeRequest(method, path, body = null) {
  const url = new URL(path, BASE_URL);
  
  return new Promise((resolve, reject) => {
    const req = createServer({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            data = JSON.parse(data);
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('Starting server tests...');
  
  try {
    // Wait for server to start
    await waitForServer();
    console.log('Server started successfully');

    // Test 1: Health check endpoint
    console.log('\nTest 1: Health check endpoint');
    const healthResponse = await makeRequest('GET', '/api/health');
    assert.strictEqual(healthResponse.statusCode, 200);
    assert.strictEqual(healthResponse.body.status, 'ok');
    console.log('✅ Health check passed');

    // Test 2: Status endpoint
    console.log('\nTest 2: Status endpoint');
    const statusResponse = await makeRequest('GET', '/api/status');
    assert.strictEqual(statusResponse.statusCode, 200);
    assert.ok(statusResponse.body.uptime > 0);
    console.log('✅ Status check passed');

    // Test 3: Not found route
    console.log('\nTest 3: Not found route');
    const notFoundResponse = await makeRequest('GET', '/nonexistent-route');
    assert.strictEqual(notFoundResponse.statusCode, 404);
    console.log('✅ Not found handling works');

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Clean up
    serverProcess.kill();
    console.log('\nServer stopped');
  }
}

// Run the tests
runTests();
