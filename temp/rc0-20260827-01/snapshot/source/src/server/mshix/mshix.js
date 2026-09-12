'use strict';

const crypto = require('crypto');

const MSHIX_VERSION = 'mshix.event.v1';
const DEFAULTS = Object.freeze({
  maxEventBytes: 64 * 1024,
  maxHistory: 500,
  maxDeadLetters: 200,
  maxPayloadDepth: 8,
  maxCollectionItems: 100,
  handlerTimeoutMs: 5 * 1000,
  idempotencyTtlMs: 10 * 60 * 1000,
});

const EVENT_RISKS = Object.freeze(['low', 'medium', 'high', 'critical']);
const TERMINAL_DELIVERY_STATES = Object.freeze({
  ACCEPTED: 'accepted',
  DELIVERED: 'delivered',
  PARTIAL: 'partial',
  FAILED: 'failed',
  BLOCKED: 'blocked',
});

const SENSITIVE_KEY = /(token|secret|password|api[_-]?key|authorization|private[_-]?key|cookie)/i;

class MshixError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'MshixError';
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

function normalizeString(value, field, maxLength = 128, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim();
  if (!normalized || normalized.length > maxLength) {
    throw new MshixError('MSHIX_INVALID_INPUT', `${field} must be 1-${maxLength} characters.`);
  }
  return normalized;
}

function normalizeEventType(value) {
  const type = normalizeString(value, 'type', 128);
  if (!type || !/^[a-z0-9][a-z0-9._:-]*$/i.test(type)) {
    throw new MshixError(
      'MSHIX_INVALID_EVENT_TYPE',
      'type must use letters, numbers, dots, underscores, colons or hyphens.'
    );
  }
  return type;
}

function normalizeRisk(value) {
  const risk = String(value || 'low').trim().toLowerCase();
  if (!EVENT_RISKS.includes(risk)) {
    throw new MshixError('MSHIX_INVALID_RISK', `risk must be one of: ${EVENT_RISKS.join(', ')}.`);
  }
  return risk;
}

function sanitizeValue(value, options, depth = 0, seen = new WeakSet()) {
  if (depth > options.maxPayloadDepth) {
    throw new MshixError('MSHIX_PAYLOAD_TOO_DEEP', 'Event payload exceeds the maximum nesting depth.', 413);
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new MshixError('MSHIX_INVALID_PAYLOAD', 'Payload numbers must be finite.');
    return value;
  }
  if (value === undefined) return undefined;
  if (Buffer.isBuffer(value)) return `[binary:${value.length} bytes]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') {
    throw new MshixError('MSHIX_INVALID_PAYLOAD', 'Payload contains an unsupported value type.');
  }
  if (seen.has(value)) throw new MshixError('MSHIX_CIRCULAR_PAYLOAD', 'Event payload cannot contain circular references.');
  seen.add(value);

  let result;
  if (Array.isArray(value)) {
    if (value.length > options.maxCollectionItems) {
      throw new MshixError('MSHIX_PAYLOAD_TOO_LARGE', 'Payload arrays exceed the maximum item count.', 413);
    }
    result = value.map((item) => {
      const sanitized = sanitizeValue(item, options, depth + 1, seen);
      return sanitized === undefined ? null : sanitized;
    });
  } else {
    const keys = Object.keys(value);
    if (keys.length > options.maxCollectionItems) {
      throw new MshixError('MSHIX_PAYLOAD_TOO_LARGE', 'Payload objects exceed the maximum field count.', 413);
    }
    result = {};
    keys.forEach((key) => {
      if (key.length > 128) throw new MshixError('MSHIX_INVALID_PAYLOAD', 'Payload field names are too long.');
      if (SENSITIVE_KEY.test(key)) {
        result[key] = '[REDACTED]';
        return;
      }
      const sanitized = sanitizeValue(value[key], options, depth + 1, seen);
      if (sanitized !== undefined) result[key] = sanitized;
    });
  }
  seen.delete(value);
  return result;
}

function matchesEventType(pattern, eventType) {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) return eventType.startsWith(pattern.slice(0, -1));
  return pattern === eventType;
}

function normalizeActor(actor) {
  if (!actor) return { type: 'system', id: 'mshix' };
  if (typeof actor === 'string') return { type: 'unknown', id: normalizeString(actor, 'actor', 128) };
  if (typeof actor !== 'object') throw new MshixError('MSHIX_INVALID_ACTOR', 'actor must be an object or string.');
  return {
    type: normalizeString(actor.type, 'actor.type', 64, 'unknown'),
    id: normalizeString(actor.id, 'actor.id', 128, 'anonymous'),
  };
}

function normalizeTarget(input) {
  if (input.targetAgentId) {
    return { type: 'agent', id: normalizeString(input.targetAgentId, 'targetAgentId', 128) };
  }
  if (!input.target) return null;
  if (typeof input.target === 'string') return { type: 'resource', id: normalizeString(input.target, 'target', 128) };
  if (typeof input.target !== 'object') throw new MshixError('MSHIX_INVALID_TARGET', 'target must be an object or string.');
  const id = normalizeString(input.target.id, 'target.id', 128);
  if (!id) throw new MshixError('MSHIX_INVALID_TARGET', 'target.id is required.');
  return {
    type: normalizeString(input.target.type, 'target.type', 64, 'resource'),
    id,
  };
}

function normalizeOccurredAt(value, clock) {
  if (!value) return nowIso(clock);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new MshixError('MSHIX_INVALID_TIMESTAMP', 'occurredAt must be a valid date value.');
  return date.toISOString();
}

function safeError(error) {
  return {
    code: error?.code || 'MSHIX_CONNECTOR_ERROR',
    message: String(error?.message || 'Connector delivery failed').replace(SENSITIVE_KEY, '[REDACTED]').slice(0, 256),
  };
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new MshixError('MSHIX_CONNECTOR_TIMEOUT', `${label} exceeded ${timeoutMs}ms.`, 504));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class MshixCore {
  constructor(options = {}) {
    this.clock = options.clock || (() => Date.now());
    this.idFactory = options.idFactory || ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.options = {
      maxEventBytes: positiveInteger(options.maxEventBytes, DEFAULTS.maxEventBytes),
      maxHistory: positiveInteger(options.maxHistory, DEFAULTS.maxHistory),
      maxDeadLetters: positiveInteger(options.maxDeadLetters, DEFAULTS.maxDeadLetters),
      maxPayloadDepth: positiveInteger(options.maxPayloadDepth, DEFAULTS.maxPayloadDepth),
      maxCollectionItems: positiveInteger(options.maxCollectionItems, DEFAULTS.maxCollectionItems),
      handlerTimeoutMs: positiveInteger(options.handlerTimeoutMs, DEFAULTS.handlerTimeoutMs),
      idempotencyTtlMs: positiveInteger(options.idempotencyTtlMs, DEFAULTS.idempotencyTtlMs),
    };
    this.safetyController = options.safetyController || null;
    this.lifecycleController = options.lifecycleController || null;
    this.executionController = options.executionController || null;
    this.jailStateProvider = typeof options.jailStateProvider === 'function' ? options.jailStateProvider : null;
    this.audit = typeof options.audit === 'function' ? options.audit : null;
    this.connectors = new Map();
    this.events = [];
    this.deadLetters = [];
    this.idempotency = new Map();
    this.startedAt = nowIso(this.clock);
    this.stopped = false;
    this.metrics = {
      published: 0,
      accepted: 0,
      delivered: 0,
      blocked: 0,
      duplicates: 0,
      deliveryFailures: 0,
      deadLetters: 0,
      auditFailures: 0,
    };
  }

  _assertRunning() {
    if (this.stopped) throw new MshixError('MSHIX_STOPPED', 'MSHIX is stopped.', 503);
  }

  _normalizeEvent(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new MshixError('MSHIX_INVALID_EVENT', 'Event input must be an object.');
    }
    const payload = sanitizeValue(input.payload || {}, this.options) || {};
    const metadata = sanitizeValue(input.metadata || {}, this.options) || {};
    const event = {
      eventVersion: MSHIX_VERSION,
      id: normalizeString(input.id || input.eventId, 'id', 128, this.idFactory('evt')),
      type: normalizeEventType(input.type),
      source: normalizeString(input.source, 'source', 128, 'unknown'),
      action: normalizeString(input.action, 'action', 128),
      execution: input.execution === true || input.requiresExecution === true,
      risk: normalizeRisk(input.risk),
      actor: normalizeActor(input.actor),
      target: normalizeTarget(input),
      correlationId: normalizeString(input.correlationId, 'correlationId', 128, null),
      causationId: normalizeString(input.causationId, 'causationId', 128, null),
      idempotencyKey: normalizeString(input.idempotencyKey, 'idempotencyKey', 256, null),
      occurredAt: normalizeOccurredAt(input.occurredAt, this.clock),
      payload,
      metadata,
    };
    const bytes = Buffer.byteLength(JSON.stringify(event), 'utf8');
    if (bytes > this.options.maxEventBytes) {
      throw new MshixError('MSHIX_EVENT_TOO_LARGE', `Event exceeds ${this.options.maxEventBytes} bytes.`, 413, { bytes });
    }
    return Object.freeze(event);
  }

  _admit(event) {
    const checks = [];
    if (!event.execution) {
      checks.push({ name: 'execution-gate', passed: true, mode: 'observe-only' });
      return { allowed: true, checks };
    }

    if (this.safetyController && !this.safetyController.isEnabled()) {
      throw new MshixError('MSHIX_GLOBAL_AI_DISABLED', 'Global AI execution is disabled by the safety switch.', 503);
    }
    checks.push({ name: 'global-safety-switch', passed: true });

    const agentId = event.target?.type === 'agent' ? event.target.id : null;
    if (agentId && this.lifecycleController) {
      let agent;
      try {
        agent = this.lifecycleController.getAgent(agentId);
      } catch (error) {
        throw new MshixError('MSHIX_TARGET_AGENT_NOT_FOUND', `Target agent "${agentId}" was not found.`, 404);
      }
      if (agent.status === 'JAILED') {
        throw new MshixError('MSHIX_AGENT_JAILED', `Target agent "${agentId}" is jailed.`, 423, { agentId });
      }
      if (!this.lifecycleController.canAcceptWork(agentId)) {
        throw new MshixError('MSHIX_AGENT_NOT_DISPATCHABLE', `Target agent "${agentId}" is not dispatchable.`, 409, {
          agentId,
          status: agent.status,
        });
      }
      checks.push({ name: 'agent-lifecycle', passed: true, agentId, status: agent.status });
    }

    if (this.jailStateProvider && this.jailStateProvider() === true && event.metadata.allowDuringJail !== true) {
      throw new MshixError('MSHIX_JAIL_ACTIVE', 'Execution is blocked while the Jail is active.', 423);
    }
    checks.push({ name: 'jail-gate', passed: true });
    return { allowed: true, checks };
  }

  _pruneIdempotency() {
    const now = this.clock();
    this.idempotency.forEach((entry, key) => {
      if (entry.expiresAt <= now) this.idempotency.delete(key);
    });
  }

  registerConnector(input = {}) {
    const connectorId = normalizeString(input.id || input.connectorId, 'connectorId', 128);
    if (!connectorId) throw new MshixError('MSHIX_CONNECTOR_ID_REQUIRED', 'connectorId is required.');
    if (this.connectors.has(connectorId)) {
      throw new MshixError('MSHIX_CONNECTOR_EXISTS', `Connector "${connectorId}" is already registered.`, 409);
    }
    if (typeof input.handler !== 'function') {
      throw new MshixError('MSHIX_CONNECTOR_HANDLER_REQUIRED', `Connector "${connectorId}" requires a handler.`);
    }
    const eventTypes = Array.isArray(input.eventTypes) && input.eventTypes.length ? input.eventTypes : ['*'];
    eventTypes.forEach((pattern) => {
      if (typeof pattern !== 'string' || !/^[a-z0-9._:*?-]+$/i.test(pattern)) {
        throw new MshixError('MSHIX_INVALID_CONNECTOR_FILTER', `Invalid event filter for connector "${connectorId}".`);
      }
    });
    const record = {
      id: connectorId,
      version: normalizeString(input.version, 'connector.version', 64, '1.0.0'),
      description: normalizeString(input.description, 'connector.description', 256, null),
      eventTypes: eventTypes.slice(0, this.options.maxCollectionItems),
      capabilities: Array.isArray(input.capabilities) ? input.capabilities.map(String).slice(0, 50) : [],
      registeredAt: nowIso(this.clock),
      status: 'ready',
      deliveryCount: 0,
      failureCount: 0,
      lastDeliveryAt: null,
      lastError: null,
      handler: input.handler,
      health: typeof input.health === 'function' ? input.health : null,
    };
    this.connectors.set(connectorId, record);
    return this._publicConnector(record);
  }

  unregisterConnector(connectorId) {
    const id = normalizeString(connectorId, 'connectorId', 128);
    if (!this.connectors.delete(id)) return false;
    return true;
  }

  _publicConnector(record) {
    const { handler, health, ...publicRecord } = record;
    return clone(publicRecord);
  }

  listConnectors() {
    return Array.from(this.connectors.values()).map((record) => this._publicConnector(record));
  }

  _matchingConnectors(event) {
    return Array.from(this.connectors.values()).filter((connector) =>
      connector.eventTypes.some((pattern) => matchesEventType(pattern, event.type))
    );
  }

  dryRun(input = {}) {
    const event = this._normalizeEvent(input);
    const admission = this._admit(event);
    return {
      event: clone(event),
      admission,
      matchedConnectors: this._matchingConnectors(event).map((connector) => connector.id),
      maxEventBytes: this.options.maxEventBytes,
    };
  }

  async publish(input = {}) {
    this._assertRunning();
    this._pruneIdempotency();
    const event = this._normalizeEvent(input);
    const idempotencyKey = event.idempotencyKey || event.id;
    const existing = this.idempotency.get(idempotencyKey);
    const replayFailedDelivery = input.replay === true
      && existing
      && ['failed', 'partial'].includes(existing.result?.status);
    if (existing && !replayFailedDelivery) {
      this.metrics.duplicates += 1;
      return { ...clone(existing.result), duplicate: true };
    }
    if (replayFailedDelivery) this.idempotency.delete(idempotencyKey);

    let admission;
    let controllerReceipt = null;
    try {
      admission = this._admit(event);
      if (event.execution && this.executionController) {
        if (typeof this.executionController.requestExecution !== 'function') {
          throw new MshixError(
            'MSHIX_EXECUTION_CONTROLLER_INVALID',
            'The execution controller must expose requestExecution(event, context).',
            500
          );
        }
        controllerReceipt = await this.executionController.requestExecution(event, { admission });
      }
    } catch (error) {
      this.metrics.blocked += 1;
      throw error;
    }

    const record = {
      event: clone(event),
      status: TERMINAL_DELIVERY_STATES.ACCEPTED,
      acceptedAt: nowIso(this.clock),
      completedAt: null,
      admission,
      controller: controllerReceipt,
      deliveries: [],
    };
    this.events.push(record);
    this.events.splice(0, Math.max(0, this.events.length - this.options.maxHistory));
    this.metrics.published += 1;
    this.metrics.accepted += 1;

    const deliveries = [];
    const matchedConnectors = this._matchingConnectors(event);
    for (const connector of matchedConnectors) {
      try {
        const result = await withTimeout(
          Promise.resolve().then(() => connector.handler(clone(event), {
            mshixVersion: MSHIX_VERSION,
            connectorId: connector.id,
            admission: clone(admission),
          })),
          this.options.handlerTimeoutMs,
          connector.id
        );
        connector.deliveryCount += 1;
        connector.status = 'ready';
        connector.lastDeliveryAt = nowIso(this.clock);
        connector.lastError = null;
        deliveries.push({ connectorId: connector.id, status: 'delivered', result: sanitizeValue(result ?? null, this.options) });
      } catch (error) {
        const normalizedError = safeError(error);
        connector.failureCount += 1;
        connector.status = 'degraded';
        connector.lastError = normalizedError;
        const deadLetter = {
          id: this.idFactory('dlq'),
          eventId: event.id,
          connectorId: connector.id,
          createdAt: nowIso(this.clock),
          error: normalizedError,
        };
        this.deadLetters.push(deadLetter);
        this.deadLetters.splice(0, Math.max(0, this.deadLetters.length - this.options.maxDeadLetters));
        this.metrics.deliveryFailures += 1;
        this.metrics.deadLetters += 1;
        deliveries.push({ connectorId: connector.id, status: 'failed', error: normalizedError });
      }
    }

    const successful = deliveries.filter((delivery) => delivery.status === 'delivered').length;
    const failed = deliveries.filter((delivery) => delivery.status === 'failed').length;
    record.status = failed && successful ? TERMINAL_DELIVERY_STATES.PARTIAL
      : failed ? TERMINAL_DELIVERY_STATES.FAILED
        : matchedConnectors.length ? TERMINAL_DELIVERY_STATES.DELIVERED : TERMINAL_DELIVERY_STATES.ACCEPTED;
    record.deliveries = deliveries;
    record.completedAt = nowIso(this.clock);
    if (record.status === TERMINAL_DELIVERY_STATES.DELIVERED) this.metrics.delivered += 1;
    if (this.audit) {
      try {
        await Promise.resolve(this.audit({
          event: clone(event),
          admission: clone(admission),
          status: record.status,
          deliveries: clone(deliveries),
          controller: clone(controllerReceipt),
        }));
        record.audit = { status: 'recorded' };
      } catch (error) {
        this.metrics.auditFailures += 1;
        record.audit = { status: 'failed', error: safeError(error) };
      }
    }

    const result = {
      accepted: true,
      duplicate: false,
      status: record.status,
      event: record.event,
      admission,
      controller: controllerReceipt,
      deliveries,
    };
    this.idempotency.set(idempotencyKey, {
      expiresAt: this.clock() + this.options.idempotencyTtlMs,
      result: clone(result),
    });
    return result;
  }

  async request(input = {}) {
    return this.publish({ ...input, execution: true });
  }

  getEvent(eventId) {
    const id = normalizeString(eventId, 'eventId', 128);
    const record = this.events.find((item) => item.event.id === id);
    if (!record) throw new MshixError('MSHIX_EVENT_NOT_FOUND', `Event "${id}" was not found.`, 404);
    return clone(record);
  }

  listEvents(filters = {}) {
    const limit = Math.min(positiveInteger(filters.limit, 50), this.options.maxHistory);
    return this.events
      .filter((record) => !filters.type || record.event.type === filters.type)
      .filter((record) => !filters.status || record.status === filters.status)
      .slice(-limit)
      .reverse()
      .map(clone);
  }

  getDeadLetters(limit = 50) {
    return this.deadLetters.slice(-Math.min(positiveInteger(limit, 50), this.options.maxDeadLetters)).reverse().map(clone);
  }

  getMetrics() {
    return {
      ...clone(this.metrics),
      eventsInHistory: this.events.length,
      deadLettersInMemory: this.deadLetters.length,
      connectorCount: this.connectors.size,
    };
  }

  getStatus() {
    return {
      service: 'mshix',
      version: MSHIX_VERSION,
      status: this.stopped ? 'stopped' : 'ready',
      startedAt: this.startedAt,
      connectorCount: this.connectors.size,
      connectors: this.listConnectors(),
      metrics: this.getMetrics(),
      gates: {
        globalAiEnabled: this.safetyController ? this.safetyController.isEnabled() : null,
        lifecycleAttached: Boolean(this.lifecycleController),
        executionControllerAttached: Boolean(this.executionController),
        jailProviderAttached: Boolean(this.jailStateProvider),
      },
    };
  }

  async getHealth() {
    const connectors = [];
    for (const connector of this.connectors.values()) {
      let health = { status: connector.status };
      if (connector.health) {
        try {
          health = await withTimeout(
            Promise.resolve().then(() => connector.health()),
            this.options.handlerTimeoutMs,
            `${connector.id}.health`
          );
        } catch (error) {
          health = { status: 'degraded', error: safeError(error) };
        }
      }
      connectors.push({ id: connector.id, status: health.status || 'unknown', details: health.details || null });
    }
    const degraded = connectors.some((connector) => connector.status !== 'ready' && connector.status !== 'ok');
    return {
      service: 'mshix',
      version: MSHIX_VERSION,
      status: this.stopped ? 'stopped' : degraded ? 'degraded' : 'ok',
      timestamp: nowIso(this.clock),
      connectors,
      metrics: this.getMetrics(),
    };
  }

  shutdown() {
    this.stopped = true;
  }
}

module.exports = {
  DEFAULTS,
  EVENT_RISKS,
  MSHIX_VERSION,
  MshixCore,
  MshixError,
  TERMINAL_DELIVERY_STATES,
  normalizeEventType,
  sanitizeValue,
};
