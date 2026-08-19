# SafeSoundArena Pioneer Setup Guide

> **For New Contributors**: This guide walks you through setting up SafeSoundArena from scratch, whether you're a beginner or experienced developer.

---

## 🎯 Quick Start (3 minutes)

### If you're familiar with Docker:
```bash
# 1. Clone the project
git clone https://github.com/Hodi420/SafeSoundArena.git
cd SafeSoundArena

# 2. Run the setup wizard (interactive)
node setup-wizard.js

# 3. Start Docker Compose
docker compose up --build

# 4. Open http://localhost:3000
```

### If you prefer manual local setup:
```bash
npm install
npm start  # Backend on port 4000
cd frontend && npm run dev  # Frontend on port 3000
```

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Git** - Version control (https://git-scm.com)
- **Node.js** - Version 24.x LTS (https://nodejs.org)
- **npm** or **pnpm** - Package manager (comes with Node.js)

Optional but recommended:
- **Docker & Docker Compose** - Containerization (https://docs.docker.com/compose/install/)
- **MongoDB** - Local database or MongoDB Atlas account (https://www.mongodb.com)

---

## 🚀 Setup Options

Choose one path based on your skill level and environment:

### Option 1: Interactive Setup Wizard (Recommended for First-Time)

The setup wizard guides you through everything step-by-step.

```bash
node setup-wizard.js
```

This will:
- Ask about your setup type (local, Docker, cloud)
- Configure your database
- Set up API keys and secrets
- Generate a `.env` file with all required variables
- Optionally seed sample data

**Time:** ~5-10 minutes  
**Skill Level:** Beginner-friendly

---

### Option 2: Docker Compose (Recommended for Development)

Docker handles all services in isolated containers.

```bash
# 1. Ensure Docker is installed
docker --version
docker-compose --version

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env if needed (optional for development)
# nano .env

# 4. Start services
docker compose up --build

# 5. Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:4000
# - MongoDB: mongodb://localhost:27017
```

**Services included:**
- Frontend (Next.js on port 3000)
- Backend (Express on port 4000)
- MongoDB (on port 27017)
- IPFS (on ports 5001, 8080)

**Advantages:**
- No local MongoDB installation needed
- Isolated environment, easy to tear down
- Works on Mac, Linux, Windows
- Consistent development environment

**Time:** ~2-5 minutes  
**Skill Level:** Intermediate

---

### Option 3: Local Development Setup

Run services directly on your machine (more manual).

#### 3.1 Install MongoDB

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongod
```

**Windows:**
1. Download: https://www.mongodb.com/try/download/community
2. Run installer, use default settings
3. MongoDB starts automatically

**Verify it's running:**
```bash
mongo --eval "db.version()"  # Should output version number
```

#### 3.2 Install Node Dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

#### 3.3 Configure Environment

```bash
cp .env.example .env

# Edit .env with your values
nano .env  # or use your editor
```

**Minimum required in `.env`:**
```
MONGO_URI=mongodb://localhost:27017/safesoundarena
NODE_ENV=development
PORT=4000
```

#### 3.4 Initialize Database

```bash
# This creates collections and optionally seeds sample data
SEED_DATA=true node db-init.js
```

#### 3.5 Start Services

**Terminal 1 - Backend:**
```bash
npm start
# Listens on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Listens on http://localhost:3000
```

**Open http://localhost:3000 in your browser**

**Time:** ~10-15 minutes  
**Skill Level:** Intermediate-Advanced

---

### Option 4: Cloud Deployment (MongoDB Atlas)

For production-like environments or if you can't run local MongoDB.

#### 4.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free tier available)
3. Create a new project
4. Create a cluster (M0 free tier is fine)
5. Create a database user with password
6. Whitelist your IP address
7. Copy connection string (looks like `mongodb+srv://user:pass@cluster.mongodb.net/db?...`)

#### 4.2 Update `.env`

```bash
# Replace with your Atlas connection string
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/safesoundarena?retryWrites=true&w=majority
```

#### 4.3 Initialize Database

```bash
SEED_DATA=true node db-init.js
```

#### 4.4 Start Locally

```bash
npm start  # Backend
cd frontend && npm run dev  # Frontend (another terminal)
```

**Advantages:**
- No local MongoDB installation
- Automatic backups and scaling
- Accessible from multiple machines
- Can run backend on different server

**Time:** ~5-10 minutes  
**Skill Level:** Intermediate

---

## 🗄️ Database Scenarios

SafeSoundArena supports multiple database configurations:

| Setup Type | Database | Connection | Pros | Cons |
|-----------|----------|-----------|------|------|
| **Local Dev** | MongoDB local | `mongodb://localhost:27017` | Fast, offline | Must install MongoDB |
| **Docker** | MongoDB container | `mongodb://mongo:27017` | No install, isolated | Slower than local |
| **Cloud** | MongoDB Atlas | `mongodb+srv://...` | Scalable, managed | Free tier limits |
| **Production** | PostgreSQL | `postgres://...` | Enterprise-grade | More complex setup |

---

## 🔑 Environment Variables

Your `.env` file contains sensitive configuration. **Keep it secure!**

### Essential Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `development`, `staging`, `production` |
| `PORT` | Backend server port | `4000` |
| `MONGO_URI` | Database connection | `mongodb://localhost:27017/safesoundarena` |
| `ADMIN_TOKEN` | Admin authentication | (auto-generated by setup wizard) |
| `JWT_SECRET` | Session signing | (auto-generated by setup wizard) |
| `ALLOWED_ORIGINS` | CORS allowed domains | `http://localhost:3000,http://localhost:4000` |

### Optional Variables

| Variable | Purpose | Required If |
|----------|---------|------------|
| `OPENAI_API_KEY` | GPT-4 integration | Using AI features |
| `PI_API_KEY` | Pi Network integration | Using Pi Network |
| `NEXT_PUBLIC_API_URL` | Frontend API endpoint | Different from localhost:4000 |

### Important Security Notes

⚠️ **NEVER commit `.env` to Git!** It contains secrets.

Already in `.gitignore`? Verify:
```bash
cat .gitignore | grep "\.env"
```

Should output: `.env` (or `.env.local`, etc.)

---

## ✅ Verification Checklist

After setup, verify everything works:

### 1. Database Connection
```bash
# Test MongoDB connection
mongo --eval "db.adminCommand('ping')"
# Should output: { ok: 1 }
```

### 2. Backend Server
```bash
# Backend should be running on port 4000
curl http://localhost:4000/api/health
# Should output: {"uptime":..., "status":"ok"}
```

### 3. Frontend Server
```bash
# Frontend should be running on port 3000
# Open http://localhost:3000 in browser
# Should load without errors
```

### 4. Database Collections
```bash
# Connect to MongoDB
mongo
use safesoundarena
db.users.count()  # Should show sample users if seeded
db.arenas.count()  # Should show sample arenas
```

---

## 🐛 Troubleshooting

### Problem: "EADDRINUSE: address already in use :::4000"
**Cause:** Port 4000 is already in use  
**Solution:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill it
kill -9 <PID>

# Or use different port
PORT=5000 npm start
```

### Problem: "Cannot find module 'mongoose'"
**Cause:** Dependencies not installed  
**Solution:**
```bash
npm install
npm install --save mongoose
```

### Problem: "MongoDB connection refused"
**Cause:** MongoDB not running  
**Solution:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows (check Services)
# Or run: mongod --dbpath "C:\data\db"
```

### Problem: "MONGO_URI not set"
**Cause:** `.env` file missing or incomplete  
**Solution:**
```bash
cp .env.example .env
# Edit .env with your database URI
nano .env
```

### Problem: "Frontend shows 404 / can't reach API"
**Cause:** Backend not running or wrong API URL  
**Solution:**
```bash
# Ensure backend is running (Terminal 1)
npm start

# Check .env in frontend folder
cat frontend/.env.local

# Should have:
# NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Problem: Docker container exits immediately
**Cause:** Environment variables or database not accessible  
**Solution:**
```bash
# Check logs
docker compose logs api-server

# Rebuild
docker compose down
docker compose up --build

# Or with verbose output
docker compose -f docker-compose.yml up --build
```

For more solutions, see [TROUBLESHOOTING.md](./devops/docs/TROUBLESHOOTING.md)

---

## 📊 Multi-Scenario Setup Matrix

Use this table to find your exact setup:

| Scenario | Skills | Time | Steps |
|----------|--------|------|-------|
| **First time, beginner** | Basic | 15 min | Use Option 1 (Wizard) |
| **Want Docker** | Intermediate | 5 min | Use Option 2 (Compose) |
| **No Docker preference** | Intermediate | 15 min | Use Option 3 (Local) |
| **Team/shared database** | Advanced | 10 min | Use Option 4 (Atlas) |
| **Production deployment** | Advanced | 30 min | See DEPLOYMENT_GUIDE.md |

---

## 🤝 Getting Help

### Common Questions

**Q: Do I need Docker?**  
A: No, but it's easier. Use Option 3 (Local) without Docker.

**Q: Can I use PostgreSQL instead of MongoDB?**  
A: Yes, but requires code changes. See `backend/db-adapters/` for details.

**Q: How do I add API keys after setup?**  
A: Edit `.env` and restart backend: `npm start`

**Q: Is my `.env` file safe?**  
A: It's in `.gitignore`, so it won't be committed. But keep your machine secure!

**Q: Can multiple pioneers work on the same database?**  
A: Yes! Use MongoDB Atlas so everyone connects to the same cloud database.

### Get Support

- **Documentation:** See `DEVELOPMENT_GUIDE.md`, `API_DOCUMENTATION.md`
- **Issues:** Report bugs on GitHub: https://github.com/Hodi420/SafeSoundArena/issues
- **Discussions:** Join community: https://github.com/Hodi420/SafeSoundArena/discussions
- **Chat:** Discord (link in README.md)

---

## 🎓 Next Steps After Setup

Once setup is complete:

1. **Explore the codebase:**
   - Frontend: `frontend/src/components/`
   - Backend: `server/`, `backend/`
   - Database: `backend/models/`

2. **Read documentation:**
   - [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Overview
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API endpoints
   - [REUSABLE_COMPONENTS_GUIDE.md](./REUSABLE_COMPONENTS_GUIDE.md) - React patterns

3. **Run tests:**
   ```bash
   npm test
   npm run lint
   ```

4. **Try making a change:**
   - Edit a React component
   - Backend will hot-reload
   - Frontend will hot-reload

5. **Contribute:**
   - Pick an issue from GitHub
   - Create a feature branch
   - Submit a pull request

---

## 📝 Notes for Different Experience Levels

### 🟢 Beginners
- Start with **Option 1 (Wizard)** - it asks what to do
- Use **Docker** if available - simpler than local setup
- Follow the verification checklist to confirm it works
- Ask in discussions if stuck

### 🟡 Intermediate
- Choose **Option 2 or 3** based on preference
- Understand what environment variables do
- Explore the database manually
- Try modifying a simple component

### 🔴 Advanced
- Use **Option 4** for shared team database
- Set up CI/CD (see `.github/workflows/`)
- Deploy to Kubernetes (see `k8s/`)
- Contribute architectural improvements

---

## ✨ What's Included After Setup

Your SafeSoundArena installation includes:

- **Frontend:** Next.js app with components, hooks, styling
- **Backend:** Express API with routes, models, middleware
- **Database:** MongoDB with user, arena, quest collections
- **Real-time:** Socket.io for live communication
- **Blockchain:** Pi Network integration (optional)
- **Admin Panel:** Control room for governance
- **Testing:** Jest, Mocha for unit tests
- **DevOps:** Docker, Kubernetes, monitoring
- **Documentation:** 5000+ lines of guides

---

**Last Updated:** 2026-05-15  
**Status:** Production Ready  
**Support:** https://github.com/Hodi420/SafeSoundArena/discussions
