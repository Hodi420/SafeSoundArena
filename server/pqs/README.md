# PQS

PQS is an official-ready Competitive Party Quest System with Carnival Arena as the first mode. It is implemented with original, generic mechanics and disabled-by-default platform adapters.

## Legal and Platform Approach

This module does not build a private server and does not use proprietary client code, packets, WZ files, extracted assets, maps, monsters, logos, protected names, or copied game data. MapleStory Worlds, MSU, and VIBE IP are treated only as future official integration targets that require permission before activation.

Rewards are internal preview rewards only. They are not real tokens, NFTs, cash items, wallet transfers, or tradable platform assets.

## Structure

```text
server/pqs/
  core/eventModel.js
  modes/carnival/simulation.js
  adapters/ipAdapter.interface.js
  adapters/mapleStoryWorldsAdapter.placeholder.js
  adapters/msuSdkAdapter.placeholder.js
  adapters/vibeIpAdapter.placeholder.js
  proof/matchProofSha512.js
  security/antiAbuseRules.js
```

Related root docs:

- `PQS_CORE_SPEC.md`
- `CARNIVAL_ARENA_RULES.md`
- `OFFICIAL_PLATFORM_READINESS.md`

## Quick Simulation

```js
const { CarnivalArenaSimulation } = require('./modes/carnival/simulation');

const match = new CarnivalArenaSimulation({
  matchId: 'demo',
  teams: [
    { teamId: 'red', players: ['red-1'] },
    { teamId: 'blue', players: ['blue-1'] }
  ]
});

match.start();
match.awardCP({ teamId: 'red', actorId: 'red-1', scoreCP: 40, actionCP: 30 });
match.performAction({ actorId: 'red-1', teamId: 'red', action: 'sendMiniBoss' });
const completed = match.complete();

console.log(completed.proof.proofHash);
```

## Tests

From the repository root:

```bash
npm test -- --grep PQS
```

The focused test suite covers event logging, Carnival Arena simulation, proof hashing, anti-abuse detection, and disabled placeholder adapters.
