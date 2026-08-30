'use strict';

const assert = require('assert');
const {
  AGENT_STATES,
  AgentLifecycleController,
  GlobalSafetyController,
} = require('../src/server/agentLifecycle');
const { AgentOrchestrator } = require('../src/server/agentOrchestrator');

describe('Safety Gate 1', () => {
  it('proves checkpoint pause/resume and distinct stop/cancel paths', () => {
    const lifecycle = new AgentLifecycleController({ autoStartLeaseMonitor: false });
    lifecycle.registerAgent({ agentId: 'pause-agent' });
    lifecycle.transitionAgent('pause-agent', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('pause-agent', AGENT_STATES.ACTIVE);
    lifecycle.transitionAgent('pause-agent', AGENT_STATES.PAUSING, { reason: 'operator pause' });
    const paused = lifecycle.transitionAgent('pause-agent', AGENT_STATES.PAUSED, {
      checkpointId: 'checkpoint-1',
      reason: 'checkpoint persisted',
    });

    assert.strictEqual(paused.checkpointId, 'checkpoint-1');
    assert.strictEqual(lifecycle.canAcceptWork('pause-agent'), false);
    assert.throws(
      () => lifecycle.transitionAgent('pause-agent', AGENT_STATES.RESUMING, { checkpointId: 'wrong-checkpoint' }),
      (error) => error.code === 'CHECKPOINT_MISMATCH'
    );

    lifecycle.transitionAgent('pause-agent', AGENT_STATES.RESUMING, { checkpointId: 'checkpoint-1' });
    const resumed = lifecycle.transitionAgent('pause-agent', AGENT_STATES.ACTIVE, { reason: 'resume completed' });
    assert.strictEqual(resumed.status, AGENT_STATES.ACTIVE);
    assert.strictEqual(lifecycle.canAcceptWork('pause-agent'), true);

    lifecycle.registerAgent({ agentId: 'cancelled-agent' });
    const cancelled = lifecycle.transitionAgent('cancelled-agent', AGENT_STATES.CANCELLED, { reason: 'cancel before start' });
    assert.strictEqual(cancelled.status, AGENT_STATES.CANCELLED);

    lifecycle.transitionAgent('pause-agent', AGENT_STATES.STOPPING, { reason: 'graceful stop' });
    const stopped = lifecycle.transitionAgent('pause-agent', AGENT_STATES.STOPPED, { reason: 'worker stopped' });
    assert.strictEqual(stopped.status, AGENT_STATES.STOPPED);
    assert.notStrictEqual(stopped.status, cancelled.status);
  });

  it('proves Jail, kill and recovery transitions remain fail-closed', () => {
    const lifecycle = new AgentLifecycleController({ autoStartLeaseMonitor: false });
    lifecycle.registerAgent({ agentId: 'safety-agent' });
    lifecycle.transitionAgent('safety-agent', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('safety-agent', AGENT_STATES.ACTIVE);
    lifecycle.transitionAgent('safety-agent', AGENT_STATES.JAILED, { reason: 'policy violation' });
    assert.strictEqual(lifecycle.canAcceptWork('safety-agent'), false);

    const jailed = lifecycle.getAgent('safety-agent');
    assert.strictEqual(jailed.status, AGENT_STATES.JAILED);
    lifecycle.transitionAgent('safety-agent', AGENT_STATES.KILLED, { reason: 'operator kill' });
    assert.strictEqual(lifecycle.canAcceptWork('safety-agent'), false);

    lifecycle.registerAgent({ agentId: 'recovery-agent' });
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.ACTIVE);
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.FAILED, { reason: 'worker failure' });
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.ROLLING_BACK, {
      checkpointId: 'checkpoint-safe',
      reason: 'rollback requested',
    });
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.RECOVERING, { reason: 'rollback complete' });
    lifecycle.transitionAgent('recovery-agent', AGENT_STATES.STARTING, { reason: 'recovery restart' });
    const recovered = lifecycle.transitionAgent('recovery-agent', AGENT_STATES.ACTIVE, { reason: 'recovery verified' });
    assert.strictEqual(recovered.status, AGENT_STATES.ACTIVE);
  });

  it('proves heartbeat lease degradation and bounded child orchestration', () => {
    let now = 1000;
    const lifecycle = new AgentLifecycleController({
      clock: () => now,
      heartbeatTimeoutMs: 100,
      autoStartLeaseMonitor: false,
    });
    const safety = new GlobalSafetyController({ enabled: true, clock: () => now });
    lifecycle.registerAgent({ agentId: 'parent-agent' });
    lifecycle.transitionAgent('parent-agent', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('parent-agent', AGENT_STATES.ACTIVE);
    const orchestrator = new AgentOrchestrator({
      lifecycleController: lifecycle,
      safetyController: safety,
      maxChildrenPerParent: 1,
      maxTotalAgents: 2,
      maxChildDepth: 1,
    });

    orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-agent' });
    assert.throws(
      () => orchestrator.spawnChildAgent('parent-agent', { agentId: 'overflow-child' }),
      (error) => error.code === 'CHILD_AGENT_LIMIT_REACHED'
    );

    now = 1201;
    const firstSweep = lifecycle.sweepHeartbeats();
    assert.strictEqual(firstSweep[0].status, AGENT_STATES.UNHEALTHY);
    now = 1402;
    const secondSweep = lifecycle.sweepHeartbeats();
    assert.strictEqual(secondSweep[0].status, AGENT_STATES.LOST);
    assert.strictEqual(lifecycle.canAcceptWork('parent-agent'), false);
  });
});
