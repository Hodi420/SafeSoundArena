const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GENESIS_PREVIOUS_HASH = 'genesis:ai-control-room:audit:v1';

function canonicalize(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalized = canonicalize(item);
      return normalized === undefined ? null : normalized;
    });
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      const normalized = canonicalize(value[key]);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
      return result;
    }, {});
}

function canonicalJsonStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function randomId(prefix) {
  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

function computeAuditEventHash(eventPayload, previousHash) {
  const chainPreviousHash = previousHash || GENESIS_PREVIOUS_HASH;
  return crypto
    .createHash('sha256')
    .update(canonicalJsonStringify(eventPayload))
    .update('\n')
    .update(chainPreviousHash)
    .digest('hex');
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readAuditEvents(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readLatestAuditHash(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (event && typeof event.hash === 'string' && event.hash) {
        return event.hash;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function toAuditPayload(event) {
  return {
    id: event.id,
    event: event.event,
    actor: event.actor,
    requestId: event.requestId,
    timestamp: event.timestamp,
    details: event.details || {},
  };
}

function appendAuditEvent(filePath, eventName, options) {
  const config = options || {};
  const previousHash = readLatestAuditHash(filePath) || GENESIS_PREVIOUS_HASH;
  const eventPayload = {
    id: config.id || randomId('audit'),
    event: eventName,
    actor: config.actor || { type: 'system', id: 'system' },
    requestId: config.requestId || null,
    timestamp: config.timestamp || new Date().toISOString(),
    details: config.details || {},
  };
  const auditEvent = {
    ...eventPayload,
    previousHash,
    hash: computeAuditEventHash(eventPayload, previousHash),
  };

  ensureParentDirectory(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(auditEvent)}\n`, 'utf8');
  return auditEvent;
}

function verifyAuditChain(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      valid: true,
      checked: 0,
      brokenAt: null,
      latestHash: null,
    };
  }

  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  let previousHash = GENESIS_PREVIOUS_HASH;
  let latestHash = null;

  for (let index = 0; index < lines.length; index += 1) {
    let event;
    try {
      event = JSON.parse(lines[index]);
    } catch (error) {
      return {
        valid: false,
        checked: index + 1,
        brokenAt: index + 1,
        latestHash,
      };
    }

    const expectedHash = computeAuditEventHash(toAuditPayload(event), previousHash);
    if (event.previousHash !== previousHash || event.hash !== expectedHash) {
      return {
        valid: false,
        checked: index + 1,
        brokenAt: index + 1,
        latestHash,
      };
    }

    latestHash = event.hash;
    previousHash = event.hash;
  }

  return {
    valid: true,
    checked: lines.length,
    brokenAt: null,
    latestHash,
  };
}

module.exports = {
  GENESIS_PREVIOUS_HASH,
  appendAuditEvent,
  canonicalJsonStringify,
  computeAuditEventHash,
  readAuditEvents,
  readLatestAuditHash,
  verifyAuditChain,
};
