# SafeSoundArena — Ubuntu Mini-PC preflight and operator runbook

Status: **PREPARATION ONLY — NO TARGET HAS BEEN CONTACTED OR DEPLOYED**

The Ubuntu Mini-PC is the primary single-node runtime. This runbook defines a
private baseline for API + frontend only. The QNAP remains storage/backup and
a separately gated fallback, not the primary application host.

The baseline combines docker-compose.yml with the additive
docker-compose.minipc.yml overlay, two reviewed preloaded application images,
an untracked target-local .env.minipc based on minipc.env.example, and the
read-only scripts/minipc-preflight.sh. The preflight never starts, stops, pulls,
builds or removes anything.

The minipc profile removes on-target builds, sets pull_policy to never, keeps
ports on 127.0.0.1, makes the Compose application network internal, disables
IPFS, and disables AI enrichment and provider integrations. It is deliberately
not a public-LAN or public-Internet profile.

## 1. Record target data locally

Do not send secrets, passwords, private keys, tokens, complete environment
files, or a fully rendered Compose configuration. Record only the non-secret
facts required by minipc.env.example:

- Mini-PC hostname, architecture (linux/amd64 or linux/arm64), Ubuntu version,
  Docker Engine/API version, Docker Compose version, total/free RAM and
  Docker-root free capacity.
- Intended private access mode: local-only or ssh-tunnel.
- A clean Git SHA, chosen image IDs, stable data-volume name and whether the
  volume is fresh or deliberately migrated.
- Backup/restore destination, owner, RPO/RTO expectation, and the result of a
  restore rehearsal on disposable data.

On the target, create the private input file only after the inventory is known:

~~~sh
cp minipc.env.example .env.minipc
chmod 600 .env.minipc
openssl rand -hex 32
~~~

Put the generated secret only in ADMIN_TOKEN. The script accepts 64–128
hexadecimal characters. Leave PI_API_KEY, AI_ADMIN_TOKEN and AI_AGENT_TOKEN
empty. Keep GLOBAL_AI_ENABLED and MSHIX_BRAIN_AUTO_ENRICH set to false.

## 2. Prepare an artifact off-target

The Mini-PC overlay will not build or pull. Build the API and frontend from a
clean checkout on a reviewed builder that matches the target architecture, then
preload them through an approved path. For each image:

- use the complete clean Git SHA as the tag and as SAFESOUND_BUILD_REVISION;
- build the frontend with the approved loopback socket value supplied as
  NEXT_PUBLIC_SOCKET_URL;
- run the repository test, frontend test, typecheck, production build and
  vulnerability checks against that candidate;
- record the local sha256 image ID after loading it on the Mini-PC;
- retain the previous exported image and its ID for rollback.

The preflight checks image ID, platform and OCI revision label. For the frontend
it also checks the socket label, because NEXT_PUBLIC values are baked into a
Next.js bundle at build time.

Do not copy node_modules, .next, Docker volumes, Windows runtime state or
secrets from the workstation. Do not use latest, a mutable tag, an unreviewed
image, or legacy Compose/Kubernetes paths as an artifact substitute.

## 3. Run the three read-only phases

~~~sh
# From a clean checkout, before target access:
sh scripts/minipc-preflight.sh --env-file .env.minipc --phase repository

# On the Mini-PC after the reviewed images are loaded, before any start:
sh scripts/minipc-preflight.sh --env-file .env.minipc --phase staged

# Only after separate authorization to start the approved candidate:
sh scripts/minipc-preflight.sh --env-file .env.minipc --phase running
~~~

Repository validates the input and rendered safety contract, and marks target
facts as NOT_RUN. Staged requires Ubuntu, a local Unix-socket Docker context,
Docker Engine 28+, Compose 2.24.4+, matching versions, capacity, images,
labels, a consistent volume state and free ports. Running adds Docker health
and semantic JSON health checks through both API and frontend proxy.

Any error or required NOT_RUN is a stop condition. A PASS validates only its
own phase; it is not permission to deploy.

## 4. Private access and network boundary

The profile binds frontend and API only to the Mini-PC IPv4 loopback:

- 127.0.0.1:3000 — frontend
- 127.0.0.1:4000 — API / Socket.IO

For laptop administration, use an authenticated SSH tunnel only after SSH,
host-key verification and the target user have been separately approved:

~~~sh
ssh -N -L 3000:127.0.0.1:3000 -L 4000:127.0.0.1:4000 <user>@<mini-pc-private-ip>
~~~

Then browse locally at http://localhost:3000. Do not change the profile to
0.0.0.0, ::, host networking, router forwarding, a remote Docker API, or a
reverse proxy merely to make it reachable. Those changes require an explicit
network, authentication, TLS, CORS/CSP and Socket.IO design review.

The Docker application network is internal, which prevents container egress
outside that network in the reviewed baseline. It does not replace host SSH
hardening, firewall review, OS patching, physical security, backup/restore
testing, browser acceptance or authorization design.

## 5. Required acceptance after a separately authorized start

- Confirm both containers use the recorded image IDs and are healthy.
- Confirm API health through ports 4000 and 3000 reports JSON status ok, not
  merely HTTP 200.
- Test the actual browser Socket.IO handshake/reconnect through the emitted CSP
  and approved SSH tunnel.
- Test authorized and denied API/proxy flows only with disposable fixtures.
- Observe RAM, CPU, disk, container logs, outbox/dead-letter status and
  JailTime persistence for the agreed window.
- Run a backup restore into a separate disposable location before relying on
  it. The feature_data volume persists app data; MCP permissions remain in the
  container layer and Jail/user state is in memory, so they are not covered by
  that volume alone.
- Do not run docker compose down -v, volume/image prune, or recreate a volume
  as a diagnostic shortcut.

## Still outside this preparation

This profile does not close the existing authorization/ownership issues,
multi-node or transactional state, public exposure, reverse proxy/TLS, external
providers, Pi, Ollama, IPFS, migrations, load targets, reboot testing or a
production Go decision. See MINI_PC_READINESS.md for the remaining gates.
