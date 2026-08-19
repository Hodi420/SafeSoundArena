const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

const {
  appendAuditEvent,
  canonicalJsonStringify,
  readAuditEvents,
  readLatestAuditHash,
  verifyAuditChain,
} = require('./aiAdminAudit');
const {
  AGENT_STATES,
  AgentLifecycleController,
  AgentLifecycleError,
  GlobalSafetyController,
} = require('./agentLifecycle');
const { AgentOrchestrator } = require('./agentOrchestrator');
const {
  loadAgentRuntimeState,
  persistAgentRuntimeState,
} = require('./agentRuntimePersistence');

const DEFAULT_POLICY_PATH = path.join(__dirname, 'ai-admin-policy.json');
const DEFAULT_AUDIT_LOG_PATH = path.join(process.cwd(), 'ai-admin-audit-log.jsonl');
const COMMAND_PROOF_VERSION = 'command-proof-v1';
const CONTROL_ROOM_ENVS = new Set(['development', 'staging', 'production']);
const SECRET_KEY_PATTERN =
  /(api[_-]?key|authorization|credential|password|private[_-]?key|secret|token)/i;
const RISK_RANK = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function randomId(prefix) {
  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

function normalizeControlRoomEnv(value) {
  const normalized = String(value || 'development').toLowerCase();
  return CONTROL_ROOM_ENVS.has(normalized) ? normalized : 'development';
}

function resolveToken() {
  for (let index = 0; index < arguments.length; index += 1) {
    const token = arguments[index];
    if (typeof token === 'string' && token.trim()) {
      return token.trim();
    }
  }
  return null;
}

function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  return JSON.parse(raw);
}

function safeCompare(value, expected) {
  if (!value || !expected) {
    return false;
  }

  const valueBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(String(expected));
  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

function bearerToken(req) {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function collectPresentedTokens(req) {
  return [
    req.get('x-ai-admin-token'),
    req.get('x-admin-token'),
    req.get('x-ai-agent-token'),
    req.get('x-agent-token'),
    bearerToken(req),
  ].filter(Boolean);
}

function actorFromRequest(req, actorType) {
  if (actorType === 'admin') {
    return {
      type: 'admin',
      id: req.get('x-admin-user') || req.get('x-ai-admin-user') || 'admin',
    };
  }

  if (actorType === 'agent') {
    return {
      type: 'agent',
      id: req.get('x-agent-id') || req.get('x-ai-agent-id') || 'agent',
    };
  }

  return {
    type: 'anonymous',
    id: 'anonymous',
  };
}

function authenticateRequest(req, tokens) {
  const presentedTokens = collectPresentedTokens(req);
  if (presentedTokens.length === 0) {
    return {
      authenticated: false,
      actorType: 'anonymous',
      actor: actorFromRequest(req, 'anonymous'),
      presented: false,
    };
  }

  if (tokens.adminToken) {
    const isAdmin = presentedTokens.some((token) => safeCompare(token, tokens.adminToken));
    if (isAdmin) {
      return {
        authenticated: true,
        actorType: 'admin',
        actor: actorFromRequest(req, 'admin'),
        presented: true,
      };
    }
  }

  if (tokens.agentToken) {
    const isAgent = presentedTokens.some((token) => safeCompare(token, tokens.agentToken));
    if (isAgent) {
      return {
        authenticated: true,
        actorType: 'agent',
        actor: actorFromRequest(req, 'agent'),
        presented: true,
      };
    }
  }

  return {
    authenticated: false,
    actorType: 'anonymous',
    actor: actorFromRequest(req, 'anonymous'),
    invalid: true,
    presented: true,
  };
}

function makeError(code, message, details) {
  const error = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function sendApiResponse(res, status, requestId, error, data) {
  return res.status(status).json({
    requestId,
    error: error || null,
    data: data === undefined ? null : data,
  });
}

function requestIdFor(req) {
  return req.get('x-request-id') || randomId('req');
}

function requireAdmin(req, res, requestId, tokens) {
  if (!tokens.adminToken) {
    sendApiResponse(
      res,
      503,
      requestId,
      makeError(
        'ADMIN_TOKEN_NOT_CONFIGURED',
        'Admin token is required for this operation but is not configured.'
      )
    );
    return null;
  }

  const auth = authenticateRequest(req, tokens);
  if (auth.authenticated && auth.actorType === 'admin') {
    return auth;
  }

  sendApiResponse(
    res,
    401,
    requestId,
    makeError(
      auth.invalid ? 'INVALID_ADMIN_TOKEN' : 'ADMIN_AUTH_REQUIRED',
      'A valid admin token is required for this operation.'
    )
  );
  return null;
}

function requireAgentOrAdmin(req, res, requestId, tokens) {
  if (!tokens.adminToken && !tokens.agentToken) {
    sendApiResponse(
      res,
      503,
      requestId,
      makeError(
        'CONTROL_ROOM_TOKEN_NOT_CONFIGURED',
        'An admin token or agent token is required but neither is configured.'
      )
    );
    return null;
  }

  const auth = authenticateRequest(req, tokens);
  if (auth.authenticated && (auth.actorType === 'admin' || auth.actorType === 'agent')) {
    return auth;
  }

  sendApiResponse(
    res,
    401,
    requestId,
    makeError(
      auth.invalid ? 'INVALID_CONTROL_ROOM_TOKEN' : 'CONTROL_ROOM_AUTH_REQUIRED',
      'A valid agent token or admin token is required for this operation.'
    )
  );
  return null;
}

function authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv) {
  if (controlRoomEnv === 'production') {
    return requireAgentOrAdmin(req, res, requestId, tokens);
  }

  const auth = authenticateRequest(req, tokens);
  if (auth.invalid) {
    sendApiResponse(
      res,
      401,
      requestId,
      makeError('INVALID_CONTROL_ROOM_TOKEN', 'The supplied control room token is invalid.')
    );
    return null;
  }

  return auth;
}

function redactSecrets(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSecrets(value[key]);
      return result;
    }, {});
  }

  return value;
}

function policyList(policy, key) {
  return Array.isArray(policy[key]) ? policy[key] : [];
}

function roleCommands(policy, role) {
  const roleConfig = policy.roles && policy.roles[role];
  if (!roleConfig) {
    return [];
  }
  return Array.isArray(roleConfig)
    ? roleConfig
    : Array.isArray(roleConfig.allowedActions)
      ? roleConfig.allowedActions
      : Array.isArray(roleConfig.commands)
        ? roleConfig.commands
        : [];
}

function roleAllowsCommand(policy, role, commandName) {
  return roleCommands(policy, role).includes(commandName);
}

function optionalAgentId(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return String(value).trim();
}

function commandPolicy(policy, commandName) {
  return policy.commands && policy.commands[commandName] ? policy.commands[commandName] : null;
}

function normalizeRisk(risk) {
  const normalized = String(risk || '').toLowerCase();
  return RISK_RANK[normalized] ? normalized : null;
}

function deriveRisk(policy, commandName, requestedRisk) {
  const explicitRisk = normalizeRisk(requestedRisk);
  if (explicitRisk) {
    return explicitRisk;
  }

  const policyCommand = commandPolicy(policy, commandName);
  const defaultRisk = normalizeRisk(policyCommand && policyCommand.defaultRisk);
  if (defaultRisk) {
    return defaultRisk;
  }

  return 'high';
}

function isAtLeastRisk(risk, minimumRisk) {
  return (RISK_RANK[risk] || 0) >= (RISK_RANK[minimumRisk] || 0);
}

function commandFlags(policy, commandName, risk) {
  const requiresHumanApproval = policyList(policy, 'requiresHumanApproval').includes(commandName);
  const forbiddenForAiExecution = policyList(policy, 'forbiddenForAiExecution').includes(commandName);
  const readOnly = policyList(policy, 'allowedReadOnly').includes(commandName);
  const lowRiskWithAgentToken = policyList(policy, 'allowedLowRiskWithAgentToken').includes(
    commandName
  );
  const known = Boolean(commandPolicy(policy, commandName));

  return {
    known,
    readOnly,
    lowRiskWithAgentToken,
    humanGated: requiresHumanApproval || isAtLeastRisk(risk, 'high'),
    requiresHumanApproval,
    forbiddenForAiExecution,
  };
}

function commandProofPayload(command) {
  return {
    id: command.id,
    command: command.command,
    risk: command.risk,
    role: command.role,
    agentId: command.agentId,
    target: command.target,
    task: command.task,
    payload: command.payload,
    createdAt: command.createdAt,
  };
}

function computeCommandProofHash(command) {
  return crypto
    .createHash('sha256')
    .update(canonicalJsonStringify(commandProofPayload(command)))
    .digest('hex');
}

function publicCommand(command) {
  return redactSecrets({
    id: command.id,
    command: command.command,
    risk: command.risk,
    role: command.role,
    agentId: command.agentId,
    target: command.target,
    task: command.task,
    payload: command.payload,
    status: command.status,
    answer: command.answer,
    assessment: command.assessment,
    approval: command.approval,
    rejection: command.rejection,
    dispatchReceipt: command.dispatchReceipt,
    createdAt: command.createdAt,
    updatedAt: command.updatedAt,
    proofHash: command.proofHash,
    proofVersion: command.proofVersion,
    humanGated: command.humanGated,
    requiresHumanApproval: command.requiresHumanApproval,
    forbiddenForAiExecution: command.forbiddenForAiExecution,
  });
}

function validatePolicy(policy) {
  const warnings = [];
  const commandNames = new Set(Object.keys(policy.commands || {}));
  const categorizedCommands = new Set([
    ...policyList(policy, 'allowedReadOnly'),
    ...policyList(policy, 'allowedLowRiskWithAgentToken'),
    ...policyList(policy, 'requiresHumanApproval'),
    ...policyList(policy, 'forbiddenForAiExecution'),
  ]);
  const forbidden = new Set(policyList(policy, 'forbiddenForAiExecution'));
  const lowRisk = new Set(policyList(policy, 'allowedLowRiskWithAgentToken'));
  const readOnly = new Set(policyList(policy, 'allowedReadOnly'));
  const roles = policy.roles || {};

  Object.keys(roles).forEach((roleName) => {
    const roleConfig = roles[roleName];
    const roleCommands = Array.isArray(roleConfig)
      ? roleConfig
      : roleConfig.allowedActions || roleConfig.commands || [];
    roleCommands.forEach((commandName) => {
      if (!categorizedCommands.has(commandName)) {
        warnings.push({
          code: 'ROLE_COMMAND_NOT_CATEGORIZED',
          message: `Role "${roleName}" references "${commandName}", but the command is not in any policy category.`,
          command: commandName,
          role: roleName,
        });
      }

      if (!commandNames.has(commandName)) {
        warnings.push({
          code: 'ROLE_COMMAND_NOT_DEFINED',
          message: `Role "${roleName}" references "${commandName}", but the command is not defined in policy.commands.`,
          command: commandName,
          role: roleName,
        });
      }
    });
  });

  forbidden.forEach((commandName) => {
    if (lowRisk.has(commandName)) {
      warnings.push({
        code: 'FORBIDDEN_COMMAND_LOW_RISK',
        message: `"${commandName}" is forbidden for AI execution and also allowed as low-risk.`,
        command: commandName,
      });
    }

    if (readOnly.has(commandName)) {
      warnings.push({
        code: 'FORBIDDEN_COMMAND_READ_ONLY',
        message: `"${commandName}" is forbidden for AI execution and also marked read-only.`,
        command: commandName,
      });
    }
  });

  policyList(policy, 'requiresHumanApproval').forEach((commandName) => {
    const defaultRisk = normalizeRisk(commandPolicy(policy, commandName)?.defaultRisk);
    if (!defaultRisk) {
      warnings.push({
        code: 'HUMAN_APPROVAL_COMMAND_NOT_DEFINED',
        message: `"${commandName}" requires human approval but has no default risk.`,
        command: commandName,
      });
      return;
    }

    if (!isAtLeastRisk(defaultRisk, 'high')) {
      warnings.push({
        code: 'HUMAN_APPROVAL_RISK_TOO_LOW',
        message: `"${commandName}" requires human approval but default risk is "${defaultRisk}".`,
        command: commandName,
        risk: defaultRisk,
      });
    }
  });

  ['allowedReadOnly', 'allowedLowRiskWithAgentToken', 'requiresHumanApproval', 'forbiddenForAiExecution'].forEach(
    (category) => {
      policyList(policy, category).forEach((commandName) => {
        if (!commandNames.has(commandName)) {
          warnings.push({
            code: 'CATEGORY_COMMAND_NOT_DEFINED',
            message: `"${commandName}" appears in "${category}" but is not defined in policy.commands.`,
            command: commandName,
            category,
          });
        }
      });
    }
  );

  return {
    valid: warnings.length === 0,
    warnings,
    checked: {
      commands: commandNames.size,
      roles: Object.keys(roles).length,
      categorizedCommands: categorizedCommands.size,
    },
  };
}

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      const requestId = req.aiAdminRequestId || requestIdFor(req);
      if (error instanceof AgentLifecycleError || (error && error.status && error.code)) {
        sendApiResponse(res, error.status, requestId, makeError(error.code, error.message, error.details));
        return;
      }
      sendApiResponse(res, 500, requestId, makeError('AI_ADMIN_INTERNAL_ERROR', 'Control room request failed.'));
    });
  };
}

function createAiAdminGovernanceRouter(options) {
  const config = options || {};
  const router = express.Router();
  const commands = new Map();
  const policyPath = config.policyPath || DEFAULT_POLICY_PATH;
  const auditLogPath =
    config.auditLogPath || process.env.AI_ADMIN_AUDIT_LOG_PATH || DEFAULT_AUDIT_LOG_PATH;
  const controlRoomEnv = normalizeControlRoomEnv(
    config.controlRoomEnv || process.env.AI_CONTROL_ROOM_ENV
  );
  const tokens = {
    adminToken: resolveToken(config.adminToken, process.env.AI_ADMIN_TOKEN, process.env.ADMIN_TOKEN),
    agentToken: resolveToken(config.agentToken, process.env.AI_AGENT_TOKEN, process.env.AGENT_TOKEN),
  };
  const persistenceEnabled = config.persistenceEnabled === true;
  const runtimeStatePath =
    config.runtimeStatePath ||
    process.env.AI_ADMIN_RUNTIME_STATE_PATH ||
    path.join(process.cwd(), 'ai-admin-runtime-state.json');
  const persistedState = persistenceEnabled ? loadAgentRuntimeState(runtimeStatePath) : null;
  const lifecycle =
    config.lifecycleController ||
    new AgentLifecycleController({
      initialAgents: config.initialAgents || [],
      initialState: persistedState?.lifecycle,
      heartbeatTimeoutMs: config.heartbeatTimeoutMs,
      leaseSweepIntervalMs: config.leaseSweepIntervalMs,
      autoStartLeaseMonitor: config.autoStartLeaseMonitor === true,
    });
  const safety =
    config.safetyController ||
    new GlobalSafetyController({
      enabled: String(process.env.GLOBAL_AI_ENABLED || 'true').toLowerCase() !== 'false',
      initialState: persistedState?.safety,
    });
  function persistRuntimeState() {
    if (!persistenceEnabled) {
      return null;
    }
    return persistAgentRuntimeState(runtimeStatePath, {
      lifecycle: lifecycle.exportState(),
      safety: safety.getState(),
    });
  }
  if (persistenceEnabled) {
    lifecycle.setOnChange(persistRuntimeState);
  }
  if (persistenceEnabled) {
    safety.setOnChange(persistRuntimeState);
  }
  if (persistenceEnabled && !persistedState) {
    persistRuntimeState();
  }
  const orchestrator =
    config.orchestrator ||
    new AgentOrchestrator({
      lifecycleController: lifecycle,
      safetyController: safety,
      maxChildrenPerParent: config.maxChildrenPerParent || process.env.AGENT_MAX_CHILDREN_PER_PARENT,
      maxTotalAgents: config.maxTotalAgents || process.env.AGENT_MAX_TOTAL_AGENTS,
      maxChildDepth: config.maxChildDepth || process.env.AGENT_MAX_CHILD_DEPTH,
    });
  if (config.runtime && typeof config.runtime === 'object') {
    config.runtime.lifecycle = lifecycle;
    config.runtime.safety = safety;
    config.runtime.orchestrator = orchestrator;
  }
  let policy = loadPolicy(policyPath);

  if (Array.isArray(config.initialCommands)) {
    config.initialCommands.forEach((command) => {
      if (command && command.id) {
        commands.set(command.id, command);
      }
    });
  }

  function currentPolicy() {
    if (config.reloadPolicyOnRequest) {
      policy = loadPolicy(policyPath);
    }
    return policy;
  }

  function audit(eventName, auth, requestId, details) {
    return appendAuditEvent(auditLogPath, eventName, {
      actor: auth?.actor || { type: 'system', id: 'system' },
      requestId,
      details: redactSecrets(details || {}),
    });
  }

  function findCommand(res, requestId, id) {
    const command = commands.get(id);
    if (!command) {
      sendApiResponse(
        res,
        404,
        requestId,
        makeError('COMMAND_NOT_FOUND', `Command "${id}" was not found.`)
      );
      return null;
    }
    return command;
  }

  router.use(express.json({ limit: config.jsonLimit || '1mb' }));
  router.use((req, res, next) => {
    req.aiAdminRequestId = requestIdFor(req);
    next();
  });

  router.get(
    '/meta',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      sendApiResponse(res, 200, requestId, null, {
        env: controlRoomEnv,
        production: controlRoomEnv === 'production',
        adminTokenConfigured: Boolean(tokens.adminToken),
        agentTokenConfigured: Boolean(tokens.agentToken),
        policyVersion: currentPolicy().version || null,
        proofVersion: COMMAND_PROOF_VERSION,
        lifecycleVersion: 'agent-lifecycle-v1',
        agentCount: lifecycle.listAgents().length,
        lease: lifecycle.getLeaseConfig(),
        orchestration: orchestrator.getCapacity(),
        persistence: {
          enabled: persistenceEnabled,
          stateLoaded: Boolean(persistedState),
        },
        globalAiEnabled: safety.isEnabled(),
      });
    })
  );

  router.get(
    '/commands',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        commands: Array.from(commands.values()).map(publicCommand),
      });
    })
  );

  router.post(
    '/commands',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const body = req.body || {};
      const commandName = String(body.command || '').trim();
      if (!commandName) {
        sendApiResponse(
          res,
          400,
          requestId,
          makeError('COMMAND_REQUIRED', 'Command name is required.')
        );
        return;
      }

      const activePolicy = currentPolicy();
      const risk = deriveRisk(activePolicy, commandName, body.risk);
      const flags = commandFlags(activePolicy, commandName, risk);
      const role = String(body.role || (auth.actorType === 'admin' ? 'admin' : 'agent')).trim();
      const agentId = optionalAgentId(body.agentId);
      if (!activePolicy.roles || !activePolicy.roles[role]) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError('ROLE_NOT_DEFINED', `Role "${role}" is not defined in the active policy.`)
        );
        return;
      }

      if (agentId && agentId.length > 128) {
        sendApiResponse(
          res,
          400,
          requestId,
          makeError('INVALID_AGENT_ID', 'agentId must be 128 characters or fewer.')
        );
        return;
      }

      if (agentId && auth.actorType === 'agent' && auth.actor.id !== agentId) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError('AGENT_IDENTITY_MISMATCH', 'An agent token may only create work for its own agentId.')
        );
        return;
      }

      if (!safety.isEnabled()) {
        sendApiResponse(
          res,
          503,
          requestId,
          makeError('GLOBAL_AI_DISABLED', 'Global AI execution is disabled by the safety switch.')
        );
        return;
      }
      if (!roleAllowsCommand(activePolicy, role, commandName)) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError(
            'ROLE_ACTION_NOT_ALLOWED',
            `Role "${role}" is not allowed to request command "${commandName}".`
          )
        );
        return;
      }
      const now = new Date().toISOString();
      const command = {
        id: body.id || randomId('cmd'),
        command: commandName,
        risk,
        role,
        agentId,
        target: body.target || 'default',
        task: body.task || '',
        payload: body.payload === undefined ? {} : body.payload,
        status: flags.humanGated ? 'pending_approval' : 'created',
        answer: null,
        assessment: null,
        approval: null,
        rejection: null,
        dispatchReceipt: null,
        createdAt: now,
        updatedAt: now,
        proofVersion: COMMAND_PROOF_VERSION,
        proofHash: null,
        humanGated: flags.humanGated,
        requiresHumanApproval: flags.requiresHumanApproval,
        forbiddenForAiExecution: flags.forbiddenForAiExecution,
      };
      command.proofHash = computeCommandProofHash(command);
      commands.set(command.id, command);

      audit('command.created', auth, requestId, {
        commandId: command.id,
        command: command.command,
        risk: command.risk,
        status: command.status,
        proofHash: command.proofHash,
        humanGated: command.humanGated,
        forbiddenForAiExecution: command.forbiddenForAiExecution,
      });

      sendApiResponse(res, 201, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.get(
    '/commands/:id',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.get(
    '/agents',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        agents: lifecycle.listAgents(),
        lease: lifecycle.getLeaseConfig(),
      });
    })
  );

  router.get(
    '/agents/:id',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        agent: lifecycle.getAgent(req.params.id),
      });
    })
  );

  router.get(
    '/agents/:id/children',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        parentAgentId: req.params.id,
        children: orchestrator.listChildren(req.params.id),
        capacity: orchestrator.getCapacity(),
      });
    })
  );

  router.post(
    '/agents',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const agent = lifecycle.registerAgent(req.body || {});
      audit('agent.registered', auth, requestId, {
        agentId: agent.agentId,
        status: agent.status,
      });
      sendApiResponse(res, 201, requestId, null, { agent });
    })
  );

  router.post(
    '/agents/:id/children',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }
      if (auth.actorType === 'agent' && auth.actor.id !== req.params.id) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError('AGENT_IDENTITY_MISMATCH', 'An agent token may only spawn children for itself.')
        );
        return;
      }

      const result = orchestrator.spawnChildAgent(req.params.id, req.body || {});
      audit('agent.child_spawned', auth, requestId, {
        parentAgentId: result.parent.agentId,
        childAgentId: result.agent.agentId,
        capacity: result.capacity,
      });
      sendApiResponse(res, 201, requestId, null, result);
    })
  );

  router.post(
    '/agents/:id/children/:childId/stop',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }
      if (auth.actorType === 'agent' && auth.actor.id !== req.params.id) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError('AGENT_IDENTITY_MISMATCH', 'An agent token may only stop children for itself.')
        );
        return;
      }

      const result = orchestrator.stopChildAgent(req.params.id, req.params.childId, {
        reason: req.body?.reason,
        actor: auth.actor,
        requestId,
      });
      audit('agent.child_stopped', auth, requestId, {
        parentAgentId: result.parent.agentId,
        childAgentId: result.agent.agentId,
        status: result.agent.status,
      });
      sendApiResponse(res, 200, requestId, null, result);
    })
  );

  router.post(
    '/agents/:id/transition',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const targetState = req.body?.state || req.body?.to;
      if (
        !safety.isEnabled() &&
        ['STARTING', 'ACTIVE', 'RESUMING'].includes(String(targetState || '').toUpperCase())
      ) {
        sendApiResponse(
          res,
          503,
          requestId,
          makeError('GLOBAL_AI_DISABLED', 'Global AI execution is disabled by the safety switch.')
        );
        return;
      }
      const agent = lifecycle.transitionAgent(req.params.id, targetState, {
        reason: req.body?.reason,
        actor: auth.actor,
        requestId,
        checkpointId: req.body?.checkpointId,
      });
      audit('agent.state_changed', auth, requestId, {
        agentId: agent.agentId,
        status: agent.status,
        latestTransition: agent.history[agent.history.length - 1],
      });
      sendApiResponse(res, 200, requestId, null, { agent });
    })
  );

  router.post(
    '/agents/:id/heartbeat',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      if (auth.actorType === 'agent' && auth.actor.id !== req.params.id) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError(
            'AGENT_IDENTITY_MISMATCH',
            'An agent token may only send heartbeats for its own agentId.'
          )
        );
        return;
      }

      const agent = lifecycle.heartbeat(req.params.id, req.body?.metadata);
      audit('agent.heartbeat', auth, requestId, {
        agentId: agent.agentId,
        status: agent.status,
        lastHeartbeatAt: agent.lastHeartbeatAt,
      });
      sendApiResponse(res, 200, requestId, null, { agent });
    })
  );

  router.post(
    '/agents/leases/sweep',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const changed = lifecycle.sweepHeartbeats();
      audit('agent.lease_sweep', auth, requestId, {
        changedAgentIds: changed.map((agent) => agent.agentId),
        lease: lifecycle.getLeaseConfig(),
      });
      sendApiResponse(res, 200, requestId, null, {
        changed,
        lease: lifecycle.getLeaseConfig(),
      });
    })
  );

  router.get(
    '/safety',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, safety.getState());
    })
  );

  router.post(
    '/safety/global',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const state = safety.setEnabled(req.body?.enabled, { actor: auth.actor });
      audit('safety.global_switch_changed', auth, requestId, state);
      sendApiResponse(res, 200, requestId, null, state);
    })
  );

  router.post(
    '/commands/:id/assess',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      const activePolicy = currentPolicy();
      if (!roleAllowsCommand(activePolicy, command.role, command.command)) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError(
            'ROLE_ACTION_NOT_ALLOWED',
            `Role "${command.role}" is no longer allowed to assess command "${command.command}".`
          )
        );
        return;
      }
      const flags = commandFlags(activePolicy, command.command, command.risk);
      const now = new Date().toISOString();
      command.assessment = {
        assessedAt: now,
        assessedBy: auth.actor,
        risk: command.risk,
        policyKnown: flags.known,
        humanGated: flags.humanGated,
        forbiddenForAiExecution: flags.forbiddenForAiExecution,
      };
      command.humanGated = flags.humanGated;
      command.requiresHumanApproval = flags.requiresHumanApproval;
      command.forbiddenForAiExecution = flags.forbiddenForAiExecution;
      if (command.status === 'created') {
        command.status = command.humanGated ? 'pending_approval' : 'assessed';
      }
      command.updatedAt = now;

      audit('command.assessed', auth, requestId, {
        commandId: command.id,
        assessment: command.assessment,
        status: command.status,
      });

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.post(
    '/commands/:id/approve',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      const now = new Date().toISOString();
      command.status = 'approved';
      command.approval = {
        approvedAt: now,
        approvedBy: auth.actor,
        requestId,
        reason: req.body?.reason || null,
      };
      command.rejection = null;
      command.updatedAt = now;

      audit('command.approved', auth, requestId, {
        commandId: command.id,
        reason: command.approval.reason,
      });

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.post(
    '/commands/:id/reject',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      const now = new Date().toISOString();
      command.status = 'rejected';
      command.rejection = {
        rejectedAt: now,
        rejectedBy: auth.actor,
        requestId,
        reason: req.body?.reason || null,
      };
      command.updatedAt = now;

      audit('command.rejected', auth, requestId, {
        commandId: command.id,
        reason: command.rejection.reason,
      });

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.post(
    '/commands/:id/dispatch',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      const mustUseAdmin =
        command.humanGated || isAtLeastRisk(command.risk, 'high') || command.risk === 'critical';
      const auth = mustUseAdmin
        ? requireAdmin(req, res, requestId, tokens)
        : requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      if (!safety.isEnabled()) {
        sendApiResponse(
          res,
          503,
          requestId,
          makeError('GLOBAL_AI_DISABLED', 'Global AI execution is disabled by the safety switch.')
        );
        return;
      }

      const activePolicy = currentPolicy();
      if (!roleAllowsCommand(activePolicy, command.role, command.command)) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError(
            'ROLE_ACTION_NOT_ALLOWED',
            `Role "${command.role}" is no longer allowed to dispatch command "${command.command}".`
          )
        );
        return;
      }

      if (command.agentId) {
        const targetAgent = lifecycle.getAgent(command.agentId);
        if (auth.actorType === 'agent' && auth.actor.id !== command.agentId) {
          sendApiResponse(
            res,
            403,
            requestId,
            makeError(
              'AGENT_IDENTITY_MISMATCH',
              'An agent token may only dispatch work for its own agentId.'
            )
          );
          return;
        }

        if (targetAgent.status === AGENT_STATES.JAILED) {
          sendApiResponse(
            res,
            423,
            requestId,
            makeError(
              'AGENT_JAILED',
              `Agent "${command.agentId}" is jailed and cannot receive work.`,
              { agentId: command.agentId, status: targetAgent.status }
            )
          );
          return;
        }

        if (!lifecycle.canAcceptWork(command.agentId)) {
          sendApiResponse(
            res,
            409,
            requestId,
            makeError(
              'AGENT_NOT_DISPATCHABLE',
              `Agent "${command.agentId}" is not dispatchable in state ${targetAgent.status}.`,
              { agentId: command.agentId, status: targetAgent.status }
            )
          );
          return;
        }
      }

      const requestedActorType = String(
        req.body?.actorType || req.get('x-ai-actor-type') || ''
      ).toLowerCase();
      const aiOrAgentActor =
        auth.actorType === 'agent' ||
        requestedActorType === 'agent' ||
        requestedActorType === 'ai' ||
        requestedActorType === 'automation';

      if (command.forbiddenForAiExecution && aiOrAgentActor) {
        sendApiResponse(
          res,
          403,
          requestId,
          makeError(
            'FORBIDDEN_FOR_AI_EXECUTION',
            'This command is forbidden for AI or agent execution.'
          )
        );
        return;
      }

      if (command.status === 'rejected') {
        sendApiResponse(
          res,
          409,
          requestId,
          makeError('COMMAND_REJECTED', 'Rejected commands cannot be dispatched.')
        );
        return;
      }

      if (command.humanGated && command.status !== 'approved') {
        sendApiResponse(
          res,
          409,
          requestId,
          makeError(
            'HUMAN_APPROVAL_REQUIRED',
            'This command is human-gated and must be approved before dispatch.'
          )
        );
        return;
      }

      if (controlRoomEnv === 'production' && command.risk === 'critical' && !command.approval) {
        sendApiResponse(
          res,
          409,
          requestId,
          makeError(
            'CRITICAL_APPROVAL_REQUIRED',
            'Critical production commands require explicit human approval before dispatch.'
          )
        );
        return;
      }

      const now = new Date().toISOString();
      command.status = 'dispatched';
      command.dispatchReceipt = {
        dispatchedAt: now,
        dispatchedBy: auth.actor,
        requestId,
        mode: 'governed',
      };
      command.updatedAt = now;

      audit('command.dispatched', auth, requestId, {
        commandId: command.id,
        command: command.command,
        risk: command.risk,
        proofHash: command.proofHash,
      });

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.post(
    '/commands/:id/answer',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = requireAgentOrAdmin(req, res, requestId, tokens);
      if (!auth) {
        return;
      }

      const command = findCommand(res, requestId, req.params.id);
      if (!command) {
        return;
      }

      const now = new Date().toISOString();
      command.status = 'answered';
      command.answer = {
        answeredAt: now,
        answeredBy: auth.actor,
        requestId,
        result: req.body?.answer ?? req.body?.result ?? null,
      };
      command.updatedAt = now;

      audit('command.answered', auth, requestId, {
        commandId: command.id,
        answer: command.answer,
      });

      sendApiResponse(res, 200, requestId, null, {
        command: publicCommand(command),
      });
    })
  );

  router.get(
    '/audit',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      const limit = Math.min(Number(req.query.limit || 100), 500);
      const events = readAuditEvents(auditLogPath).slice(-limit).map(redactSecrets);
      sendApiResponse(res, 200, requestId, null, {
        events,
        latestHash: readLatestAuditHash(auditLogPath),
      });
    })
  );

  router.get(
    '/audit/verify',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, verifyAuditChain(auditLogPath));
    })
  );

  router.get(
    '/policy',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, {
        policy: currentPolicy(),
      });
    })
  );

  router.get(
    '/policy/validate',
    asyncRoute(async (req, res) => {
      const requestId = req.aiAdminRequestId;
      const auth = authorizeReadOnly(req, res, requestId, tokens, controlRoomEnv);
      if (!auth) {
        return;
      }

      sendApiResponse(res, 200, requestId, null, validatePolicy(currentPolicy()));
    })
  );

  return router;
}

module.exports = createAiAdminGovernanceRouter;
module.exports.COMMAND_PROOF_VERSION = COMMAND_PROOF_VERSION;
module.exports.computeCommandProofHash = computeCommandProofHash;
module.exports.createAiAdminGovernanceRouter = createAiAdminGovernanceRouter;
module.exports.validatePolicy = validatePolicy;
