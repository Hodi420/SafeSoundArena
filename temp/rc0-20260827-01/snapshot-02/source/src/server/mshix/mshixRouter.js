'use strict';

const crypto = require('crypto');
const express = require('express');
const { MshixError } = require('./mshix');

function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBearer(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7);
  return req.headers['x-admin-token'] || req.headers['x-ai-admin-token'] || req.headers['x-agent-token'] || req.headers['x-ai-agent-token'];
}

function createMshixRouter(options = {}) {
  if (!options.mshix) throw new TypeError('createMshixRouter requires a mshix instance.');
  const router = express.Router();
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const adminToken = options.adminToken || process.env.AI_ADMIN_TOKEN || process.env.ADMIN_TOKEN || '';
  const agentToken = options.agentToken || process.env.AI_AGENT_TOKEN || process.env.AGENT_TOKEN || '';
  const allowUnauthenticatedDev = options.allowUnauthenticatedDev === true
    || String(process.env.MSHIX_ALLOW_UNAUTHENTICATED_DEV || '').toLowerCase() === 'true';

  function authorize(req, res, write = false) {
    const token = readBearer(req);
    const actor = safeEqual(token, adminToken)
      ? { type: 'admin', id: 'mshix-admin' }
      : safeEqual(token, agentToken)
        ? { type: 'agent', id: req.headers['x-agent-id'] || req.headers['x-ai-agent-id'] || 'mshix-agent' }
        : null;

    if (actor) return actor;
    if (!write && environment !== 'production') return { type: 'development', id: 'local' };
    if (write && environment !== 'production' && allowUnauthenticatedDev) return { type: 'development', id: 'local' };
    res.status(401).json({ error: { code: 'MSHIX_UNAUTHORIZED', message: 'MSHIX authorization is required.' } });
    return null;
  }

  function assertAgentScope(actor, body) {
    if (actor.type !== 'agent' || body?.execution !== true) return;
    const targetAgentId = body.targetAgentId
      || (body.target && body.target.type === 'agent' ? body.target.id : null);
    if (!targetAgentId) {
      throw new MshixError('MSHIX_AGENT_TARGET_REQUIRED', 'Agent execution events must identify their target agent.', 403);
    }
    if (String(targetAgentId) !== actor.id) {
      throw new MshixError('MSHIX_AGENT_IDENTITY_MISMATCH', 'An agent token may only execute work for its own agent.', 403);
    }
  }

  function run(handler) {
    return async (req, res) => {
      try {
        await handler(req, res);
      } catch (error) {
        if (error instanceof MshixError || (error && error.status && error.code)) {
          res.status(error.status || 400).json({
            error: {
              code: error.code,
              message: error.message,
              details: error.details || undefined,
            },
          });
          return;
        }
        console.error('[mshix-api] unexpected error:', error);
        res.status(500).json({ error: { code: 'MSHIX_INTERNAL_ERROR', message: 'MSHIX request failed.' } });
      }
    };
  }

  router.get('/meta', run(async (req, res) => {
    if (!authorize(req, res)) return;
    res.json(options.mshix.getStatus());
  }));

  router.get('/health', run(async (req, res) => {
    if (!authorize(req, res)) return;
    const health = await options.mshix.getHealth();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  }));

  router.get('/connectors', run(async (req, res) => {
    if (!authorize(req, res)) return;
    res.json({ connectors: options.mshix.listConnectors() });
  }));

  router.get('/metrics', run(async (req, res) => {
    if (!authorize(req, res)) return;
    res.json(options.mshix.getMetrics());
  }));

  router.get('/outbox/status', run(async (req, res) => {
    if (!authorize(req, res)) return;
    if (!options.outbox || typeof options.outbox.getStatus !== 'function') {
      res.status(503).json({ error: { code: 'MSHIX_OUTBOX_DISABLED', message: 'MSHIX Outbox is not configured.' } });
      return;
    }
    res.json(options.outbox.getStatus());
  }));

  router.get('/brain/status', run(async (req, res) => {
    if (!authorize(req, res)) return;
    if (!options.brainKernel) {
      res.status(503).json({ error: { code: 'MSHIX_BRAIN_DISABLED', message: 'MSHIX Brain Kernel is not configured.' } });
      return;
    }
    res.json(options.brainKernel.getStatus());
  }));

  router.get('/brain/health', run(async (req, res) => {
    if (!authorize(req, res)) return;
    if (!options.brainKernel) {
      res.status(503).json({ error: { code: 'MSHIX_BRAIN_DISABLED', message: 'MSHIX Brain Kernel is not configured.' } });
      return;
    }
    const health = await options.brainKernel.getHealth();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  }));

  router.get('/brain/memories', run(async (req, res) => {
    if (!authorize(req, res)) return;
    if (!options.brainKernel || !options.brainKernel.store?.list) {
      res.status(503).json({ error: { code: 'MSHIX_BRAIN_DISABLED', message: 'MSHIX Brain Kernel is not configured.' } });
      return;
    }
    res.json({ memories: options.brainKernel.store.list(req.query.limit) });
  }));

  router.get('/brain/search', run(async (req, res) => {
    if (!authorize(req, res)) return;
    if (!options.brainKernel) {
      res.status(503).json({ error: { code: 'MSHIX_BRAIN_DISABLED', message: 'MSHIX Brain Kernel is not configured.' } });
      return;
    }
    const query = String(req.query.q || '').trim();
    if (!query) throw new MshixError('MSHIX_BRAIN_QUERY_REQUIRED', 'Query parameter "q" is required.');
    res.json({ query, memories: await options.brainKernel.search(query, req.query.limit) });
  }));

  router.get('/events', run(async (req, res) => {
    if (!authorize(req, res)) return;
    res.json({ events: options.mshix.listEvents({ type: req.query.type, status: req.query.status, limit: req.query.limit }) });
  }));

  router.get('/events/:eventId', run(async (req, res) => {
    if (!authorize(req, res)) return;
    res.json(options.mshix.getEvent(req.params.eventId));
  }));

  router.post('/events/dry-run', run(async (req, res) => {
    const actor = authorize(req, res);
    if (!actor) return;
    assertAgentScope(actor, req.body);
    res.json(options.mshix.dryRun({ ...req.body, actor }));
  }));

  router.post('/events', run(async (req, res) => {
    const actor = authorize(req, res, true);
    if (!actor) return;
    assertAgentScope(actor, req.body);
    const result = await options.mshix.publish({ ...req.body, actor });
    res.status(result.status === 'failed' ? 502 : result.status === 'partial' ? 207 : 202).json(result);
  }));

  return router;
}

module.exports = { createMshixRouter };
