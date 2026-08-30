// app.js - SafeSoundArena backend bootstrap
// נקודת כניסה ראשית לשרת ולמודולים המרכזיים
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// ייבוא מודולים עיקריים (skeleton)
const scrollsEngine = require('./scrolls-engine');
const { createJailTimeEventLog } = require('./jailtime-events');
const proofOfActivity = require('./proof-of-activity');
const shameHonorBoards = require('./shame-honor-boards');
const { createFeatureRouter } = require('./api/featureRoutes');
const { createAiAdminGovernanceRouter } = require('../src/server/aiAdminGovernance');
const { createMshixRouter, MshixCore } = require('../src/server/mshix');
const { AgentExecutionController } = require('../src/server/agentExecutionController');
const { MshixBrainKernel } = require('../src/server/mshix/brainKernel');
const { JsonlMemoryStore } = require('../src/server/mshix/brainMemoryStore');
const { OllamaProvider } = require('../src/server/mshix/ollamaProvider');
const { MshixOutbox } = require('../src/server/mshix/mshixOutbox');
const { appendAuditEvent } = require('../src/server/aiAdminAudit');

// מודול ניהול הרשאות MCP
const mcpPermissions = require('./mcp-permissions');
// Optional development seed. Never mutate permission state during production startup.
if (process.env.SEED_MCP_PERMISSIONS === 'true') {
  mcpPermissions.addPermission('devUser', 'admin');
  mcpPermissions.addPermission('devUser', 'write');
  mcpPermissions.addPermission('testUser', 'read');
}

let jailActive = false;
let usersInJail = {};
let jailStartTime = null;
let jailEndTime = null;
let scheduledTimeouts = []; // Track timeouts for cleanup
let mshixOutboxReplayTimer = null;

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = allowedOrigins.length > 0
  ? allowedOrigins
  : process.env.NODE_ENV === 'production'
    ? false
    : true;
app.use(cors({ origin: corsOrigin, optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(helmet());
const aiAdminRuntime = {};
const aiAdminAuditLogPath =
  process.env.AI_ADMIN_AUDIT_LOG_PATH ||
  path.join(
    process.env.SAFESOUND_DATA_DIR || path.join(__dirname, 'api', 'data'),
    'ai-admin-audit-log.jsonl'
  );
const safeSoundDataDir = process.env.SAFESOUND_DATA_DIR || path.join(__dirname, 'api', 'data');
const jailTimeEvents = createJailTimeEventLog({
  filePath: process.env.JAILTIME_LOG_PATH || path.join(safeSoundDataDir, 'jailtime-events.jsonl'),
  maxEntries: process.env.JAILTIME_LOG_MAX_ENTRIES,
});
const brainKernel = new MshixBrainKernel({
  memoryStore: new JsonlMemoryStore({
    filePath: process.env.MSHIX_BRAIN_STORE_PATH || path.join(safeSoundDataDir, 'mshix-brain-memory.jsonl'),
    maxMemories: process.env.MSHIX_BRAIN_MAX_MEMORIES,
  }),
  provider: new OllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL,
    chatModel: process.env.MSHIX_BRAIN_CHAT_MODEL || process.env.OLLAMA_MODEL,
    embeddingModel: process.env.MSHIX_BRAIN_EMBED_MODEL,
    timeoutMs: process.env.OLLAMA_REQUEST_TIMEOUT_MS,
  }),
  autoEnrich: String(process.env.MSHIX_BRAIN_AUTO_ENRICH || 'false').toLowerCase() === 'true',
  storePayload: String(process.env.MSHIX_BRAIN_STORE_PAYLOAD || 'false').toLowerCase() === 'true',
  maxQueue: process.env.MSHIX_BRAIN_QUEUE_LIMIT,
});
const mshixOutbox = new MshixOutbox({
  filePath: process.env.MSHIX_OUTBOX_PATH || path.join(safeSoundDataDir, 'mshix-outbox.jsonl'),
  maxEntries: process.env.MSHIX_OUTBOX_MAX_ENTRIES,
  maxAttempts: process.env.MSHIX_OUTBOX_MAX_ATTEMPTS,
  retryBaseMs: process.env.MSHIX_OUTBOX_RETRY_BASE_MS,
  dispatchLeaseMs: process.env.MSHIX_OUTBOX_DISPATCH_LEASE_MS,
});
const aiAdminRouter = createAiAdminGovernanceRouter({
    runtime: aiAdminRuntime,
    auditLogPath: aiAdminAuditLogPath,
    heartbeatTimeoutMs: process.env.AGENT_HEARTBEAT_TIMEOUT_MS,
    leaseSweepIntervalMs: process.env.AGENT_LEASE_SWEEP_INTERVAL_MS,
    autoStartLeaseMonitor: String(process.env.AGENT_LEASE_MONITOR || 'true').toLowerCase() !== 'false',
    persistenceEnabled: String(process.env.AI_ADMIN_PERSISTENCE || 'true').toLowerCase() !== 'false',
    runtimeStatePath:
      process.env.AI_ADMIN_RUNTIME_STATE_PATH ||
      path.join(
      process.env.SAFESOUND_DATA_DIR || path.join(__dirname, 'api', 'data'),
        'ai-admin-runtime-state.json'
      ),
  });

const executionController = new AgentExecutionController({
  lifecycleController: aiAdminRuntime.lifecycle,
  safetyController: aiAdminRuntime.safety,
});
aiAdminRuntime.executionController = executionController;

const mshix = new MshixCore({
  lifecycleController: aiAdminRuntime.lifecycle,
  safetyController: aiAdminRuntime.safety,
  executionController,
  jailStateProvider: () => jailActive,
  maxEventBytes: process.env.MSHIX_MAX_EVENT_BYTES,
  maxHistory: process.env.MSHIX_EVENT_HISTORY_LIMIT,
  handlerTimeoutMs: process.env.MSHIX_HANDLER_TIMEOUT_MS,
  audit: ({ event, admission, status, deliveries, controller }) => appendAuditEvent(
    aiAdminAuditLogPath,
    'mshix.event.accepted',
    {
      actor: event.actor,
      requestId: event.correlationId,
      details: { event, admission, status, deliveries, controller },
    }
  ),
});

function registerObserverConnector(input) {
  mshix.registerConnector({
    ...input,
    handler: async (event) => ({
      acknowledged: true,
      mode: 'observer',
      connectorId: input.id,
      eventId: event.id,
      eventType: event.type,
    }),
  });
}

registerObserverConnector({
  id: 'ai-control-room',
  description: 'Governance and lifecycle visibility boundary.',
  eventTypes: ['ai.*', 'agent.*', 'mshix.*'],
  capabilities: ['governance', 'lifecycle', 'safety'],
});
registerObserverConnector({
  id: 'jail-time',
  description: 'Jail state and participant signal boundary.',
  eventTypes: ['jail.*'],
  capabilities: ['jail-state', 'participant-signals'],
});
registerObserverConnector({
  id: 'pqs',
  description: 'PQS match, proof and anti-abuse signal boundary.',
  eventTypes: ['pqs.*', 'match.*', 'proof.*'],
  capabilities: ['proof', 'anti-abuse'],
});
registerObserverConnector({
  id: 'feature-store',
  description: 'Feature-store mutation and product activity boundary.',
  eventTypes: ['feature.*', 'guild.*', 'marketplace.*', 'quest.*', 'challenge.*', 'notification.*'],
  capabilities: ['events', 'marketplace', 'guilds', 'quests', 'challenges'],
});
registerObserverConnector({
  id: 'blockchain',
  description: 'Future reward and proof anchoring boundary.',
  eventTypes: ['reward.*', 'proof.*'],
  capabilities: ['reward-anchor'],
});
mshix.registerConnector({
  id: 'mshix-brain',
  description: 'Local memory, enrichment and retrieval boundary. Never executes work.',
  eventTypes: ['*'],
  capabilities: ['memory', 'summarization', 'embeddings', 'retrieval'],
  health: async () => brainKernel.getHealth(),
  handler: async (event) => brainKernel.ingest(event),
});

function publishMshixEvent(event) {
  if (event && (typeof event.type === 'string' && event.type.startsWith('jail.')) || event?.source?.startsWith('backend.jail.')) {
    try {
      jailTimeEvents.record(event);
    } catch (error) {
      console.error('[jailtime-log] event append failed:', error.message);
    }
  }
  return mshix.publish(event).catch((error) => {
    console.error(`[mshix] ${error.code || 'EVENT_FAILED'}: ${error.message}`);
    return { accepted: false, error: error.code || 'MSHIX_EVENT_FAILED' };
  });
}

async function dispatchOutboxEvent(event) {
  const entry = mshixOutbox.enqueue(event);
  return mshixOutbox.dispatch(entry.id, (outboxEvent, context) => mshix.publish({
    ...outboxEvent,
    replay: context.replay,
  }));
}

async function replayMshixOutbox() {
  return mshixOutbox.replay((outboxEvent, context) => mshix.publish({
    ...outboxEvent,
    replay: context.replay,
  }), { limit: process.env.MSHIX_OUTBOX_REPLAY_BATCH });
}

app.use('/api', createFeatureRouter({
  onMutation: dispatchOutboxEvent,
}));
app.use('/api/ai-admin', aiAdminRouter);
app.use(
  '/api/mshix',
  createMshixRouter({
    mshix,
    brainKernel,
    outbox: mshixOutbox,
    environment: process.env.AI_CONTROL_ROOM_ENV || process.env.NODE_ENV || 'development',
  })
);

const outboxReplayIntervalMs = Number.parseInt(process.env.MSHIX_OUTBOX_REPLAY_INTERVAL_MS || '5000', 10);
if (Number.isInteger(outboxReplayIntervalMs) && outboxReplayIntervalMs > 0) {
  mshixOutboxReplayTimer = setInterval(() => {
    replayMshixOutbox().catch((error) => console.error('[mshix-outbox] replay failed:', error.message));
  }, outboxReplayIntervalMs);
  if (typeof mshixOutboxReplayTimer.unref === 'function') mshixOutboxReplayTimer.unref();
  setImmediate(() => {
    replayMshixOutbox().catch((error) => console.error('[mshix-outbox] startup replay failed:', error.message));
  });
}

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: corsOrigin } });

// Helper: Validate userId and role format
function isValidUserId(userId) {
  return typeof userId === 'string' && userId.length > 0 && userId.length <= 255;
}

function isValidRole(role) {
  return typeof role === 'string' && ['admin', 'write', 'read', 'edit'].includes(role);
}

// --- MCP Permissions API ---
// רשימת כל המשתמשים עם הרשאות
app.get('/api/mcp/users', (req, res) => {
  res.json({ users: mcpPermissions.getAllUsers() });
});

// הוספת הרשאה למשתמש
app.post('/api/mcp/permissions', (req, res) => {
  const { userId, role } = req.body;
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid userId' });
  if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
  mcpPermissions.addPermission(userId, role);
  res.json({ success: true, userId, role });
});

// הסרת הרשאה ממשתמש
app.delete('/api/mcp/permissions', (req, res) => {
  const { userId, role } = req.body;
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid userId' });
  if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
  mcpPermissions.removePermission(userId, role);
  res.json({ success: true, userId, role });
});

// דוגמת API לבדיקה
app.get('/api/mcp/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid userId' });
  res.json({ userId, roles: mcpPermissions.getUserRoles(userId) });
});

// דוגמת API לבדוק הרשאה
app.get('/api/mcp/has-permission/:userId/:role', (req, res) => {
  const { userId, role } = req.params;
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid userId' });
  if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' });
  res.json({ userId, role, has: mcpPermissions.hasPermission(userId, role) });
});

// דוגמה: חיבור API של Jail Time Events
app.post('/api/jail', rateLimit({ windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const authHeader = req.headers.authorization;
  const token = process.env.ADMIN_TOKEN;
  if (!authHeader || !token) {
    console.log('Missing auth header or ADMIN_TOKEN');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const headerToken = authHeader.replace('Bearer ', '');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(token))) {
      console.log('Unauthorized /api/jail attempt');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } catch (err) {
    console.log('Token comparison failed:', err.message);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  jailActive = !!req.body.active;
  console.log(`Jail manually set to ${jailActive}`);
  io.emit('jailStatus', { active: jailActive });
  publishMshixEvent({
    type: 'jail.status.changed',
    source: 'backend.jail',
    actor: { type: 'admin', id: 'jail-api' },
    payload: { active: jailActive, mode: 'manual' },
  });
  if (!jailActive) {
    usersInJail = {};
    console.log('Users in jail cleared');
  }
  res.json({ success: true, active: jailActive });
});

app.get('/api/jail-status', (req, res) => {
  res.json({ active: jailActive });
});

app.get('/api/health', (req, res) => {
  const mshixStatus = mshix.getStatus();
  const brainStatus = brainKernel.getStatus();
  const outboxStatus = mshixOutbox.getStatus();
  const jailTimeLogStatus = jailTimeEvents.getStatus();
  const outboxDegraded = (outboxStatus.counts.failed || 0) > 0 || (outboxStatus.counts.dead_letter || 0) > 0;
  const jailTimeLogDegraded = jailTimeLogStatus.status !== 'ok';
  res.json({
    status: outboxDegraded || jailTimeLogDegraded ? 'degraded' : 'ok',
    service: 'safesoundarena-api',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    jailActive,
    userCount: Object.keys(usersInJail).length,
    mshix: {
      status: mshixStatus.status,
      version: mshixStatus.version,
      connectorCount: mshixStatus.connectorCount,
      metrics: mshixStatus.metrics,
    },
     brain: {
      status: brainStatus.status,
      autoEnrich: brainStatus.autoEnrich,
      memoryCount: brainStatus.store?.count || 0,
       queueDepth: brainStatus.queueDepth,
     },
      outbox: outboxStatus,
    jailTimeLog: jailTimeLogStatus,
  });
});

// --- Jail Scheduler ---
function calculateReward(userCount) {
  return Math.floor(100 + 15 * userCount + 0.5 * userCount * userCount);
}

function clearScheduledTimeouts() {
  scheduledTimeouts.forEach(id => clearTimeout(id));
  scheduledTimeouts = [];
}

function scheduleJail() {
  clearScheduledTimeouts(); // Clean up any previous schedule
  const msToNextJail = 70 * 60 * 1000; // 70 minutes

  let t1 = setTimeout(() => {
    console.log('Jail starting soon in 60 seconds');
    io.emit('jailStartingSoon', { in: 60, startTime: Date.now() + 60 * 1000 });
    publishMshixEvent({
      type: 'jail.warning',
      source: 'backend.jail.scheduler',
      payload: { secondsUntilStart: 60 },
    });

    let t2 = setTimeout(() => {
      jailActive = true;
      jailStartTime = Date.now();
      jailEndTime = jailStartTime + 10 * 60 * 1000;
      console.log('Jail started');
      io.emit('jailStatus', { active: true, startTime: jailStartTime, endTime: jailEndTime });
      publishMshixEvent({
        type: 'jail.status.changed',
        source: 'backend.jail.scheduler',
        payload: { active: true, startTime: jailStartTime, endTime: jailEndTime },
      });

      let t3 = setTimeout(() => {
        jailActive = false;
        console.log('Jail ended');
        io.emit('jailStatus', { active: false });
        publishMshixEvent({
          type: 'jail.status.changed',
          source: 'backend.jail.scheduler',
          payload: { active: false, endedAt: Date.now() },
        });

        let t4 = setTimeout(() => {
          const userCount = Object.keys(usersInJail).length;
          const reward = calculateReward(userCount);
          console.log(`Sending rewards: ${reward} for ${userCount} users`);
          io.emit('jailReward', { reward, userCount });
          publishMshixEvent({
            type: 'reward.preview.created',
            source: 'backend.jail.scheduler',
            payload: { reward, userCount },
          });
          scheduleJail();
        }, 60 * 1000);
        scheduledTimeouts.push(t4);
      }, 10 * 60 * 1000);
      scheduledTimeouts.push(t3);
    }, 60 * 1000);
    scheduledTimeouts.push(t2);
  }, msToNextJail);
  scheduledTimeouts.push(t1);
}

scheduleJail();

io.on('connection', (socket) => {
  socket.emit('jailStatus', { active: jailActive });
  socket.on('joinJail', (profile) => {
    usersInJail[socket.id] = profile;
    io.emit('jailUsers', Object.values(usersInJail));
    publishMshixEvent({
      type: 'jail.user.joined',
      source: 'backend.jail.socket',
      actor: { type: 'user', id: typeof profile?.id === 'string' ? profile.id : 'anonymous' },
      payload: { participantCount: Object.keys(usersInJail).length },
    });
  });
  socket.on('leaveJail', () => {
    delete usersInJail[socket.id];
    io.emit('jailUsers', Object.values(usersInJail));
    publishMshixEvent({
      type: 'jail.user.left',
      source: 'backend.jail.socket',
      payload: { participantCount: Object.keys(usersInJail).length },
    });
  });
  socket.on('jailMessage', (msg) => {
    try {
      // Only forward safe string fields; do not spread raw client object
      const safe = {
        text: typeof msg.text === 'string' ? msg.text.slice(0, 500) : '',
        username: typeof msg.username === 'string' ? msg.username.slice(0, 64) : 'anonymous',
        timestamp: Date.now(),
      };
      io.emit('jailMessage', safe);
    } catch (err) {
      console.error('Error broadcasting jailMessage:', err.message);
    }
  });
  socket.on('disconnect', () => {
    delete usersInJail[socket.id];
    io.emit('jailUsers', Object.values(usersInJail));
    publishMshixEvent({
      type: 'jail.user.disconnected',
      source: 'backend.jail.socket',
      payload: { participantCount: Object.keys(usersInJail).length },
    });
  });
});

const PORT = Number.parseInt(process.env.PORT || '4000', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`SafeSoundArena backend running on http://${HOST}:${PORT}`));

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  clearScheduledTimeouts();
  if (mshixOutboxReplayTimer) clearInterval(mshixOutboxReplayTimer);
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  clearScheduledTimeouts();
  if (mshixOutboxReplayTimer) clearInterval(mshixOutboxReplayTimer);
  server.close(() => process.exit(0));
});
