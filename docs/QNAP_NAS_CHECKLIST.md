# QNAP NAS preflight and operator checklist

Status: **PREPARATION ONLY — TARGET NOT RUN, NOT APPROVED FOR DEPLOYMENT**
Last reviewed: 2026-08-30

## Architecture decision and known target

The current primary runtime remains the Ubuntu Mini-PC: application containers and live data stay on its local SSD, while the QNAP provides scoped storage and backups. This document preserves a separately gated QNAP runtime fallback; it does not replace that architecture decision.

The known NAS is a QNAP TS-233 (`linux/arm64`) with fixed 2 GB RAM. Its QTS, Container Station, Docker Engine/Compose builds, free capacity, storage paths, and firewall state have not been read from the device. No NAS login, image load, build, start, volume change, or network exposure was performed.

The fallback is an additive layer over the canonical `docker-compose.yml`:

- `docker-compose.yml` remains the application source of truth.
- `docker-compose.qnap.yml` activates API + frontend under `qnap`; Kubo is a separate `qnap-ipfs` opt-in.
- `!reset` removes application `build` sections, and `pull_policy: never` prevents implicit registry access. Images must be built off-NAS, reviewed, and preloaded before staging.
- Application tags are tied to the Git SHA and separately locked to recorded local image IDs. The frontend image also records the `NEXT_PUBLIC_SOCKET_URL` build input in an OCI label.
- Host ports are declared on `127.0.0.1`, but that is not accepted as LAN isolation until the target has Docker Engine 28+ and a negative connection test from a second LAN host.
- The API/frontend baseline caps Node heaps at 384/256 MiB and containers at 640/384 MiB, with CPU, reservation, PID, log, and restart limits. These are conservative safety ceilings, not sizing evidence.

The preflight is read-only. It never pulls/builds images, creates volumes, changes networking, or starts/stops containers.

## 1. Prepare the NAS-local input

From a clean checkout:

```sh
cp qnap.env.example .env.qnap
chmod 600 .env.qnap
```

Fill every `REQUIRED` value locally. Generate `ADMIN_TOKEN` with `openssl rand -hex 32`; the preflight accepts only a 64-128 character hexadecimal literal so Compose interpolation cannot silently change it. Never commit `.env.qnap`, paste it into chat/issues, or print a fully rendered Compose configuration.

The script has three explicit phases:

```sh
# Off-target/repository-only: syntax and rendered safety contract.
sh scripts/qnap-preflight.sh --env-file .env.qnap --phase repository

# On the QNAP after reviewed images are preloaded, before any start.
sh scripts/qnap-preflight.sh --env-file .env.qnap --phase staged

# On the QNAP after a separately authorized start.
sh scripts/qnap-preflight.sh --env-file .env.qnap --phase running
```

`repository` deliberately reports target daemon, image, volume, listener, RAM, and runtime gates as `NOT_RUN`. `staged` requires local QNAP identity, a local Unix-socket Docker context, image IDs/platforms/provenance, storage and port checks. `running` additionally proves Compose container labels/image IDs/health/bindings and semantic HTTP health. A `PASS` is evidence for that phase only, never deployment permission.

## 2. Compatibility and target-identity gate

- [ ] QNAP `getcfg` exactly matches the recorded model, OS version, `SAFESOUND_QNAP_OS_BUILD`, and Container Station package version. `staged`/`running` fail off-target or when identity cannot be read.
- [ ] `uname -m` matches `SAFESOUND_QNAP_PLATFORM`; TS-233 must report `aarch64`/`linux/arm64`. A 32-bit ARM target is unsupported.
- [ ] Docker context resolves to a local `unix://` socket. `DOCKER_HOST`, `DOCKER_CONTEXT`, TLS overrides, TCP/SSH contexts, and remote daemons are rejected.
- [ ] Detected Docker Engine and API versions exactly match `SAFESOUND_DOCKER_ENGINE_VERSION` and `SAFESOUND_DOCKER_API_VERSION`; Engine is 28 or newer. Older releases can expose loopback-published ports to same-L2 hosts, so version/backport ambiguity is a stop condition.
- [ ] Docker Compose is 2.24.4 or newer and accepts `!reset`, profiles, `${VAR:?}`, named volumes, health conditions and loopback port declarations. Legacy `docker-compose` is rejected.
- [ ] `/proc/meminfo` meets the recorded 1800 MiB total and 512 MiB available floors; Docker-root has at least the recorded 20 GiB free. These are staging floors, not load-test results.
- [ ] Do not combine a Container Station/QTS upgrade with the application change; validate the platform change separately first.

References: [QNAP Container Station requirements](https://www.qnap.com/en/software/container-station?desktop=yes), [QNAP Container Station 3 considerations](https://www.qnap.com/en-au/how-to/faq/article/what-are-the-recommended-considerations-before-updating-to-container-station-30), [QNAP Compose V2 guidance](https://www.qnap.com/en-uk/how-to/faq/article/why-cant-i-use-docker-compose-commands-in-container-station), and [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/).

## 3. Off-NAS artifact gate

- [ ] Build the two single-platform `linux/arm64` images on a capable, controlled builder—not on the 2 GB TS-233.
- [ ] Pass the full clean Git SHA as `SAFESOUND_BUILD_REVISION` to both builds. Pass the reviewed loopback socket URL as `NEXT_PUBLIC_SOCKET_URL` to the frontend build.
- [ ] Run root/frontend tests, typecheck, production build, vulnerability scan, image inventory, and ARM64 smoke against that exact candidate.
- [ ] Export/load the reviewed images through a controlled path. Compose is intentionally unable to pull or build them.
- [ ] Record exact `docker image inspect` IDs in `SAFESOUND_QNAP_API_IMAGE_ID` and `SAFESOUND_QNAP_FRONTEND_IMAGE_ID`. The staged preflight checks tag, ID, OS/architecture, Git revision label, and frontend socket label.
- [ ] Do not reuse a release tag. Retain the prior image IDs/export, resolved base-image manifest digests, and their build record for rollback. A Git SHA alone does not make a later rebuild byte-identical while upstream images or package repositories remain mutable.
- [ ] IPFS remains disabled on TS-233. The script rejects IPFS below 3500 MiB detected RAM; on another approved NAS it still requires a digest-pinned, preloaded image whose local platform matches the target.

The current CI security check on PR #7 previously found a base-image OpenSSL update requirement; required CI must be green on the final candidate. A tag refresh without a new recorded image ID is not acceptable evidence.

## 4. Storage, state and backup gate

- [ ] Keep `COMPOSE_PROJECT_NAME` and stable volume names fixed.
- [ ] Keep `SAFESOUND_QNAP_FEATURE_VOLUME` and `SAFESOUND_QNAP_IPFS_VOLUME` distinct; the preflight rejects physical-volume aliasing even when IPFS is disabled.
- [ ] `feature_data` resolves to `/app/data`. On a fresh staged target its absence is expected; the preflight never creates it.
- [ ] For migration or running checks set `SAFESOUND_QNAP_EXPECT_EXISTING_DATA=true`, record the exact `local` driver and mountpoint from `docker volume inspect`, and stop on a missing, unlabeled, differently owned, or differently mounted volume.
- [ ] A stopped migration target uses `--phase staged`; it is not forced to pass runtime HTTP health.
- [ ] Record a QNAP backup/snapshot destination, retention, RPO/RTO, immutable backup identity, and a successful restore into a separate test location before any deployment/upgrade. A Docker volume, RAID, or sync is not a backup.
- [ ] Do not claim complete state coverage: feature data/audit/runtime/Brain/Outbox paths are constrained under `/app/data`, but MCP permissions still live in the container layer and Jail/user state is memory-only.
- [ ] If named volumes are ever replaced by NAS bind mounts, first verify the exact `/share/...` path, UID/GID, ACLs, read/write behavior, snapshot and restore. Never guess a path or use `chmod 777`.

## 5. Network, environment and egress gate

- [ ] Rendered ports are exactly `127.0.0.1:3000` and `127.0.0.1:4000`; IPFS is not part of the TS-233 baseline.
- [ ] Ports are free in `staged`; `running` verifies bindings on the expected Compose containers and recorded image IDs.
- [ ] From a second LAN host, prove that ports 3000/4000 are unreachable. Review QNAP firewall/iptables, Network & Virtual Switch, every LAN/VPN CIDR, DNS and gateway. A rendered `host_ip` alone is insufficient.
- [ ] Do not add host networking, Container Station additional mappings, `0.0.0.0`/`::`, router forwarding, myQNAPcloud publication, a remote Docker API, LAN/reverse-proxy/public access, or QNAP admin-port changes under this profile.
- [ ] Access is only `local-only` or an SSH tunnel after SSH is explicitly secured. A remote hostname/origin is a separate authentication/TLS/CORS/CSP/Socket.IO project.
- [ ] `GLOBAL_AI_ENABLED=false`, `MSHIX_BRAIN_AUTO_ENRICH=false`, `MSHIX_BRAIN_STORE_PAYLOAD=false`, and unauthenticated development is off. Ollama is fixed to an inert API-container loopback URL.
- [ ] `PI_API_KEY`, `AI_ADMIN_TOKEN`, and `AI_AGENT_TOKEN` remain empty. No Pi, external AI/provider, telemetry or model egress is approved.
- [ ] Persistence/lease safeguards stay enabled, and audit/runtime/Brain/Outbox paths remain at their reviewed `/app/data/...` locations.
- [ ] The frontend browser socket URL is both in `.env.qnap` and the locked image label; runtime `NEXT_PUBLIC_*` values alone do not change a Next.js bundle.

## 6. Running acceptance after separate authorization

Run `--phase running` only after a separately authorized start and after changing `SAFESOUND_QNAP_EXPECT_EXISTING_DATA=true`. The script must verify:

- [ ] API/frontend containers belong to the expected Compose project/services, use the recorded image IDs, report `healthy`, and publish only the expected IPv4 loopback ports. If the separately approved `qnap-ipfs` profile is enabled on another NAS, the same identity/config-hash/image/health checks apply to IPFS and both of its loopback bindings.
- [ ] API `/api/health` contains JSON `status: "ok"`, not merely HTTP 200.
- [ ] Frontend root succeeds and its `/api/health` proxy also reports JSON `status: "ok"`.

The operator must additionally verify a real-browser Socket.IO handshake/reconnect under the emitted CSP, an agreed observation window, Outbox failed/dead-letter counts, JailTime log status, authorized fixture reads/writes, resource peaks, disk/log growth, negative LAN access, and—only if required—a separately authorized reboot/power-recovery exercise.

No target runtime acceptance was executed during this repository preparation.

## 7. Rollback and destructive-action guardrails

Record together: clean Git SHA, both Compose files, non-secret environment inventory/hash, project/profile/volume identities, current/prior image IDs and exports, base-image digests, backup identity/restore result, schema decision, owner, trigger and acceptance tests.

On failure, stop the application first and preserve logs/evidence. Never run `docker compose down -v`, volume/image prune, or delete/recreate a volume as a diagnostic shortcut. Ordinary `down` also removes the API container and loses its current container-layer MCP permission state, so prefer `stop` until that gap is captured or explicitly accepted. See [Docker Compose down](https://docs.docker.com/reference/cli/docker/compose/down/).

## Stop conditions and information still required

Stop if any phase reports an error; any required gate is `NOT_RUN`; Docker Engine is older than 28 or its backport status is ambiguous; Compose is older than 2.24.4; target identity/local context is unproven; images/labels/IDs/platforms differ; RAM/disk/ports are insufficient; a required volume/backup/restore is uncertain; negative LAN access fails; or remote exposure/integration/IPFS is requested.

Known: TS-233, ARM64, fixed 2 GB RAM. Still required (non-secret):

- exact QTS build, Container Station build, Docker Engine/API and Compose versions;
- Docker/storage-pool free space, volume driver/mountpoint, QNAP share/backup destination, retention, RPO/RTO and restore result;
- NAS admin ports, LAN/VPN CIDRs, firewall rules and second-host negative port test;
- expected fallback load, observation window and reboot/autostart requirement;
- Mini-PC model/CPU/RAM/disk, Ubuntu state, private IP/SSH readiness, because it remains the primary runtime target.

Do not send passwords, private keys, tokens, environment files, or raw rendered Compose output.
