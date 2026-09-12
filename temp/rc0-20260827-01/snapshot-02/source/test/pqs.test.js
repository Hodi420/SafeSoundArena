const assert = require('assert');

const { EVENT_TYPES } = require('../server/pqs/core/eventModel');
const { createMatchProof } = require('../server/pqs/proof/matchProofSha512');
const { analyzeAntiAbuse, RULE_IDS } = require('../server/pqs/security/antiAbuseRules');
const { CarnivalArenaSimulation } = require('../server/pqs/modes/carnival/simulation');
const { MapleStoryWorldsAdapterPlaceholder } = require('../server/pqs/adapters/mapleStoryWorldsAdapter.placeholder');
const { MsuSdkAdapterPlaceholder } = require('../server/pqs/adapters/msuSdkAdapter.placeholder');
const { VibeIpAdapterPlaceholder } = require('../server/pqs/adapters/vibeIpAdapter.placeholder');

function fixedClock(start = Date.parse('2026-06-01T00:00:00.000Z'), stepMs = 1000) {
  let tick = 0;
  return () => new Date(start + tick++ * stepMs).toISOString();
}

describe('PQS', () => {
  it('logs every Carnival Arena action and creates a SHA-512 proof on completion', () => {
    const match = new CarnivalArenaSimulation({
      matchId: 'pqs-test-001',
      clock: fixedClock(),
      teams: [
        { teamId: 'red', players: ['red-1', 'red-2'] },
        { teamId: 'blue', players: ['blue-1', 'blue-2'] }
      ]
    });

    match.start();
    match.awardCP({ teamId: 'red', actorId: 'red-1', scoreCP: 42, actionCP: 70 });
    match.awardCP({ teamId: 'blue', actorId: 'blue-1', scoreCP: 30, actionCP: 70 });

    const actions = [
      ['red-1', 'red', 'summonMob'],
      ['red-1', 'red', 'summonElite'],
      ['red-2', 'red', 'placeProtector'],
      ['red-2', 'red', 'triggerChaosEvent'],
      ['blue-1', 'blue', 'applyDebuff'],
      ['blue-1', 'blue', 'cleanseTeam'],
      ['blue-2', 'blue', 'sendMiniBoss']
    ];

    for (const [actorId, teamId, action] of actions) {
      const result = match.performAction({ actorId, teamId, action });
      assert.strictEqual(result.accepted, true, `${action} should be accepted`);
    }

    const completed = match.complete();
    const acceptedActions = completed.events.filter((event) => event.type === EVENT_TYPES.ACTION_ACCEPTED);

    assert.strictEqual(acceptedActions.length, actions.length);
    assert.strictEqual(completed.winnerTeamId, 'red');
    assert.match(completed.proof.proofHash, /^[a-f0-9]{128}$/);
    assert.ok(completed.previewRewards.every((reward) => reward.externalToken === false && reward.tradable === false));
  });

  it('records rejected actions as events', () => {
    const match = new CarnivalArenaSimulation({
      matchId: 'pqs-test-002',
      clock: fixedClock(),
      teams: [
        { teamId: 'red', players: ['red-1'] },
        { teamId: 'blue', players: ['blue-1'] }
      ]
    });

    match.start();
    const result = match.performAction({ actorId: 'red-1', teamId: 'red', action: 'sendMiniBoss' });
    const rejectedActions = match.toMatchRecord().events.filter((event) => event.type === EVENT_TYPES.ACTION_REJECTED);

    assert.strictEqual(result.accepted, false);
    assert.strictEqual(result.reason, 'insufficientActionCP');
    assert.strictEqual(rejectedActions.length, 1);
  });

  it('creates deterministic proof hashes from the same completed match record', () => {
    const record = {
      matchId: 'proof-test',
      mode: 'carnivalArena',
      rulesVersion: 'pqs.carnival-arena.v1',
      status: 'completed',
      startedAt: '2026-06-01T00:00:00.000Z',
      completedAt: '2026-06-01T00:02:00.000Z',
      winnerTeamId: 'red',
      teams: [{ teamId: 'red', scoreCP: 10 }, { teamId: 'blue', scoreCP: 5 }],
      events: [{ sequence: 1, type: EVENT_TYPES.MATCH_COMPLETED }],
      antiAbuseFindings: [],
      previewRewards: []
    };

    assert.strictEqual(createMatchProof(record).proofHash, createMatchProof(record).proofHash);
  });

  it('detects core anti-abuse patterns', () => {
    const events = [];
    const start = Date.parse('2026-06-01T00:00:00.000Z');
    for (let index = 0; index < 5; index++) {
      events.push({
        type: EVENT_TYPES.ACTION_ACCEPTED,
        actorId: 'red-1',
        teamId: 'red',
        timestamp: new Date(start + index * 1000).toISOString()
      });
    }
    events.push({
      type: EVENT_TYPES.PLAYER_DISCONNECTED,
      actorId: 'blue-2',
      teamId: 'blue',
      timestamp: new Date(start + 59000).toISOString(),
      payload: { reason: 'clientClosed' }
    });

    const match = {
      matchId: 'abuse-test',
      status: 'completed',
      startedAt: new Date(start).toISOString(),
      completedAt: new Date(start + 60000).toISOString(),
      winnerTeamId: 'red',
      teams: [
        { teamId: 'red', scoreCP: 40, players: [{ playerId: 'red-1' }, { playerId: 'red-2' }] },
        { teamId: 'blue', scoreCP: 10, players: [{ playerId: 'blue-1' }, { playerId: 'blue-2' }] }
      ],
      events
    };

    const matchHistory = [0, 1, 2].map((index) => ({
      winnerTeamId: index % 2 === 0 ? 'red' : 'blue',
      teams: match.teams
    }));

    const findings = analyzeAntiAbuse({
      match,
      matchHistory,
      playerProfiles: {
        'blue-2': { recentDisconnects: 3 }
      }
    });
    const ruleIds = findings.map((finding) => finding.ruleId);

    assert.ok(ruleIds.includes(RULE_IDS.REPEATED_MATCHUPS));
    assert.ok(ruleIds.includes(RULE_IDS.WIN_TRADING));
    assert.ok(ruleIds.includes(RULE_IDS.AFK_LEECHING));
    assert.ok(ruleIds.includes(RULE_IDS.SCRIPTED_ACTION_TIMING));
    assert.ok(ruleIds.includes(RULE_IDS.SUSPICIOUS_DISCONNECTS));
  });

  it('keeps official platform adapters disabled by default', async () => {
    const adapters = [
      new MapleStoryWorldsAdapterPlaceholder(),
      new MsuSdkAdapterPlaceholder(),
      new VibeIpAdapterPlaceholder()
    ];

    for (const adapter of adapters) {
      assert.strictEqual(adapter.isEnabled(), false);
      await assert.rejects(() => adapter.publishMatchResult({ matchId: 'disabled-test' }), /disabled/);
    }
  });
});
