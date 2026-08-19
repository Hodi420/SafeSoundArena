# MSHIX Core Specification

MSHIX is the SafeSoundArena multi-system exchange layer. In this repository it is implemented as a small, contract-first event hub that gives the AI Control Room, Agent Lifecycle, Jail, PQS, feature store and future integrations one safe communication boundary.

The expansion of the acronym is intentionally not hard-coded into the runtime. The important contract is the behavior: normalized events, controlled admission, bounded delivery, audit-friendly history and observable connector health.

## Responsibilities

- Normalize events into `mshix.event.v1` envelopes.
- Redact credentials and reject unsafe payloads before storage or delivery.
- Enforce the existing Global Safety Switch and Agent Lifecycle before execution events.
- Route execution events through the separate Agent Execution Controller boundary; MSHIX does not start workers, invoke shells or perform network writes.
- Prevent duplicate work with an idempotency key and bounded TTL.
- Route events to registered connectors using exact or prefix filters such as `pqs.*`.
- Bound connector execution with a timeout and store failed deliveries in a bounded dead-letter list.
- Persist Feature Store mutation events in a single-node JSONL outbox with retry, lease recovery and startup replay before acknowledging the HTTP mutation response.
- Expose status, health, metrics and recent events through `/api/mshix`.
- Append accepted events to the existing hash-chained AI Control Room audit log when the canonical backend is running.
- Feed accepted events into the local Brain Kernel, which stores bounded JSONL memories with stable event-derived identity and optionally enriches them through a local Ollama model.
- Keep the first implementation single-process and dependency-light so it remains usable on Windows and the Mini PC.

## Event contract

```json
{
  "eventVersion": "mshix.event.v1",
  "id": "evt_...",
  "type": "pqs.match.completed",
  "source": "pqs",
  "action": null,
  "execution": false,
  "risk": "low",
  "actor": { "type": "system", "id": "pqs" },
  "target": null,
  "correlationId": "match-...",
  "causationId": null,
  "idempotencyKey": "match-proof-...",
  "occurredAt": "2026-08-19T00:00:00.000Z",
  "payload": {},
  "metadata": {}
}
```

`execution: true` means the event requests work that can change runtime state. Such events are checked against the Global Safety Switch, the target agent state and the Jail gate. Observational events (`execution: false`) remain available for audit, telemetry and UI synchronization while execution is paused.

When the canonical backend is running, an execution event must pass through `AgentExecutionController`. The current controller is admission-only: it validates the target and returns a receipt without starting a worker. A future worker adapter may be attached only behind an explicit request contract, timeout, identity check and rollback policy.

## Built-in connector domains

The canonical backend registers connectors for:

| Connector | Event families | Role |
|---|---|---|
| `ai-control-room` | `ai.*`, `agent.*`, `mshix.*` | Governance and lifecycle visibility |
| `jail-time` | `jail.*` | Jail state and participant signals |
| `pqs` | `pqs.*`, `match.*`, `proof.*` | Match proof and anti-abuse signals |
| `feature-store` | `feature.*`, `guild.*`, `marketplace.*`, `quest.*`, `challenge.*` | Product feature activity |
| `blockchain` | `reward.*`, `proof.*` | Future reward/anchor adapter boundary |
| `mshix-brain` | `*` | Local memory, enrichment and retrieval; never executes work |

The adapters are deliberately observers in this first phase. They confirm routing and health without sending funds, calling external AI providers or executing shell commands. Real integrations should be added behind the same connector contract with an owner, credentials, timeout and rollback plan.

## HTTP API

Base path: `/api/mshix`

| Method | Path | Purpose |
|---|---|---|
| GET | `/meta` | Runtime status and gates |
| GET | `/health` | Connector health |
| GET | `/connectors` | Registered connector metadata |
| GET | `/metrics` | Counters and bounded-memory sizes |
| GET | `/outbox/status` | Durable Feature Outbox counts and retry state |
| GET | `/brain/status` | Brain Kernel configuration and memory metrics |
| GET | `/brain/health` | Ollama/provider and memory-store health |
| GET | `/brain/memories` | Recent stored memories |
| GET | `/brain/search?q=...` | Lexical or embedding-assisted memory retrieval |
| GET | `/events` | Recent events; supports `type`, `status`, `limit` |
| GET | `/events/:eventId` | One event record |
| POST | `/events/dry-run` | Validate and run admission without delivery |
| POST | `/events` | Publish and route an event |

In production, all routes require an admin or agent token. In development, read-only inspection is allowed without a token. Unauthenticated writes remain disabled unless `MSHIX_ALLOW_UNAUTHENTICATED_DEV=true` is explicitly set.

Agent-token execution requests must include a target agent and the target must match `x-agent-id` or `x-ai-agent-id`. Admin-token requests may target any agent subject to the lifecycle and safety gates.

Accepted canonical-backend events are also visible through the existing `/api/ai-admin/audit` and `/api/ai-admin/audit/verify` endpoints. MSHIX audit failures are counted in `metrics.auditFailures`; they do not silently claim that an audit record was written.

The Brain Kernel is a memory and retrieval layer, not online model training. It never changes model weights, executes tools, or grants an event permission to mutate runtime state. Payload storage is disabled by default; enable `MSHIX_BRAIN_STORE_PAYLOAD=true` only after reviewing the privacy boundary. A replayed event keeps one memory identity, and if chat enrichment succeeds while embeddings fail, the successful summary is retained with `status: "enriched_partial"`.

## Example

```js
const { MshixCore } = require('./src/server/mshix');

const mshix = new MshixCore({ lifecycleController, safetyController });
mshix.registerConnector({
  id: 'pqs',
  eventTypes: ['pqs.*'],
  handler: async (event) => pqsService.observe(event),
});

await mshix.publish({
  type: 'pqs.match.completed',
  source: 'pqs',
  idempotencyKey: `match:${matchId}:completed`,
  correlationId: matchId,
  payload: { matchId, proofHash },
});
```

## Deliberate boundaries

MSHIX is not yet a distributed queue, database, identity provider or blockchain. Its in-memory history and dead-letter records are bounded and process-local; the canonical audit chain is the durable evidence path for accepted events. Feature Store mutations now use a single-node durable outbox with retry and replay, but the Feature Store state file and Outbox file are not one atomic transaction. A crash between those two writes can still require reconciliation. Before multi-node deployment, replace or extend the storage boundary with a transactional durable store, cross-process locking, replay policy and an external worker queue.
