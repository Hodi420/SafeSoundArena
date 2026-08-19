const { EVENT_TYPES, MatchEventLog } = require('../../core/eventModel');
const { createMatchProof } = require('../../proof/matchProofSha512');
const { analyzeAntiAbuse } = require('../../security/antiAbuseRules');

const MODE = 'carnivalArena';
const RULES_VERSION = 'pqs.carnival-arena.v1';

const ACTION_DEFINITIONS = Object.freeze({
  summonMob: {
    cost: 8,
    target: 'opponent',
    description: 'Adds generic arena pressure to the opposing lane.'
  },
  summonElite: {
    cost: 18,
    target: 'opponent',
    description: 'Adds a stronger generic threat to the opposing lane.'
  },
  applyDebuff: {
    cost: 12,
    target: 'opponent',
    description: 'Applies a temporary generic performance penalty unless blocked by protection.'
  },
  placeProtector: {
    cost: 16,
    target: 'ownTeam',
    description: 'Adds one protection charge to absorb a future debuff.'
  },
  cleanseTeam: {
    cost: 14,
    target: 'ownTeam',
    description: 'Removes one active debuff and lowers chaos pressure.'
  },
  sendMiniBoss: {
    cost: 28,
    target: 'opponent',
    description: 'Sends a generic mini boss pressure event to the opposing lane.'
  },
  triggerChaosEvent: {
    cost: 22,
    target: 'opponent',
    description: 'Triggers a generic chaos event that increases tactical pressure.'
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePlayers(players = []) {
  return players.map((player) => {
    if (typeof player === 'string') {
      return { playerId: player };
    }
    if (!player || typeof player.playerId !== 'string') {
      throw new TypeError('Each player must have a playerId');
    }
    return {
      playerId: player.playerId,
      displayAlias: player.displayAlias || player.playerId
    };
  });
}

function normalizeTeams(teams = []) {
  if (!Array.isArray(teams) || teams.length !== 2) {
    throw new Error('Carnival Arena requires exactly two teams');
  }

  const teamIds = new Set();
  return teams.map((team) => {
    if (!team || typeof team.teamId !== 'string' || team.teamId.trim() === '') {
      throw new TypeError('Each team must have a teamId');
    }
    if (teamIds.has(team.teamId)) {
      throw new Error(`Duplicate teamId: ${team.teamId}`);
    }
    teamIds.add(team.teamId);

    const players = normalizePlayers(team.players || []);
    if (players.length === 0) {
      throw new Error(`Team ${team.teamId} must include at least one player`);
    }

    return {
      teamId: team.teamId,
      label: team.label || team.teamId,
      players,
      scoreCP: Number(team.scoreCP || 0),
      actionCP: Number(team.actionCP || 0),
      arenaState: {
        pressure: 0,
        elitePressure: 0,
        miniBossPressure: 0,
        chaosLevel: 0,
        protectorCharges: 0,
        debuffs: []
      }
    };
  });
}

function makePreviewRewards({ teams, winnerTeamId }) {
  return teams.flatMap((team) => {
    const placement = winnerTeamId === null ? 'draw' : team.teamId === winnerTeamId ? 'winner' : 'runnerUp';
    const points = placement === 'winner' ? 100 : placement === 'draw' ? 60 : 35;

    return team.players.map((player) => ({
      playerId: player.playerId,
      teamId: team.teamId,
      rewardType: 'INTERNAL_PREVIEW_REWARD',
      rewardCode: `PQS_${placement.toUpperCase()}_SCRIM_POINTS`,
      previewPoints: points,
      externalToken: false,
      tradable: false,
      note: 'Internal preview only. Not a token, NFT, cash item, or transferable platform asset.'
    }));
  });
}

class CarnivalArenaSimulation {
  constructor({
    matchId,
    teams,
    clock = () => new Date().toISOString(),
    matchHistory = [],
    playerProfiles = {}
  }) {
    if (typeof matchId !== 'string' || matchId.trim() === '') {
      throw new TypeError('matchId is required');
    }

    this.matchId = matchId;
    this.mode = MODE;
    this.rulesVersion = RULES_VERSION;
    this.status = 'created';
    this.startedAt = null;
    this.completedAt = null;
    this.winnerTeamId = null;
    this.teams = normalizeTeams(teams);
    this.eventLog = new MatchEventLog({ matchId, clock });
    this.clock = clock;
    this.matchHistory = matchHistory;
    this.playerProfiles = playerProfiles;
    this.antiAbuseFindings = [];
    this.previewRewards = [];
    this.proof = null;

    this.eventLog.append(EVENT_TYPES.MATCH_CREATED, {
      payload: {
        mode: this.mode,
        rulesVersion: this.rulesVersion,
        teamIds: this.teams.map((team) => team.teamId)
      }
    });
  }

  start() {
    if (this.status !== 'created') {
      throw new Error(`Cannot start match from status ${this.status}`);
    }

    this.status = 'active';
    this.startedAt = this.clock();
    this.eventLog.append(EVENT_TYPES.MATCH_STARTED, {
      payload: {
        startedAt: this.startedAt
      }
    });
    return this.toMatchRecord();
  }

  getTeam(teamId) {
    const team = this.teams.find((candidate) => candidate.teamId === teamId);
    if (!team) {
      throw new Error(`Unknown teamId: ${teamId}`);
    }
    return team;
  }

  getOpposingTeam(teamId) {
    return this.teams.find((team) => team.teamId !== teamId);
  }

  ensureActive() {
    if (this.status !== 'active') {
      throw new Error('Match must be active');
    }
  }

  isPlayerOnTeam(actorId, teamId) {
    return this.getTeam(teamId).players.some((player) => player.playerId === actorId);
  }

  awardCP({ teamId, actorId = 'system', scoreCP = 0, actionCP = 0, reason = 'objectiveProgress' }) {
    this.ensureActive();
    const team = this.getTeam(teamId);
    team.scoreCP += Number(scoreCP);
    team.actionCP += Number(actionCP);

    this.eventLog.append(EVENT_TYPES.SCORE_EARNED, {
      actorId,
      teamId,
      action: 'awardCP',
      payload: {
        reason,
        delta: {
          scoreCP: Number(scoreCP),
          actionCP: Number(actionCP)
        },
        totals: {
          scoreCP: team.scoreCP,
          actionCP: team.actionCP
        }
      }
    });

    return clone(team);
  }

  performAction({ actorId, teamId, action, targetTeamId = null, payload = {} }) {
    this.ensureActive();

    if (!ACTION_DEFINITIONS[action]) {
      this.eventLog.recordActionRejected({
        actorId,
        teamId,
        action,
        reason: 'unknownAction'
      });
      return { accepted: false, reason: 'unknownAction' };
    }

    if (!this.isPlayerOnTeam(actorId, teamId)) {
      this.eventLog.recordActionRejected({
        actorId,
        teamId,
        action,
        reason: 'actorNotOnTeam'
      });
      return { accepted: false, reason: 'actorNotOnTeam' };
    }

    const definition = ACTION_DEFINITIONS[action];
    const actingTeam = this.getTeam(teamId);
    const targetTeam = definition.target === 'ownTeam'
      ? actingTeam
      : this.getTeam(targetTeamId || this.getOpposingTeam(teamId).teamId);

    if (definition.target === 'opponent' && targetTeam.teamId === actingTeam.teamId) {
      this.eventLog.recordActionRejected({
        actorId,
        teamId,
        action,
        reason: 'targetMustBeOpponent'
      });
      return { accepted: false, reason: 'targetMustBeOpponent' };
    }

    if (actingTeam.actionCP < definition.cost) {
      this.eventLog.recordActionRejected({
        actorId,
        teamId,
        action,
        reason: 'insufficientActionCP',
        payload: {
          requiredActionCP: definition.cost,
          availableActionCP: actingTeam.actionCP
        }
      });
      return { accepted: false, reason: 'insufficientActionCP' };
    }

    actingTeam.actionCP -= definition.cost;
    const effect = this.applyActionEffect({ action, actingTeam, targetTeam, payload });

    this.eventLog.recordActionAccepted({
      actorId,
      teamId,
      action,
      payload: {
        costActionCP: definition.cost,
        remainingActionCP: actingTeam.actionCP,
        targetTeamId: targetTeam.teamId,
        effect
      }
    });

    return {
      accepted: true,
      action,
      effect,
      actingTeam: clone(actingTeam),
      targetTeam: clone(targetTeam)
    };
  }

  applyActionEffect({ action, actingTeam, targetTeam, payload }) {
    switch (action) {
      case 'summonMob':
        targetTeam.arenaState.pressure += 1;
        return { pressureDelta: 1 };
      case 'summonElite':
        targetTeam.arenaState.pressure += 2;
        targetTeam.arenaState.elitePressure += 1;
        return { pressureDelta: 2, elitePressureDelta: 1 };
      case 'applyDebuff':
        if (targetTeam.arenaState.protectorCharges > 0) {
          targetTeam.arenaState.protectorCharges -= 1;
          return { blockedByProtector: true, protectorCharges: targetTeam.arenaState.protectorCharges };
        }
        targetTeam.arenaState.debuffs.push({
          kind: payload.kind || 'genericSlow',
          stacks: 1
        });
        return { debuffApplied: payload.kind || 'genericSlow' };
      case 'placeProtector':
        actingTeam.arenaState.protectorCharges = Math.min(3, actingTeam.arenaState.protectorCharges + 1);
        return { protectorCharges: actingTeam.arenaState.protectorCharges };
      case 'cleanseTeam': {
        const removedDebuff = actingTeam.arenaState.debuffs.shift() || null;
        actingTeam.arenaState.chaosLevel = Math.max(0, actingTeam.arenaState.chaosLevel - 1);
        return { removedDebuff, chaosLevel: actingTeam.arenaState.chaosLevel };
      }
      case 'sendMiniBoss':
        targetTeam.arenaState.pressure += 4;
        targetTeam.arenaState.miniBossPressure += 1;
        return { pressureDelta: 4, miniBossPressureDelta: 1 };
      case 'triggerChaosEvent':
        targetTeam.arenaState.pressure += 2;
        targetTeam.arenaState.chaosLevel += 1;
        return {
          pressureDelta: 2,
          chaosLevel: targetTeam.arenaState.chaosLevel,
          eventCode: payload.eventCode || 'genericChaos'
        };
      default:
        throw new Error(`Unhandled action: ${action}`);
    }
  }

  recordDisconnect({ actorId, teamId, reason = 'unknown' }) {
    this.ensureActive();
    this.eventLog.append(EVENT_TYPES.PLAYER_DISCONNECTED, {
      actorId,
      teamId,
      payload: {
        reason
      }
    });
  }

  complete({ reason = 'timeLimit' } = {}) {
    this.ensureActive();

    this.status = 'completed';
    this.completedAt = this.clock();
    const sortedByScore = this.teams.slice().sort((a, b) => b.scoreCP - a.scoreCP);
    this.winnerTeamId = sortedByScore[0].scoreCP === sortedByScore[1].scoreCP ? null : sortedByScore[0].teamId;

    this.eventLog.append(EVENT_TYPES.MATCH_COMPLETED, {
      payload: {
        reason,
        completedAt: this.completedAt,
        winnerTeamId: this.winnerTeamId,
        victoryMetric: 'scoreCP'
      }
    });

    this.previewRewards = makePreviewRewards({
      teams: this.teams,
      winnerTeamId: this.winnerTeamId
    });

    this.eventLog.append(EVENT_TYPES.PREVIEW_REWARD_CREATED, {
      payload: {
        rewardCount: this.previewRewards.length,
        externalToken: false,
        tradable: false
      }
    });

    this.antiAbuseFindings = analyzeAntiAbuse({
      match: this.toMatchRecord({ includeProof: false }),
      matchHistory: this.matchHistory,
      playerProfiles: this.playerProfiles
    });

    for (const finding of this.antiAbuseFindings) {
      this.eventLog.append(EVENT_TYPES.ANTI_ABUSE_FLAGGED, {
        actorId: finding.subjectId || 'system',
        teamId: finding.teamId || null,
        payload: finding
      });
    }

    this.proof = createMatchProof(this.toMatchRecord({ includeProof: false }));
    return this.toMatchRecord();
  }

  toMatchRecord({ includeProof = true } = {}) {
    return {
      matchId: this.matchId,
      mode: this.mode,
      rulesVersion: this.rulesVersion,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      winnerTeamId: this.winnerTeamId,
      teams: clone(this.teams),
      events: this.eventLog.toJSON(),
      antiAbuseFindings: clone(this.antiAbuseFindings),
      previewRewards: clone(this.previewRewards),
      proof: includeProof ? this.proof : null
    };
  }
}

module.exports = {
  MODE,
  RULES_VERSION,
  ACTION_DEFINITIONS,
  CarnivalArenaSimulation
};
