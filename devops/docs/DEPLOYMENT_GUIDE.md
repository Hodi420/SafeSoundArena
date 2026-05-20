# SafeSoundArena DevOps Deployment Guide

This guide covers how to deploy SafeSoundArena in different environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### For Docker
- Docker 20.10+
- Docker Compose 1.29+
- 4GB RAM minimum
- 10GB disk space

### For Kubernetes
- Kubernetes 1.24+
- kubectl 1.24+
- Helm 3+ (optional)
- 8GB RAM minimum
- 20GB disk space

### For Local Development
- Node.js 18+
- npm 9+
- MongoDB (optional, for local development)

---

## 🚀 Local Development

### 1. Clone Repository
```bash
git clone https://github.com/Hodi420/SafeSoundArena.git
cd SafeSoundArena
```

### 2. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 3. Setup Environment Variables
```bash
cp devops/.env.example .env
# Edit .env with your local settings
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Visit http://localhost:3000

---

## 🐳 Docker Deployment

### Development Environment

```bash
cd devops

# Copy environment file
cp .env.example .env.dev
# Edit .env.dev with development settings

# Start all services
docker-compose -f docker-compose/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose/docker-compose.dev.yml logs -f api-server

# Stop services
docker-compose -f docker-compose/docker-compose.dev.yml down
```

**Access Points:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Jaeger: http://localhost:16686
- MailHog: http://localhost:8025

### Staging Environment

```bash
cd devops

# Copy and configure environment
cp .env.example .env.staging
# Edit .env.staging with staging settings

# Build images
docker-compose -f docker-compose/docker-compose.staging.yml build

# Start services
docker-compose -f docker-compose/docker-compose.staging.yml up -d

# Health check
docker-compose -f docker-compose/docker-compose.staging.yml ps
```

### Production Environment

```bash
cd devops

# Copy and configure environment (DO NOT commit this)
cp .env.example .env.prod
# Edit .env.prod with production secrets

# Build images with tag
docker build -t yourregistry/safesoundarena-api:1.0.0 -f docker/Dockerfile.server .
docker build -t yourregistry/safesoundarena-frontend:1.0.0 -f docker/Dockerfile.frontend frontend/

# Push to registry
docker push yourregistry/safesoundarena-api:1.0.0
docker push yourregistry/safesoundarena-frontend:1.0.0

# Start services
docker-compose -f docker-compose/docker-compose.prod.yml up -d

# Verify health
curl http://localhost:4000/api/health
curl http://localhost:3000/
```

---

## ☸️ Kubernetes Deployment

### Prerequisites

```bash
# Create namespace
kubectl create namespace safesoundarena
kubectl label namespace safesoundarena name=safesoundarena

# Install Prometheus (optional)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace safesoundarena

# Install Nginx Ingress (for production)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### Development Deployment

```bash
# Apply development configuration
kubectl apply -k devops/k8s/overlays/dev/

# Verify deployment
kubectl get all -n safesoundarena-dev

# View logs
kubectl logs -n safesoundarena-dev -l app=safesoundarena -f

# Port forward to local
kubectl port-forward -n safesoundarena-dev svc/safesoundarena-api 4000:4000
kubectl port-forward -n safesoundarena-dev svc/safesoundarena-api 3001:3001 # Grafana
```

### Staging Deployment

```bash
# Apply staging configuration
kubectl apply -k devops/k8s/overlays/staging/

# Verify deployment
kubectl rollout status deployment/safesoundarena-api -n safesoundarena-staging

# Scale replicas
kubectl scale deployment safesoundarena-api --replicas=3 -n safesoundarena-staging
```

### Production Deployment

```bash
# Update image registry in overlays/prod/kustomization.yaml
# Change: YOUR_REGISTRY/safesoundarena-api:latest

# Apply production configuration
kubectl apply -k devops/k8s/overlays/prod/

# Verify deployment
kubectl get all -n safesoundarena
kubectl rollout status deployment/safesoundarena-api -n safesoundarena

# Check HPA status
kubectl get hpa -n safesoundarena

# Monitor autoscaling
kubectl get hpa -n safesoundarena -w
```

### Update Deployment

```bash
# Update image
kubectl set image deployment/safesoundarena-api \
  api-server=yourregistry/safesoundarena-api:2.0.0 \
  -n safesoundarena

# Rollback if needed
kubectl rollout undo deployment/safesoundarena-api -n safesoundarena
```

---

## 📊 Monitoring & Logging

### Prometheus

Access metrics at: http://your-cluster/prometheus

Query examples:
```promql
# API response time
rate(http_request_duration_seconds_bucket[5m])

# API error rate
rate(http_requests_total{status=~"5.."}[5m])

# Container memory usage
container_memory_usage_bytes

# Pod CPU usage
rate(container_cpu_usage_seconds_total[5m])
```

### Grafana

Access at: http://your-cluster:3001
Default credentials: admin / admin

Pre-configured dashboards:
- Kubernetes Cluster
- Pod Metrics
- Application Metrics
- Database Performance

---

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs safesoundarena-api-dev

# Check health
curl -v http://localhost:4000/api/health

# Inspect configuration
docker exec safesoundarena-api-dev env | grep DATABASE_URL
```

### K8s pod pending

```bash
# Check events
kubectl describe pod POD_NAME -n safesoundarena

# Check resources
kubectl top nodes
kubectl top pods -n safesoundarena

# Check node status
kubectl get nodes -o wide
```

### Database connection errors

```bash
# Test connection
docker exec safesoundarena-api-dev nc -zv postgres 5432
docker exec safesoundarena-api-dev redis-cli ping

# Check environment variables
docker exec safesoundarena-api-dev env | grep DATABASE
```

### High memory usage

```bash
# Check memory limits
kubectl describe pod POD_NAME -n safesoundarena | grep -A 5 "Limits"

# Increase limits (edit deployment)
kubectl edit deployment safesoundarena-api -n safesoundarena

# Or patch
kubectl set resources deployment safesoundarena-api \
  --limits=memory=1Gi \
  -n safesoundarena
```

---

## 📝 Environment Variables Reference

See [.env.example](../.env.example) for all available configuration options.

Key variables:
- `NODE_ENV`: Set environment (development/staging/production)
- `PI_API_KEY`: Pi Network authentication
- `OPENAI_API_KEY`: OpenAI/ChatGPT integration
- `ADMIN_TOKEN`: Admin API access token
- `DATABASE_URL`: Database connection string
- `REDIS_PASSWORD`: Redis authentication

---

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized and migrated
- [ ] SSL certificates ready (production)
- [ ] Docker images built and pushed
- [ ] K8s secrets created
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] DNS configured
- [ ] Load balancer configured

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [SafeSoundArena README](../../README.md)
