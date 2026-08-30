const EVENT_VERSION = 'pqs.event.v1';

const EVENT_TYPES = Object.freeze({
  MATCH_CREATED: 'match.created',
  MATCH_STARTED: 'match.started',
  SCORE_EARNED: 'score.earned',
  ACTION_ACCEPTED: 'match.action.accepted',
  ACTION_REJECTED: 'match.action.rejected',
  PLAYER_DISCONNECTED: 'player.disconnected',
  MATCH_COMPLETED: 'match.completed',
  PREVIEW_REWARD_CREATED: 'reward.preview.created',
  ANTI_ABUSE_FLAGGED: 'antiAbuse.flagged'
});

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}

function normalizeTimestamp(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('timestamp must be a valid date value');
  }
  return date.toISOString();
}

function sanitizePayload(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((clean, key) => {
      const child = value[key];
      if (child !== undefined) {
        clean[key] = sanitizePayload(child);
      }
      return clean;
    }, {});
  }

  return value;
}

function createEvent({
  matchId,
  type,
  sequence,
  timestamp,
  actorId = 'system',
  teamId = null,
  action = null,
  payload = {},
  traceId = null
}) {
  assertNonEmptyString(matchId, 'matchId');
  assertNonEmptyString(type, 'type');

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new TypeError('sequence must be a positive integer');
  }

  return Object.freeze({
    eventVersion: EVENT_VERSION,
    matchId,
    sequence,
    timestamp: normalizeTimestamp(timestamp || Date.now()),
    type,
    actorId,
    teamId,
    action,
    payload: sanitizePayload(payload),
    traceId: traceId || `${matchId}:${sequence}`
  });
}

class MatchEventLog {
  constructor({ matchId, clock = () => new Date().toISOString() }) {
    assertNonEmptyString(matchId, 'matchId');
    this.matchId = matchId;
    this.clock = clock;
    this.events = [];
  }

  append(type, details = {}) {
    const event = createEvent({
      matchId: this.matchId,
      type,
      sequence: this.events.length + 1,
      timestamp: details.timestamp || this.clock(),
      actorId: details.actorId || 'system',
      teamId: details.teamId || null,
      action: details.action || null,
      payload: details.payload || {},
      traceId: details.traceId || null
    });

    this.events.push(event);
    return event;
  }

  recordActionAccepted({ actorId, teamId, action, payload }) {
    return this.append(EVENT_TYPES.ACTION_ACCEPTED, {
      actorId,
      teamId,
      action,
      payload
    });
  }

  recordActionRejected({ actorId, teamId, action, reason, payload = {} }) {
    return this.append(EVENT_TYPES.ACTION_REJECTED, {
      actorId,
      teamId,
      action,
      payload: {
        reason,
        ...payload
      }
    });
  }

  toJSON() {
    return this.events.map((event) => ({ ...event }));
  }
}

module.exports = {
  EVENT_VERSION,
  EVENT_TYPES,
  MatchEventLog,
  createEvent,
  sanitizePayload
};
