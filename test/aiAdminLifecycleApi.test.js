const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { createAiAdminApp } = require('../src/server/index.cjs');
const {
  AgentLifecycleController,
  GlobalSafetyController,
} = require('../src/server/agentLifecycle');

describe('AI Admin lifecycle API', () => {
  let server;
  let baseUrl;
  let tempDir;
  let safety;
  let lifecycle;
  let now;

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safesound-ai-admin-'));
    safety = new GlobalSafetyController({ enabled: true });
    now = Date.parse('2026-01-01T00:00:00.000Z');
    lifecycle = new AgentLifecycleController({
      clock: () => now,
      heartbeatTimeoutMs: 1000,
      leaseSweepIntervalMs: 500,
    });
    const app = createAiAdminApp({
      basePath: '/api/ai-admin',
      adminToken: 'admin-test-token',
      agentToken: 'agent-test-token',
      auditLogPath: path.join(tempDir, 'audit.jsonl'),
      safetyController: safety,
      lifecycleController: lifecycle,
    });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}/api/ai-admin`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return { status: response.status, body: await response.json() };
  }

  it('exposes a protected registry and enforces lifecycle transitions', async () => {
    const initial = await request('/agents');
    assert.strictEqual(initial.status, 200);
    assert.deepStrictEqual(initial.body.data.agents, []);

    const registered = await request('/agents', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ agentId: 'diagnostic-agent', type: 'diagnostic' }),
    });
    assert.strictEqual(registered.status, 201);
    assert.strictEqual(registered.body.data.agent.status, 'REGISTERED');

    const agentAttempt = await request('/agents/diagnostic-agent/transition', {
      method: 'POST',
      headers: { 'x-agent-token': 'agent-test-token' },
      body: JSON.stringify({ state: 'STARTING' }),
    });
    assert.strictEqual(agentAttempt.status, 401);

    const started = await request('/agents/diagnostic-agent/transition', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ state: 'STARTING', reason: 'boot' }),
    });
    assert.strictEqual(started.status, 200);

    const invalid = await request('/agents/diagnostic-agent/transition', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ state: 'PAUSED' }),
    });
    assert.strictEqual(invalid.status, 409);
    assert.strictEqual(invalid.body.error.code, 'INVALID_AGENT_TRANSITION');

    const active = await request('/agents/diagnostic-agent/transition', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ state: 'ACTIVE', reason: 'ready' }),
    });
    assert.strictEqual(active.status, 200);

    const heartbeat = await request('/agents/diagnostic-agent/heartbeat', {
      method: 'POST',
      headers: {
        'x-agent-token': 'agent-test-token',
        'x-agent-id': 'diagnostic-agent',
      },
      body: JSON.stringify({ metadata: { version: '1.0.0' } }),
    });
    assert.strictEqual(heartbeat.status, 200);
    assert.strictEqual(heartbeat.body.data.agent.metadata.version, '1.0.0');

    now += 1001;
    const unhealthy = await request('/agents/leases/sweep', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
    });
    assert.strictEqual(unhealthy.status, 200);
    assert.strictEqual(unhealthy.body.data.changed[0].status, 'UNHEALTHY');

    now += 1001;
    const lost = await request('/agents/leases/sweep', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
    });
    assert.strictEqual(lost.status, 200);
    assert.strictEqual(lost.body.data.changed[0].status, 'LOST');
  });

  it('enforces the agent jail before dispatch', async () => {
    const registered = await request('/agents', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ agentId: 'jail-agent', type: 'worker' }),
    });
    assert.strictEqual(registered.status, 201);

    for (const state of ['STARTING', 'ACTIVE']) {
      const transitioned = await request('/agents/jail-agent/transition', {
        method: 'POST',
        headers: { 'x-admin-token': 'admin-test-token' },
        body: JSON.stringify({ state }),
      });
      assert.strictEqual(transitioned.status, 200);
    }

    const created = await request('/commands', {
      method: 'POST',
      headers: {
        'x-agent-token': 'agent-test-token',
        'x-agent-id': 'jail-agent',
      },
      body: JSON.stringify({ command: 'run_diagnostic', agentId: 'jail-agent' }),
    });
    assert.strictEqual(created.status, 201);

    const jailed = await request('/agents/jail-agent/transition', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ state: 'JAILED', reason: 'safety hold' }),
    });
    assert.strictEqual(jailed.status, 200);

    const dispatch = await request(`/commands/${created.body.data.command.id}/dispatch`, {
      method: 'POST',
      headers: {
        'x-agent-token': 'agent-test-token',
        'x-agent-id': 'jail-agent',
      },
    });
    assert.strictEqual(dispatch.status, 423);
    assert.strictEqual(dispatch.body.error.code, 'AGENT_JAILED');
  });

  it('bounds child-agent orchestration through the API', async () => {
    const registered = await request('/agents', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ agentId: 'parent-agent', type: 'worker' }),
    });
    assert.strictEqual(registered.status, 201);

    for (const state of ['STARTING', 'ACTIVE']) {
      const transitioned = await request('/agents/parent-agent/transition', {
        method: 'POST',
        headers: { 'x-admin-token': 'admin-test-token' },
        body: JSON.stringify({ state }),
      });
      assert.strictEqual(transitioned.status, 200);
    }

    const spawned = await request('/agents/parent-agent/children', {
      method: 'POST',
      headers: {
        'x-agent-token': 'agent-test-token',
        'x-agent-id': 'parent-agent',
      },
      body: JSON.stringify({ agentId: 'child-agent' }),
    });
    assert.strictEqual(spawned.status, 201);
    assert.strictEqual(spawned.body.data.agent.metadata.parentAgentId, 'parent-agent');

    const children = await request('/agents/parent-agent/children');
    assert.strictEqual(children.status, 200);
    assert.strictEqual(children.body.data.children.length, 1);

    const stopped = await request('/agents/parent-agent/children/child-agent/stop', {
      method: 'POST',
      headers: {
        'x-agent-token': 'agent-test-token',
        'x-agent-id': 'parent-agent',
      },
      body: JSON.stringify({ reason: 'test cleanup' }),
    });
    assert.strictEqual(stopped.status, 200);
    assert.strictEqual(stopped.body.data.agent.status, 'CANCELLED');
  });

  it('enforces policy role boundaries when commands are created', async () => {
    const denied = await request('/commands', {
      method: 'POST',
      headers: { 'x-agent-token': 'agent-test-token' },
      body: JSON.stringify({ command: 'deploy_production' }),
    });
    assert.strictEqual(denied.status, 403);
    assert.strictEqual(denied.body.error.code, 'ROLE_ACTION_NOT_ALLOWED');

    const allowed = await request('/commands', {
      method: 'POST',
      headers: { 'x-agent-token': 'agent-test-token' },
      body: JSON.stringify({ command: 'prepare_patch' }),
    });
    assert.strictEqual(allowed.status, 201);
    assert.strictEqual(allowed.body.data.command.role, 'agent');
  });

  it('blocks new work while the global safety switch is disabled', async () => {
    const disabled = await request('/safety/global', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.strictEqual(disabled.status, 200);
    assert.strictEqual(disabled.body.data.globalAiEnabled, false);

    const blocked = await request('/commands', {
      method: 'POST',
      headers: { 'x-agent-token': 'agent-test-token' },
      body: JSON.stringify({ command: 'prepare_patch' }),
    });
    assert.strictEqual(blocked.status, 503);
    assert.strictEqual(blocked.body.error.code, 'GLOBAL_AI_DISABLED');

    const restored = await request('/safety/global', {
      method: 'POST',
      headers: { 'x-admin-token': 'admin-test-token' },
      body: JSON.stringify({ enabled: true }),
    });
    assert.strictEqual(restored.status, 200);
    assert.strictEqual(restored.body.data.globalAiEnabled, true);
  });
});
