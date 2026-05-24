const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_PROOF_FILE = 'proof-events.jsonl';
const HASH_ALGORITHMS = new Set(['sha256', 'sha512']);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableValue(value[key]);
    return acc;
  }, {});
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function normalizeAlgorithm(algorithm) {
  return HASH_ALGORITHMS.has(algorithm) ? algorithm : 'sha256';
}

function digest(value, algorithm = 'sha256') {
  return crypto
    .createHash(normalizeAlgorithm(algorithm))
    .update(stableStringify(value))
    .digest('hex');
}

function createProofLayer(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const proofFile = options.proofFile || path.join(dataDir, DEFAULT_PROOF_FILE);

  function readEvents(limit) {
    ensureDir(dataDir);
    if (!fs.existsSync(proofFile)) return [];
    const events = fs.readFileSync(proofFile, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line));
    return limit ? events.slice(-limit) : events;
  }

  function appendEvent(type, payload = {}, context = {}, options = {}) {
    ensureDir(dataDir);
    const algorithm = normalizeAlgorithm(options.algorithm || payload.hashAlgorithm);
    const events = readEvents();
    const previous = events[events.length - 1] || null;
    const body = {
      id: crypto.randomUUID(),
      type,
      actor: context.actor || payload.actor || 'system',
      requestId: context.requestId || payload.requestId || null,
      at: new Date().toISOString(),
      algorithm,
      previousHash: previous?.hash || null,
      payload
    };
    const entry = {
      ...body,
      hash: digest(body, algorithm)
    };
    fs.appendFileSync(proofFile, `${JSON.stringify(entry)}\n`);
    return entry;
  }

  function logActivity(activity, context = {}, options = {}) {
    return appendEvent('activity', activity, context, options);
  }

  function logCheckpoint(checkpoint, context = {}, options = {}) {
    return appendEvent('checkpoint', checkpoint, context, options);
  }

  function logBotResponse(response, context = {}, options = {}) {
    return appendEvent('bot_response', response, context, options);
  }

  function verifyChain() {
    const events = readEvents();
    let previousHash = null;
    const failures = [];
    events.forEach((entry, index) => {
      const { hash, ...body } = entry;
      const expected = digest(body, entry.algorithm);
      if (entry.previousHash !== previousHash) {
        failures.push({
          index,
          id: entry.id,
          reason: 'previousHash mismatch',
          expected: previousHash,
          actual: entry.previousHash
        });
      }
      if (hash !== expected) {
        failures.push({
          index,
          id: entry.id,
          reason: 'hash mismatch',
          expected,
          actual: hash
        });
      }
      previousHash = hash;
    });
    return {
      ok: failures.length === 0,
      count: events.length,
      head: previousHash,
      failures
    };
  }

  function readByType(type, limit = 100) {
    return readEvents()
      .filter(entry => entry.type === type)
      .slice(-limit)
      .reverse();
  }

  function summary(limit = 20) {
    const events = readEvents();
    return {
      chain: verifyChain(),
      total: events.length,
      recent: events.slice(-limit).reverse(),
      activity: readByType('activity', limit),
      checkpoints: readByType('checkpoint', limit),
      botResponses: readByType('bot_response', limit)
    };
  }

  return {
    appendEvent,
    digest,
    logActivity,
    logBotResponse,
    logCheckpoint,
    readByType,
    readEvents,
    summary,
    verifyChain
  };
}

module.exports = {
  ...createProofLayer(),
  createProofLayer,
  stableStringify
};
