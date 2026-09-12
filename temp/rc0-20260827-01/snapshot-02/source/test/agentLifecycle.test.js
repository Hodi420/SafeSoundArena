const assert = require('assert');

const {
  AGENT_STATES,
  AgentLifecycleController,
  AgentLifecycleError,
  GlobalSafetyController,
} = require('../src/server/agentLifecycle');

describe('Agent lifecycle controller', () => {
  it('registers an agent in a safe non-running state', () => {
    const controller = new AgentLifecycleController();
    const agent = controller.registerAgent({ agentId: 'diagnostic-agent', type: 'diagnostic' });

    assert.strictEqual(agent.status, AGENT_STATES.REGISTERED);
    assert.strictEqual(agent.history.length, 1);
    assert.strictEqual(controller.canAcceptWork('diagnostic-agent'), false);
  });

  it('enforces the active, pause and resume lifecycle', () => {
    const controller = new AgentLifecycleController();
    controller.registerAgent({ agentId: 'review-agent' });

    controller.transitionAgent('review-agent', 'STARTING', { reason: 'boot' });
    controller.transitionAgent('review-agent', 'ACTIVE', { reason: 'heartbeat confirmed' });
    assert.strictEqual(controller.canAcceptWork('review-agent'), true);

    controller.transitionAgent('review-agent', 'PAUSING', { reason: 'operator pause' });
    controller.transitionAgent('review-agent', 'PAUSED', { reason: 'pause completed', checkpointId: 'cp-1' });
    assert.strictEqual(controller.canAcceptWork('review-agent'), false);
    assert.strictEqual(controller.getAgent('review-agent').checkpointId, 'cp-1');

    controller.transitionAgent('review-agent', 'RESUMING', { reason: 'operator resume' });
    controller.transitionAgent('review-agent', 'ACTIVE', { reason: 'resume completed' });
    assert.strictEqual(controller.canAcceptWork('review-agent'), true);
  });

  it('rejects unsafe or unknown transitions', () => {
    const controller = new AgentLifecycleController();
    controller.registerAgent({ agentId: 'test-runner' });

    assert.throws(
      () => controller.transitionAgent('test-runner', 'ACTIVE'),
      (error) => error instanceof AgentLifecycleError && error.code === 'INVALID_AGENT_TRANSITION'
    );
    assert.throws(
      () => controller.transitionAgent('missing-agent', 'STARTING'),
      (error) => error instanceof AgentLifecycleError && error.code === 'AGENT_NOT_FOUND'
    );
  });

  it('requires the same checkpoint to pause and resume an agent', () => {
    const controller = new AgentLifecycleController();
    controller.registerAgent({ agentId: 'checkpoint-agent' });
    controller.transitionAgent('checkpoint-agent', 'STARTING');
    controller.transitionAgent('checkpoint-agent', 'ACTIVE');
    controller.transitionAgent('checkpoint-agent', 'PAUSING');

    assert.throws(
      () => controller.transitionAgent('checkpoint-agent', 'PAUSED'),
      (error) => error instanceof AgentLifecycleError && error.code === 'CHECKPOINT_REQUIRED'
    );

    controller.transitionAgent('checkpoint-agent', 'PAUSED', { checkpointId: 'cp-42' });
    assert.throws(
      () => controller.transitionAgent('checkpoint-agent', 'RESUMING', { checkpointId: 'cp-other' }),
      (error) => error instanceof AgentLifecycleError && error.code === 'CHECKPOINT_MISMATCH'
    );

    const resuming = controller.transitionAgent('checkpoint-agent', 'RESUMING');
    assert.strictEqual(resuming.checkpointId, 'cp-42');
    assert.strictEqual(resuming.history.at(-1).checkpointId, 'cp-42');
  });

  it('records jail and failure transitions without erasing history', () => {
    const controller = new AgentLifecycleController();
    controller.registerAgent({ agentId: 'worker-1' });
    controller.transitionAgent('worker-1', 'STARTING');
    controller.transitionAgent('worker-1', 'ACTIVE');
    controller.transitionAgent('worker-1', 'JAILED', { reason: 'safety gate' });
    controller.transitionAgent('worker-1', 'STOPPING', { reason: 'stop jailed worker' });
    controller.transitionAgent('worker-1', 'STOPPED', { reason: 'stop completed' });

    const agent = controller.getAgent('worker-1');
    assert.strictEqual(agent.status, AGENT_STATES.STOPPED);
    assert.deepStrictEqual(
      agent.history.map((entry) => entry.to),
      ['REGISTERED', 'STARTING', 'ACTIVE', 'JAILED', 'STOPPING', 'STOPPED']
    );
  });

  it('provides an independent global execution switch', () => {
    const safety = new GlobalSafetyController({ enabled: true });
    assert.strictEqual(safety.isEnabled(), true);
    safety.setEnabled(false, { actor: { type: 'admin', id: 'operator' } });
    assert.strictEqual(safety.getState().globalAiEnabled, false);
    assert.strictEqual(safety.getState().updatedBy.id, 'operator');
  });

  it('moves an inactive agent from unhealthy to lost after lease expiry', () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const controller = new AgentLifecycleController({
      clock: () => now,
      heartbeatTimeoutMs: 1000,
      leaseSweepIntervalMs: 500,
    });
    controller.registerAgent({ agentId: 'lease-agent' });
    controller.transitionAgent('lease-agent', 'STARTING');
    controller.transitionAgent('lease-agent', 'ACTIVE');

    now += 1001;
    const firstSweep = controller.sweepHeartbeats();
    assert.strictEqual(firstSweep.length, 1);
    assert.strictEqual(firstSweep[0].status, AGENT_STATES.UNHEALTHY);
    assert.strictEqual(controller.canAcceptWork('lease-agent'), false);

    now += 1001;
    const secondSweep = controller.sweepHeartbeats();
    assert.strictEqual(secondSweep.length, 1);
    assert.strictEqual(secondSweep[0].status, AGENT_STATES.LOST);
    assert.strictEqual(controller.getAgent('lease-agent').history.at(-1).actor.id, 'heartbeat-lease');
  });

  it('rolls back lifecycle and safety mutations when persistence fails', () => {
    const controller = new AgentLifecycleController();
    controller.setOnChange(() => {
      throw new Error('disk full');
    });
    assert.throws(() => controller.registerAgent({ agentId: 'rollback-agent' }), /disk full/);
    assert.deepStrictEqual(controller.listAgents(), []);

    const stableController = new AgentLifecycleController();
    stableController.registerAgent({ agentId: 'stable-agent' });
    stableController.setOnChange(() => {
      throw new Error('write failed');
    });
    assert.throws(() => stableController.transitionAgent('stable-agent', 'STARTING'), /write failed/);
    assert.strictEqual(stableController.getAgent('stable-agent').status, AGENT_STATES.REGISTERED);

    const safety = new GlobalSafetyController({ enabled: true });
    safety.setOnChange(() => {
      throw new Error('safety write failed');
    });
    assert.throws(() => safety.setEnabled(false), /safety write failed/);
    assert.strictEqual(safety.isEnabled(), true);
  });
});
