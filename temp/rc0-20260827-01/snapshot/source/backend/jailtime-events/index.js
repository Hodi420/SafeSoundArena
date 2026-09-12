const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_ENTRIES = 10000;
const JAILTIME_EVENT_PREFIXES = ['jail.'];

function isJailTimeEvent(event = {}) {
  return JAILTIME_EVENT_PREFIXES.some((prefix) =>
    typeof event.type === 'string' && event.type.startsWith(prefix)
  ) || event.source === 'backend.jail.scheduler' || event.source === 'backend.jail.socket';
}

function safeLimit(value, fallback = 100) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1000) : fallback;
}

class JailTimeEventLog {
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(
      process.env.SAFESOUND_DATA_DIR || path.join(__dirname, '..', 'api', 'data'),
      'jailtime-events.jsonl'
    );
    this.maxEntries = Number.isInteger(Number(options.maxEntries)) && Number(options.maxEntries) > 0
      ? Number(options.maxEntries)
      : DEFAULT_MAX_ENTRIES;
    this.clock = typeof options.clock === 'function' ? options.clock : () => new Date();
    this.events = [];
    this.lastError = null;
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const lines = fs.readFileSync(this.filePath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-this.maxEntries);
      this.events = lines.map((line) => JSON.parse(line));
      this.lastError = null;
    } catch (error) {
      this.lastError = { code: 'JAILTIME_LOG_READ_FAILED', message: error.message };
      this.events = [];
    }
  }

  _append(event) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  record(event = {}) {
    if (!isJailTimeEvent(event)) {
      throw new TypeError('JailTime log accepts only JailTime lifecycle events.');
    }

    const timestamp = this.clock().toISOString();
    const stored = {
      schema: 'jailtime-event-v1',
      eventId: event.id || `jailtime-${crypto.randomUUID()}`,
      eventType: event.type,
      source: event.source || 'jailtime',
      timestamp,
      correlationId: event.correlationId || null,
      actor: event.actor || { type: 'system', id: 'jailtime' },
      payload: event.payload || {},
    };

    try {
      this._append(stored);
      this.events.push(stored);
      if (this.events.length > this.maxEntries) {
        this.events = this.events.slice(-this.maxEntries);
      }
      this.lastError = null;
      return stored;
    } catch (error) {
      this.lastError = { code: 'JAILTIME_LOG_WRITE_FAILED', message: error.message };
      throw error;
    }
  }

  list(limit) {
    return this.events.slice(-safeLimit(limit)).reverse();
  }

  getStatus() {
    return {
      status: this.lastError ? 'degraded' : 'ok',
      filePath: this.filePath,
      count: this.events.length,
      maxEntries: this.maxEntries,
      lastEventAt: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      lastError: this.lastError,
    };
  }
}

function createJailTimeEventLog(options = {}) {
  return new JailTimeEventLog(options);
}

module.exports = {
  JailTimeEventLog,
  createJailTimeEventLog,
  isJailTimeEvent,
};
