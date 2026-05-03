const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const policy = require('./ai-admin-policy.json');

const router = express.Router();
const DATA_DIR = path.join(__dirname, 'data');
const COMMANDS_FILE = path.join(DATA_DIR, 'ai-admin-commands.json');
const AUDIT_FILE = path.join(DATA_DIR, 'ai-admin-audit.jsonl');

const STATUSES = new Set([
  'pending_approval',
  'ready',
  'approved',
  'rejected',
  'executed',
  'answered',
  'expired',
  'proposed'
]);
const RISK_ORDER = ['low', 'medium', 'high', 'critical'];

router.use((req, res, next) => {
  req.requestId = req.requestId || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

function ok(req, res, data, status = 200) {
  return res.status(status).json({ requestId: req.requestId, error: null, data });
}

function fail(req, res, status, message, details) {
  return res.status(status).json({
    requestId: req.requestId,
    error: { message, details: details || null },
    data: null
  });
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCommands() {
  ensureDataDir();
  if (!fs.existsSync(COMMANDS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCommands(commands) {
  ensureDataDir();
  fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

function writeAudit(event, req, details = {}) {
  ensureDataDir();
  const entry = {
    id: crypto.randomUUID(),
    event,
    actor: req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'unknown',
    requestId: req.requestId,
    ip: req.ip,
    at: new Date().toISOString(),
    ...details
  };
  fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`);
  return entry;
}

function readAudit(limit = 100) {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) return [];
  const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(line => JSON.parse(line)).reverse();
}

function adminRequired(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return fail(req, res, 403, 'Admin approval required');
  }
  return next();
}

function agentOrAdminRequired(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  const agentToken = req.headers['x-agent-token'];
  if (process.env.ADMIN_TOKEN && adminToken === process.env.ADMIN_TOKEN) return next();
  if (process.env.AI_AGENT_TOKEN && agentToken === process.env.AI_AGENT_TOKEN) return next();
  return fail(req, res, 403, 'AI agent or admin token required');
}

function isKnownCommand(command) {
  return (
    policy.allowedReadOnly.includes(command) ||
    policy.allowedLowRiskWithAgentToken.includes(command) ||
    policy.requiresHumanApproval.includes(command) ||
    policy.forbiddenForAiExecution.includes(command)
  );
}

function normalizeRisk(command, requestedRisk) {
  const risk = requestedRisk || policy.riskDefaults[command] || 'medium';
  return RISK_ORDER.includes(risk) ? risk : 'medium';
}

function normalizeCommand(input) {
  return String(input.command || input.action || '').trim();
}

function assessCommand(input) {
  const command = normalizeCommand(input);
  if (!command) return { ok: false, error: 'command is required' };
  if (!isKnownCommand(command)) return { ok: false, error: `Unknown or unregistered command: ${command}` };

  const risk = normalizeRisk(command, input.risk);
  const readOnly = policy.allowedReadOnly.includes(command);
  const lowRiskAgentCommand = policy.allowedLowRiskWithAgentToken.includes(command);
  const forbiddenForAiExecution = policy.forbiddenForAiExecution.includes(command);
  const requiresHumanApproval =
    policy.requiresHumanApproval.includes(command) ||
    forbiddenForAiExecution ||
    risk === 'high' ||
    risk === 'critical';

  return {
    ok: true,
    command,
    risk,
    readOnly,
    lowRiskAgentCommand,
    forbiddenForAiExecution,
    requiresHumanApproval,
    executionAllowed: readOnly || (lowRiskAgentCommand && !requiresHumanApproval)
  };
}

function publicCommand(command) {
  return {
    id: command.id,
    command: command.command,
    action: command.command,
    status: command.status,
    risk: command.risk,
    role: command.role,
    source: command.source,
    target: command.target,
    task: command.task,
    reason: command.reason,
    evidence: command.evidence,
    impact: command.impact,
    payload: command.payload,
    questions: command.questions,
    answerRequest: command.answerRequest,
    answer: command.answer,
    result: command.result,
    approval: command.approval,
    requiresHumanApproval: command.requiresHumanApproval,
    forbiddenForAiExecution: command.forbiddenForAiExecution,
    executionAllowed: command.executionAllowed,
    createdBy: command.createdBy,
    updatedBy: command.updatedBy,
    createdAt: command.createdAt,
    updatedAt: command.updatedAt,
    expiresAt: command.expiresAt
  };
}

function findCommand(req, res) {
  const commands = readCommands();
  const command = commands.find(item => item.id === req.params.id);
  if (!command) {
    fail(req, res, 404, 'Command not found');
    return null;
  }
  return { commands, command };
}

function createCommand(req, res) {
  const assessment = assessCommand(req.body);
  if (!assessment.ok) return fail(req, res, 400, assessment.error);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(req.body.ttlMinutes || 60) * 60 * 1000);
  const command = {
    id: crypto.randomUUID(),
    command: assessment.command,
    status: assessment.requiresHumanApproval ? 'pending_approval' : 'ready',
    risk: assessment.risk,
    role: req.body.role || 'observer',
    source: req.headers['x-agent-id'] ? 'agent' : 'admin',
    target: {
      type: req.body.targetType || req.body.target?.type || 'system',
      name: req.body.targetName || req.body.target?.name || 'SafeSoundArena',
      url: req.body.targetUrl || req.body.target?.url || null
    },
    task: {
      title: req.body.taskTitle || req.body.task?.title || assessment.command,
      description: req.body.taskDescription || req.body.task?.description || ''
    },
    reason: req.body.reason || '',
    evidence: Array.isArray(req.body.evidence) ? req.body.evidence : [],
    impact: req.body.impact || {},
    payload: req.body.payload || {},
    questions: Array.isArray(req.body.questions) ? req.body.questions : [],
    answerRequest: req.body.answerRequest || 'Return { requestId, error, data } with a short operational answer.',
    answer: null,
    result: null,
    approval: {
      required: assessment.requiresHumanApproval,
      approvedBy: null,
      rejectedBy: null,
      note: null
    },
    requiresHumanApproval: assessment.requiresHumanApproval,
    forbiddenForAiExecution: assessment.forbiddenForAiExecution,
    executionAllowed: assessment.executionAllowed,
    createdBy: req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'ai-agent',
    updatedBy: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const commands = readCommands();
  commands.unshift(command);
  writeCommands(commands);
  writeAudit('command.create', req, { commandId: command.id, command: command.command, risk: command.risk });
  return ok(req, res, publicCommand(command), 201);
}

router.get('/healthz', (req, res) => {
  ok(req, res, {
    status: 'online',
    component: 'ai-admin-command-center',
    commandCount: readCommands().length,
    time: new Date().toISOString()
  });
});

router.get('/meta', (req, res) => {
  ok(req, res, {
    name: 'AI Admin Command Center',
    version: policy.version,
    mode: policy.mode,
    contract: '{ requestId, error, data }'
  });
});

router.get('/capabilities', (req, res) => {
  ok(req, res, {
    commands: [
      ...policy.allowedReadOnly,
      ...policy.allowedLowRiskWithAgentToken,
      ...policy.requiresHumanApproval
    ],
    statuses: Array.from(STATUSES),
    risks: RISK_ORDER
  });
});

router.get('/docs', (req, res) => {
  ok(req, res, {
    endpoints: [
      'GET /api/admin/ai/healthz',
      'GET /api/admin/ai/meta',
      'GET /api/admin/ai/capabilities',
      'GET /api/admin/ai/settings',
      'GET /api/admin/ai/commands?status=pending_approval',
      'POST /api/admin/ai/commands',
      'POST /api/admin/ai/commands/:id/approve',
      'POST /api/admin/ai/commands/:id/reject',
      'POST /api/admin/ai/commands/:id/simulate',
      'POST /api/admin/ai/commands/:id/dispatch',
      'POST /api/admin/ai/commands/:id/answer',
      'GET /api/admin/ai/logs'
    ],
    responseShape: { requestId: 'string', error: null, data: 'any' }
  });
});

router.get('/settings', adminRequired, (req, res) => {
  writeAudit('settings.read', req);
  ok(req, res, {
    policyVersion: policy.version,
    mode: policy.mode,
    approvalRequired: policy.requiresHumanApproval,
    forbiddenForAiExecution: policy.forbiddenForAiExecution
  });
});

router.get('/policy', adminRequired, (req, res) => {
  writeAudit('policy.read', req);
  ok(req, res, policy);
});

router.get('/commands', adminRequired, (req, res) => {
  const { status } = req.query;
  let commands = readCommands();
  if (status && STATUSES.has(status)) commands = commands.filter(command => command.status === status);
  writeAudit('commands.list', req, { status: status || 'all' });
  ok(req, res, commands.map(publicCommand));
});

router.post('/commands', agentOrAdminRequired, createCommand);

router.get('/commands/:id', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  writeAudit('commands.read', req, { commandId: found.command.id });
  ok(req, res, publicCommand(found.command));
});

router.post('/commands/:id/approve', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;
  if (!['pending_approval', 'approved'].includes(command.status)) {
    return fail(req, res, 409, `Cannot approve command in status ${command.status}`);
  }

  command.status = 'approved';
  command.approval.approvedBy = req.headers['x-admin-user'] || 'admin';
  command.approval.note = req.body.note || '';
  command.updatedBy = command.approval.approvedBy;
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('commands.approve', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.post('/commands/:id/reject', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;
  if (!['pending_approval', 'approved', 'ready'].includes(command.status)) {
    return fail(req, res, 409, `Cannot reject command in status ${command.status}`);
  }

  command.status = 'rejected';
  command.approval.rejectedBy = req.headers['x-admin-user'] || 'admin';
  command.approval.note = req.body.reason || '';
  command.updatedBy = command.approval.rejectedBy;
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('commands.reject', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.post('/commands/:id/simulate', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { command } = found;
  writeAudit('commands.simulate', req, { commandId: command.id, command: command.command });
  ok(req, res, {
    commandId: command.id,
    command: command.command,
    target: command.target,
    status: 'simulation-only',
    wouldRequireHumanApproval: command.requiresHumanApproval,
    wouldDispatch: !command.forbiddenForAiExecution && ['ready', 'approved'].includes(command.status),
    expectedImpact: command.impact || {},
    answerRequest: command.answerRequest,
    responseShape: { requestId: req.requestId, error: null, data: 'simulation result' }
  });
});

router.post('/commands/:id/dispatch', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;
  if (command.forbiddenForAiExecution) return fail(req, res, 403, 'Command is forbidden for AI execution');
  if (!['ready', 'approved'].includes(command.status)) {
    return fail(req, res, 409, `Command is not ready to dispatch: ${command.status}`);
  }

  command.status = 'executed';
  command.result = req.body.result || {
    dispatched: true,
    realExecutionImplemented: false,
    message: 'Command dispatch recorded. A safe executor can be attached here.'
  };
  command.updatedBy = req.headers['x-admin-user'] || 'admin';
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('commands.dispatch', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.post('/commands/:id/answer', agentOrAdminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;

  command.status = 'answered';
  command.answer = {
    responder: req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'system',
    at: new Date().toISOString(),
    data: req.body.data || req.body.answer || null,
    error: req.body.error || null
  };
  command.updatedBy = command.answer.responder;
  command.updatedAt = command.answer.at;
  writeCommands(commands);
  writeAudit('commands.answer', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.get('/logs', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  ok(req, res, readAudit(limit));
});

router.get('/audit', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  ok(req, res, readAudit(limit));
});

router.get('/actions', adminRequired, (req, res) => {
  const { status } = req.query;
  let commands = readCommands();
  if (status && STATUSES.has(status)) commands = commands.filter(command => command.status === status);
  writeAudit('actions.list.compat', req, { status: status || 'all' });
  ok(req, res, commands.map(publicCommand));
});

router.post('/actions/propose', agentOrAdminRequired, createCommand);
router.get('/actions/:id', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  writeAudit('actions.read.compat', req, { commandId: found.command.id });
  ok(req, res, publicCommand(found.command));
});

router.post('/actions/:id/approve', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;
  if (!['pending_approval', 'approved'].includes(command.status)) {
    return fail(req, res, 409, `Cannot approve command in status ${command.status}`);
  }
  command.status = 'approved';
  command.approval.approvedBy = req.headers['x-admin-user'] || 'admin';
  command.approval.note = req.body.note || '';
  command.updatedBy = command.approval.approvedBy;
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('actions.approve.compat', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.post('/actions/:id/reject', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { commands, command } = found;
  if (!['pending_approval', 'approved', 'ready'].includes(command.status)) {
    return fail(req, res, 409, `Cannot reject command in status ${command.status}`);
  }
  command.status = 'rejected';
  command.approval.rejectedBy = req.headers['x-admin-user'] || 'admin';
  command.approval.note = req.body.reason || '';
  command.updatedBy = command.approval.rejectedBy;
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('actions.reject.compat', req, { commandId: command.id, command: command.command });
  ok(req, res, publicCommand(command));
});

router.post('/actions/:id/simulate', adminRequired, (req, res) => {
  const found = findCommand(req, res);
  if (!found) return;
  const { command } = found;
  writeAudit('actions.simulate.compat', req, { commandId: command.id, command: command.command });
  ok(req, res, {
    commandId: command.id,
    command: command.command,
    target: command.target,
    status: 'simulation-only',
    wouldRequireHumanApproval: command.requiresHumanApproval,
    wouldDispatch: !command.forbiddenForAiExecution && ['ready', 'approved'].includes(command.status),
    expectedImpact: command.impact || {},
    answerRequest: command.answerRequest,
    responseShape: { requestId: req.requestId, error: null, data: 'simulation result' }
  });
});

module.exports = router;
