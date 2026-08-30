const fs = require('fs');
const path = require('path');

const RUNTIME_STATE_VERSION = 'agent-runtime-state-v1';

class AgentRuntimePersistenceError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AgentRuntimePersistenceError';
    this.code = code;
    this.status = 500;
    this.details = details;
  }
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== RUNTIME_STATE_VERSION) {
    throw new AgentRuntimePersistenceError(
      'INVALID_RUNTIME_STATE_VERSION',
      `Runtime state must use version ${RUNTIME_STATE_VERSION}.`
    );
  }
  if (!snapshot.lifecycle || !Array.isArray(snapshot.lifecycle.agents)) {
    throw new AgentRuntimePersistenceError(
      'INVALID_RUNTIME_STATE_LIFECYCLE',
      'Runtime state lifecycle payload is missing or invalid.'
    );
  }
  if (!snapshot.safety || typeof snapshot.safety.globalAiEnabled !== 'boolean') {
    throw new AgentRuntimePersistenceError(
      'INVALID_RUNTIME_STATE_SAFETY',
      'Runtime state safety payload is missing or invalid.'
    );
  }
  return snapshot;
}

function loadAgentRuntimeState(filePath) {
  const resolvedPath = path.resolve(filePath);
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    return validateSnapshot(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    if (error instanceof AgentRuntimePersistenceError) {
      throw error;
    }
    throw new AgentRuntimePersistenceError(
      'RUNTIME_STATE_READ_FAILED',
      `Could not read runtime state from ${resolvedPath}.`,
      { cause: error.message }
    );
  }
}

function persistAgentRuntimeState(filePath, state) {
  const resolvedPath = path.resolve(filePath);
  ensureParentDirectory(resolvedPath);
  const snapshot = validateSnapshot({
    version: RUNTIME_STATE_VERSION,
    savedAt: new Date().toISOString(),
    lifecycle: state.lifecycle,
    safety: state.safety,
  });
  const temporaryPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
  const raw = `${JSON.stringify(snapshot, null, 2)}\n`;

  try {
    fs.writeFileSync(temporaryPath, raw, { encoding: 'utf8', flag: 'w' });
    try {
      fs.renameSync(temporaryPath, resolvedPath);
    } catch (error) {
      if (!['EEXIST', 'EPERM', 'ENOTEMPTY'].includes(error.code)) {
        throw error;
      }
      fs.rmSync(resolvedPath, { force: true });
      fs.renameSync(temporaryPath, resolvedPath);
    }
    return { filePath: resolvedPath, savedAt: snapshot.savedAt };
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // Preserve the original persistence error.
    }
    if (error instanceof AgentRuntimePersistenceError) {
      throw error;
    }
    throw new AgentRuntimePersistenceError(
      'RUNTIME_STATE_WRITE_FAILED',
      `Could not persist runtime state to ${resolvedPath}.`,
      { cause: error.message }
    );
  }
}

module.exports = {
  AgentRuntimePersistenceError,
  RUNTIME_STATE_VERSION,
  loadAgentRuntimeState,
  persistAgentRuntimeState,
};
