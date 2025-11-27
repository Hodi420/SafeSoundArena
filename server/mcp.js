console.log('Starting server initialization...');

// Load environment variables first
console.log('Loading environment variables...');
require('dotenv').config();

// Verify required environment variables
const requiredEnvVars = ['PORT', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Load dependencies with error handling
function requireWithLog(moduleName) {
  console.log(`Loading ${moduleName}...`);
  try {
    const module = require(moduleName);
    console.log(`Successfully loaded ${moduleName}`);
    return module;
  } catch (error) {
    console.error(`Error loading ${moduleName}:`, error);
    process.exit(1);
  }
}

// Load all dependencies
const express = requireWithLog('express');
const fetch = requireWithLog('node-fetch');
const { execFile } = requireWithLog('child_process');
const simpleGit = requireWithLog('simple-git');
const swaggerUi = requireWithLog('swagger-ui-express');
const fs = requireWithLog('fs');
const path = requireWithLog('path');
const { v4: uuidv4 } = requireWithLog('uuid');
const winston = requireWithLog('winston');
const cors = requireWithLog('cors');
const helmet = requireWithLog('helmet');
const morgan = requireWithLog('morgan');
const rateLimit = requireWithLog('express-rate-limit');
const promClient = requireWithLog('prom-client');

console.log('All dependencies loaded successfully');

console.log('Initializing Express app...');
const app = express();

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '256kb' }));
console.log('Express middleware configured');

const agents = [
  { name: 'Agent1', url: 'http://localhost:3001' },
  { name: 'Agent2', url: 'http://localhost:3002' },
];
console.log('Agents configured');

// Winston logger (JSON)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Correlation/Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// CORS allowlist (comma-separated origins) or allow all if not set
const allowedOrigins = (process.env.MCP_CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions =
  allowedOrigins.length === 0
    ? {}
    : {
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
      };
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 600 }));

// Feature flags
function isEnabled(envKey, defaultValue = false) {
  const v = process.env[envKey];
  if (v === undefined) return defaultValue;
  return String(v).toLowerCase() === 'true';
}

// API key protection (optional). If MCP_API_KEY is set, require it for non-public paths
const PUBLIC_PATHS = new Set(['/healthz', '/metrics']);
app.use((req, res, next) => {
  const isDocs = req.path === '/docs' || req.path.startsWith('/docs/');
  if (PUBLIC_PATHS.has(req.path) || isDocs) return next();
  const requiredKey = process.env.MCP_API_KEY;
  if (!requiredKey) return next();
  const provided = req.header('x-api-key');
  if (provided && provided === requiredKey) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Prometheus metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
});

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, code: res.statusCode });
    try {
      logger.info('request_completed', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
      });
    } catch (_) {}
  });
  next();
});

// Graceful JSON parse errors (return 400 instead of HTML error page)
app.use((err, req, res, next) => {
  const isJsonParse = err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError);
  const status =
    err && (err.status || err.statusCode) ? err.status || err.statusCode : isJsonParse ? 400 : 500;
  const message = isJsonParse
    ? 'Invalid JSON body'
    : err && err.message
      ? err.message
      : 'Internal Server Error';
  if (res.headersSent) return next(err);
  return res.status(status).json({ error: message });
});

// Minimal OpenAPI spec for docs
const swaggerSpec = {
  openapi: '3.0.0',
  info: { title: 'SafeSoundArena MCP', version: '1.0.0' },
  paths: {
    '/healthz': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/metrics': {
      get: { summary: 'Prometheus metrics', responses: { 200: { description: 'Metrics' } } },
    },
    '/api/mcp/agents': {
      get: { summary: 'List agents status', responses: { 200: { description: 'Statuses' } } },
    },
    '/api/mcp/agents/{name}/command': {
      post: {
        summary: 'Send command to agent',
        parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true },
        responses: { 200: { description: 'Response from agent' } },
      },
    },
    '/api/mcp/shell': {
      post: {
        summary: 'Execute shell command',
        requestBody: { required: true },
        responses: { 200: { description: 'Shell output' } },
      },
    },
    '/api/mcp/git': {
      post: {
        summary: 'Run git action',
        requestBody: { required: true },
        responses: { 200: { description: 'Git result' } },
      },
    },
    '/api/mcp/http/get': {
      post: {
        summary: 'HTTP GET (read-only, allowlist + size/timeout limits)',
        requestBody: { required: true },
        responses: { 200: { description: 'HTTP response' } },
      },
    },
    '/api/mcp/fs/read': {
      post: {
        summary: 'Read a text file (read-only, dev use)',
        requestBody: { required: true },
        responses: { 200: { description: 'File content' } },
      },
    },
  },
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (e) {
    res.status(500).send('Metrics error');
  }
});

// קבלת סטטוס מכל ה-Agents
app.get('/api/mcp/agents', async (req, res) => {
  const statuses = await Promise.all(
    agents.map(async (agent) => {
      try {
        const r = await fetch(agent.url + '/healthz');
        const status = await r.json();
        return { ...agent, status: status.status, time: status.time };
      } catch {
        return { ...agent, status: 'offline' };
      }
    })
  );
  res.json(statuses);
});

// שליחת פקודה ל-Agent
app.post('/api/mcp/agents/:name/command', async (req, res) => {
  const agent = agents.find((a) => a.name === req.params.name);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    const r = await fetch(agent.url + '/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.json({ ok: true, response: data });
  } catch (err) {
    res.status(500).json({ error: 'Agent unreachable' });
  }
});

// ---- Open-source helpers: shell and git (MCP-style endpoints) ----
app.post('/api/mcp/shell', async (req, res) => {
  if (!isEnabled('MCP_ENABLE_SHELL', false)) {
    return res
      .status(403)
      .json({ error: 'Shell access disabled. Set MCP_ENABLE_SHELL=true to enable.' });
  }
  const { cmd, args = [], cwd = process.cwd(), timeoutMs = 60000 } = req.body || {};
  if (!cmd) return res.status(400).json({ error: 'Missing cmd' });
  try {
    const child = execFile(
      cmd,
      args,
      { cwd, timeout: timeoutMs, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          return res
            .status(500)
            .json({ error: 'Shell error', details: err.message, stdout, stderr });
        }
        res.json({ code: 0, output: stdout, stderr });
      }
    );
    child.on('error', (e) => {
      res.status(500).json({ error: 'Spawn error', details: e.message });
    });
  } catch (e) {
    res.status(500).json({ error: 'Shell error', details: e.message });
  }
});

app.post('/api/mcp/git', async (req, res) => {
  if (!isEnabled('MCP_ENABLE_GIT', false)) {
    return res
      .status(403)
      .json({ error: 'Git access disabled. Set MCP_ENABLE_GIT=true to enable.' });
  }
  const { action, repoPath = process.cwd(), payload = {} } = req.body || {};
  try {
    const git = simpleGit({ baseDir: repoPath });
    let result;
    switch (action) {
      case 'status':
        result = await git.status();
        break;
      case 'pull':
        result = await git.pull();
        break;
      case 'push':
        result = await git.push();
        break;
      case 'checkout':
        result = await git.checkout(payload.branch || 'main');
        break;
      case 'log':
        result = await git.log({ n: payload.n || 20 });
        break;
      default:
        return res.status(400).json({ error: 'Unsupported action' });
    }
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: 'Git error', details: e.message });
  }
});

// Read-only HTTP GET with allowlist
app.post('/api/mcp/http/get', async (req, res) => {
  if (!isEnabled('MCP_ENABLE_HTTP', false)) {
    return res
      .status(403)
      .json({ error: 'HTTP client disabled. Set MCP_ENABLE_HTTP=true to enable.' });
  }
  try {
    const { url, headers = {} } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });
    const u = new URL(url);
    const allow = (process.env.MCP_HTTP_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allow.length === 0 || !allow.includes(u.hostname)) {
      return res.status(403).json({ error: 'Host not allowed' });
    }
    const r = await fetch(url, { method: 'GET', headers, timeout: 10000, size: 262144 });
    const text = await r.text();
    res.json({
      ok: true,
      status: r.status,
      headers: Object.fromEntries(Object.entries(r.headers.raw ? r.headers.raw() : {})),
      body: text,
    });
  } catch (e) {
    res.status(500).json({ error: 'HTTP error', details: e.message });
  }
});

app.post('/api/mcp/fs/read', async (req, res) => {
  const { relPath = '', maxBytes = 65536 } = req.body || {};
  try {
    const base = process.cwd();
    const resolved = path.resolve(base, relPath);
    if (!resolved.startsWith(base))
      return res.status(400).json({ error: 'Path traversal blocked' });
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) return res.status(400).json({ error: 'Not a file' });
    const size = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(resolved, 'r');
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    fs.closeSync(fd);
    res.json({ ok: true, path: relPath, size, content: buf.toString('utf8') });
  } catch (e) {
    res.status(500).json({ error: 'FS error', details: e.message });
  }
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const port = Number(process.env.PORT || 3005);
if (require.main === module) {
  app.listen(port, () => console.log(`MCP running on port ${port}`));
}

module.exports = { app };
