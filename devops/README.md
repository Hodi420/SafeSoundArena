# SafeSoundArena DevOps Configuration

This directory contains all DevOps configurations for SafeSoundArena across different environments.

## 📁 Directory Structure

```
devops/
├── docker/                      # Dockerfiles for different services
│   ├── Dockerfile.server       # API server (Node.js)
│   ├── Dockerfile.frontend     # Frontend (Next.js)
│   └── Dockerfile.dev          # Development base image
│
├── docker-compose/              # Environment-specific compose files
│   ├── docker-compose.dev.yml  # Development (hot-reload, all tools)
│   ├── docker-compose.staging.yml # Staging (production-like)
│   └── docker-compose.prod.yml # Production (optimized)
│
├── k8s/                         # Kubernetes manifests
│   ├── base/                    # Base manifests
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   │
│   └── overlays/                # Environment-specific overlays
│       ├── dev/
│       ├── staging/
│       └── prod/
│
├── scripts/                     # Utility scripts
│   ├── deploy.sh               # Deployment script
│   ├── health-check.sh         # Health check script
│   └── rollback.sh             # Rollback script
│
├── monitoring/                  # Monitoring configurations
│   ├── prometheus/prometheus.yml
│   └── grafana/dashboards/
│
└── docs/                        # Documentation
    ├── DEPLOYMENT_GUIDE.md
    ├── TROUBLESHOOTING.md
    └── MONITORING.md
```

## 🚀 Quick Start

### Development
```bash
cd devops
docker-compose -f docker-compose/docker-compose.dev.yml up
```

### Staging
```bash
cd devops
docker-compose -f docker-compose/docker-compose.staging.yml up
```

### Production (Docker)
```bash
cd devops
docker-compose -f docker-compose/docker-compose.prod.yml up -d
```

### Production (Kubernetes)
```bash
kubectl apply -k devops/k8s/overlays/prod/
```

## 📋 Environment Variables

Each environment has its own `.env` file:
- `.env.dev` - Development settings
- `.env.staging` - Staging settings
- `.env.prod` - Production settings (not in repo, create manually)

See `.env.example` for required variables.

## 🔒 Security Notes

- Production images run as non-root user
- All sensitive values via environment variables
- K8s uses secrets for sensitive data
- Network policies restrict traffic
- Resource limits prevent resource exhaustion

## 📊 Monitoring

- **Prometheus**: http://localhost:9090 (dev)
- **Grafana**: http://localhost:3001 (dev)
- **Health Check**: `/health` and `/healthz` endpoints

## 🆘 Troubleshooting

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Monitoring Setup](docs/MONITORING.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
