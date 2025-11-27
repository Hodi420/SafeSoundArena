# SafeSoundArena - Production Deployment Guide

## Quick Start (Docker Compose)

### Prerequisites

- Docker & Docker Compose installed
- At least 8GB RAM (for local AI models)
- GPU support (optional, for text-gen-inference)

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys and configuration
# Required: OPENAI_API_KEY, CLAUDE_API_KEY
# Optional: PI_API_KEY for Pi Network integration
```

### 2. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps
docker-compose logs api-server
docker-compose logs frontend
```

### 3. Health Checks

- Backend: http://localhost:4000/api/health
- Frontend: http://localhost:3000/healthz
- GraphQL Playground: http://localhost:4000/graphql
- AI Router: http://localhost:4000/api/ai/chat

### 4. Testing AI Integration

```bash
# Test AI chat endpoint
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "model": "gpt-4o",
    "context": []
  }'
```

## Service Overview

### Core Services

- **api-server** (Port 4000): TypeScript backend with GraphQL, AI routing, WebSocket
- **frontend** (Port 3000): Next.js React app with Apollo Client
- **ollama** (Port 11434): Local LLM inference (llama3.1:8b, mistral:7b)
- **text-gen-inference** (Port 8081): Hugging Face TGI for larger models
- **redis** (Port 6379): Caching and session storage
- **ipfs** (Port 5001, 8080): Decentralized file storage

### AI Model Strategy

The HybridAIRouter intelligently routes requests:

- **Local models** (Ollama): Fast, private, no API costs
- **Cloud APIs** (OpenAI, Claude): Higher quality for complex tasks
- **Automatic selection** based on cost, speed, and complexity

## Environment Variables

### Required

```bash
# AI API Keys
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=...

# Backend
PORT=4000
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Optional

```bash
# Pi Network
PI_API_KEY=...

# Security
DEV_ACCESS_TOKEN=... # disable in production
ADMIN_TOKEN=...

# Local AI
OLLAMA_BASE_URL=http://ollama:11434
TGI_BASE_URL=http://text-gen-inference:80
```

## Scaling Options

### Cloud Deployment (No Local Models)

Remove `ollama` and `text-gen-inference` from docker-compose.yml if using only API-based models.

### Separate Backend/Frontend

Deploy backend and frontend to different platforms:

- **Backend**: Render, Fly.io, Railway
- **Frontend**: Vercel, Netlify
- Set `NEXT_PUBLIC_API_URL` to your backend domain

### Kubernetes

Use `k8s/` manifests for production Kubernetes deployment.

## Security Checklist

- [ ] Change all default keys in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Disable `DEV_ACCESS_TOKEN` and `FORCE_DEV_GATE`
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Use strong `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Enable rate limiting
- [ ] Monitor logs for security events

## Troubleshooting

### Backend Won't Start

- Check `docker-compose logs api-server`
- Verify environment variables
- Ensure ports 4000, 11434, 8081 are not in use

### AI Router Errors

- Check API keys are valid
- For local models: `docker-compose logs ollama`
- Test individual endpoints: `/api/ai/models`, `/api/ai/stats`

### Frontend Build Issues

- Check `docker-compose logs frontend`
- Verify `NEXT_PUBLIC_API_URL` points to backend
- Ensure healthz endpoint responds

### Performance Issues

- Monitor with `/api/health` endpoint
- Check Redis connection
- Scale individual services: `docker-compose up -d --scale api-server=2`

## Monitoring

### Built-in Endpoints

- `/api/health` - System status
- `/api/ai/stats` - AI usage statistics
- `/healthz` - Frontend health

### Recommended Tools

- Grafana + Prometheus (configs in `deploy/monitoring/`)
- Sentry for error tracking
- AlertManager for notifications

## Support

For deployment issues or questions, check:

1. GitHub Issues
2. Documentation in `docs/`
3. Community Discord (if available)

---

**Ready to deploy!** 🚀

The system is production-ready with cloud AI models. Local models (Ollama) provide additional privacy and cost savings but require more resources.
