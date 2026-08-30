# SafeSoundArena Pioneer Setup Checklist

Use this checklist to verify your setup at each stage. Print it or track progress digitally.

---

## 📋 Pre-Setup (Before Starting)

- [ ] **Git** installed (`git --version`)
- [ ] **Node.js 24.x LTS** installed (`node --version`)
- [ ] **npm** installed (`npm --version`)
- [ ] Project cloned (`git clone ...`)
- [ ] Inside project directory (`cd SafeSoundArena`)

**Estimated time:** 5 minutes  
**If stuck:** See PIONEER_SETUP_GUIDE.md → Prerequisites

---

## 🚀 Setup Phase 1: Choose Your Path

Pick ONE option that matches your situation:

### Path A: Interactive Wizard (Recommended First-Time)
- [ ] Run: `node setup-wizard.js`
- [ ] Answer setup type question (1, 2, or 3)
- [ ] Answer database question
- [ ] Provide database credentials/URI
- [ ] Select AI providers (or skip)
- [ ] Configure Pi Network (or skip)
- [ ] Choose environment (development, staging, production)
- [ ] Review configuration
- [ ] Secrets generated
- [ ] `.env` file created

**Estimated time:** 5-10 minutes  
**If stuck:** Is Node.js 24.x LTS installed? See terminal output for errors.

### Path B: Docker Compose (No Local Dependencies)
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Run: `cp .env.example .env`
- [ ] Run: `docker compose up --build`
- [ ] Services start successfully (no errors)

**Estimated time:** 2-5 minutes  
**If stuck:** Docker Desktop not running? Need to install Docker? See TROUBLESHOOTING.md

### Path C: Manual Local Setup (Full Control)
- [ ] MongoDB installed and running
- [ ] Run: `npm install`
- [ ] Run: `cp .env.example .env`
- [ ] Edit `.env` with your MongoDB URI
- [ ] Run: `node db-init.js` (with SEED_DATA=true if you want sample data)

**Estimated time:** 10-15 minutes  
**If stuck:** MongoDB won't start? Dependencies missing? See TROUBLESHOOTING.md

---

## ✅ Setup Phase 2: Verification

### Database Connection
- [ ] `MONGO_URI` set in `.env`
- [ ] MongoDB is accessible (not "connection refused")
- [ ] Collections created (users, arenas, quests)

**Test command:**
```bash
mongo --eval "db.adminCommand('ping')"
# Should output: { ok: 1 }
```

### Backend Server
- [ ] Backend running on port 4000 (`npm start`)
- [ ] Health endpoint responds: `curl http://localhost:4000/api/health`
- [ ] No error logs in terminal

**Expected output:**
```json
{"uptime": 123.45, "memoryUsage": {...}, "jailActive": false, ...}
```

### Frontend Server
- [ ] Frontend running on port 3000 (`cd frontend && npm run dev`)
- [ ] Loads without errors: `http://localhost:3000`
- [ ] Can navigate to different pages
- [ ] No CORS errors in browser console

**Check browser console:**
- [ ] No red error messages
- [ ] Only yellow/blue warnings are okay
- [ ] Network requests to API succeed

### Environment Variables
- [ ] `.env` file exists and has content
- [ ] Not committed to Git (check: `git status | grep .env`)
- [ ] All required keys present:
  - [ ] `MONGO_URI` or database connection
  - [ ] `NODE_ENV` set
  - [ ] `PORT` set
  - [ ] `ADMIN_TOKEN` (generated or from wizard)
  - [ ] `JWT_SECRET` (generated or from wizard)

---

## 🔧 Setup Phase 3: Configuration

### API Keys (Optional)
- [ ] OpenAI key added (if using AI features)
- [ ] Claude key added (if using AI features)
- [ ] Pi Network keys added (if using Pi integration)
- [ ] Backend restarted after adding keys

### CORS Configuration
- [ ] `ALLOWED_ORIGINS` includes your frontend URL
- [ ] Can make API calls without CORS errors
- [ ] Socket.io connections work

### Database Seeding
- [ ] Sample users created (if SEED_DATA=true)
- [ ] Sample arenas created
- [ ] Sample quests created
- [ ] Can query database: `db.users.count()` in mongo shell

---

## 📊 Setup Phase 4: Health Checks

### Backend Health
```bash
# Terminal where backend is running:
# Should see: "Server running on http://localhost:4000"
# Should see: "Connected to MongoDB" or similar
```

- [ ] No errors in backend logs
- [ ] Endpoint `/api/health` returns 200 status
- [ ] Endpoint `/api/jail-status` returns 200 status

### Frontend Health
```bash
# Terminal where frontend is running:
# Should see: "compiled successfully"
# Should see: "Ready in X.XXXs"
```

- [ ] No errors in frontend logs
- [ ] Page loads at http://localhost:3000
- [ ] Can interact with UI (click buttons, fill forms)

### Network Communication
- [ ] Browser console has no CORS errors
- [ ] API calls from frontend succeed (check Network tab in DevTools)
- [ ] Socket.io connects (should see "connected" message if using real-time features)

---

## 🎯 Setup Phase 5: Ready for Development

### Code Quality
- [ ] Run linter: `npm run lint`
- [ ] No high-severity errors
- [ ] Can auto-fix: `npm run lint -- --fix`

### Testing
- [ ] Run tests: `npm test`
- [ ] Tests pass (or you understand why they fail)
- [ ] Coverage is acceptable

### Git Setup
- [ ] Created feature branch (if contributing)
- [ ] `.env` in `.gitignore` (never committed)
- [ ] No sensitive data in staged files

### Documentation
- [ ] Read: DEVELOPMENT_GUIDE.md
- [ ] Read: PIONEER_SETUP_GUIDE.md (this helped, right?)
- [ ] Bookmarked: API_DOCUMENTATION.md
- [ ] Know where to find: TROUBLESHOOTING.md

---

## 🚨 Common Issues & Fixes

Check these if stuck:

### ❌ "MONGO_URI not set"
- [ ] `.env` file exists in project root
- [ ] Contains `MONGO_URI=...`
- [ ] Backend restarted after .env change

### ❌ "Port 4000 already in use"
- [ ] Find process: `lsof -i :4000`
- [ ] Kill it: `kill -9 <PID>`
- [ ] Or use different port: `PORT=5000 npm start`

### ❌ "Cannot find module 'mongoose'"
- [ ] Run: `npm install`
- [ ] Check: `ls node_modules | grep mongoose`

### ❌ "Frontend can't reach API"
- [ ] Backend is running on port 4000
- [ ] `NEXT_PUBLIC_API_URL` points to correct backend
- [ ] No CORS errors (check browser console)

### ❌ "Docker containers won't start"
- [ ] Check logs: `docker compose logs`
- [ ] Rebuild: `docker compose down && docker compose up --build`
- [ ] Free disk space: `docker system df`

---

## 📝 Setup Completion Signature

Once everything is checked, you're ready!

**Setup completed by:** ___________________  
**Date:** ___________________  
**Setup method:** [ ] Wizard [ ] Docker [ ] Manual [ ] Cloud  
**Environment:** [ ] Development [ ] Staging [ ] Production  

---

## 🎓 Next Steps After Setup

- [ ] **Read documentation:** Start with DEVELOPMENT_GUIDE.md
- [ ] **Explore codebase:** Navigate frontend/, backend/, server/
- [ ] **Make a test change:** Edit a React component, verify hot-reload works
- [ ] **Run tests:** `npm test` to ensure development environment works
- [ ] **Set up your IDE:** ESLint extensions, prettier formatting, etc.
- [ ] **Create a branch:** `git checkout -b feature/your-feature`

---

## 📞 Getting Help

If you're stuck on any step:

1. **Check the relevant section in PIONEER_SETUP_GUIDE.md**
2. **Search TROUBLESHOOTING.md** for error message
3. **Check GitHub Issues:** https://github.com/Hodi420/SafeSoundArena/issues
4. **Ask in Discussions:** https://github.com/Hodi420/SafeSoundArena/discussions
5. **Run status check:** `node pioneer-cli.js status`

---

## ✨ Congratulations!

If all checkboxes are checked, you have a working SafeSoundArena development environment! 🎉

**You can now:**
- ✓ Run the application locally
- ✓ Make code changes
- ✓ Test features
- ✓ Contribute to the project
- ✓ Deploy to Docker/Kubernetes

**Happy coding! 🚀**

---

**Last Updated:** 2026-05-15  
**Total Setup Time:** ~30 minutes (depending on path)  
**Questions?** See PIONEER_SETUP_GUIDE.md or GitHub Discussions
