# PQS Core Spec

PQS means Party Quest System. It is an original competitive match framework designed to be official-platform ready without copying or emulating any proprietary game client, server, packet protocol, data file, map, character, monster, logo, item, economy, or named world.

This repository treats any future MapleStory Worlds, MSU, or VIBE IP work as an adapter-based integration path that is disabled by default. Until written platform approval, live credentials, content review, and the applicable license terms exist, PQS runs only with original mechanics, generic mock data, internal preview rewards, and local proof hashes.

## Non-Goals

- No private server behavior.
- No game client code, packets, reverse engineering, WZ files, extracted assets, copied maps, copied monster behavior, copied logos, copied names, or proprietary data.
- No external token sale, NFT mint, marketplace listing, third-party item trade, wallet reward, or cash-value item distribution.
- No claim that this project is official, affiliated, endorsed, or licensed before the relevant platform grants that status.

## File Structure

```text
PQS_CORE_SPEC.md
CARNIVAL_ARENA_RULES.md
OFFICIAL_PLATFORM_READINESS.md
server/
  pqs/
    README.md
    core/
      eventModel.js
    modes/
      carnival/
        simulation.js
    adapters/
      ipAdapter.interface.js
      mapleStoryWorldsAdapter.placeholder.js
      msuSdkAdapter.placeholder.js
      vibeIpAdapter.placeholder.js
    proof/
      matchProofSha512.js
    security/
      antiAbuseRules.js
test/
  pqs.test.js
```

## Architecture

PQS is split into five layers:

- Core event model: creates immutable event envelopes for match creation, scoring, action acceptance/rejection, disconnects, completion, preview rewards, and anti-abuse findings.
- Mode simulation: owns original match rules. `carnivalArena` is the first mode.
- Proof layer: canonicalizes completed match records and creates a SHA-512 proof hash.
- Anti-abuse layer: inspects match events and history for suspicious competitive behavior.
- IP/platform adapters: placeholders for official integrations. They are disabled by default and throw before making any external call.

## Match Lifecycle

1. `created`: match object exists and emits `match.created`.
2. `active`: match starts and emits `match.started`.
3. `active actions`: every accepted or rejected player action emits an event.
4. `completed`: match emits `match.completed`, creates internal preview rewards, runs anti-abuse checks, logs findings, and produces a SHA-512 proof.

## Event Contract

Every event uses the same envelope:

```js
{
  eventVersion: 'pqs.event.v1',
  matchId: 'match-001',
  sequence: 1,
  timestamp: '2026-06-01T00:00:00.000Z',
  type: 'match.action.accepted',
  actorId: 'player-a',
  teamId: 'team-red',
  action: 'summonMob',
  payload: {},
  traceId: 'match-001:1'
}
```

The sequence number is local to a match. The event log is append-only in the simulation API. Production storage should persist these events in a tamper-evident store before any official launch.

## Proof Contract

Completed matches are converted into a canonical JSON payload and hashed with SHA-512:

```js
{
  proofVersion: 'pqs.match-proof.sha512.v1',
  algorithm: 'sha512',
  proofHash: '<128 hex characters>',
  canonicalPayload: '<deterministic JSON>'
}
```

The proof includes match metadata, teams, ordered events, anti-abuse findings, and internal preview rewards. It does not include secrets, official API keys, wallet keys, or any hidden platform data.

## Reward Policy

PQS rewards are internal preview rewards only:

- `rewardType`: `INTERNAL_PREVIEW_REWARD`
- `externalToken`: `false`
- `tradable`: `false`
- no wallet transfer
- no NFT mint
- no marketplace listing
- no third-party sale or trade

Any future official reward mapping must be implemented inside an approved adapter after platform permission and legal review.

## Adapter Policy

Adapters are boundary objects, not active integrations. They require official permission before activation:

- MapleStory Worlds placeholder: waits for platform authorization and permitted APIs.
- MSU SDK placeholder: waits for Builder approval, KYC/KYB where required, API keys, and live app review.
- VIBE IP placeholder: waits for official licensing, settlement, and publishing terms.

No adapter imports platform SDKs or contacts live services in this implementation.

## Security and Fair Play

The anti-abuse layer currently detects:

- win trading
- AFK leeching
- repeated matchups
- scripted action timing
- suspicious disconnects

These findings are logged as match events and included in the proof payload. In production, findings should gate rewards, matchmaking privileges, leaderboard placement, or official reward submission.
