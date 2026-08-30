# Express Example

This example mounts the portable governance router at `/api/ai-admin`.

```bash
AI_ADMIN_TOKEN=admin-dev-token AI_AGENT_TOKEN=agent-dev-token node examples/express/server.cjs
```

Useful checks:

```bash
curl http://localhost:4317/api/ai-admin/meta
curl -H "x-admin-token: admin-dev-token" http://localhost:4317/api/ai-admin/audit/verify
curl -H "x-admin-token: admin-dev-token" http://localhost:4317/api/ai-admin/policy/validate
```
