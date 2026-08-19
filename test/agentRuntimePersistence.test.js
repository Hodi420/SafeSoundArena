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
const {
  AgentRuntimePersistenceError,
  loadAgentRuntimeState,
  persistAgentRuntimeState,
} = require('../src/server/agentRuntimePersistence');

describe('Agent runtime persistence', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safesound-runtime-state-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists lifecycle history and safety state and restores them', () => {
    const statePath = path.join(tempDir, 'runtime.json');
    const lifecycle = new AgentLifecycleController();
    lifecycle.registerAgent({ agentId: 'persistent-agent' });
    lifecycle.transitionAgent('persistent-agent', 'STARTING');
    lifecycle.transitionAgent('persistent-agent', 'ACTIVE');
    lifecycle.transitionAgent('persistent-agent', 'PAUSING');
    lifecycle.transitionAgent('persistent-agent', 'PAUSED', { checkpointId: 'cp-persisted' });
    const safety = new GlobalSafetyController({ enabled: true });
    safety.setEnabled(false, { actor: { type: 'admin', id: 'persist-test' } });

    persistAgentRuntimeState(statePath, {
      lifecycle: lifecycle.exportState(),
      safety: safety.getState(),
    });

    const snapshot = loadAgentRuntimeState(statePath);
    const restoredLifecycle = new AgentLifecycleController({ initialState: snapshot.lifecycle });
    const restoredSafety = new GlobalSafetyController({ initialState: snapshot.safety });
    const restoredAgent = restoredLifecycle.getAgent('persistent-agent');

    assert.strictEqual(restoredAgent.status, 'PAUSED');
    assert.strictEqual(restoredAgent.checkpointId, 'cp-persisted');
    assert.strictEqual(restoredAgent.history.length, 5);
    assert.strictEqual(restoredSafety.isEnabled(), false);
    assert.strictEqual(restoredSafety.getState().updatedBy.id, 'persist-test');
  });

  it('fails closed on a corrupt runtime snapshot', () => {
    const statePath = path.join(tempDir, 'runtime.json');
    fs.writeFileSync(statePath, '{"version":"wrong"}\n', 'utf8');

    assert.throws(
      () => loadAgentRuntimeState(statePath),
      (error) => error instanceof AgentRuntimePersistenceError && error.code === 'INVALID_RUNTIME_STATE_VERSION'
    );
  });

  it('restores agents through a new Control Room process instance', async () => {
    const statePath = path.join(tempDir, 'runtime.json');
    const firstApp = createAiAdminApp({
      basePath: '/api/ai-admin',
      adminToken: 'admin-test-token',
      agentToken: 'agent-test-token',
      persistenceEnabled: true,
      runtimeStatePath: statePath,
      autoStartLeaseMonitor: false,
    });
    const firstServer = http.createServer(firstApp);
    await new Promise((resolve) => firstServer.listen(0, '127.0.0.1', resolve));
    const firstPort = firstServer.address().port;

    try {
      const response = await fetch(`http://127.0.0.1:${firstPort}/api/ai-admin/agents`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': 'admin-test-token',
        },
        body: JSON.stringify({ agentId: 'restart-agent' }),
      });
      assert.strictEqual(response.status, 201);
    } finally {
      await new Promise((resolve, reject) => firstServer.close((error) => (error ? reject(error) : resolve())));
    }

    const secondApp = createAiAdminApp({
      basePath: '/api/ai-admin',
      adminToken: 'admin-test-token',
      agentToken: 'agent-test-token',
      persistenceEnabled: true,
      runtimeStatePath: statePath,
      autoStartLeaseMonitor: false,
    });
    const secondServer = http.createServer(secondApp);
    await new Promise((resolve) => secondServer.listen(0, '127.0.0.1', resolve));
    const secondPort = secondServer.address().port;

    try {
      const response = await fetch(`http://127.0.0.1:${secondPort}/api/ai-admin/agents`);
      const body = await response.json();
      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.data.agents[0].agentId, 'restart-agent');
    } finally {
      await new Promise((resolve, reject) => secondServer.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
