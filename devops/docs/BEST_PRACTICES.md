# SafeSoundArena DevOps Best Practices

Guidelines and best practices for DevOps, Docker, Kubernetes, and monitoring in SafeSoundArena.

## 🐳 Docker Best Practices

### Image Optimization

**Multi-stage builds**
```dockerfile
# ✅ Good: Reduces final image size
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]

# ❌ Bad: Large image with build tools
FROM node:18
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

**Minimize layers**
```dockerfile
# ✅ Good: One RUN instruction
RUN apk add --no-cache curl git && \
    npm ci && \
    npm run build

# ❌ Bad: Multiple RUN instructions
RUN apk add --no-cache curl
RUN apk add --no-cache git
RUN npm ci
RUN npm run build
```

**Use .dockerignore**
```
node_modules/
npm-debug.log
.git
.gitignore
.env
.env.*.local
dist/
coverage/
*.log
```

### Security

**Non-root user**
```dockerfile
# ✅ Good
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# ❌ Bad: Running as root
# No USER instruction
```

**Read-only filesystem**
```dockerfile
# ✅ Good
ENV WORKDIR /app
VOLUME /tmp
RUN mkdir -p /tmp && chown appuser:appgroup /tmp
USER appuser

# ❌ Bad
# Running with default writable filesystem
```

**Minimal base images**
```dockerfile
# ✅ Good: ~160MB
FROM node:18-alpine

# ⚠️ Medium: ~350MB
FROM node:18-slim

# ❌ Large: ~900MB
FROM node:18
```

### Performance

**Layer caching**
```dockerfile
# ✅ Good: Dependencies cached
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ❌ Bad: Cache busted on code change
COPY . .
RUN npm ci && npm run build
```

**Secrets handling**
```dockerfile
# ✅ Good: Using build secrets (Docker 18.09+)
RUN --mount=type=secret,id=npm_token npm ci

# ⚠️ Use environment variables for runtime secrets
ENV API_KEY=${API_KEY}

# ❌ Bad: Secrets in layers
COPY .env ./
RUN npm ci
```

---

## ☸️ Kubernetes Best Practices

### Resource Management

**Always set resource requests/limits**
```yaml
# ✅ Good
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"

# ❌ Bad: No limits
# Containers can consume all cluster resources
```

**CPU/Memory guidelines:**
- **Requests**: Guaranteed minimum for scheduling
- **Limits**: Maximum container can use
- Set requests ~25% of limits
- Always set both

### Probes

**Liveness vs Readiness**
```yaml
# ✅ Good: Both configured
livenessProbe:    # Is container healthy?
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:   # Can it handle traffic?
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5

# ❌ Bad: Missing probes
# Kubelet doesn't know if container is healthy
```

### Security

**Security Context**
```yaml
# ✅ Good
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL

# ❌ Bad: Running as root with all capabilities
```

**Network Policies**
```yaml
# ✅ Good: Default deny all
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

# ❌ Bad: No network policies
# All pods can communicate with each other
```

### Pod Distribution

**Anti-affinity**
```yaml
# ✅ Good: Spread pods across nodes
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - myapp
        topologyKey: kubernetes.io/hostname

# ❌ Bad: All pods on same node
# Single node failure impacts service
```

### Updates

**Rolling updates**
```yaml
# ✅ Good
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1

# ❌ Bad: Recreate strategy
# Downtime during updates
strategy:
  type: Recreate
```

---

## 📊 Monitoring Best Practices

### Logging

**Structured logging**
```javascript
// ✅ Good: JSON structured logs
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'api',
  message: 'User login',
  userId: '123',
  duration: 145
}))

// ❌ Bad: Unstructured logs
console.log('User 123 logged in after 145ms')
```

**Log levels**
- `debug`: Development/debugging only
- `info`: Important events, request flows
- `warn`: Potential issues, degraded service
- `error`: Errors that need attention
- `fatal`: Application cannot continue

### Metrics

**Essential metrics**
```promql
# Request latency
histogram_quantile(0.95, http_request_duration_seconds)

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# CPU usage
rate(container_cpu_usage_seconds_total[5m])

# Memory usage
container_memory_usage_bytes / 1024 / 1024

# Database connections
mysql_global_status_threads_connected
```

**Alert rules**
```yaml
# ✅ Good: Actionable alerts
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High error rate ({{ $value }})"
    action: "Check error logs and restart affected pods"

# ❌ Bad: Too many alerts
# Leads to alert fatigue
```

### Tracing

**Distributed tracing setup**
```javascript
// OpenTelemetry example
const tracer = opentelemetry.trace.getTracer('app');
const span = tracer.startSpan('handleRequest');
span.setAttribute('user_id', userId);
span.end();
```

---

## 🔒 Security Best Practices

### Secrets Management

**Never hardcode secrets**
```javascript
// ✅ Good: From environment
const apiKey = process.env.API_KEY;

// ❌ Bad: Hardcoded
const apiKey = 'sk_live_abc123...';
```

**Use secret management tools**
- Kubernetes Secrets (with encryption at rest)
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

### Image Scanning

```bash
# ✅ Good: Scan for vulnerabilities
trivy image safesoundarena-api:latest
docker scan safesoundarena-api:latest

# ❌ Bad: Deploy without scanning
```

### Access Control

**RBAC principle: Least privilege**
```yaml
# ✅ Good: Minimal permissions
kind: Role
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]

# ❌ Bad: Too permissive
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
```

---

## 🚀 Performance Tuning

### Node.js Optimization

```javascript
// ✅ Good: Connection pooling
const pool = new Pool({
  max: 20,
  min: 5,
  idle: 10000,
});

// ❌ Bad: New connection per request
const db = new Database();
```

**Memory optimization**
```javascript
// ✅ Good: Streaming large responses
response.setHeader('Content-Type', 'application/json');
response.write('[');
for (const item of largeDataset) {
  response.write(JSON.stringify(item) + ',');
}
response.write(']');
response.end();

// ❌ Bad: Load all in memory
const data = largeDataset.map(JSON.stringify).join(',');
response.send('[' + data + ']');
```

### Database Optimization

```sql
-- ✅ Good: Indexed queries
CREATE INDEX idx_user_created ON users(created_at DESC);
SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY;

-- ❌ Bad: Full table scan
SELECT * FROM users WHERE YEAR(created_at) = 2024;
```

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Images scanned for vulnerabilities
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security context configured
- [ ] Resource limits set
- [ ] Health checks defined
- [ ] Monitoring and alerts configured
- [ ] Backup strategy verified
- [ ] Rollback plan documented
- [ ] Load tested
- [ ] Secrets secured
- [ ] RBAC configured
- [ ] Network policies applied
- [ ] Logging centralized
- [ ] SSL/TLS configured

---

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Container_Security_Cheat_Sheet.html)
- [12 Factor App](https://12factor.net/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/instrumentation/)

---

## 🎓 Learning Path

1. **Basics**: Docker fundamentals, K8s concepts
2. **Intermediate**: YAML syntax, service mesh, networking
3. **Advanced**: Custom controllers, operators, GitOps
4. **Mastery**: Multi-cluster, disaster recovery, optimization

---

**Last Updated:** 2024
**Version:** 1.0.0
