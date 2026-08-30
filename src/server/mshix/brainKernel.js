'use strict';

const crypto = require('crypto');

const RISK_IMPORTANCE = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function memoryIdForEvent(eventId) {
  const digest = crypto.createHash('sha256').update(String(eventId)).digest('hex').slice(0, 32);
  return `memory_${digest}`;
}

function safeString(value, fallback = '') {
  return String(value ?? fallback).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim();
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}

function lexicalScore(memory, query) {
  const haystack = [memory.summary, memory.text, memory.eventType, memory.source, ...(memory.tags || [])]
    .join(' ')
    .toLowerCase();
  const tokens = safeString(query).toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

class MshixBrainKernel {
  constructor(options = {}) {
    if (!options.memoryStore || typeof options.memoryStore.upsert !== 'function') {
      throw new TypeError('MshixBrainKernel requires a memoryStore.');
    }
    this.store = options.memoryStore;
    this.provider = options.provider || null;
    this.autoEnrich = options.autoEnrich === true;
    this.storePayload = options.storePayload === true;
    this.maxQueue = positiveInteger(options.maxQueue, 100);
    this.queue = [];
    this.processing = false;
    this.drainPromise = null;
    this.metrics = {
      observed: 0,
      duplicates: 0,
      enrichmentQueued: 0,
      enriched: 0,
      enrichmentFailed: 0,
      queueDropped: 0,
      retrievals: 0,
    };
  }

  _baseMemory(event) {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
    const declaredText = payload.memoryText || payload.summary || payload.description || '';
    const payloadKeys = Object.keys(payload).slice(0, 100);
    const text = safeString(
      declaredText || `event ${event.type} from ${event.source}; fields: ${payloadKeys.join(', ') || 'none'}`
    ).slice(0, 4000);
    const createdAt = new Date().toISOString();
    const memory = {
      schemaVersion: 'mshix.memory.v1',
      // Event identity is the memory identity, preventing duplicate memories
      // when an event is replayed after a process restart.
      id: memoryIdForEvent(event.id),
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      actor: clone(event.actor),
      occurredAt: event.occurredAt,
      createdAt,
      text,
      summary: text.slice(0, 1000),
      tags: [event.type, event.source].filter(Boolean),
      importance: RISK_IMPORTANCE[event.risk] || 1,
      status: 'observed',
      model: null,
      embeddingModel: null,
      embedding: null,
      payloadKeys,
      metadata: { execution: event.execution === true, risk: event.risk },
    };
    if (this.storePayload) memory.payload = clone(payload);
    return memory;
  }

  ingest(event) {
    const memory = this._baseMemory(event);
    if (typeof this.store.get === 'function' && this.store.get(memory.id)) {
      this.metrics.duplicates += 1;
      return {
        acknowledged: true,
        mode: 'memory-kernel',
        memoryId: memory.id,
        enrichment: 'duplicate',
        duplicate: true,
      };
    }
    this.store.upsert(memory);
    this.metrics.observed += 1;

    let enrichment = 'disabled';
    if (this.autoEnrich && this.provider) {
      if (this.queue.length >= this.maxQueue) {
        this.metrics.queueDropped += 1;
        enrichment = 'queue-full';
      } else {
        this.queue.push(memory.id);
        this.metrics.enrichmentQueued += 1;
        enrichment = 'queued';
        void this.drain();
      }
    }

    return {
      acknowledged: true,
      mode: 'memory-kernel',
      memoryId: memory.id,
      enrichment,
    };
  }

  async _enrich(memory) {
    let updated = { ...memory };
    let enriched = false;
    const errors = [];
    if (this.provider && typeof this.provider.chatJson === 'function') {
      try {
        const result = await this.provider.chatJson(
          `Analyze this SafeSoundArena event for a local memory index. Do not recommend actions. Return JSON with summary (string), facts (array of strings), tags (array of strings), and importance (number 1-4).\n\n${JSON.stringify({
            eventType: memory.eventType,
            source: memory.source,
            text: memory.text,
            payloadKeys: memory.payloadKeys,
          })}`
        ) || {};
        if (result.summary) updated.summary = safeString(result.summary).slice(0, 1000);
        if (Array.isArray(result.facts)) updated.facts = result.facts.map((fact) => safeString(fact).slice(0, 500)).slice(0, 20);
        if (Array.isArray(result.tags)) updated.tags = Array.from(new Set([...updated.tags, ...result.tags.map((tag) => safeString(tag).slice(0, 64))])).slice(0, 30);
        if (Number.isInteger(Number(result.importance))) updated.importance = Math.max(1, Math.min(4, Number(result.importance)));
        updated.model = this.provider.chatModel || null;
        enriched = true;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.provider && typeof this.provider.embed === 'function') {
      try {
        updated.embedding = await this.provider.embed(`${updated.summary}\n${(updated.tags || []).join(' ')}`);
        updated.embeddingModel = this.provider.embeddingModel || null;
        enriched = true;
      } catch (error) {
        errors.push(error);
      }
    }
    if (enriched) {
      updated.status = errors.length ? 'enriched_partial' : 'enriched';
      updated.enrichedAt = new Date().toISOString();
      updated.enrichmentError = errors.length
        ? { code: errors[0].code || 'BRAIN_ENRICHMENT_PARTIAL', message: safeString(errors[0].message).slice(0, 256) }
        : null;
      this.store.upsert(updated);
      this.metrics.enriched += 1;
      if (errors.length) this.metrics.enrichmentFailed += 1;
      return;
    }
    throw errors[0] || new Error('No Brain Kernel enrichment capability is available.');
  }

  async drain() {
    if (this.processing) return this.drainPromise;
    this.processing = true;
    this.drainPromise = (async () => {
      while (this.queue.length) {
        const memoryId = this.queue.shift();
        const memory = this.store.get(memoryId);
        if (!memory) continue;
        try {
          await this._enrich(memory);
        } catch (error) {
          this.metrics.enrichmentFailed += 1;
          this.store.upsert({
            ...memory,
            status: 'enrichment_failed',
            enrichmentError: { code: error.code || 'BRAIN_ENRICHMENT_FAILED', message: safeString(error.message).slice(0, 256) },
          });
        }
      }
    })().finally(() => {
      this.processing = false;
      this.drainPromise = null;
    });
    return this.drainPromise;
  }

  async search(query, limit = 10) {
    const safeLimit = Math.min(positiveInteger(limit, 10), 100);
    const memories = typeof this.store.all === 'function' ? this.store.all() : this.store.list(1000);
    if (!safeString(query)) return memories.slice(0, safeLimit);
    this.metrics.retrievals += 1;

    if (this.provider && typeof this.provider.embed === 'function') {
      try {
        const queryEmbedding = await this.provider.embed(query);
        const embedded = memories
          .filter((memory) => Array.isArray(memory.embedding))
          .map((memory) => ({ memory, score: cosineSimilarity(queryEmbedding, memory.embedding) }))
          .sort((left, right) => right.score - left.score);
        if (embedded.length) return embedded.slice(0, safeLimit).map(({ memory, score }) => ({ ...memory, score }));
      } catch (error) {
        // Retrieval falls back to lexical search while Ollama is unavailable.
      }
    }

    return memories
      .map((memory) => ({ memory, score: lexicalScore(memory, query) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, safeLimit)
      .map(({ memory, score }) => ({ ...memory, score }));
  }

  getStatus() {
    return {
      service: 'mshix-brain-kernel',
      version: 'mshix.memory.v1',
      status: 'ready',
      autoEnrich: this.autoEnrich,
      storePayload: this.storePayload,
      queueDepth: this.queue.length,
      maxQueue: this.maxQueue,
      metrics: { ...this.metrics },
      store: this.store.getStatus ? this.store.getStatus() : null,
      provider: this.provider?.getConfig ? this.provider.getConfig() : { configured: false },
    };
  }

  async getHealth() {
    const providerHealth = !this.autoEnrich
      ? { status: 'disabled', reason: 'auto_enrich_disabled' }
      : this.provider?.health
        ? await this.provider.health()
        : { status: 'disabled', reason: 'provider_not_configured' };
    return {
      service: 'mshix-brain-kernel',
      version: 'mshix.memory.v1',
      status: providerHealth.status === 'degraded' ? 'degraded' : 'ok',
      provider: providerHealth,
      store: this.store.getStatus ? this.store.getStatus() : null,
      metrics: { ...this.metrics },
    };
  }
}

module.exports = { MshixBrainKernel, cosineSimilarity };
