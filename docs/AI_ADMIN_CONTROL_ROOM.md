# AI Admin Control Room

The AI Admin Control Room is a portable governance kit for routing AI-suggested project commands through a human-gated proof layer. Phase 1 upgrades the kit into a Proof Command Layer while keeping the React UI, Express router, JSON policy, and examples modular.

## Proof Command Layer

The Proof Command Layer gives every governed command a stable proof and records command lifecycle events in a tamper-evident audit chain.

The API response contract remains:

```json
{
  "requestId": "req_...",
  "error": null,
  "data": {}
}
```

Critical actions stay human-gated. Low-risk agent operations require a valid agent token or admin token. Admin operations require a valid admin token.

## Audit Hash Chain

Audit events are appended as JSON lines. Each event includes:

```json
{
  "id": "audit_...",
  "event": "command.created",
  "actor": { "type": "admin", "id": "admin" },
  "requestId": "req_...",
  "timestamp": "2026-05-27T00:00:00.000Z",
  "details": {},
  "previousHash": "genesis:ai-control-room:audit:v1",
  "hash": "..."
}
```

The hash is SHA-256 over the canonical event payload plus the previous hash. The first event uses a fixed genesis previous hash. If an event is modified or removed, verification reports the first broken event position.

Read-only verification endpoint:

```http
GET /audit/verify
```

Response data:

```json
{
  "valid": true,
  "checked": 4,
  "brokenAt": null,
  "latestHash": "..."
}
```

The utility functions live in `src/server/aiAdminAudit.js`:

- `canonicalJsonStringify`
- `computeAuditEventHash`
- `readLatestAuditHash`
- `verifyAuditChain`

## Command Proof Hash

Every command created through the governance API receives:

- `proofHash`
- `proofVersion`
- `createdAt`
- `updatedAt`

`proofHash` is derived from stable command fields:

- `id`
- `command`
- `risk`
- `role`
- `target`
- `task`
- `payload`
- `createdAt`

Mutable fields are intentionally excluded:

- `status`
- `answer`
- `updatedAt`
- `assessment`
- `approval`
- `dispatchReceipt`

This lets the UI and backend show that the original command intent has a stable proof even as the command moves through `create -> assess -> approve/reject -> dispatch -> answer -> audit`.

## Token Handling

Supported token sources:

- Admin: `AI_ADMIN_TOKEN`, then backwards-compatible `ADMIN_TOKEN`
- Agent: `AI_AGENT_TOKEN`, then backwards-compatible `AGENT_TOKEN`

Supported request headers:

- `x-admin-token`
- `x-ai-admin-token`
- `x-agent-token`
- `x-ai-agent-token`
- `Authorization: Bearer ...`

Token values are never returned by the API. Public metadata returns only:

- `adminTokenConfigured`
- `agentTokenConfigured`

Missing token behavior is explicit. A protected operation returns a structured error if the required token is not configured or not supplied.

## Production Guardrails

Set the environment flag:

```bash
AI_CONTROL_ROOM_ENV=development
AI_CONTROL_ROOM_ENV=staging
AI_CONTROL_ROOM_ENV=production
```

In production:

- Read-only inspection endpoints require authorization.
- Unsafe debug metadata is not exposed from public endpoints.
- Human-gated commands cannot dispatch until approved.
- Critical commands require explicit human approval before dispatch.
- Commands marked `forbiddenForAiExecution` cannot be dispatched by an AI, automation, or agent actor.

The dispatch endpoint records governed dispatch state. It does not provide unrestricted shell execution and does not run destructive actions.

## Policy Validation

Read-only validation endpoint:

```http
GET /policy/validate
```

The validator checks:

- Every command listed in roles appears in one policy category.
- Forbidden commands are not low-risk agent commands.
- Forbidden commands are not read-only commands.
- Human approval commands default to `high` or `critical` risk.
- Category entries are defined in `policy.commands`.

Validation returns warnings instead of crashing the process.

## UI

`src/ui/AiAdminControlRoom.jsx` keeps the existing props:

- `projectName`
- `title`
- `apiBasePath`
- `catalog`
- `targets`
- `adminToken`
- `adminUser`

The UI shows:

- Short command proof hashes in the command table.
- Full proof hash in command details.
- Audit chain verification status.
- Policy validation status.
- Human-gated badges.
- AI-forbidden badges.

The UI sends the admin token only in request headers. It does not render or echo token values.

The `adminToken` prop is preserved for backwards compatibility with existing trusted admin shells. Do not source long-lived production tokens from public frontend environment variables. In a real integration, put the page behind your auth provider and exchange that session for scoped server-side authorization.

## Mounting Express

```js
const express = require('express');
const createAiAdminGovernanceRouter = require('./src/server/aiAdminGovernance');

const app = express();
app.use('/api/ai-admin', createAiAdminGovernanceRouter());
```

`src/server/index.cjs` provides a portable standalone Express app.

## Security Limitations

Phase 1 is a portable proof and governance layer. It is not a complete production security platform.

Still not included:

- Real user auth provider
- PostgreSQL persistence
- Blockchain anchoring
- Proof of Humanity verification
- External worker queue
- Real GitHub/CI adapters

Before integrating with a real project, add a durable database, a real identity provider, scoped authorization, production audit storage, rate limiting, and project-specific command adapters.
