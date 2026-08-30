# SafeSoundArena Pioneer Quick Reference Card

Print this card, save to phone, or keep in your IDE. Quick answers at your fingertips.

---

## 🚀 Quick Start (Pick One)

```bash
# Option A: Interactive wizard (first time)
node setup-wizard.js && npm start

# Option B: Docker (easiest)
docker compose up --build

# Option C: Manual (most control)
npm install && npm start
cd frontend && npm run dev  # In another terminal
```

---

## 🔗 Key URLs

| Service | URL | Use |
|---------|-----|-----|
| Frontend | http://localhost:3000 | Web app |
| Backend | http://localhost:4000 | API |
| API Health | http://localhost:4000/api/health | Check backend |
| MongoDB | mongodb://localhost:27017 | Database |
| MongoDB Atlas | https://cloud.mongodb.com | Cloud DB |

---

## 📁 Important Files & Directories

| Path | Purpose |
|------|---------|
| `.env` | Configuration (secrets, database) ⚠️ Don't commit! |
| `package.json` | Dependencies & scripts |
| `backend/app.js` | Canonical backend entry point |
| `server.js` | Legacy backend; do not use for the current runtime |
| `frontend/` | React/Next.js frontend |
| `backend/` | Backend services & models |
| `docker-compose.yml` | Docker configuration |
| `k8s/` | Kubernetes manifests |

---

## 🎮 Common Commands

```bash
# Installation
npm install              # Install dependencies
npm ci                   # Install exact versions (CI)

# Development
npm start                # Start backend (port 4000)
npm run dev              # Start frontend (port 3000) in frontend/
npm run dev:all          # Both (if configured)

# Testing
npm test                 # Run tests
npm run lint             # Run ESLint
npm run lint -- --fix    # Auto-fix lint issues

# Docker
docker compose up --build        # Start services
docker compose down              # Stop services
docker compose logs backend      # View logs
docker ps                        # List running containers

# Database
node db-init.js                  # Initialize database
SEED_DATA=true node db-init.js  # Seed sample data

# Help
node pioneer-cli.js              # Show CLI commands
node pioneer-cli.js status       # Check setup status
node setup-wizard.js             # Interactive wizard
```

---

## 🔐 Environment Variables (Key Ones)

```bash
# Database
MONGO_URI=mongodb://localhost:27017/safesoundarena
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db  # Cloud

# Security
NODE_ENV=development              # development | staging | production
ADMIN_TOKEN=your-secret-token
JWT_SECRET=your-secret-key

# Server
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000

# AI (Optional)
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🆘 Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| Port 4000 in use | `lsof -i :4000` then `kill -9 <PID>` |
| MongoDB won't connect | Check MongoDB running: `mongo --eval "db.version()"` |
| "Cannot find module X" | `npm install` |
| `.env` not found | `cp .env.example .env` |
| Docker won't start | `docker system prune` then `docker compose up --build` |
| CORS error | Check `ALLOWED_ORIGINS` in `.env` |
| API returns 401 | Check `ADMIN_TOKEN` in `.env` |

---

## 📊 Database Collections

After seeding, you have:

| Collection | Docs | Purpose |
|-----------|------|---------|
| `users` | 3 | Player profiles |
| `arenas` | 3 | Game modes |
| `quests` | 3 | Tasks & rewards |
| `matches` | 1 | Sample match record |

**Query from MongoDB shell:**
```javascript
db.users.find()           // All users
db.arenas.find()          // All arenas
db.quests.find()          // All quests
db.users.count()          // Count users
```

---

## 🔄 API Endpoints (Common)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Server health check |
| GET | `/api/jail-status` | Jail mode status |
| POST | `/api/jail` | Set jail mode (admin only) |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/arenas` | List arenas |
| GET | `/api/quests` | List quests |

Full docs: See `API_DOCUMENTATION.md`

---

## 📚 Documentation Map

| Document | Read When |
|----------|-----------|
| **PIONEER_SETUP_GUIDE.md** | First time setting up |
| **SETUP_CHECKLIST.md** | Verifying setup is complete |
| **DEVELOPMENT_GUIDE.md** | Understanding project structure |
| **API_DOCUMENTATION.md** | Building API features |
| **REUSABLE_COMPONENTS_GUIDE.md** | Creating React components |
| **ERROR_HANDLING_GUIDE.md** | Handling errors properly |
| **TROUBLESHOOTING.md** | When things break |
| **DEPLOYMENT_GUIDE.md** | Going to production |

---

## 🎯 Common Tasks

### Add a New Environment Variable
```bash
# 1. Add to .env
echo "NEW_KEY=value" >> .env

# 2. Use in code
const value = process.env.NEW_KEY;

# 3. Restart backend
npm start
```

### Connect to Database Directly
```bash
# Local MongoDB
mongo
use safesoundarena
db.users.find()

# Or use MongoDB Compass GUI
# Connection: mongodb://localhost:27017
```

### Debug Backend Issues
```bash
# Check logs
tail -f logs/backend.log        # if logs exist

# Increase verbosity
DEBUG=* npm start

# Check network
curl -v http://localhost:4000/api/health
```

### Hot Reload Isn't Working
```bash
# Backend hot reload (with nodemon)
npm install -g nodemon
cd backend
npm run dev

# Frontend auto-reloads by default
# If not, try:
cd frontend && npm run dev --poll
```

---

## 💡 Pro Tips

✨ **Keep .env secure**
- Never commit to Git
- Never share with others
- Keep backups of production secrets
- Rotate keys regularly

✨ **Use Docker in development**
- Consistent environment for team
- No local MongoDB installation
- Easy to reset: `docker-compose down -v`
- Better matches production

✨ **Read error messages carefully**
- They tell you what's wrong
- Search error in TROUBLESHOOTING.md
- Google the error for more context

✨ **Use the CLI helper**
- `node pioneer-cli.js status` → Check setup
- `node pioneer-cli.js db:init` → Reset database
- `node pioneer-cli.js test` → Run tests

✨ **Test before committing**
```bash
npm run lint --fix   # Fix formatting
npm test             # Run tests
git status           # Check what you changed
```

---

## 🤝 Git Workflow

```bash
# Before starting work
git pull origin main
git checkout -b feature/my-feature

# While working
git add .
git commit -m "Add description of change"

# Before pushing
npm run lint --fix
npm test

# Push to GitHub
git push origin feature/my-feature
# Then create Pull Request on GitHub

# After merge
git checkout main
git pull origin main
git branch -d feature/my-feature
```

---

## 🆘 Emergency Reset

**Clear everything and start fresh:**

```bash
# Hard reset (⚠️ Removes all changes!)
git reset --hard HEAD

# Clear node_modules
rm -rf node_modules
npm install

# Clear database
node db-init.js  # This clears and reinitializes

# Clear Docker
docker-compose down -v
docker system prune

# Fresh start
npm start
```

---

## 📞 Quick Help

| Question | Answer |
|----------|--------|
| Where's the database? | `.env` → `MONGO_URI` |
| How do I add an API key? | Edit `.env`, restart backend |
| Can I use Docker? | Yes! `docker compose up --build` |
| Is my .env safe? | Yes, it's in `.gitignore` |
| How do I deploy? | See `DEPLOYMENT_GUIDE.md` |
| Need community help? | GitHub Discussions: https://github.com/Hodi420/SafeSoundArena/discussions |

---

## 🎓 First-Time Checklist

- [ ] Clone repo: `git clone ...`
- [ ] Install Node 24.x LTS: `node --version`
- [ ] Run wizard: `node setup-wizard.js`
- [ ] Verify setup: `node pioneer-cli.js status`
- [ ] Start backend: `npm start`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open browser: `http://localhost:3000`
- [ ] Try a feature
- [ ] Read `DEVELOPMENT_GUIDE.md`
- [ ] Make a test commit: `git checkout -b test-branch`

---

## 📋 Before Asking for Help

1. ✅ Read the error message completely
2. ✅ Search TROUBLESHOOTING.md for the error
3. ✅ Try `node pioneer-cli.js status` to diagnose
4. ✅ Check `.env` is configured correctly
5. ✅ Restart the backend
6. ✅ Check browser console for errors
7. ✅ Try Docker: `docker compose down && docker compose up --build`
8. ✅ Then ask in GitHub Discussions with:
   - Full error message
   - What you were trying to do
   - Your setup method (Docker/Local/Cloud)
   - Output of `node pioneer-cli.js status`

---

**Keep This Handy!** 📌

Bookmark this file, print it, or keep it in your notes. You'll reference it often!

**Last Updated:** 2026-05-15  
**Questions?** See PIONEER_SETUP_GUIDE.md or GitHub Discussions
