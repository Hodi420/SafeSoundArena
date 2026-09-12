const AGENT_STATES = Object.freeze({
  REGISTERED: 'REGISTERED',
  STARTING: 'STARTING',
  ACTIVE: 'ACTIVE',
  PAUSING: 'PAUSING',
  PAUSED: 'PAUSED',
  RESUMING: 'RESUMING',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  CANCELLED: 'CANCELLED',
  JAILED: 'JAILED',
  FAILED: 'FAILED',
  RECOVERING: 'RECOVERING',
  ROLLING_BACK: 'ROLLING_BACK',
  LOST: 'LOST',
  UNHEALTHY: 'UNHEALTHY',
  KILLED: 'KILLED',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  REGISTERED: ['STARTING', 'CANCELLED'],
  STARTING: ['ACTIVE', 'FAILED', 'STOPPING', 'CANCELLED'],
  ACTIVE: ['PAUSING', 'STOPPING', 'JAILED', 'FAILED', 'UNHEALTHY', 'LOST', 'ROLLING_BACK', 'KILLED'],
  PAUSING: ['PAUSED', 'STOPPING', 'JAILED', 'FAILED'],
  PAUSED: ['RESUMING', 'STOPPING', 'JAILED', 'CANCELLED', 'KILLED'],
  RESUMING: ['ACTIVE', 'FAILED', 'STOPPING', 'JAILED'],
  STOPPING: ['STOPPED', 'FAILED'],
  STOPPED: ['STARTING', 'KILLED'],
  CANCELLED: [],
  JAILED: ['RESUMING', 'STOPPING', 'FAILED', 'KILLED'],
  FAILED: ['RECOVERING', 'ROLLING_BACK', 'STOPPING', 'KILLED'],
  RECOVERING: ['STARTING', 'FAILED', 'ROLLING_BACK', 'STOPPING'],
  ROLLING_BACK: ['RECOVERING', 'FAILED', 'STOPPING'],
  LOST: ['RECOVERING', 'STOPPING', 'KILLED'],
  UNHEALTHY: ['RECOVERING', 'LOST', 'STOPPING', 'KILLED'],
  KILLED: [],
});

const WORK_ACCEPTING_STATES = new Set([AGENT_STATES.ACTIVE]);
const LEASE_MONITORED_STATES = new Set([AGENT_STATES.ACTIVE, AGENT_STATES.UNHEALTHY]);

class AgentLifecycleError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = 'AgentLifecycleError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAgentId(agentId) {
  const value = String(agentId || '').trim();
  if (!value || value.length > 128) {
    throw new AgentLifecycleError(
      'INVALID_AGENT_ID',
      'agentId must be a non-empty string of 128 characters or fewer.'
    );
  }
  return value;
}

function normalizeState(state) {
  const value = String(state || '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(AGENT_STATES, value)) {
    throw new AgentLifecycleError('INVALID_AGENT_STATE', `Unknown agent state "${state}".`);
  }
  return value;
}

function normalizeCheckpointId(checkpointId) {
  const value = String(checkpointId || '').trim();
  if (!value || value.length > 256) {
    throw new AgentLifecycleError(
      'INVALID_CHECKPOINT_ID',
      'checkpointId must be a non-empty string of 256 characters or fewer.'
    );
  }
  return value;
}

function createAgentRecord(input, clock) {
  const agentId = normalizeAgentId(input.agentId);
  const createdAt = nowIso(clock);
  return {
    agentId,
    name: String(input.name || agentId).slice(0, 128),
    type: String(input.type || 'generic').slice(0, 64),
    status: AGENT_STATES.REGISTERED,
    metadata: clone(input.metadata || {}),
    checkpointId: input.checkpointId || null,
    lastHeartbeatAt: null,
    createdAt,
    updatedAt: createdAt,
    history: [
      {
        from: null,
        to: AGENT_STATES.REGISTERED,
        at: createdAt,
        reason: 'registered',
        actor: { type: 'system', id: 'lifecycle-controller' },
        requestId: null,
      },
    ],
  };
}

class AgentLifecycleController {
  constructor(options = {}) {
    this.clock = options.clock || (() => Date.now());
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.maxHistory = Number.isInteger(options.maxHistory) && options.maxHistory > 0
      ? options.maxHistory
      : 100;
    this.heartbeatTimeoutMs = positiveInteger(options.heartbeatTimeoutMs, 60 * 1000);
    this.leaseSweepIntervalMs = positiveInteger(
      options.leaseSweepIntervalMs,
      Math.min(this.heartbeatTimeoutMs, 15 * 1000)
    );
    this.leaseTimer = null;
    this.agents = new Map();

    if (options.initialState) {
      this.restoreState(options.initialState);
    } else {
      (options.initialAgents || []).forEach((agent) => {
        this.registerAgent(agent);
      });
    }

    if (options.autoStartLeaseMonitor === true) {
      this.startLeaseMonitor();
    }
  }

  registerAgent(input = {}) {
    const agentId = normalizeAgentId(input.agentId);
    if (this.agents.has(agentId)) {
      throw new AgentLifecycleError(
        'AGENT_ALREADY_REGISTERED',
        `Agent "${agentId}" is already registered.`,
        409
      );
    }

    const agent = createAgentRecord({ ...input, agentId }, this.clock);
    this.agents.set(agentId, agent);
    try {
      this.notifyChange();
    } catch (error) {
      this.agents.delete(agentId);
      throw error;
    }
    return clone(agent);
  }

  setOnChange(onChange) {
    this.onChange = typeof onChange === 'function' ? onChange : null;
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange(this.exportState());
    }
  }

  exportState() {
    return {
      agents: this.listAgents(),
    };
  }

  restoreState(state = {}) {
    if (!Array.isArray(state.agents)) {
      throw new AgentLifecycleError(
        'INVALID_LIFECYCLE_STATE',
        'Persisted lifecycle state must contain an agents array.',
        500
      );
    }

    this.agents.clear();
    state.agents.forEach((input) => {
      const base = createAgentRecord(input || {}, this.clock);
      base.status = normalizeState(input.status);
      base.metadata = clone(input.metadata || {});
      base.checkpointId = input.checkpointId || null;
      base.lastHeartbeatAt = input.lastHeartbeatAt || null;
      base.createdAt = input.createdAt || base.createdAt;
      base.updatedAt = input.updatedAt || base.updatedAt;
      base.history = Array.isArray(input.history) && input.history.length
        ? clone(input.history).slice(-this.maxHistory)
        : base.history;
      this.agents.set(base.agentId, base);
    });

    return this.listAgents();
  }

  getAgent(agentId) {
    const normalizedId = normalizeAgentId(agentId);
    const agent = this.agents.get(normalizedId);
    if (!agent) {
      throw new AgentLifecycleError(
        'AGENT_NOT_FOUND',
        `Agent "${normalizedId}" was not found.`,
        404
      );
    }
    return clone(agent);
  }

  listAgents() {
    return Array.from(this.agents.values()).map(clone);
  }

  transitionAgent(agentId, targetState, options = {}) {
    const normalizedId = normalizeAgentId(agentId);
    const agent = this.agents.get(normalizedId);
    if (!agent) {
      throw new AgentLifecycleError(
        'AGENT_NOT_FOUND',
        `Agent "${normalizedId}" was not found.`,
        404
      );
    }

    const nextState = normalizeState(targetState);
    const allowed = ALLOWED_TRANSITIONS[agent.status] || [];
    if (!allowed.includes(nextState)) {
      throw new AgentLifecycleError(
        'INVALID_AGENT_TRANSITION',
        `Agent "${normalizedId}" cannot transition from ${agent.status} to ${nextState}.`,
        409,
        { agentId: normalizedId, from: agent.status, to: nextState, allowed }
      );
    }

    let transitionCheckpointId = options.checkpointId === undefined
      ? agent.checkpointId
      : normalizeCheckpointId(options.checkpointId);

    if (nextState === AGENT_STATES.PAUSED) {
      if (options.checkpointId === undefined || !transitionCheckpointId) {
        throw new AgentLifecycleError(
          'CHECKPOINT_REQUIRED',
          `Agent "${normalizedId}" must provide a checkpointId before entering PAUSED.`
        );
      }
    }

    if (nextState === AGENT_STATES.RESUMING) {
      if (!agent.checkpointId) {
        throw new AgentLifecycleError(
          'CHECKPOINT_REQUIRED',
          `Agent "${normalizedId}" cannot resume without a stored checkpointId.`
        );
      }
      if (options.checkpointId !== undefined && transitionCheckpointId !== agent.checkpointId) {
        throw new AgentLifecycleError(
          'CHECKPOINT_MISMATCH',
          `Agent "${normalizedId}" must resume from checkpoint "${agent.checkpointId}".`,
          409,
          { expected: agent.checkpointId, received: transitionCheckpointId }
        );
      }
      transitionCheckpointId = agent.checkpointId;
    }

    const previousAgent = clone(agent);
    const at = nowIso(this.clock);
    const transition = {
      from: agent.status,
      to: nextState,
      at,
      reason: String(options.reason || 'unspecified').slice(0, 500),
      actor: clone(options.actor || { type: 'system', id: 'lifecycle-controller' }),
      requestId: options.requestId || null,
      checkpointId: transitionCheckpointId || null,
    };

    agent.status = nextState;
    agent.updatedAt = at;
    if (options.checkpointId !== undefined || nextState === AGENT_STATES.RESUMING) {
      agent.checkpointId = transitionCheckpointId || null;
    }
    if (nextState === AGENT_STATES.ACTIVE || nextState === AGENT_STATES.RESUMING) {
      agent.lastHeartbeatAt = at;
    }
    agent.history.push(transition);
    if (agent.history.length > this.maxHistory) {
      agent.history.splice(0, agent.history.length - this.maxHistory);
    }

    try {
      this.notifyChange();
    } catch (error) {
      this.agents.set(normalizedId, previousAgent);
      throw error;
    }
    return clone(agent);
  }

  heartbeat(agentId, metadata) {
    const normalizedId = normalizeAgentId(agentId);
    const agent = this.agents.get(normalizedId);
    if (!agent) {
      throw new AgentLifecycleError(
        'AGENT_NOT_FOUND',
        `Agent "${normalizedId}" was not found.`,
        404
      );
    }

    const previousAgent = clone(agent);
    agent.lastHeartbeatAt = nowIso(this.clock);
    agent.updatedAt = agent.lastHeartbeatAt;
    if (metadata && typeof metadata === 'object') {
      agent.metadata = { ...agent.metadata, ...clone(metadata) };
    }
    try {
      this.notifyChange();
    } catch (error) {
      this.agents.set(normalizedId, previousAgent);
      throw error;
    }
    return clone(agent);
  }

  getLeaseConfig() {
    return {
      heartbeatTimeoutMs: this.heartbeatTimeoutMs,
      leaseSweepIntervalMs: this.leaseSweepIntervalMs,
      monitorRunning: Boolean(this.leaseTimer),
    };
  }

  sweepHeartbeats() {
    const now = this.clock();
    const nowMs = new Date(now).getTime();
    const changed = [];

    this.agents.forEach((agent) => {
      if (!LEASE_MONITORED_STATES.has(agent.status)) {
        return;
      }

      const lastHeartbeatMs = Date.parse(agent.lastHeartbeatAt || '');
      const expired = !Number.isFinite(lastHeartbeatMs) || nowMs - lastHeartbeatMs > this.heartbeatTimeoutMs;
      if (!expired) {
        return;
      }

      const nextState = agent.status === AGENT_STATES.ACTIVE
        ? AGENT_STATES.UNHEALTHY
        : AGENT_STATES.LOST;
      changed.push(
        this.transitionAgent(agent.agentId, nextState, {
          reason: `heartbeat lease expired after ${this.heartbeatTimeoutMs}ms`,
          actor: { type: 'system', id: 'heartbeat-lease' },
        })
      );
    });

    return changed;
  }

  startLeaseMonitor() {
    if (this.leaseTimer) {
      return false;
    }

    this.leaseTimer = setInterval(() => {
      this.sweepHeartbeats();
    }, this.leaseSweepIntervalMs);
    if (typeof this.leaseTimer.unref === 'function') {
      this.leaseTimer.unref();
    }
    return true;
  }

  stopLeaseMonitor() {
    if (!this.leaseTimer) {
      return false;
    }
    clearInterval(this.leaseTimer);
    this.leaseTimer = null;
    return true;
  }

  canAcceptWork(agentId) {
    const agent = this.getAgent(agentId);
    return WORK_ACCEPTING_STATES.has(agent.status);
  }
}

class GlobalSafetyController {
  constructor(options = {}) {
    this.clock = options.clock || (() => Date.now());
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    const initialState = options.initialState || {};
    this.enabled = typeof initialState.globalAiEnabled === 'boolean'
      ? initialState.globalAiEnabled
      : options.enabled !== false;
    this.updatedAt = initialState.updatedAt || nowIso(this.clock);
    this.updatedBy = clone(initialState.updatedBy || { type: 'system', id: 'safety-controller' });
  }

  isEnabled() {
    return this.enabled;
  }

  getState() {
    return {
      globalAiEnabled: this.enabled,
      updatedAt: this.updatedAt,
      updatedBy: clone(this.updatedBy),
    };
  }

  setOnChange(onChange) {
    this.onChange = typeof onChange === 'function' ? onChange : null;
  }

  setEnabled(enabled, options = {}) {
    if (typeof enabled !== 'boolean') {
      throw new AgentLifecycleError(
        'INVALID_GLOBAL_AI_ENABLED',
        'globalAiEnabled must be a boolean.'
      );
    }

    const previousState = {
      enabled: this.enabled,
      updatedAt: this.updatedAt,
      updatedBy: clone(this.updatedBy),
    };
    this.enabled = enabled;
    this.updatedAt = nowIso(this.clock);
    this.updatedBy = clone(options.actor || { type: 'system', id: 'safety-controller' });
    try {
      if (this.onChange) {
        this.onChange(this.getState());
      }
    } catch (error) {
      this.enabled = previousState.enabled;
      this.updatedAt = previousState.updatedAt;
      this.updatedBy = previousState.updatedBy;
      throw error;
    }
    return this.getState();
  }
}

module.exports = {
  AGENT_STATES,
  ALLOWED_TRANSITIONS,
  AgentLifecycleController,
  AgentLifecycleError,
  GlobalSafetyController,
  LEASE_MONITORED_STATES,
  normalizeCheckpointId,
  WORK_ACCEPTING_STATES,
};
