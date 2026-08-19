# Carnival Arena Rules

Carnival Arena is the first PQS mode. It is an original, generic competitive party mode. The rules do not copy any existing proprietary party quest, map, monster, item, skill, packet, client mechanic, or asset.

## Summary

- Two teams compete in parallel arenas.
- Each team progresses in its own arena lane.
- Teams earn `scoreCP` and `actionCP`.
- `scoreCP` determines victory.
- `actionCP` is spent on tactical actions that pressure the opposing lane or protect the team lane.
- Completed matches produce internal preview rewards and a SHA-512 match proof.

## CP Types

`scoreCP` is the victory score. It represents objective progress, performance, and successful lane clears in the original PQS ruleset.

`actionCP` is the tactical spend pool. It is earned through progress and spent during the match. Spending `actionCP` never directly changes victory scoring; it changes arena pressure, protection, debuffs, and chaos states.

## Tactical Actions

| Action | Cost | Target | Effect |
| --- | ---: | --- | --- |
| `summonMob` | 8 | Opponent | Adds generic pressure to the opposing arena lane. |
| `summonElite` | 18 | Opponent | Adds stronger generic pressure to the opposing arena lane. |
| `applyDebuff` | 12 | Opponent | Applies a temporary generic penalty unless blocked by protection. |
| `placeProtector` | 16 | Own team | Adds one protection charge, up to a maximum of three. |
| `cleanseTeam` | 14 | Own team | Removes one active debuff and lowers chaos pressure. |
| `sendMiniBoss` | 28 | Opponent | Adds a high-pressure generic encounter to the opposing lane. |
| `triggerChaosEvent` | 22 | Opponent | Adds generic chaos and pressure to the opposing lane. |

These action names are generic system labels. The simulation does not define or reference proprietary creatures, art, animations, maps, skills, sounds, names, or client behavior.

## Match Flow

1. A match is created with exactly two teams.
2. The match starts and logs `match.started`.
3. Objective progress awards `scoreCP` and `actionCP` through `awardCP`.
4. Players spend `actionCP` through tactical actions.
5. Every accepted or rejected action is logged as an event.
6. The match completes by time limit, admin stop, or future approved rule trigger.
7. The team with higher `scoreCP` wins. Tied `scoreCP` produces a draw.
8. Preview rewards are generated internally and marked non-tradable, non-token, and non-external.
9. Anti-abuse findings are logged.
10. The completed match receives a SHA-512 proof hash.

## Victory

Victory is determined only by `scoreCP`.

Tie behavior:

- If both teams finish with equal `scoreCP`, `winnerTeamId` is `null`.
- Draw rewards are internal preview rewards only.
- Production matchmaking can choose to replay, settle as draw, or use an officially approved tournament rule.

## Anti-Abuse Signals

Carnival Arena records the event data needed to detect:

- win trading through repeated roster pairings, alternating winners, or low-effort losses
- AFK leeching through zero-action participants on scoring teams
- repeated matchups through roster signatures
- scripted action timing through near-identical action intervals
- suspicious disconnects through late-match disconnects and repeated profile disconnects

Anti-abuse findings do not automatically accuse a player. They are review signals that should gate preview rewards, leaderboards, and any future official reward submission.

## Current Simulator API

```js
const { CarnivalArenaSimulation } = require('./server/pqs/modes/carnival/simulation');

const match = new CarnivalArenaSimulation({
  matchId: 'pqs-demo-001',
  teams: [
    { teamId: 'red', players: ['red-1', 'red-2'] },
    { teamId: 'blue', players: ['blue-1', 'blue-2'] }
  ]
});

match.start();
match.awardCP({ teamId: 'red', actorId: 'red-1', scoreCP: 30, actionCP: 30 });
match.performAction({ actorId: 'red-1', teamId: 'red', action: 'sendMiniBoss' });
const completed = match.complete();

console.log(completed.proof.proofHash);
```

## Expansion Rules

New modes can reuse the PQS event model and proof layer if they meet these requirements:

- original mechanics
- generic data
- complete event logging
- deterministic proof payload
- disabled official adapters by default
- internal preview rewards only until official authorization exists
