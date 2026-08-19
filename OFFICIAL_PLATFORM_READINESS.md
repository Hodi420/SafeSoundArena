# Official Platform Readiness

PQS is structured for a future official integration path while remaining clean, generic, and disabled by default today. This document is an engineering readiness checklist, not legal advice.

Reference check date: 2026-06-01.

## Current Official-Ready Position

- PQS does not operate a private server.
- PQS does not use game client code, network packets, WZ files, extracted assets, maps, monsters, logos, protected names, or proprietary data.
- PQS does not sell tokens, mint NFTs, list items on third-party marketplaces, or enable external item trading.
- PQS uses original match rules and generic data.
- Platform-specific code is isolated behind disabled placeholder adapters.
- All rewards are internal preview rewards.
- Every match action is logged.
- Every completed match produces a SHA-512 proof hash.

## Official Sources To Re-Verify Before Activation

- MapleStory Worlds legal and creator policy pages: https://maplestoryworlds.nexon.com/en/legal/policy/1037
- MapleStory Worlds support and terms pages: https://playersupport.nexon.com/
- MSU Builder documentation: https://docs.msu.io/msu-builder/get-started
- MSU Builder FAQ and compliance guidance: https://docs.msu.io/msu-builder/builder-faq
- MapleStory Universe official site: https://msu.io/
- Official MapleStory Universe VIBE IP communications: https://medium.com/maplestory-universe

The MSU Builder FAQ currently describes MSU and MapleStory Worlds as independent platforms and says MSU Builder does not provide official integration between them. PQS therefore keeps MapleStory Worlds, MSU, and VIBE IP adapters separate.

## Activation Gates

No adapter should be enabled until all applicable gates are complete:

- written permission or accepted platform terms for the exact use case
- official account, Builder status, or creator status as required
- KYC/KYB where the platform requires it
- API key or SDK access issued through official channels
- live app or world review approval
- IP/content usage review
- age rating, moderation, privacy, and data-retention review
- reward and monetization approval
- security review for proof, event logs, authentication, and abuse controls
- production incident and takedown process

## MapleStory Worlds Adapter Gate

`server/pqs/adapters/mapleStoryWorldsAdapter.placeholder.js` must stay disabled until the project has:

- official platform permission for the specific world or integration
- permission to use any official assets or IP inside the platform scope
- approval that PQS is not misleading players into believing it is official unless it actually is
- review of reward behavior and any creator monetization

The placeholder currently returns no live data and makes no network calls.

## MSU SDK Adapter Gate

`server/pqs/adapters/msuSdkAdapter.placeholder.js` must stay disabled until the project has:

- approved MSU Builder account
- KYC/KYB completion where required
- issued API key or SDK credentials
- live Synergy App review approval where required
- approved handling of user, wallet, item, reward, and marketplace data

The placeholder explicitly blocks external token, NFT, and tradable reward behavior.

## VIBE IP Adapter Gate

`server/pqs/adapters/vibeIpAdapter.placeholder.js` must stay disabled until the project has:

- official VIBE IP access
- license scope for any IP-backed content
- approved AI creation, settlement, payments, and publishing terms
- written approval for any production reward or economy mapping

The placeholder treats VIBE IP as a future licensing rail only. It does not activate IP usage by itself.

## Data and Privacy Checklist

Before any official integration:

- replace mock IDs with platform-approved identity mapping
- avoid storing secrets in logs or proof payloads
- store API keys only in secret storage
- define retention for event logs and proof records
- provide moderation and appeal workflows
- document fraud-review rules
- rate-limit all player actions server-side
- ensure disconnect and AFK checks are transparent and appealable

## Reward and Economy Checklist

PQS production reward behavior must remain internal until officially approved:

- no external token grant
- no wallet transfer
- no NFT mint
- no third-party item listing
- no peer-to-peer trade
- no cash-value promise
- no platform reward mapping without written approval

When permission exists, add reward mapping only inside the relevant adapter and keep proof/event logging unchanged.

## Release Checklist

Before launch on any official platform:

- run `npm test`
- manually review all files under `server/pqs`
- verify no proprietary assets or names were added
- verify adapters are disabled in default config
- verify proof hashes are generated for completed matches
- verify anti-abuse findings are included in match records
- complete current official platform review using the latest terms, not this static document alone
