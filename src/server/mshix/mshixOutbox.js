'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function safeString(value, fallback = '') {
  return String(value ?? fallback).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim();
}

function stableOutboxId(eventId) {
  const digest = crypto.createHash('sha256').update(String(eventId)).digest('hex').slice(0, 32);
  return `outbox_${digest}`;
}

function safeError(error) {
  return {
    code: error?.code || 'MSHIX_OUTBOX_DISPATCH_FAILED',
    message: safeString(error?.message || 'Outbox dispatch failed').slice(0, 256),
  };
}

class MshixOutbox {
  constructor(options = {}) {
    this.clock = options.clock || (() => Date.now());
    this.filePath = options.filePath || null;
    this.maxEntries = positiveInteger(options.maxEntries, 10000);
    this.maxAttempts = positiveInteger(options.maxAttempts, 10);
    this.retryBaseMs = positiveInteger(options.retryBaseMs, 1000);
    this.dispatchLeaseMs = positiveInteger(options.dispatchLeaseMs, 30 * 1000);
    this.entries = new Map();
    this.loadErrors = 0;
    this.activeDispatches = new Set();
    this._load();
  }

  _nowIso() {
    return new Date(this.clock()).toISOString();
  }

  _load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    const lines = fs.readFileSync(this.filePath, 'utf8').split(/\r?\n/).filter(Boolean);
    lines.forEach((line) => {
      try {
        const entry = JSON.parse(line);
        if (!entry || typeof entry.id !== 'string' || !entry.event) return;
        this.entries.delete(entry.id);
        this.entries.set(entry.id, entry);
      } catch (error) {
        this.loadErrors += 1;
      }
    });
    this._trim();
  }

  _trim() {
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  _commit(entry) {
    const stored = clone(entry);
    if (this.filePath) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(stored)}\n`, 'utf8');
    }
    this.entries.delete(stored.id);
    this.entries.set(stored.id, stored);
    this._trim();
    return clone(stored);
  }

  _normalizeEvent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Outbox event must be an object.');
    }
    const event = clone(input);
    const eventId = safeString(event.id) || `evt_outbox_${crypto.randomUUID()}`;
    return {
      ...event,
      id: eventId,
      idempotencyKey: safeString(event.idempotencyKey) || eventId,
    };
  }

  enqueue(event) {
    const normalizedEvent = this._normalizeEvent(event);
    const id = stableOutboxId(normalizedEvent.id);
    const existing = this.entries.get(id);
    if (existing) return clone(existing);

    const now = this._nowIso();
    return this._commit({
      schemaVersion: 'mshix.outbox.v1',
      id,
      event: normalizedEvent,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextAttemptAt: null,
      dispatchLeaseUntil: null,
      lastError: null,
      result: null,
    });
  }

  get(id) {
    const entry = this.entries.get(String(id));
    return entry ? clone(entry) : null;
  }

  list(limit = 50) {
    const safeLimit = Math.min(positiveInteger(limit, 50), this.maxEntries);
    return Array.from(this.entries.values()).slice(-safeLimit).reverse().map(clone);
  }

  listDue(limit = 100) {
    const now = this.clock();
    return this.list(this.maxEntries)
      .filter((entry) => {
        if (entry.status === 'dispatching') {
          return !entry.dispatchLeaseUntil || Date.parse(entry.dispatchLeaseUntil) <= now;
        }
        if (!['pending', 'failed'].includes(entry.status)) return false;
        return !entry.nextAttemptAt || Date.parse(entry.nextAttemptAt) <= now;
      })
      .slice(0, Math.min(positiveInteger(limit, 100), this.maxEntries));
  }

  markDispatching(id) {
    const entry = this.entries.get(String(id));
    if (!entry) throw new Error(`Outbox entry "${id}" was not found.`);
    const now = this.clock();
    return this._commit({
      ...entry,
      status: 'dispatching',
      attempts: entry.attempts + 1,
      updatedAt: new Date(now).toISOString(),
      nextAttemptAt: null,
      dispatchLeaseUntil: new Date(now + this.dispatchLeaseMs).toISOString(),
    });
  }

  markDelivered(id, result) {
    const entry = this.entries.get(String(id));
    if (!entry) throw new Error(`Outbox entry "${id}" was not found.`);
    return this._commit({
      ...entry,
      status: 'delivered',
      updatedAt: this._nowIso(),
      deliveredAt: this._nowIso(),
      dispatchLeaseUntil: null,
      nextAttemptAt: null,
      lastError: null,
      result: result ? clone(result) : null,
    });
  }

  markFailed(id, error) {
    const entry = this.entries.get(String(id));
    if (!entry) throw new Error(`Outbox entry "${id}" was not found.`);
    const exhausted = entry.attempts >= this.maxAttempts;
    const nextAttemptAt = exhausted
      ? null
      : new Date(this.clock() + this.retryBaseMs * (2 ** Math.max(0, entry.attempts - 1))).toISOString();
    return this._commit({
      ...entry,
      status: exhausted ? 'dead_letter' : 'failed',
      updatedAt: this._nowIso(),
      dispatchLeaseUntil: null,
      nextAttemptAt,
      lastError: safeError(error),
    });
  }

  async dispatch(entryOrId, publish) {
    if (typeof publish !== 'function') throw new TypeError('Outbox dispatch requires a publish function.');
    const entry = typeof entryOrId === 'string' ? this.get(entryOrId) : clone(entryOrId);
    if (!entry) throw new Error('Outbox entry was not found.');
    if (entry.status === 'delivered') {
      return { outboxId: entry.id, status: 'delivered', attempts: entry.attempts, duplicate: true, result: entry.result };
    }
    if (entry.status === 'dead_letter') {
      return { outboxId: entry.id, status: 'dead_letter', attempts: entry.attempts, error: entry.lastError };
    }
    if (entry.status === 'failed' && entry.nextAttemptAt && Date.parse(entry.nextAttemptAt) > this.clock()) {
      return { outboxId: entry.id, status: 'failed', attempts: entry.attempts, deferred: true, nextAttemptAt: entry.nextAttemptAt, error: entry.lastError };
    }
    if (entry.status === 'dispatching' && entry.dispatchLeaseUntil && Date.parse(entry.dispatchLeaseUntil) > this.clock()) {
      return { outboxId: entry.id, status: 'dispatching', attempts: entry.attempts, deferred: true, nextAttemptAt: entry.dispatchLeaseUntil };
    }
    if (this.activeDispatches.has(entry.id)) {
      return { outboxId: entry.id, status: 'dispatching', attempts: entry.attempts, inFlight: true };
    }

    this.activeDispatches.add(entry.id);
    let marked;
    try {
      marked = this.markDispatching(entry.id);
      const result = await publish(clone(marked.event), {
        outboxId: marked.id,
        attempt: marked.attempts,
        replay: marked.attempts > 1,
      });
      if (result && ['failed', 'partial'].includes(result.status)) {
        const failed = this.markFailed(marked.id, {
          code: 'MSHIX_EVENT_DELIVERY_FAILED',
          message: `MSHIX returned ${result.status}.`,
        });
        return { outboxId: failed.id, status: failed.status, attempts: failed.attempts, result, nextAttemptAt: failed.nextAttemptAt };
      }
      const delivered = this.markDelivered(marked.id, result);
      return { outboxId: delivered.id, status: delivered.status, attempts: delivered.attempts, result: delivered.result };
    } catch (error) {
      const failed = this.markFailed(marked?.id || entry.id, error);
      return { outboxId: failed.id, status: failed.status, attempts: failed.attempts, error: failed.lastError, nextAttemptAt: failed.nextAttemptAt };
    } finally {
      this.activeDispatches.delete(entry.id);
    }
  }

  async replay(publish, options = {}) {
    const receipts = [];
    for (const entry of this.listDue(options.limit)) {
      receipts.push(await this.dispatch(entry.id, publish));
    }
    return receipts;
  }

  getStatus() {
    const counts = {};
    this.entries.forEach((entry) => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
    });
    return {
      type: 'jsonl-outbox',
      filePath: this.filePath,
      count: this.entries.size,
      maxEntries: this.maxEntries,
      maxAttempts: this.maxAttempts,
      loadErrors: this.loadErrors,
      activeDispatches: this.activeDispatches.size,
      counts,
    };
  }
}

module.exports = { MshixOutbox, safeError, stableOutboxId };
