# SafeSoundArena DevOps Troubleshooting Guide

Common issues and solutions for SafeSoundArena deployments.

## 🐳 Docker Issues

### Container exits immediately

**Symptoms:** Container starts and stops quickly

**Solutions:**
```bash
# Check logs
docker logs CONTAINER_NAME

# Check exit code
docker ps -a | grep CONTAINER_NAME

# Run with interactive terminal to see errors
docker run -it safesoundarena-api
```

**Common causes:**
- Missing environment variables
- Database connection failure
- Port already in use
- Permission issues

### Out of memory

**Symptoms:** OOMKilled, Memory limit exceeded

**Solutions:**
```bash
# Increase memory limit
docker update --memory=1g CONTAINER_NAME

# Or in docker-compose
# In service definition, add:
# resources:
#   limits:
#     memory: 1g
```

### Network connectivity issues

**Symptoms:** Cannot connect between services

**Solutions:**
```bash
# Check network
docker network ls
docker network inspect sa-network

# Test connectivity
docker exec SERVICE_NAME curl http://other-service:PORT/

# Verify DNS
docker exec SERVICE_NAME nslookup other-service
```

### Volume mount issues

**Symptoms:** Permission denied, cannot write files

**Solutions:**
```bash
# Check volume permissions
ls -la /path/to/volume

# Fix ownership
sudo chown 1000:1000 /path/to/volume

# In docker-compose, set proper user:
# user: "1000:1000"
```

---

## ☸️ Kubernetes Issues

### Pod stuck in Pending

**Symptoms:** Pod not starting, status shows Pending

**Diagnosis:**
```bash
kubectl describe pod POD_NAME -n NAMESPACE
kubectl get events -n NAMESPACE --sort-by='.lastTimestamp'
```

**Solutions:**
```bash
# Check node resources
kubectl top nodes
kubectl describe node NODE_NAME

# Check resource requests
kubectl get pods -n NAMESPACE -o json | \
  jq '.items[].spec.containers[].resources'

# Reduce resource requests in deployment
kubectl edit deployment DEPLOYMENT_NAME -n NAMESPACE
```

### CrashLoopBackOff status

**Symptoms:** Pod keeps crashing and restarting

**Diagnosis:**
```bash
# Check logs
kubectl logs POD_NAME -n NAMESPACE
kubectl logs POD_NAME -n NAMESPACE --previous

# Check events
kubectl describe pod POD_NAME -n NAMESPACE
```

**Solutions:**
- Fix environment variables
- Fix application code issues
- Increase resource limits
- Check liveness probe configuration

```bash
# Disable liveness probe temporarily for debugging
kubectl edit deployment safesoundarena-api -n safesoundarena
# Change livenessProbe.enabled to false
```

### ImagePullBackOff

**Symptoms:** Cannot pull Docker image

**Solutions:**
```bash
# Check image registry authentication
kubectl create secret docker-registry regcred \
  --docker-server=YOUR_REGISTRY \
  --docker-username=USERNAME \
  --docker-password=PASSWORD \
  -n safesoundarena

# Update deployment to use imagePullSecrets
kubectl edit deployment safesoundarena-api -n safesoundarena
# Add:
# imagePullSecrets:
# - name: regcred
```

### Service not accessible

**Symptoms:** Cannot connect to service

**Solutions:**
```bash
# Check service exists
kubectl get svc -n safesoundarena

# Test internal connectivity
kubectl run -it --rm debug --image=busybox -- sh
# Inside pod: wget -O- http://safesoundarena-api:4000/api/health

# Check endpoints
kubectl get endpoints safesoundarena-api -n safesoundarena

# Check ingress
kubectl get ingress -n safesoundarena
kubectl describe ingress safesoundarena-api-ingress -n safesoundarena
```

### PVC not mounting

**Symptoms:** Pod pending, PVC shows Pending

**Solutions:**
```bash
# Check PVC status
kubectl describe pvc -n safesoundarena

# Check storage class
kubectl get storageclass

# List available storage
kubectl get pv

# For local volumes, ensure path exists on node
ssh NODE_NAME mkdir -p /mnt/data/pv-name
```

---

## 📊 Database Issues

### Connection timeout

**Symptoms:** Cannot connect to database

**Solutions:**
```bash
# Check database service
kubectl get svc postgres -n safesoundarena
kubectl describe svc postgres -n safesoundarena

# Test connection from pod
kubectl exec -it POD_NAME -n safesoundarena -- \
  psql -h postgres -U postgres -d safesoundarena

# Check PostgreSQL logs
kubectl logs svc/postgres -n safesoundarena
```

### Slow queries

**Symptoms:** High latency, timeouts

**Solutions:**
```bash
# Check slow query log
kubectl exec svc/postgres -n safesoundarena -- \
  tail -f /var/log/postgresql/postgresql.log | grep "duration:"

# Enable query logging
kubectl exec svc/postgres -n safesoundarena -- \
  psql -U postgres -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Index optimization
kubectl exec svc/postgres -n safesoundarena -- \
  psql -U postgres -c "ANALYZE;"
```

### Disk full

**Symptoms:** Database errors, write failures

**Solutions:**
```bash
# Check disk usage
kubectl exec svc/postgres -n safesoundarena -- df -h

# Clean up old data
kubectl exec svc/postgres -n safesoundarena -- \
  psql -U postgres -c "VACUUM FULL;"

# Expand PVC
kubectl patch pvc postgres-data -n safesoundarena \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

---

## 📈 Performance Issues

### High CPU usage

**Diagnosis:**
```bash
# Check CPU usage
kubectl top pods -n safesoundarena --sort-by=cpu

# Check running processes
kubectl exec POD_NAME -n safesoundarena -- top

# Check for threads
kubectl exec POD_NAME -n safesoundarena -- ps aux
```

**Solutions:**
```bash
# Increase CPU limits
kubectl set resources deployment safesoundarena-api \
  --limits=cpu=2000m \
  -n safesoundarena

# Optimize application code (memory leaks, infinite loops)
# Check for N+1 queries
# Add caching
```

### High memory usage

**Diagnosis:**
```bash
# Check memory
kubectl top pods -n safesoundarena --sort-by=memory

# Check heap size
kubectl exec POD_NAME -- node -e "console.log(process.memoryUsage())"
```

**Solutions:**
```bash
# Increase memory limit
kubectl set resources deployment safesoundarena-api \
  --limits=memory=2Gi \
  -n safesoundarena

# Fix memory leaks in application
# Profile with: node --inspect
# Use: chrome://inspect
```

### Slow API responses

**Solutions:**
```bash
# Check application logs
kubectl logs svc/safesoundarena-api -n safesoundarena -f

# Check database query performance
# Enable query logging as shown above

# Add caching layer
# Configure Redis cache properly

# Use APM (Application Performance Monitoring)
# See monitoring setup
```

---

## 🔐 Security Issues

### Unauthorized access

**Solutions:**
```bash
# Check RBAC
kubectl auth can-i get pods --as=system:serviceaccount:safesoundarena:safesoundarena

# Check network policies
kubectl get networkpolicy -n safesoundarena

# View detailed policy
kubectl describe networkpolicy safesoundarena-api -n safesoundarena
```

### Secret not loaded

**Solutions:**
```bash
# Check secret exists
kubectl get secret safesoundarena-secrets -n safesoundarena
kubectl describe secret safesoundarena-secrets -n safesoundarena

# Verify mounting
kubectl exec POD_NAME -n safesoundarena -- env | grep SECRET

# Re-create secret
kubectl delete secret safesoundarena-secrets -n safesoundarena
kubectl create secret generic safesoundarena-secrets \
  --from-literal=KEY=VALUE \
  -n safesoundarena
```

---

## 🔄 Deployment Issues

### Rollout stuck

**Symptoms:** Deployment shows progress but never completes

**Solutions:**
```bash
# Check rollout status
kubectl rollout status deployment/safesoundarena-api -n safesoundarena

# Describe deployment
kubectl describe deployment safesoundarena-api -n safesoundarena

# Check replica sets
kubectl get rs -n safesoundarena

# Force rollback
kubectl rollout undo deployment/safesoundarena-api -n safesoundarena
```

### New version not deploying

**Solutions:**
```bash
# Trigger new rollout
kubectl rollout restart deployment/safesoundarena-api -n safesoundarena

# Or update image
kubectl set image deployment/safesoundarena-api \
  api-server=yourregistry/safesoundarena-api:NEW_TAG \
  -n safesoundarena

# Force pull image
kubectl patch deployment safesoundarena-api \
  -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"date\":\"`date +'%s'`\"}}}}}" \
  -n safesoundarena
```

---

## 📝 Debug Commands Quick Reference

```bash
# Logs
kubectl logs POD -n NS
kubectl logs -f DEPLOYMENT -n NS  # follow
kubectl logs POD -n NS --previous  # crashed container

# Exec into pod
kubectl exec -it POD -n NS -- /bin/sh

# Port forward
kubectl port-forward POD 3000:3000 -n NS

# Check resources
kubectl top nodes
kubectl top pods -n NS

# Describe resource
kubectl describe pod POD -n NS

# Get detailed info
kubectl get pods -n NS -o wide
kubectl get pods -n NS -o json

# Events
kubectl get events -n NS --sort-by='.lastTimestamp'

# Apply with preview
kubectl apply -f FILE --dry-run=client

# Debug pod
kubectl run -it --rm debug --image=busybox -- sh
```

---

## 🎯 Common Fixes Summary

| Issue | Fix |
|-------|-----|
| Pod won't start | Check logs: `kubectl logs POD` |
| Can't connect | Check service: `kubectl get svc` |
| Out of memory | Increase limit in deployment |
| Slow responses | Check logs, enable query logging |
| Permission denied | Check RBAC, service account |
| Image not found | Check registry auth, image tag |
| Config not applied | Reload config: `kubectl rollout restart` |
| Disk full | Expand PVC, clean old data |

---

## 📞 Getting Help

1. Check logs: `kubectl logs [POD]`
2. Describe resource: `kubectl describe [RESOURCE]`
3. Check events: `kubectl get events`
4. Increase log level: Add `--loglevel=debug`
5. Open issue: Include logs, describe what happened
