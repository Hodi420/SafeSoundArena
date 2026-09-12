'use strict';

const fs = require('fs');
const path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

class JsonlMemoryStore {
  constructor(options = {}) {
    this.filePath = options.filePath || null;
    this.maxMemories = positiveInteger(options.maxMemories, 10000);
    this.memories = new Map();
    this.loadErrors = 0;
    this._load();
  }

  _load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    const lines = fs.readFileSync(this.filePath, 'utf8').split(/\r?\n/).filter(Boolean);
    lines.forEach((line) => {
      try {
        const memory = JSON.parse(line);
        if (memory && typeof memory.id === 'string') {
          // Revisions are append-only; keep insertion order aligned with the
          // latest durable revision rather than the first one seen.
          this.memories.delete(memory.id);
          this.memories.set(memory.id, memory);
        }
      } catch (error) {
        this.loadErrors += 1;
      }
    });
    this._trim();
  }

  _trim() {
    while (this.memories.size > this.maxMemories) {
      this.memories.delete(this.memories.keys().next().value);
    }
  }

  upsert(memory) {
    if (!memory || typeof memory.id !== 'string' || !memory.id) {
      throw new TypeError('A memory id is required.');
    }
    const stored = clone(memory);
    if (this.filePath) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(stored)}\n`, 'utf8');
    }
    // Commit the in-memory revision only after the durable append succeeds.
    this.memories.delete(stored.id);
    this.memories.set(stored.id, stored);
    this._trim();
    return clone(stored);
  }

  get(id) {
    const memory = this.memories.get(String(id));
    return memory ? clone(memory) : null;
  }

  list(limit = 50) {
    const safeLimit = Math.min(positiveInteger(limit, 50), this.maxMemories);
    return Array.from(this.memories.values()).slice(-safeLimit).reverse().map(clone);
  }

  all() {
    return Array.from(this.memories.values()).map(clone);
  }

  getStatus() {
    return {
      type: 'jsonl',
      filePath: this.filePath,
      count: this.memories.size,
      maxMemories: this.maxMemories,
      loadErrors: this.loadErrors,
    };
  }
}

module.exports = { JsonlMemoryStore };
