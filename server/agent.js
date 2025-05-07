const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./agent-config.json');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const AGENT_VERSION = '1.0.0';
const AGENT_ANALOGY = 'אני כמו רובוט עוזר אישי שמבצע משימות, בודק בריאות, ומספק מידע על עצמו.';
const AGENT_DESCRIPTION = 'Agent חכם להרצת פקודות, ניהול קבצים, אינטגרציה עם AI, ועוד.';
const AGENT_CAPABILITIES = [
  'open_game', 'move_file', 'delete_temp', 'run_update',
  'fetch_github', 'query_openai', 'query_ollama', 'fetch_url'
];

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

function isAllowed(command) {
  return config.allowedCommands.includes(command);
}

function isRestrictedPath(targetPath) {
  return config.restrictedFolders.some(folder =>
    path.resolve(targetPath).startsWith(path.resolve(folder))
  );
}

function isActiveHour() {
  const now = new Date();
  const [start, end] = config.activeHours;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

// Healthz endpoint (detailed)
app.get('/healthz', (req, res) => {
  res.json({
    status: 'online',
    version: AGENT_VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    agentId: config.agentId || 'unknown',
    type: config.type || 'generic',
    time: new Date().toISOString()
  });
});

// Meta endpoint
app.get('/meta', (req, res) => {
  res.json({
    agentId: config.agentId || 'unknown',
    type: config.type || 'generic',
    version: AGENT_VERSION,
    description: AGENT_DESCRIPTION,
    capabilities: AGENT_CAPABILITIES,
    tags: config.tags || [],
    analogy: AGENT_ANALOGY
  });
});

// Capabilities endpoint
app.get('/capabilities', (req, res) => {
  res.json({
    agentId: config.agentId || 'unknown',
    capabilities: AGENT_CAPABILITIES
  });
});

// Logs endpoint (last 100 lines)
app.get('/logs', (req, res) => {
  try {
    const logPath = path.resolve('agent.log');
    if (!fs.existsSync(logPath)) return res.json({ log: [] });
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
    res.json({ log: lines.slice(-100), requestId: req.requestId });
  } catch (e) {
    sendError(res, 500, 'Failed to read log', req, e.message);
  }
});

// Analogy endpoint
app.get('/analogy', (req, res) => {
  res.json({ analogy: AGENT_ANALOGY, description: AGENT_DESCRIPTION });
});

// Basic API key check middleware (optional, demo)
function apiKeyCheck(req, res, next) {
  if (config.apiKey && req.headers['x-api-key'] !== config.apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Unified error handler
function sendError(res, code, message, req, details) {
  res.status(code).json({
    error: message,
    requestId: req && req.requestId,
    details: details || undefined
  });
}

app.post('/api/agent', apiKeyCheck, (req, res) => {
  const { command, args, targetPath, confirm, apiKey } = req.body;
  if (!isAllowed(command)) return res.status(403).json({ error: 'Command not allowed' });
  if (targetPath && isRestrictedPath(targetPath)) return res.status(403).json({ error: 'Target path restricted' });
  if (!isActiveHour()) return res.status(403).json({ error: 'Outside active hours' });
  if (config.requireConfirmation.includes(command) && !confirm) {
    return res.status(403).json({ error: 'Confirmation required for this command' });
  }

  // Audit log
  fs.appendFileSync('agent.log', `${new Date().toISOString()} EXEC: ${command} ${args ? JSON.stringify(args) : ''} ${targetPath || ''}\n`);

  // Real execution for local commands
  if (command === 'open_game' && args && args.exePath) {
    // Example: Open a game executable
    exec(`start "" "${args.exePath}"`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Game launched: ${args.exePath}` });
    });
    return;
  }
  if (command === 'move_file' && args && args.src && args.dest) {
    // Move file
    fs.rename(args.src, args.dest, err => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ ok: true, message: `File moved from ${args.src} to ${args.dest}` });
    });
    return;
  }
  if (command === 'delete_temp' && args && args.file) {
    // Delete file
    fs.unlink(args.file, err => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ ok: true, message: `File deleted: ${args.file}` });
    });
    return;
  }
  if (command === 'run_update' && args && args.script) {
    // Run update script
    exec(`powershell ./scripts/${args.script}`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Update script executed: ${args.script}` });
    });
    return;
  }

  // Internet/API actions - now enabled!
  if (command === 'fetch_github') {
    if (!args || !args.repo) return res.status(400).json({ error: 'Missing repo' });
    exec(`git clone ${args.repo}`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Repo cloned: ${args.repo}` });
    });
    return;
  }
  if (command === 'query_openai') {
    if (!apiKey) return res.status(400).json({ error: 'API key required' });
    // Minimal OpenAI call (text completion)
    const https = require('https');
    const payload = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: args && args.prompt ? args.prompt : 'Hello!' }]
    });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const reqOpenAI = https.request(options, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json({ ok: true, result: parsed.choices ? parsed.choices[0].message.content : data });
        } catch {
          res.json({ ok: true, result: data });
        }
      });
    });
    reqOpenAI.on('error', e => res.status(500).json({ error: e.message }));
    reqOpenAI.write(payload);
    reqOpenAI.end();
    return;
  }
  if (command === 'query_ollama') {
    // Minimal Ollama local API call
    const http = require('http');
    const ollamaReq = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json({ ok: true, result: parsed.message || data });
        } catch {
          res.json({ ok: true, result: data });
        }
      });
    });
    ollamaReq.on('error', e => res.status(500).json({ error: e.message }));
    ollamaReq.write(JSON.stringify({ model: args && args.model ? args.model : 'llama2', messages: [{ role: 'user', content: args && args.prompt ? args.prompt : 'Hello Ollama!' }] }));
    ollamaReq.end();
    return;
  }
  if (command === 'fetch_url') {
    if (!args || !args.url) return res.status(400).json({ error: 'Missing URL' });
    const https = require('https');
    https.get(args.url, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => res.json({ ok: true, result: data.substring(0, 1000) })); // Limit output
    }).on('error', e => res.status(500).json({ error: e.message }));
    return;
  }

  // Unknown command
  res.status(400).json({ error: 'Unknown or unimplemented command' });
});

// Settings endpoints
app.get('/settings', (req, res) => {
  try {
    const settings = {
      agentId: config.agentId,
      type: config.type,
      activeHours: config.activeHours,
      allowedCommands: config.allowedCommands,
      requireConfirmation: config.requireConfirmation,
      tags: config.tags || [],
      webhookUrl: config.webhookUrl || null
    };
    res.json({ settings, requestId: req.requestId });
  } catch (e) {
    sendError(res, 500, 'Failed to get settings', req, e.message);
  }
});

app.post('/set', (req, res) => {
  try {
    const updates = req.body;
    const configPath = path.resolve('agent-config.json');
    const newConfig = { ...config, ...updates };
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    Object.assign(config, updates); // Update in-memory config
    res.json({ ok: true, updated: updates, requestId: req.requestId });
  } catch (e) {
    sendError(res, 500, 'Failed to update settings', req, e.message);
  }
});

// Webhook trigger endpoint
app.post('/webhook', (req, res) => {
  try {
    const event = req.body;
    if (!config.webhookUrl) return sendError(res, 400, 'No webhookUrl configured', req);
    const https = require('https');
    const url = new URL(config.webhookUrl);
    const data = JSON.stringify({ event, agentId: config.agentId, time: new Date().toISOString() });
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const webhookReq = https.request(options, resp => {
      let respData = '';
      resp.on('data', chunk => respData += chunk);
      resp.on('end', () => {
        res.json({ ok: true, webhookResponse: respData, requestId: req.requestId });
      });
    });
    webhookReq.on('error', e => sendError(res, 500, 'Webhook request failed', req, e.message));
    webhookReq.write(data);
    webhookReq.end();
  } catch (e) {
    sendError(res, 500, 'Failed to trigger webhook', req, e.message);
  }
});

// Self-update endpoint (stub)
app.post('/self-update', (req, res) => {
  // In real use: git pull, npm install, restart process, etc.
  res.json({ ok: true, message: 'Self-update triggered (stub)', requestId: req.requestId });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    endpoints: [
      {
        path: '/healthz', method: 'GET',
        description: 'Health check with status, version, uptime, memory, agentId, type, time',
        example_response: {
          status: 'online', version: '1.0.0', uptime: 123.45, memory: {}, agentId: '...', type: '...', time: '...'
        }
      },
      {
        path: '/meta', method: 'GET',
        description: 'Agent metadata: id, type, version, description, capabilities, tags, analogy',
        example_response: {
          agentId: '...', type: '...', version: '1.0.0', description: '...', capabilities: [], tags: [], analogy: '...'
        }
      },
      {
        path: '/capabilities', method: 'GET',
        description: 'List of supported commands/capabilities',
        example_response: { agentId: '...', capabilities: [] }
      },
      {
        path: '/logs', method: 'GET',
        description: 'Last 100 log lines',
        example_response: { log: ['...'], requestId: '...' }
      },
      {
        path: '/analogy', method: 'GET',
        description: 'Agent analogy and description',
        example_response: { analogy: '...', description: '...' }
      },
      {
        path: '/settings', method: 'GET',
        description: 'Get agent settings',
        example_response: { settings: {}, requestId: '...' }
      },
      {
        path: '/set', method: 'POST',
        description: 'Update agent settings',
        example_request: { allowedCommands: ['open_game'] },
        example_response: { ok: true, updated: {}, requestId: '...' }
      },
      {
        path: '/webhook', method: 'POST',
        description: 'Trigger webhook with event data',
        example_request: { event: { type: 'test', data: {} } },
        example_response: { ok: true, webhookResponse: '...', requestId: '...' }
      },
      {
        path: '/self-update', method: 'POST',
        description: 'Trigger self-update (stub)',
        example_response: { ok: true, message: 'Self-update triggered (stub)', requestId: '...' }
      },
      {
        path: '/api/agent', method: 'POST',
        description: 'Run a command (see /capabilities)',
        example_request: { command: 'open_game', args: { exePath: 'C:/game.exe' }, confirm: true },
        example_response: { ok: true, message: '...' }
      }
    ]
  });
});

module.exports = app;
