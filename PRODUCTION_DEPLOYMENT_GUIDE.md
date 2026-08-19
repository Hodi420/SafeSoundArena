# 🚀 SafeSoundArena Production Deployment Guide (with Ollama)

## Complete Guide for Standalone Deployment

This guide covers deploying SafeSoundArena with Ollama LLM as a complete, self-contained production system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Docker Compose Production Setup](#docker-compose-production-setup)
4. [Kubernetes Production Setup](#kubernetes-production-setup)
5. [Health Monitoring](#health-monitoring)
6. [Backup & Recovery](#backup--recovery)
7. [Scaling Strategies](#scaling-strategies)
8. [Security Hardening](#security-hardening)
9. [Troubleshooting](#troubleshooting)
10. [Post-Deployment](#post-deployment)

---

## 📦 Prerequisites

### Hardware Requirements
```
Minimum:
  CPU: 8 cores
  RAM: 16 GB
  Disk: 50 GB SSD
  Network: 100 Mbps

Recommended:
  CPU: 16+ cores
  RAM: 32 GB
  Disk: 100 GB+ SSD
  Network: 1 Gbps
  GPU: NVIDIA (optional, for Ollama acceleration)
```

### Software Requirements
```
Docker: 20.10+
Docker Compose: 1.29+
curl/wget: For health checks
jq: For JSON parsing (optional)
```

### For Kubernetes Option
```
Kubernetes: 1.24+
kubectl: 1.24+
Helm: 3.0+
```

---

## ✅ Pre-Deployment Checklist

### Infrastructure Setup
- [ ] Server provisioned and SSH access configured
- [ ] Firewall rules set (open ports: 80, 443, 4000, 3000, 11434)
- [ ] SSL/TLS certificates ready (or auto-generate with Let's Encrypt)
- [ ] Domain DNS configured to point to server
- [ ] Backup storage configured (S3, NAS, or similar)

### Code Preparation
- [ ] Repository cloned: `git clone https://github.com/Hodi420/SafeSoundArena.git`
- [ ] All latest commits pulled: `git pull origin main`
- [ ] No uncommitted changes: `git status`
- [ ] Docker images built and ready

### Secrets & Configuration
- [ ] Create `.env.prod` from `.env.prod.example`
- [ ] Generate all secrets (ADMIN_TOKEN, JWT_SECRET, etc.)
- [ ] MongoDB password set and backed up
- [ ] Redis password set and backed up
- [ ] API keys configured (Ollama, Pi Network if needed)
- [ ] SSL certificates placed in `./devops/ssl/`

### Data Preparation
- [ ] Database backup strategy planned
- [ ] MongoDB initialized (if using external)
- [ ] Redis initialized (if using external)
- [ ] Monitoring configured (Prometheus, Grafana)

### Team & Documentation
- [ ] Deployment runbook created (team-specific)
- [ ] On-call person assigned
- [ ] Incident response plan documented
- [ ] Rollback procedure tested

---

## 🐳 Docker Compose Production Setup

### Step 1: Prepare Server

```bash
# SSH into your production server
ssh user@your-server.com

# Clone repository
git clone https://github.com/Hodi420/SafeSoundArena.git
cd SafeSoundArena

# Create necessary directories
mkdir -p devops/ssl devops/nginx logs data/{ollama,mongodb,redis}

# Set proper permissions
chmod 700 devops/ssl
chmod 700 data/*
```

### Step 2: Configure Environment

```bash
# Copy production environment template
cp .env.prod.example .env.prod

# Edit with production values
nano .env.prod
```

**Required values to set:**
```bash
ADMIN_TOKEN=<generate-secure-token>
JWT_SECRET=<generate-secure-token>
SESSION_SECRET=<generate-secure-token>
MONGO_PASSWORD=<generate-secure-password>
REDIS_PASSWORD=<generate-secure-password>
GRAFANA_PASSWORD=<generate-secure-password>
ALLOWED_ORIGINS=https://yourdomain.com
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com
```

**Generate secure tokens:**
```bash
# Generate 64-char hex tokens
openssl rand -hex 32
```

### Step 3: SSL/TLS Certificates

#### Option A: Use Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem devops/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem devops/ssl/key.pem
sudo chown $(whoami):$(whoami) devops/ssl/*

# Set auto-renewal (crontab)
sudo certbot renew --dry-run  # Test
# Add to crontab: 0 3 * * * certbot renew --quiet
```

#### Option B: Self-Signed (Development/Testing Only)
```bash
openssl req -x509 -newkey rsa:4096 -keyout devops/ssl/key.pem \
  -out devops/ssl/cert.pem -days 365 -nodes \
  -subj "/CN=yourdomain.com"
```

### Step 4: Configure Nginx (Reverse Proxy)

Create `devops/nginx/default.conf`:

```nginx
upstream api {
    server api-server:4000;
}

upstream frontend {
    server web:3000;
}

server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # API routes
    location /api {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: Initialize Models

Before starting services, pull the Ollama model:

```bash
# Start just Ollama
docker-compose -f docker-compose.prod.ollama.yml up -d ollama

# Wait for Ollama to be ready
sleep 30

# Pull mistral model (takes 5-15 minutes, first time only)
docker-compose -f docker-compose.prod.ollama.yml exec ollama \
  ollama pull mistral

# Verify model loaded
curl http://localhost:11434/api/tags | jq '.models'
```

### Step 6: Start All Services

```bash
# Build images (if not pre-built)
docker-compose -f docker-compose.prod.ollama.yml build

# Start all services
docker-compose -f docker-compose.prod.ollama.yml up -d

# Verify all services are running
docker-compose -f docker-compose.prod.ollama.yml ps

# Check logs
docker-compose -f docker-compose.prod.ollama.yml logs -f
```

### Step 7: Verify Deployment

```bash
# Check health endpoints
curl http://localhost:4000/api/health
curl http://localhost:3000/
curl http://localhost:11434/api/tags

# View logs for errors
docker-compose -f docker-compose.prod.ollama.yml logs api-server

# Monitor resource usage
docker stats

# Test with actual request
curl -X POST http://localhost:4000/api/quest/generate \
  -H "Content-Type: application/json" \
  -d '{"questName":"Test Quest"}'
```

---

## ☸️ Kubernetes Production Setup

### Step 1: Create Namespace

```bash
kubectl create namespace safesoundarena-prod
kubectl label namespace safesoundarena-prod \
  environment=production \
  monitoring=enabled
```

### Step 2: Create Secrets

```bash
# Create environment secrets
kubectl create secret generic safesoundarena-secrets \
  --from-literal=ADMIN_TOKEN=your-token \
  --from-literal=JWT_SECRET=your-secret \
  --from-literal=MONGO_PASSWORD=your-mongo-pass \
  --from-literal=REDIS_PASSWORD=your-redis-pass \
  -n safesoundarena-prod

# Create SSL certificate
kubectl create secret tls safesoundarena-tls \
  --cert=devops/ssl/cert.pem \
  --key=devops/ssl/key.pem \
  -n safesoundarena-prod
```

### Step 3: Create PersistentVolumes

```bash
# Create storage for models, database, cache
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ollama-models-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  hostPath:
    path: /data/ollama-models

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-data-pv
spec:
  capacity:
    storage: 30Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  hostPath:
    path: /data/mongodb

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: redis-data-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  hostPath:
    path: /data/redis
EOF
```

### Step 4: Deploy Ollama StatefulSet

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ollama
  namespace: safesoundarena-prod
spec:
  serviceName: ollama
  replicas: 1  # Ollama needs persistent storage
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
      - name: ollama
        image: ollama/ollama:latest
        ports:
        - containerPort: 11434
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
          limits:
            memory: "12Gi"
            cpu: "4"
        volumeMounts:
        - name: models
          mountPath: /root/.ollama
        env:
        - name: OLLAMA_HOST
          value: "0.0.0.0:11434"
        - name: OLLAMA_NUM_PARALLEL
          value: "2"
        livenessProbe:
          httpGet:
            path: /api/tags
            port: 11434
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/tags
            port: 11434
          initialDelaySeconds: 10
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: models
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 20Gi

---
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: safesoundarena-prod
spec:
  selector:
    app: ollama
  ports:
  - port: 11434
    targetPort: 11434
  clusterIP: None  # Headless service
EOF
```

### Step 5: Deploy Backend

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: safesoundarena-api
  namespace: safesoundarena-prod
spec:
  replicas: 3  # Horizontal scaling
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: safesoundarena-api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 4000
        resources:
          requests:
            memory: "1Gi"
            cpu: "1"
          limits:
            memory: "2Gi"
            cpu: "2"
        env:
        - name: NODE_ENV
          value: "production"
        - name: OLLAMA_BASE_URL
          value: "http://ollama:11434"
        - name: OLLAMA_MODEL
          value: "mistral"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: safesoundarena-secrets
              key: MONGO_URI
        - name: ADMIN_TOKEN
          valueFrom:
            secretKeyRef:
              name: safesoundarena-secrets
              key: ADMIN_TOKEN
        livenessProbe:
          httpGet:
            path: /api/health
            port: 4000
          initialDelaySeconds: 20
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: safesoundarena-prod
spec:
  selector:
    app: api
  ports:
  - port: 4000
    targetPort: 4000
  type: LoadBalancer
EOF
```

### Step 6: Configure HPA (Auto-scaling)

```bash
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: safesoundarena-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: safesoundarena-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
EOF
```

---

## 🏥 Health Monitoring

### Health Check Endpoints

```bash
# Backend health
curl http://localhost:4000/api/health

# Expected response:
{
  "status": "ok",
  "uptime": 3600,
  "memoryUsage": {...},
  "ai_provider": "ollama",
  "ai_available": true,
  "models": ["mistral:latest"]
}

# Frontend health
curl http://localhost:3000/

# Ollama health
curl http://localhost:11434/api/tags
```

### Monitoring Dashboard

Access Grafana at: `http://localhost:3001`
- Default credentials: admin / <GRAFANA_PASSWORD>
- Pre-configured dashboards:
  - Ollama Performance
  - Backend API Metrics
  - Database Performance
  - Container Resources

### Log Aggregation

View logs:
```bash
# All services
docker-compose -f docker-compose.prod.ollama.yml logs

# Specific service
docker-compose -f docker-compose.prod.ollama.yml logs api-server

# Follow logs
docker-compose -f docker-compose.prod.ollama.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.ollama.yml logs --tail=100
```

---

## 💾 Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/backups/safesoundarena"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
docker-compose -f docker-compose.prod.ollama.yml exec -T mongodb \
  mongodump --out /backup/mongodb_$DATE

# Backup Redis
docker-compose -f docker-compose.prod.ollama.yml exec -T redis \
  redis-cli BGSAVE

# Backup Ollama models (if needed)
tar -czf $BACKUP_DIR/ollama_$DATE.tar.gz ollama_models

# Upload to S3
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/safesoundarena/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

Schedule with cron:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Recovery Procedures

```bash
# Restore MongoDB from backup
docker-compose -f docker-compose.prod.ollama.yml exec -T mongodb \
  mongorestore --gzip /backup/mongodb_YYYYMMDD_HHMMSS

# Restore Redis from dump
docker-compose -f docker-compose.prod.ollama.yml exec -T redis \
  redis-cli SHUTDOWN
# Replace dump.rdb, restart

# Verify after restore
curl http://localhost:4000/api/health
```

---

## 📈 Scaling Strategies

### Horizontal Scaling (Add More Servers)

```bash
# Docker Swarm mode
docker swarm init

# Deploy as stack
docker stack deploy -c docker-compose.prod.ollama.yml safesoundarena

# Scale services
docker service scale safesoundarena_api-server=5
```

### Load Balancing

```bash
# Use HAProxy for better control
apt-get install haproxy

# Configure haproxy.cfg
# Route to multiple backend instances
```

### Ollama Scaling

```bash
# Ollama can handle multiple parallel requests
# Increase with environment variable:
OLLAMA_NUM_PARALLEL=4  # Default 2

# Or use separate Ollama instances with load balancing
# Run multiple Ollama containers on different ports
# Use nginx upstream to balance requests
```

---

## 🔒 Security Hardening

### Network Security

```bash
# Firewall rules
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw deny 4000/tcp      # Block direct API access
sudo ufw deny 3000/tcp      # Block direct frontend
sudo ufw deny 11434/tcp     # Block direct Ollama
sudo ufw deny 27017/tcp     # Block direct MongoDB
sudo ufw deny 6379/tcp      # Block direct Redis
sudo ufw enable
```

### Container Security

```dockerfile
# Use non-root user in Dockerfile
USER appuser

# No privilege escalation
security_opt:
  - no-new-privileges:true

# Read-only filesystem where possible
read_only: true
tmpfs:
  - /tmp
```

### Secret Management

```bash
# Use Docker secrets (Swarm mode)
echo "your-secret" | docker secret create admin_token -

# Or environment file (set permissions)
chmod 600 .env.prod

# Rotate secrets regularly
openssl rand -hex 32 > new-secret
# Update environment and restart
```

---

## 🆘 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.ollama.yml logs

# Common issues:
# 1. Port already in use
netstat -tlnp | grep LISTEN

# 2. Insufficient memory
free -h
docker stats

# 3. Volume permission issues
ls -la data/
chmod 755 data/*

# 4. Network issues
docker network ls
docker network inspect safesoundarena_sa-network
```

### Ollama Not Responding

```bash
# Check if running
docker-compose -f docker-compose.prod.ollama.yml ps ollama

# Check logs
docker-compose -f docker-compose.prod.ollama.yml logs ollama

# Manual test
curl http://localhost:11434/api/tags

# Restart
docker-compose -f docker-compose.prod.ollama.yml restart ollama
```

### High Memory Usage

```bash
# Check what's using memory
docker stats

# Reduce Ollama parallel requests
OLLAMA_NUM_PARALLEL=1  # In .env.prod

# Use smaller model
OLLAMA_MODEL=openchat  # 3.5B instead of 7B

# Increase swap (temporary)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## ✅ Post-Deployment

### Performance Tuning

```bash
# Monitor baseline
docker stats --no-stream

# Test with load
ab -n 100 -c 10 http://localhost:4000/api/health

# Adjust resource limits if needed
```

### Monitoring Setup

1. Access Grafana: http://your-domain:3001
2. Add Prometheus data source
3. Import dashboards
4. Set up alerts

### Documentation

1. Update team runbook
2. Document any customizations
3. Create incident response procedures
4. Schedule training session

### Maintenance Schedule

```
Daily:
  - Check health endpoints
  - Monitor logs for errors
  - Verify backups completed

Weekly:
  - Review performance metrics
  - Check disk usage
  - Update security patches

Monthly:
  - Rotate secrets
  - Review access logs
  - Test disaster recovery
  - Update documentation
```

---

## 🎯 Success Criteria

Your deployment is ready when:

- [x] All services healthy: `docker-compose ps`
- [x] API responding: `curl http://localhost:4000/api/health`
- [x] Frontend loads: `curl http://localhost:3000`
- [x] Ollama working: `curl http://localhost:11434/api/tags`
- [x] SSL certificate valid: `curl -I https://yourdomain.com`
- [x] Backups automated and tested
- [x] Monitoring configured and alerting
- [x] Team trained on procedures
- [x] Disaster recovery plan documented
- [x] Performance baselines recorded

---

**Deployment complete! Your SafeSoundArena is ready for production use.** 🎉
