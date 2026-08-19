const { EVENT_TYPES } = require('../core/eventModel');

const RULE_IDS = Object.freeze({
  WIN_TRADING: 'pqs.winTrading',
  AFK_LEECHING: 'pqs.afkLeeching',
  REPEATED_MATCHUPS: 'pqs.repeatedMatchups',
  SCRIPTED_ACTION_TIMING: 'pqs.scriptedActionTiming',
  SUSPICIOUS_DISCONNECTS: 'pqs.suspiciousDisconnects'
});

function sortRoster(players = []) {
  return players.map((player) => player.playerId || player.id || player).sort();
}

function rosterSignature(team) {
  return sortRoster(team.players).join('|');
}

function matchupSignature(teams = []) {
  return teams.map(rosterSignature).sort().join('::');
}

function getEvents(match) {
  return Array.isArray(match.events) ? match.events : [];
}

function getTeams(match) {
  return Array.isArray(match.teams) ? match.teams : [];
}

function addFinding(findings, finding) {
  findings.push({
    detectedAt: new Date(0).toISOString(),
    ...finding
  });
}

function detectRepeatedMatchups({ match, matchHistory, findings }) {
  const currentSignature = matchupSignature(getTeams(match));
  if (!currentSignature) return;

  const repeated = matchHistory.filter((pastMatch) => matchupSignature(getTeams(pastMatch)) === currentSignature);
  if (repeated.length >= 3) {
    addFinding(findings, {
      ruleId: RULE_IDS.REPEATED_MATCHUPS,
      severity: 'medium',
      subjectId: currentSignature,
      evidence: {
        priorMatchCount: repeated.length,
        threshold: 3
      },
      recommendation: 'Queue separation or manual review before preview rewards are honored.'
    });
  }
}

function detectWinTrading({ match, matchHistory, findings }) {
  const currentSignature = matchupSignature(getTeams(match));
  if (!currentSignature || !match.winnerTeamId) return;

  const related = matchHistory
    .filter((pastMatch) => matchupSignature(getTeams(pastMatch)) === currentSignature && pastMatch.winnerTeamId)
    .slice(-6);

  if (related.length < 3) return;

  const winners = related.map((pastMatch) => pastMatch.winnerTeamId).concat(match.winnerTeamId);
  const winnerSwitches = winners.reduce((count, winner, index) => {
    if (index === 0) return count;
    return count + (winner !== winners[index - 1] ? 1 : 0);
  }, 0);

  const lowEffortLosses = getTeams(match).filter((team) => {
    const acceptedActions = getEvents(match).filter(
      (event) => event.type === EVENT_TYPES.ACTION_ACCEPTED && event.teamId === team.teamId
    ).length;
    return team.teamId !== match.winnerTeamId && acceptedActions <= 1 && team.scoreCP <= 20;
  });

  if (winnerSwitches >= 3 || lowEffortLosses.length > 0) {
    addFinding(findings, {
      ruleId: RULE_IDS.WIN_TRADING,
      severity: 'high',
      subjectId: currentSignature,
      evidence: {
        sampledWinners: winners,
        winnerSwitches,
        lowEffortLosingTeams: lowEffortLosses.map((team) => team.teamId)
      },
      recommendation: 'Hold rewards for review and increase matchup cooldown.'
    });
  }
}

function detectAfkLeeching({ match, findings }) {
  const acceptedActions = getEvents(match).filter((event) => event.type === EVENT_TYPES.ACTION_ACCEPTED);

  for (const team of getTeams(match)) {
    const teamScore = Number(team.scoreCP || 0);
    for (const player of team.players || []) {
      const playerId = player.playerId || player.id || player;
      const playerActions = acceptedActions.filter((event) => event.actorId === playerId).length;
      const disconnects = getEvents(match).filter(
        (event) => event.type === EVENT_TYPES.PLAYER_DISCONNECTED && event.actorId === playerId
      ).length;

      if (teamScore >= 25 && playerActions === 0 && disconnects === 0) {
        addFinding(findings, {
          ruleId: RULE_IDS.AFK_LEECHING,
          severity: 'medium',
          subjectId: playerId,
          teamId: team.teamId,
          evidence: {
            teamScore,
            playerActions,
            threshold: 'teamScore >= 25 and zero accepted actions'
          },
          recommendation: 'Exclude the player from preview rewards until participation is reviewed.'
        });
      }
    }
  }
}

function detectScriptedActionTiming({ match, findings }) {
  const acceptedActions = getEvents(match)
    .filter((event) => event.type === EVENT_TYPES.ACTION_ACCEPTED)
    .reduce((byActor, event) => {
      byActor[event.actorId] = byActor[event.actorId] || [];
      byActor[event.actorId].push(new Date(event.timestamp).getTime());
      return byActor;
    }, {});

  for (const [actorId, timestamps] of Object.entries(acceptedActions)) {
    if (timestamps.length < 5) continue;

    const sorted = timestamps.slice().sort((a, b) => a - b);
    const intervals = sorted.slice(1).map((timestamp, index) => timestamp - sorted[index]);
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);

    if (mean > 0 && standardDeviation <= Math.max(150, mean * 0.03)) {
      addFinding(findings, {
        ruleId: RULE_IDS.SCRIPTED_ACTION_TIMING,
        severity: 'high',
        subjectId: actorId,
        evidence: {
          actionCount: timestamps.length,
          meanIntervalMs: Math.round(mean),
          standardDeviationMs: Math.round(standardDeviation)
        },
        recommendation: 'Rate-limit future actions and require server-side challenge checks.'
      });
    }
  }
}

function detectSuspiciousDisconnects({ match, playerProfiles, findings }) {
  const events = getEvents(match);
  const disconnects = events.filter((event) => event.type === EVENT_TYPES.PLAYER_DISCONNECTED);
  if (disconnects.length === 0) return;

  const startedAt = match.startedAt ? new Date(match.startedAt).getTime() : null;
  const completedAt = match.completedAt ? new Date(match.completedAt).getTime() : null;
  const durationMs = startedAt && completedAt ? completedAt - startedAt : null;

  for (const disconnect of disconnects) {
    const disconnectedAt = new Date(disconnect.timestamp).getTime();
    const lateMatchDisconnect = durationMs && disconnectedAt - startedAt >= durationMs * 0.8;
    const profile = playerProfiles[disconnect.actorId] || {};
    const recentDisconnects = Number(profile.recentDisconnects || 0);

    if (lateMatchDisconnect || recentDisconnects >= 3 || disconnect.payload.reason === 'clientClosed') {
      addFinding(findings, {
        ruleId: RULE_IDS.SUSPICIOUS_DISCONNECTS,
        severity: recentDisconnects >= 3 ? 'high' : 'medium',
        subjectId: disconnect.actorId,
        teamId: disconnect.teamId,
        evidence: {
          reason: disconnect.payload.reason || 'unknown',
          lateMatchDisconnect: Boolean(lateMatchDisconnect),
          recentDisconnects
        },
        recommendation: 'Apply reconnect cooldowns and review repeated disconnect patterns.'
      });
    }
  }
}

function analyzeAntiAbuse({ match, matchHistory = [], playerProfiles = {} }) {
  const findings = [];

  detectRepeatedMatchups({ match, matchHistory, findings });
  detectWinTrading({ match, matchHistory, findings });
  detectAfkLeeching({ match, findings });
  detectScriptedActionTiming({ match, findings });
  detectSuspiciousDisconnects({ match, playerProfiles, findings });

  return findings;
}

module.exports = {
  RULE_IDS,
  analyzeAntiAbuse
};
