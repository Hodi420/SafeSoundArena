const {
  AGENT_STATES,
  AgentLifecycleController,
  AgentLifecycleError,
  GlobalSafetyController,
} = require('./agentLifecycle');

const TERMINAL_STATES = new Set([
  AGENT_STATES.STOPPED,
  AGENT_STATES.CANCELLED,
  AGENT_STATES.KILLED,
]);

function positiveLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class AgentOrchestrator {
  constructor(options = {}) {
    this.lifecycle = options.lifecycleController || new AgentLifecycleController();
    this.safety = options.safetyController || new GlobalSafetyController();
    this.maxChildrenPerParent = positiveLimit(options.maxChildrenPerParent, 3);
    this.maxTotalAgents = positiveLimit(options.maxTotalAgents, 16);
    this.maxChildDepth = positiveLimit(options.maxChildDepth, 1);
  }

  getCapacity() {
    const liveAgents = this.lifecycle.listAgents().filter(
      (agent) => !TERMINAL_STATES.has(agent.status)
    );
    return {
      maxChildrenPerParent: this.maxChildrenPerParent,
      maxTotalAgents: this.maxTotalAgents,
      maxChildDepth: this.maxChildDepth,
      liveAgents: liveAgents.length,
      availableAgentSlots: Math.max(this.maxTotalAgents - liveAgents.length, 0),
    };
  }

  listChildren(parentAgentId) {
    const parent = this.lifecycle.getAgent(parentAgentId);
    const children = this.lifecycle.listAgents().filter(
      (agent) => agent.metadata?.parentAgentId === parent.agentId
    );
    return children.map(clone);
  }

  assertCanSpawn(parentAgentId) {
    const parent = this.lifecycle.getAgent(parentAgentId);
    if (!this.safety.isEnabled()) {
      throw new AgentLifecycleError(
        'GLOBAL_AI_DISABLED',
        'Global AI execution is disabled by the safety switch.',
        503
      );
    }
    if (!this.lifecycle.canAcceptWork(parent.agentId)) {
      throw new AgentLifecycleError(
        'PARENT_NOT_DISPATCHABLE',
        `Parent agent "${parent.agentId}" is not dispatchable in state ${parent.status}.`,
        409,
        { parentAgentId: parent.agentId, status: parent.status }
      );
    }

    const parentDepth = Number(parent.metadata?.orchestrationDepth || 0);
    if (!Number.isInteger(parentDepth) || parentDepth >= this.maxChildDepth) {
      throw new AgentLifecycleError(
        'CHILD_DEPTH_LIMIT_REACHED',
        `Parent agent "${parent.agentId}" cannot create a child at the configured depth limit.`,
        409,
        { parentAgentId: parent.agentId, maxChildDepth: this.maxChildDepth }
      );
    }

    const children = this.listChildren(parent.agentId).filter(
      (agent) => !TERMINAL_STATES.has(agent.status)
    );
    if (children.length >= this.maxChildrenPerParent) {
      throw new AgentLifecycleError(
        'CHILD_AGENT_LIMIT_REACHED',
        `Parent agent "${parent.agentId}" reached its child-agent limit.`,
        409,
        {
          parentAgentId: parent.agentId,
          maxChildrenPerParent: this.maxChildrenPerParent,
        }
      );
    }

    const capacity = this.getCapacity();
    if (capacity.availableAgentSlots < 1) {
      throw new AgentLifecycleError(
        'TOTAL_AGENT_LIMIT_REACHED',
        'The configured total live-agent limit has been reached.',
        409,
        { maxTotalAgents: this.maxTotalAgents }
      );
    }

    return { parent, parentDepth };
  }

  spawnChildAgent(parentAgentId, input = {}) {
    const { parent, parentDepth } = this.assertCanSpawn(parentAgentId);
    const childAgentId = String(input.agentId || input.childAgentId || '').trim();
    if (!childAgentId) {
      throw new AgentLifecycleError(
        'CHILD_AGENT_ID_REQUIRED',
        'agentId is required when spawning a child agent.'
      );
    }
    if (childAgentId === parent.agentId) {
      throw new AgentLifecycleError(
        'CHILD_AGENT_SELF_REFERENCE',
        'An agent cannot spawn itself as a child.'
      );
    }

    const child = this.lifecycle.registerAgent({
      agentId: childAgentId,
      name: input.name,
      type: input.type || 'child-agent',
      metadata: {
        ...(input.metadata && typeof input.metadata === 'object' ? clone(input.metadata) : {}),
        parentAgentId: parent.agentId,
        orchestrationDepth: parentDepth + 1,
      },
    });

    return {
      parent,
      agent: child,
      capacity: this.getCapacity(),
    };
  }

  stopChildAgent(parentAgentId, childAgentId, options = {}) {
    const parent = this.lifecycle.getAgent(parentAgentId);
    const child = this.lifecycle.getAgent(childAgentId);
    if (child.metadata?.parentAgentId !== parent.agentId) {
      throw new AgentLifecycleError(
        'CHILD_AGENT_NOT_OWNED',
        `Agent "${child.agentId}" is not a child of "${parent.agentId}".`,
        409
      );
    }
    if (TERMINAL_STATES.has(child.status)) {
      return { parent, agent: child, capacity: this.getCapacity() };
    }

    let stopped = child;
    if (child.status === AGENT_STATES.REGISTERED) {
      stopped = this.lifecycle.transitionAgent(child.agentId, AGENT_STATES.CANCELLED, {
        reason: options.reason || 'child orchestration cancelled',
        actor: options.actor,
        requestId: options.requestId,
      });
    } else {
      stopped = this.lifecycle.transitionAgent(child.agentId, AGENT_STATES.STOPPING, {
        reason: options.reason || 'child orchestration stop requested',
        actor: options.actor,
        requestId: options.requestId,
      });
      stopped = this.lifecycle.transitionAgent(child.agentId, AGENT_STATES.STOPPED, {
        reason: options.reason || 'child orchestration stop completed',
        actor: options.actor,
        requestId: options.requestId,
      });
    }

    return { parent, agent: stopped, capacity: this.getCapacity() };
  }
}

module.exports = {
  AgentOrchestrator,
  TERMINAL_STATES,
};
