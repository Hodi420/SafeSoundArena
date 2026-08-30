# Dependency Remediation Plan

Status: completed for the current dependency-readiness pass  
Last verified: 2026-08-19

This document records the dependency work completed during the current MSHIX
readiness pass and separates safe updates from migrations that can change
runtime APIs.

## Completed safe treatment

- Updated the root and `frontend` `jsonwebtoken` range to `^9.0.3`.
- Removed the obsolete `@types/next-auth` package from `next-app`; `next-auth`
  ships its own type declarations.
- Updated `next-app` `next-auth` to `^4.24.15`.
- Migrated `next-app` from Next.js 15 to Next.js 16.3.1 with the matching
  `eslint-config-next` and ESLint 9 toolchain.
- Migrated the main `frontend` to Next.js 16.3.1, the matching bundle analyzer,
  ESLint 9, and a flat ESLint configuration.
- Accepted the Next.js 16 TypeScript configuration requirements:
  `moduleResolution: bundler` and `jsx: react-jsx`.
- Migrated the focused `FaucetClaimButton` wallet boundary from ethers 5 to
  ethers 6.17.0.
- Updated the root Mocha runner to 11.3.0 and pinned Mocha's vulnerable
  `serialize-javascript` transitive dependency to 7.1.0 through a scoped
  override.
- Applied non-force `npm audit fix` for compatible transitive dependencies.
- Reinstalled the root workspace, `frontend` standalone lockfile, and
  `next-app` lockfile with clean `npm ci` runs.

## Current audit boundary

The current audit result is:

| Package area | Advisories | Main boundary |
| --- | ---: | --- |
| Root/workspaces | 0 | No remaining audit findings |
| `frontend` standalone lockfile | 0 | No remaining audit findings |
| `next-app` | 0 | No remaining audit findings |

No `npm audit fix --force` was used.

## Migration notes

### Next.js 15 to 16

Both applications are now on Next.js 16.3.1 and were validated separately.
The main `frontend` uses a standalone lockfile because Next 16 Turbopack
resolves the nearest lockfile as its filesystem root; its dependencies are
installed with `npm ci --workspaces=false`.

The frontend retains 60 non-blocking lint warnings, primarily existing image,
unused-variable, and suppression warnings. No lint errors remain.

### ethers 5 to 6

The migrated source-level usage is concentrated in
`frontend/src/components/FaucetClaimButton.tsx`:

- `BrowserProvider` and `Signer` types.
- `new BrowserProvider(...)` browser-provider construction.
- `Contract` construction and contract calls.
- `formatUnits(...)` response formatting.

### Legacy development tooling

The development toolchain is now on Mocha 11.3.0 with the vulnerable
serialization dependency overridden to 7.1.0. The complete root suite still
passes with 80 tests.

## Acceptance gate for the complex track

The current pass is accepted because all of the following pass:

- `npm ci` for the root, `frontend` standalone lockfile, and `next-app`.
- Root Mocha suite and frontend Jest suite.
- Frontend TypeScript check.
- Production builds for `frontend` and `next-app`.
- Docker compose validation and API smoke test from the preceding gate.
- MSHIX Brain/Ollama enrichment smoke test from the preceding gate.
- JailTime event-log persistence and health reporting checks.
- A fresh `npm audit` review with zero findings in all three dependency areas.
