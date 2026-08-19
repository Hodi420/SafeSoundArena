'use strict';

const assert = require('assert');
const {
  AgentExecutionController,
  AgentExecutionControllerError,
} = require('../src/server/agentExecutionController');
const {
  AGENT_STATES,
  AgentLifecycleController,
  GlobalSafetyController,
} = require('../src/server/agentLifecycle');

describe('Agent execution controller boundary', () => {
  function createRuntime() {
    const lifecycle = new AgentLifecycleController({ autoStartLeaseMonitor: false });
    const safety = new GlobalSafetyController({ enabled: true });
    lifecycle.registerAgent({ agentId: 'worker-1' });
    lifecycle.transitionAgent('worker-1', AGENT_STATES.STARTING);
    lifecycle.transitionAgent('worker-1', AGENT_STATES.ACTIVE);
    return { lifecycle, safety };
  }

  it('admits active work without starting a worker process', async () => {
    const { lifecycle, safety } = createRuntime();
    const controller = new AgentExecutionController({
      lifecycleController: lifecycle,
      safetyController: safety,
    });

    const receipt = await controller.requestExecution({
      id: 'evt-execution-1',
      execution: true,
      target: { type: 'agent', id: 'worker-1' },
    });

    assert.deepStrictEqual(receipt, {
      accepted: true,
      mode: 'controller-admission-only',
      executionStarted: false,
      agentId: 'worker-1',
      agentState: AGENT_STATES.ACTIVE,
      eventId: 'evt-execution-1',
    });
  });

  it('blocks jailed and non-dispatchable agents at the controller boundary', async () => {
    const { lifecycle, safety } = createRuntime();
    const controller = new AgentExecutionController({
      lifecycleController: lifecycle,
      safetyController: safety,
    });

    lifecycle.transitionAgent('worker-1', AGENT_STATES.JAILED, { reason: 'safety gate' });
    await assert.rejects(
      () => controller.requestExecution({ id: 'evt-jailed', execution: true, target: { type: 'agent', id: 'worker-1' } }),
      (error) => error instanceof AgentExecutionControllerError && error.code === 'AGENT_JAILED' && error.status === 423
    );
  });

  it('honors the independent global safety switch before target dispatch', async () => {
    const { lifecycle, safety } = createRuntime();
    const controller = new AgentExecutionController({
      lifecycleController: lifecycle,
      safetyController: safety,
    });
    safety.setEnabled(false, { actor: { type: 'admin', id: 'test-admin' } });

    await assert.rejects(
      () => controller.requestExecution({ id: 'evt-disabled', execution: true, target: { type: 'agent', id: 'worker-1' } }),
      (error) => error instanceof AgentExecutionControllerError && error.code === 'GLOBAL_AI_DISABLED' && error.status === 503
    );
  });
});
