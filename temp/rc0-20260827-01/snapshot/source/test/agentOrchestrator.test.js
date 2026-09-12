const assert = require('assert');

const { AgentLifecycleController, GlobalSafetyController, AgentLifecycleError } = require('../src/server/agentLifecycle');
const { AgentOrchestrator } = require('../src/server/agentOrchestrator');

function activate(controller, agentId) {
  controller.registerAgent({ agentId });
  controller.transitionAgent(agentId, 'STARTING');
  controller.transitionAgent(agentId, 'ACTIVE');
}

describe('Agent orchestrator', () => {
  it('bounds child fan-out and total live agents', () => {
    const lifecycle = new AgentLifecycleController();
    const safety = new GlobalSafetyController({ enabled: true });
    const orchestrator = new AgentOrchestrator({
      lifecycleController: lifecycle,
      safetyController: safety,
      maxChildrenPerParent: 2,
      maxTotalAgents: 3,
      maxChildDepth: 1,
    });
    activate(lifecycle, 'parent-agent');

    orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-1' });
    orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-2' });
    assert.throws(
      () => orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-3' }),
      (error) => error instanceof AgentLifecycleError && error.code === 'CHILD_AGENT_LIMIT_REACHED'
    );
    assert.strictEqual(orchestrator.getCapacity().liveAgents, 3);
  });

  it('prevents nested child trees and requires an active parent', () => {
    const lifecycle = new AgentLifecycleController();
    const orchestrator = new AgentOrchestrator({
      lifecycleController: lifecycle,
      maxChildDepth: 1,
    });
    activate(lifecycle, 'parent-agent');
    orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-agent' });
    lifecycle.transitionAgent('child-agent', 'STARTING');
    lifecycle.transitionAgent('child-agent', 'ACTIVE');

    assert.throws(
      () => orchestrator.spawnChildAgent('child-agent', { agentId: 'grandchild-agent' }),
      (error) => error instanceof AgentLifecycleError && error.code === 'CHILD_DEPTH_LIMIT_REACHED'
    );

    lifecycle.transitionAgent('parent-agent', 'PAUSING');
    lifecycle.transitionAgent('parent-agent', 'PAUSED', { checkpointId: 'cp-parent' });
    assert.throws(
      () => orchestrator.spawnChildAgent('parent-agent', { agentId: 'blocked-child' }),
      (error) => error instanceof AgentLifecycleError && error.code === 'PARENT_NOT_DISPATCHABLE'
    );
  });

  it('stops a child and releases its orchestration slot', () => {
    const lifecycle = new AgentLifecycleController();
    const orchestrator = new AgentOrchestrator({
      lifecycleController: lifecycle,
      maxChildrenPerParent: 1,
    });
    activate(lifecycle, 'parent-agent');
    orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-agent' });

    const stopped = orchestrator.stopChildAgent('parent-agent', 'child-agent');
    assert.strictEqual(stopped.agent.status, 'CANCELLED');
    assert.strictEqual(orchestrator.getCapacity().liveAgents, 1);

    assert.throws(
      () => orchestrator.stopChildAgent('other-parent', 'child-agent'),
      (error) => error instanceof AgentLifecycleError && error.code === 'AGENT_NOT_FOUND'
    );
  });

  it('honors the global safety switch before spawning', () => {
    const lifecycle = new AgentLifecycleController();
    const safety = new GlobalSafetyController({ enabled: false });
    const orchestrator = new AgentOrchestrator({ lifecycleController: lifecycle, safetyController: safety });
    activate(lifecycle, 'parent-agent');

    assert.throws(
      () => orchestrator.spawnChildAgent('parent-agent', { agentId: 'child-agent' }),
      (error) => error instanceof AgentLifecycleError && error.code === 'GLOBAL_AI_DISABLED'
    );
  });
});
