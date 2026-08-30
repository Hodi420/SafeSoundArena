const assert = require('assert');
const { AgentLifecycleController, GlobalSafetyController, AGENT_STATES } = require('../src/server/agentLifecycle');
const { AgentExecutionController } = require('../src/server/agentExecutionController');
const {
  MSHIX_VERSION,
  MshixCore,
  MshixError,
} = require('../src/server/mshix');

describe('MSHIX core', () => {
  it('normalizes, redacts, routes and deduplicates events', async () => {
    const received = [];
    const mshix = new MshixCore({ idFactory: (prefix) => `${prefix}_test` });
    mshix.registerConnector({
      id: 'audit',
      eventTypes: ['feature.*'],
      capabilities: ['audit'],
      handler: async (event) => {
        received.push(event);
        return { observed: true };
      },
    });

    const first = await mshix.publish({
      type: 'feature.event.joined',
      source: 'feature-api',
      idempotencyKey: 'join-1',
      actor: { type: 'user', id: 'user-1' },
      payload: { eventId: 'event-1', apiKey: 'must-not-leak' },
    });
    const duplicate = await mshix.publish({
      type: 'feature.event.joined',
      source: 'feature-api',
      idempotencyKey: 'join-1',
      payload: { changed: true },
    });

    assert.strictEqual(first.status, 'delivered');
    assert.strictEqual(first.event.eventVersion, MSHIX_VERSION);
    assert.strictEqual(received[0].payload.apiKey, '[REDACTED]');
    assert.strictEqual(duplicate.duplicate, true);
    assert.strictEqual(mshix.getMetrics().duplicates, 1);
  });

  it('blocks execution when the global safety switch is disabled', async () => {
    const safety = new GlobalSafetyController({ enabled: false });
    const mshix = new MshixCore({ safetyController: safety });

    await assert.rejects(
      () => mshix.request({ type: 'ai.command.dispatch', source: 'control-room', payload: { command: 'safe-test' } }),
      (error) => error instanceof MshixError && error.code === 'MSHIX_GLOBAL_AI_DISABLED'
    );
    assert.strictEqual(mshix.getMetrics().blocked, 1);
  });

  it('honors agent lifecycle and Jail admission gates', async () => {
    const lifecycle = new AgentLifecycleController();
    lifecycle.registerAgent({ agentId: 'agent-1', type: 'worker' });
    lifecycle.transitionAgent('agent-1', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('agent-1', AGENT_STATES.ACTIVE);
    const mshix = new MshixCore({ lifecycleController: lifecycle });

    await mshix.request({
      type: 'agent.work.requested',
      source: 'mshix-test',
      targetAgentId: 'agent-1',
      payload: { task: 'safe' },
    });
    lifecycle.transitionAgent('agent-1', AGENT_STATES.JAILED, { reason: 'test jail' });

    await assert.rejects(
      () => mshix.request({ type: 'agent.work.requested', source: 'mshix-test', targetAgentId: 'agent-1' }),
      (error) => error.code === 'MSHIX_AGENT_JAILED' && error.status === 423
    );
  });

  it('requests execution through the separate controller boundary', async () => {
    const lifecycle = new AgentLifecycleController();
    const safety = new GlobalSafetyController({ enabled: true });
    lifecycle.registerAgent({ agentId: 'controller-agent', type: 'worker' });
    lifecycle.transitionAgent('controller-agent', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('controller-agent', AGENT_STATES.ACTIVE);
    const controller = new AgentExecutionController({
      lifecycleController: lifecycle,
      safetyController: safety,
    });
    const mshix = new MshixCore({
      lifecycleController: lifecycle,
      safetyController: safety,
      executionController: controller,
    });

    const result = await mshix.request({
      type: 'agent.work.requested',
      source: 'mshix-test',
      targetAgentId: 'controller-agent',
      payload: { task: 'controller-admission-only' },
    });

    assert.strictEqual(result.controller.mode, 'controller-admission-only');
    assert.strictEqual(result.controller.executionStarted, false);
    assert.strictEqual(mshix.getStatus().gates.executionControllerAttached, true);
  });

  it('isolates connector failures in a dead-letter record', async () => {
    const mshix = new MshixCore({ handlerTimeoutMs: 10 });
    mshix.registerConnector({
      id: 'unstable',
      eventTypes: ['pqs.*'],
      handler: async () => { throw new Error('connector failed'); },
    });
    const result = await mshix.publish({ type: 'pqs.match.completed', source: 'pqs', payload: { matchId: 'm-1' } });

    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(mshix.getDeadLetters()[0].connectorId, 'unstable');
    assert.strictEqual(mshix.getMetrics().deadLetters, 1);
  });

  it('allows a durable outbox replay to retry a failed delivery', async () => {
    let attempts = 0;
    const mshix = new MshixCore();
    mshix.registerConnector({
      id: 'recovering',
      eventTypes: ['feature.*'],
      handler: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('temporary failure');
        return { recovered: true };
      },
    });

    const first = await mshix.publish({
      idempotencyKey: 'outbox-replay-1',
      type: 'feature.event.joined',
      source: 'feature-api',
    });
    const replay = await mshix.publish({
      idempotencyKey: 'outbox-replay-1',
      type: 'feature.event.joined',
      source: 'feature-api',
      replay: true,
    });

    assert.strictEqual(first.status, 'failed');
    assert.strictEqual(replay.status, 'delivered');
    assert.strictEqual(attempts, 2);
  });

  it('supports dry-run admission without creating history', () => {
    const mshix = new MshixCore();
    const result = mshix.dryRun({ type: 'jail.status.changed', source: 'jail', payload: { active: true } });
    assert.strictEqual(result.admission.allowed, true);
    assert.deepStrictEqual(result.matchedConnectors, []);
    assert.strictEqual(mshix.getMetrics().eventsInHistory, 0);
  });

  it('records accepted events through the optional audit boundary', async () => {
    const auditRecords = [];
    const mshix = new MshixCore({
      audit: (record) => auditRecords.push(record),
    });
    await mshix.publish({ type: 'mshix.audit.test', source: 'test', payload: { safe: true } });

    assert.strictEqual(auditRecords.length, 1);
    assert.strictEqual(auditRecords[0].event.type, 'mshix.audit.test');
    assert.strictEqual(auditRecords[0].status, 'accepted');
    assert.strictEqual(mshix.getMetrics().auditFailures, 0);
  });
});
