'use strict';

const {
  AGENT_STATES,
  AgentLifecycleError,
} = require('./agentLifecycle');

class AgentExecutionControllerError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = 'AgentExecutionControllerError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Safety boundary between an event hub and future workers.
 *
 * MSHIX can request execution through this object, but it never receives a
 * worker process, shell, network client or queue implementation directly.
 * The optional requestWork adapter is intentionally disabled in the canonical
 * runtime until a worker contract and rollback policy are approved.
 */
class AgentExecutionController {
  constructor(options = {}) {
    if (!options.lifecycleController || typeof options.lifecycleController.getAgent !== 'function') {
      throw new TypeError('AgentExecutionController requires a lifecycleController.');
    }
    if (!options.safetyController || typeof options.safetyController.isEnabled !== 'function') {
      throw new TypeError('AgentExecutionController requires a safetyController.');
    }

    this.lifecycle = options.lifecycleController;
    this.safety = options.safetyController;
    this.requestWork = typeof options.requestWork === 'function' ? options.requestWork : null;
  }

  async requestExecution(event, context = {}) {
    if (!event || event.execution !== true) {
      return {
        accepted: true,
        mode: 'observe-only',
        executionStarted: false,
      };
    }

    if (!this.safety.isEnabled()) {
      throw new AgentExecutionControllerError(
        'GLOBAL_AI_DISABLED',
        'The global AI safety switch is disabled.',
        503
      );
    }

    const target = event.target;
    if (!target || target.type !== 'agent' || !target.id) {
      throw new AgentExecutionControllerError(
        'AGENT_TARGET_REQUIRED',
        'Execution requests must identify an agent target.',
        403
      );
    }

    let agent;
    try {
      agent = this.lifecycle.getAgent(target.id);
    } catch (error) {
      if (error instanceof AgentLifecycleError && error.code === 'AGENT_NOT_FOUND') {
        throw new AgentExecutionControllerError(
          'AGENT_TARGET_NOT_FOUND',
          `Target agent "${target.id}" was not found.`,
          404,
          { agentId: target.id }
        );
      }
      throw error;
    }

    if (agent.status === AGENT_STATES.JAILED) {
      throw new AgentExecutionControllerError(
        'AGENT_JAILED',
        `Target agent "${target.id}" is jailed and cannot receive work.`,
        423,
        { agentId: target.id, status: agent.status }
      );
    }

    if (!this.lifecycle.canAcceptWork(target.id)) {
      throw new AgentExecutionControllerError(
        'AGENT_NOT_DISPATCHABLE',
        `Target agent "${target.id}" is not dispatchable in state ${agent.status}.`,
        409,
        { agentId: target.id, status: agent.status }
      );
    }

    const admission = {
      accepted: true,
      mode: this.requestWork ? 'worker-adapter-boundary' : 'controller-admission-only',
      executionStarted: false,
      agentId: target.id,
      agentState: agent.status,
      eventId: event.id,
    };

    if (!this.requestWork) {
      return admission;
    }

    const workerReceipt = await this.requestWork(event, {
      ...context,
      agent: { agentId: agent.agentId, status: agent.status },
    });

    return {
      ...admission,
      executionStarted: true,
      workerReceipt: workerReceipt === undefined ? null : workerReceipt,
    };
  }
}

module.exports = {
  AgentExecutionController,
  AgentExecutionControllerError,
};
