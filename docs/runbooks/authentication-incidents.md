# Authentication Incident Response Runbook

## Overview
This runbook provides step-by-step instructions for identifying, diagnosing, and resolving common authentication-related incidents in the SafeSoundArena platform.

## Common Scenarios

### 1. High Rate of Failed Login Attempts

**Symptoms:**
- Increased error rate in authentication logs
- Multiple 401/403 responses from auth endpoints
- Alerts for failed login attempts threshold exceeded

**Investigation Steps:**
1. Check authentication dashboard for patterns
   ```bash
   # Query failed login attempts in the last 15 minutes
   kubectl logs -n safesoundarena -l app=auth-service --since=15m | grep "401\|403"
   ```
2. Check for potential brute force attempts
   ```bash
   # Count failed attempts by IP
   kubectl logs -n safesoundarena -l app=auth-service --since=1h | \
     grep "401" | \
     awk '{print $1}' | \
     sort | uniq -c | sort -nr
   ```
3. Check Redis for rate limiting counters
   ```bash
   # Connect to Redis
   kubectl exec -it -n redis redis-master-0 -- redis-cli
   # Check rate limit keys
   KEYS "ratelimit:auth:*"
   ```

**Resolution:**
1. If under attack, block suspicious IPs at the load balancer
   ```bash
   # Add to deny list (example for nginx)
   kubectl -n ingress-nginx exec -it nginx-ingress-controller-xxxx -- \
     sh -c "echo 'deny 1.2.3.4;' >> /etc/nginx/deny-list.conf && nginx -s reload"
   ```
2. Increase rate limiting thresholds if legitimate traffic is being blocked
   ```yaml
   # auth-service deployment
   env:
     - name: RATE_LIMIT_WINDOW
       value: "900"  # 15 minutes
     - name: RATE_LIMIT_MAX_REQUESTS
       value: "100"  # requests per window
   ```

### 2. Token Validation Failures

**Symptoms:**
- Increased 401 Unauthorized responses
- Users being logged out unexpectedly
- Alerts for JWT validation errors

**Investigation Steps:**
1. Check JWT validation errors in logs
   ```bash
   kubectl logs -n safesoundarena -l app=auth-service | grep -i "jwt\|token" | grep -v health
   ```
2. Verify JWT secret rotation status
   ```bash
   kubectl get secret auth-secrets -n safesoundarena -o jsonpath='{.data.JWT_SECRET}'
   ```
3. Check Redis for token blacklist issues
   ```bash
   kubectl exec -it -n redis redis-master-0 -- redis-cli KEYS "token:*"
   ```

**Resolution:**
1. If JWT secret was rotated, ensure all services have the new secret
   ```bash
   # Update secret
   kubectl create secret generic auth-secrets -n safesoundarena \
     --from-literal=JWT_SECRET=new-secret-here \
     --dry-run=client -o yaml | kubectl apply -f -
   
   # Restart auth services
   kubectl rollout restart deployment -n safesoundarena auth-service
   ```

### 3. Database Connection Issues

**Symptoms:**
- Authentication service failing to start
- Database connection timeouts
- Increased 5xx errors on auth endpoints

**Investigation Steps:**
1. Check database connection status
   ```bash
   kubectl exec -it -n postgresql postgresql-0 -- pg_isready
   ```
2. Check database resource usage
   ```bash
   kubectl top pods -n postgresql
   kubectl describe pod -n postgresql postgresql-0
   ```
3. Check connection pool metrics
   ```bash
   # Query Prometheus
   rate(pg_stat_activity_count[1m]) by (datname)
   ```

**Resolution:**
1. Scale database resources if needed
   ```bash
   # Scale PostgreSQL
   kubectl scale statefulset postgresql -n postgresql --replicas=2
   ```
2. Adjust connection pool settings
   ```yaml
   # auth-service deployment
   env:
     - name: DB_MAX_POOL
       value: "20"
     - name: DB_IDLE_TIMEOUT
       value: "30000"  # 30 seconds
   ```

## Recovery Procedures

### Rollback Deployment
```bash
# Check deployment history
kubectl rollout history deployment/auth-service -n safesoundarena

# Rollback to previous version
kubectl rollout undo deployment/auth-service -n safesoundarena

# Watch rollback status
kubectl rollout status deployment/auth-service -n safesoundarena
```

### Emergency Maintenance Mode
1. Enable maintenance mode
   ```bash
   kubectl set env deployment/auth-service -n safesoundarena MAINTENANCE_MODE=true
   ```
2. Display maintenance page
   ```bash
   kubectl apply -f k8s/maintenance-page.yaml
   ```

## Post-Incident Review
1. Gather metrics and logs from the incident window
2. Document timeline of events
3. Conduct root cause analysis
4. Update this runbook with new findings
5. Schedule follow-up actions and monitoring improvements

## Contact Information
- Primary On-Call: #sre-oncall (Slack)
- Escalation: #eng-leadership (Slack)
- PagerDuty: safesoundarena-auth (Primary)
