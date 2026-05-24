const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const policy = require('./ai-admin-policy.json');
const proofLayer = require('./proofLayer');

const router = express.Router();
const REPO_ROOT = path.resolve(__dirname, '..');
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
const CONFLICT_MARKERS = ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)];

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
  const actor = req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'unknown';
  const entry = {
    id: crypto.randomUUID(),
    event,
    actor,
    requestId: req.requestId,
    ip: req.ip,
    at: new Date().toISOString(),
    ...details
  };
  fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`);
  try {
    proofLayer.logActivity({ event, auditId: entry.id, ...details }, { actor, requestId: req.requestId });
  } catch (err) {
    entry.proofWarning = err.message;
  }
  return entry;
}

function readAudit(limit = 100) {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) return [];
  const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(line => JSON.parse(line)).reverse();
}

function runReadOnly(command, args = [], options = {}) {
  try {
    const output = execFileSync(command, args, {
      cwd: options.cwd || REPO_ROOT,
      encoding: 'utf8',
      timeout: options.timeout || 8000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, output: output.trim() };
  } catch (err) {
    return {
      ok: false,
      output: String(err.stdout || '').trim(),
      error: String(err.stderr || err.message || 'command failed').trim()
    };
  }
}

function readJsonFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  return { relativePath, parsed };
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

function getFileSize(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return 0;
  return fs.statSync(absolutePath).size;
}

function walkFiles(root, options = {}) {
  const exclude = new Set(options.exclude || ['.git', 'node_modules', '.next', 'coverage', 'dist', 'build', 'temp']);
  const maxFiles = options.maxFiles || 6000;
  const files = [];

  function visit(current) {
    if (files.length >= maxFiles) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (exclude.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  visit(root);
  return files;
}

function scanConflictMarkers() {
  const files = walkFiles(REPO_ROOT, { maxFiles: 8000 });
  const matches = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.docx', '.pdf'].includes(ext)) continue;
    const size = fs.statSync(file).size;
    if (size > 1024 * 1024) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (CONFLICT_MARKERS.some(marker => line.includes(marker))) {
        matches.push({
          file: path.relative(REPO_ROOT, file),
          line: index + 1,
          text: line.slice(0, 160)
        });
      }
    });
  }
  return matches;
}

function validateJsonFiles(files) {
  return files.map(relativePath => {
    try {
      JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
      return { file: relativePath, ok: true };
    } catch (err) {
      return { file: relativePath, ok: false, error: err.message };
    }
  });
}

function readLogLines(limit = 80) {
  const candidates = [
    'temp/control-room-api.log',
    'temp/control-room-web.log',
    'server/agent.log',
    'agent.log'
  ];
  const lines = [];
  for (const relativePath of candidates) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    fs.readFileSync(absolutePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .forEach(line => lines.push({ file: relativePath, line }));
  }
  return lines.slice(-limit);
}

function getRuntimePorts(ports = [3000, 3001, 4000, 6379]) {
  const portList = ports.map(Number).filter(Boolean).join(',');
  const script = `Get-NetTCPConnection -LocalPort ${portList} -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | ConvertTo-Json -Compress`;
  const result = runReadOnly('powershell', ['-NoProfile', '-Command', script], { timeout: 6000 });
  if (!result.ok || !result.output) return { ok: false, ports: [], error: result.error || 'No port data returned' };
  try {
    const parsed = JSON.parse(result.output);
    return { ok: true, ports: Array.isArray(parsed) ? parsed : [parsed] };
  } catch (err) {
    return { ok: false, ports: [], error: err.message, raw: result.output };
  }
}

function inspectDependencies(command) {
  const manifests = command.payload?.manifests || ['package.json', 'frontend/package.json'];
  return manifests.map(relativePath => {
    try {
      const { parsed } = readJsonFile(relativePath);
      const baseDir = path.dirname(path.join(REPO_ROOT, relativePath));
      const deps = {
        ...parsed.dependencies,
        ...parsed.devDependencies
      };
      const missing = Object.keys(deps || {}).filter(name => !fs.existsSync(path.join(baseDir, 'node_modules', name)));
      return {
        manifest: relativePath,
        package: parsed.name,
        dependencyCount: Object.keys(deps || {}).length,
        missing: missing.slice(0, 30),
        engine: parsed.engines || null
      };
    } catch (err) {
      return { manifest: relativePath, error: err.message };
    }
  });
}

function inspectDocuments(command) {
  const docs = command.payload?.docs || ['README.md', 'docs/AI_ADMIN_CONTROL_ROOM.md', 'server/ai-admin-policy.json'];
  const policyCommands = [
    ...policy.allowedReadOnly,
    ...policy.allowedLowRiskWithAgentToken,
    ...policy.requiresHumanApproval,
    ...policy.forbiddenForAiExecution
  ];
  return docs.map(relativePath => {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) return { file: relativePath, exists: false };
    const content = fs.readFileSync(absolutePath, 'utf8');
    const mentionedCommands = policyCommands.filter(commandName => content.includes(commandName));
    return {
      file: relativePath,
      exists: true,
      size: content.length,
      mentionsResponseShape: content.includes('requestId') && content.includes('error') && content.includes('data'),
      mentionedCommandCount: mentionedCommands.length
    };
  });
}

function summarizeCommandQueue(commands = readCommands()) {
  return commands.reduce((acc, command) => {
    acc.byStatus[command.status] = (acc.byStatus[command.status] || 0) + 1;
    acc.byRisk[command.risk] = (acc.byRisk[command.risk] || 0) + 1;
    if (command.questions?.length && !command.answer) {
      acc.openQuestions.push({
        commandId: command.id,
        command: command.command,
        status: command.status,
        questions: command.questions
      });
    }
    return acc;
  }, { byStatus: {}, byRisk: {}, openQuestions: [] });
}

function executeSafeCommand(command, req, dryRun = false) {
  const commands = readCommands();
  const audit = readAudit(100);
  const gitStatus = runReadOnly('git', ['status', '--short', '--branch'], { timeout: 5000 });
  const now = new Date().toISOString();
  const base = {
    executed: !dryRun,
    dryRun,
    commandId: command.id,
    command: command.command,
    target: command.target,
    generatedAt: now,
    contract: { requestId: req.requestId, error: null, data: 'structured result' }
  };

  switch (command.command) {
    case 'inspect_health':
      return {
        ...base,
        status: 'ok',
        data: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          node: process.version,
          repoRoot: REPO_ROOT,
          dataDirReady: fs.existsSync(DATA_DIR),
          adminTokenConfigured: Boolean(process.env.ADMIN_TOKEN),
          commandCount: commands.length,
          auditCount: audit.length,
          proofChain: proofLayer.summary(5).chain,
          git: gitStatus
        }
      };
    case 'inspect_runtime_ports':
      return { ...base, data: getRuntimePorts(command.payload?.ports) };
    case 'inspect_dependencies':
      return { ...base, data: { node: process.version, manifests: inspectDependencies(command) } };
    case 'validate_repository': {
      const conflictMarkers = scanConflictMarkers();
      const json = validateJsonFiles([
        'package.json',
        'package-lock.json',
        'frontend/package.json',
        'frontend/package-lock.json',
        'server/ai-admin-policy.json'
      ]);
      const diffCheck = runReadOnly('git', ['diff', '--check'], { timeout: 8000 });
      return {
        ...base,
        data: {
          clean: conflictMarkers.length === 0 && json.every(item => item.ok) && diffCheck.ok,
          conflictMarkers,
          json,
          gitStatus,
          diffCheck
        }
      };
    }
    case 'validate_documents':
      return { ...base, data: { documents: inspectDocuments(command) } };
    case 'inspect_logs':
      return { ...base, data: { lines: readLogLines(command.payload?.limit || 80) } };
    case 'summarize_errors': {
      const lines = readLogLines(200);
      const findings = lines
        .filter(item => /error|failed|warn|exception/i.test(item.line))
        .slice(-40);
      return { ...base, data: { findingCount: findings.length, findings } };
    }
    case 'audit_review':
      return {
        ...base,
        data: {
          recent: audit.slice(0, command.payload?.limit || 30),
          proof: proofLayer.summary(command.payload?.limit || 30),
          actorCounts: audit.reduce((acc, entry) => {
            acc[entry.actor] = (acc[entry.actor] || 0) + 1;
            return acc;
          }, {})
        }
      };
    case 'proof_review':
      return { ...base, data: proofLayer.summary(command.payload?.limit || 30) };
    case 'question_status':
      return { ...base, data: summarizeCommandQueue(commands) };
    case 'summarize_agent_status':
      return {
        ...base,
        data: {
          agents: [
            { name: 'diagnostic-agent', status: 'available', capabilities: ['run_diagnostic_task', 'inspect_health'] },
            { name: 'review-agent', status: 'available', capabilities: ['request_code_review'] },
            { name: 'test-runner', status: 'available', capabilities: ['request_test_run'] }
          ],
          note: 'Local command center registry; attach real agent heartbeats for production.'
        }
      };
    case 'task_status':
      return {
        ...base,
        data: {
          latest: commands.slice(0, 10).map(item => ({
            id: item.id,
            command: item.command,
            status: item.status,
            updatedAt: item.updatedAt
          }))
        }
      };
    case 'inspect_ci_status':
    case 'inspect_github_pr':
      return {
        ...base,
        data: {
          gitStatus,
          branch: gitStatus.output?.split('\n')[0] || null,
          note: 'GitHub connector/CI logs should be attached by an external agent for authoritative remote status.'
        }
      };
    case 'run_diagnostic_task':
    case 'request_agent_answer':
    case 'request_code_review':
    case 'request_test_run':
    case 'create_proof_checkpoint':
      if (command.command === 'create_proof_checkpoint') {
        const checkpoint = dryRun
          ? { preview: true, payload: command.payload, commandId: command.id }
          : proofLayer.logCheckpoint({
              label: command.task?.title || command.reason || 'manual-checkpoint',
              commandId: command.id,
              target: command.target,
              payload: command.payload
            }, {
              actor: req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'system',
              requestId: req.requestId
            }, {
              algorithm: command.payload?.hashAlgorithm
            });
        return { ...base, data: { checkpoint } };
      }
      return {
        ...base,
        data: {
          queuedFor: command.target?.name || 'agent',
          task: command.task,
          questions: command.questions,
          payload: command.payload,
          note: 'Request recorded. A worker can poll commands and answer via /commands/:id/answer.'
        }
      };
    default:
      return {
        ...base,
        data: {
          dispatched: !dryRun,
          realExecutionImplemented: false,
          message: 'Command dispatch recorded. No local safe executor is attached for this command.',
          approval: command.approval,
          payload: command.payload
        }
      };
  }
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
  proofLayer.logCheckpoint({
    label: 'command-created',
    commandId: command.id,
    command: command.command,
    status: command.status,
    risk: command.risk
  }, {
    actor: command.createdBy,
    requestId: req.requestId
  });
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
      'GET /api/admin/ai/logs',
      'GET /api/admin/ai/proof',
      'GET /api/admin/ai/proof/verify',
      'GET /api/admin/ai/proof/activity',
      'GET /api/admin/ai/proof/checkpoints',
      'POST /api/admin/ai/proof/checkpoints',
      'GET /api/admin/ai/proof/bot-responses'
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
  proofLayer.logCheckpoint({
    label: 'command-approved',
    commandId: command.id,
    command: command.command,
    approvedBy: command.approval.approvedBy
  }, { actor: command.approval.approvedBy, requestId: req.requestId });
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
  proofLayer.logCheckpoint({
    label: 'command-rejected',
    commandId: command.id,
    command: command.command,
    rejectedBy: command.approval.rejectedBy
  }, { actor: command.approval.rejectedBy, requestId: req.requestId });
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
    executionPreview: executeSafeCommand(command, req, true),
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
  command.result = req.body.result || executeSafeCommand(command, req, false);
  command.updatedBy = req.headers['x-admin-user'] || 'admin';
  command.updatedAt = new Date().toISOString();
  writeCommands(commands);
  writeAudit('commands.dispatch', req, { commandId: command.id, command: command.command });
  proofLayer.logCheckpoint({
    label: 'command-dispatched',
    commandId: command.id,
    command: command.command,
    resultHash: proofLayer.digest(command.result, command.payload?.hashAlgorithm)
  }, { actor: command.updatedBy, requestId: req.requestId }, { algorithm: command.payload?.hashAlgorithm });
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
  proofLayer.logBotResponse({
    commandId: command.id,
    command: command.command,
    responder: command.answer.responder,
    responseHash: proofLayer.digest(command.answer, req.body.hashAlgorithm),
    answer: command.answer
  }, { actor: command.answer.responder, requestId: req.requestId }, { algorithm: req.body.hashAlgorithm });
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

router.get('/proof', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 200);
  writeAudit('proof.summary', req, { limit });
  ok(req, res, proofLayer.summary(limit));
});

router.get('/proof/verify', adminRequired, (req, res) => {
  writeAudit('proof.verify', req);
  ok(req, res, proofLayer.verifyChain());
});

router.get('/proof/activity', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  writeAudit('proof.activity.list', req, { limit });
  ok(req, res, proofLayer.readByType('activity', limit));
});

router.get('/proof/checkpoints', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  writeAudit('proof.checkpoints.list', req, { limit });
  ok(req, res, proofLayer.readByType('checkpoint', limit));
});

router.post('/proof/checkpoints', agentOrAdminRequired, (req, res) => {
  const actor = req.headers['x-admin-user'] || req.headers['x-agent-id'] || 'system';
  const checkpoint = proofLayer.logCheckpoint({
    label: req.body.label || 'manual-checkpoint',
    scope: req.body.scope || 'general',
    evidence: Array.isArray(req.body.evidence) ? req.body.evidence : [],
    payload: req.body.payload || {}
  }, { actor, requestId: req.requestId }, { algorithm: req.body.hashAlgorithm });
  writeAudit('proof.checkpoint.create', req, { checkpointId: checkpoint.id, hash: checkpoint.hash });
  ok(req, res, checkpoint, 201);
});

router.get('/proof/bot-responses', adminRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  writeAudit('proof.botResponses.list', req, { limit });
  ok(req, res, proofLayer.readByType('bot_response', limit));
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
    executionPreview: executeSafeCommand(command, req, true),
    responseShape: { requestId: req.requestId, error: null, data: 'simulation result' }
  });
});

module.exports = router;
