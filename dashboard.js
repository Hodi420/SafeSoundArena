// dashboard.js
// Simple Express web dashboard for analytics visualization
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { getStats, loadAnalytics, saveAnalytics } = require('./analytics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'] } });
global.io = io;

const PORT = process.env.PORT || 3000;
const PI_JWT_SECRET = process.env.PI_JWT_SECRET;
const ADMIN_LEVELS_FILE = path.join(__dirname, 'admin_levels.json');

// ─── Admin levels ────────────────────────────────────────────────────────────
function loadAdminLevels() {
  try {
    return JSON.parse(fs.readFileSync(ADMIN_LEVELS_FILE, 'utf8'));
  } catch {
    return { superadmin: [], the70: [], the300: [] };
  }
}

/**
 * Returns the highest role for a given Pi username.
 * Checks admin_levels.json: superadmin > the70 > the300 > user
 */
function getUserRole(piUsername) {
  if (!piUsername) return null;
  const levels = loadAdminLevels();
  if (Array.isArray(levels.superadmin) && levels.superadmin.includes(piUsername)) return 'superadmin';
  if (Array.isArray(levels.the70) && levels.the70.includes(piUsername)) return 'the70';
  if (Array.isArray(levels.the300) && levels.the300.includes(piUsername)) return 'the300';
  return 'user';
}

// ─── Pi identity resolution ───────────────────────────────────────────────────
/**
 * Resolves the authenticated Pi username from the request.
 *
 * Priority:
 *  1. JWT in Authorization: Bearer <token>  — verified with PI_JWT_SECRET (production)
 *  2. x-pi-username header                  — only trusted in dev (PI_JWT_SECRET not set)
 *
 * Returns null if unauthenticated.
 */
function getPiUsername(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (PI_JWT_SECRET) {
      try {
        const payload = jwt.verify(token, PI_JWT_SECRET);
        if (payload && payload.username) return String(payload.username);
      } catch (err) {
        // Invalid / expired token — treat as unauthenticated
        return null;
      }
    }
  }

  // Fallback: raw header — only trusted when PI_JWT_SECRET is not configured (dev)
  if (!PI_JWT_SECRET && req.headers['x-pi-username']) {
    console.warn('[dashboard] WARNING: trusting x-pi-username header without JWT verification (dev mode). Set PI_JWT_SECRET in production.');
    return String(req.headers['x-pi-username']);
  }

  return null;
}

/**
 * Returns a stable key for file-keyed data (profiles, analytics, votes).
 * Falls back to User-Agent for Pi Browser sessions without a username.
 */
function getPiUserKey(req) {
  const username = getPiUsername(req);
  if (username) return username;
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('PiBrowser')) return ua;
  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production');
    }
    console.warn('[dashboard] WARNING: SESSION_SECRET not set — using insecure default (dev only)');
    return 'dev-only-insecure-secret';
  })(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { userId } = req.body;
  if (userId) req.session.userId = userId;
  res.json({ userId: req.session.userId });
});
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ─── Identity endpoint ────────────────────────────────────────────────────────
app.get('/api/me', (req, res) => {
  const piUsername = getPiUsername(req);
  const role = getUserRole(piUsername);
  res.json({
    pioneer: !!piUsername,
    piUsername,
    role,
  });
});

// ─── Voting Storage ───────────────────────────────────────────────────────────
function loadVotes() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'votes.json'), 'utf8'));
  } catch (e) {
    return { votes: [] };
  }
}

function saveVotes(data) {
  fs.writeFileSync(path.join(__dirname, 'votes.json'), JSON.stringify(data, null, 2), 'utf8');
}

// ─── Profile management ───────────────────────────────────────────────────────
const PROFILES_FILE = path.join(__dirname, 'profiles.json');
function loadProfiles() {
  if (!fs.existsSync(PROFILES_FILE)) return {};
  return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
}
function saveProfiles(profiles) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
}

const THEMES_FILE = path.join(__dirname, 'themes.json');
function loadThemes() {
  if (!fs.existsSync(THEMES_FILE)) return { themes: [] };
  return JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'));
}
function saveThemes(themes) {
  fs.writeFileSync(THEMES_FILE, JSON.stringify(themes, null, 2), 'utf8');
}

const upload = multer({ dest: path.join(__dirname, 'public/themes') });

app.get('/api/my-profile', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not authenticated' });
  const profiles = loadProfiles();
  res.json(profiles[userKey] || { displayName: '', email: '' });
});
app.post('/api/my-profile', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not authenticated' });
  const { displayName, email } = req.body;
  const profiles = loadProfiles();
  profiles[userKey] = { displayName, email };
  saveProfiles(profiles);
  res.json({ ok: true });
});

// ─── Voting endpoints ─────────────────────────────────────────────────────────
function recalculateConsensus(timestamp) {
  const votes = loadVotes().votes.filter(v => v.timestamp === timestamp);
  if (!votes.length) return;
  const agree = votes.filter(v => v.vote === 'agree').length;
  const disagree = votes.filter(v => v.vote === 'disagree').length;
  let newConsensus = null;
  if (agree > disagree) newConsensus = 'agree';
  else if (disagree > agree) newConsensus = 'disagree';
  if (newConsensus) {
    const analytics = loadAnalytics();
    const q = analytics.queries.find(q => String(q.timestamp) === String(timestamp));
    if (q && q.consensus !== newConsensus) {
      q.consensus = newConsensus;
      saveAnalytics(analytics);
      if (global.io) global.io.emit('consensusUpdate', { timestamp, consensus: newConsensus });
    }
  }
}

app.post('/api/vote', (req, res) => {
  const piUsername = getPiUsername(req);
  if (!piUsername) return res.status(403).json({ error: 'Not authenticated' });
  const { timestamp, vote } = req.body;
  if (!timestamp || !['agree', 'disagree'].includes(vote)) return res.status(400).json({ error: 'Invalid vote' });
  const votes = loadVotes();
  votes.votes = votes.votes.filter(v => !(v.timestamp === timestamp && v.piUsername === piUsername));
  votes.votes.push({ timestamp, piUsername, vote });
  saveVotes(votes);
  recalculateConsensus(timestamp);
  if (global.io) global.io.emit('voteUpdate', { timestamp });
  res.json({ ok: true });
});

app.get('/api/votes/:timestamp', (req, res) => {
  const timestamp = req.params.timestamp;
  const votes = loadVotes().votes.filter(v => v.timestamp === timestamp);
  const agree = votes.filter(v => v.vote === 'agree').length;
  const disagree = votes.filter(v => v.vote === 'disagree').length;
  res.json({ agree, disagree });
});

// ─── Per-user analytics ───────────────────────────────────────────────────────
app.get('/api/my-analytics', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not authenticated' });
  const data = loadAnalytics();
  const userQueries = data.queries.filter(q => q.pioneerKey === userKey || q.piUsername === userKey);
  res.json({ queries: userQueries });
});

// ─── GDPR: export / delete ────────────────────────────────────────────────────
app.get('/api/export-my-data', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not authenticated' });
  const data = loadAnalytics();
  const userQueries = data.queries.filter(q => q.pioneerKey === userKey || q.piUsername === userKey);
  const profiles = loadProfiles();
  res.json({ profile: profiles[userKey] || null, queries: userQueries });
});

app.post('/api/delete-my-data', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not authenticated' });
  const data = loadAnalytics();
  data.queries = data.queries.filter(q => q.pioneerKey !== userKey && q.piUsername !== userKey);
  saveAnalytics(data);
  const profiles = loadProfiles();
  delete profiles[userKey];
  saveProfiles(profiles);
  res.json({ ok: true });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
app.get('/api/analytics', (req, res) => {
  res.json(getStats());
});

app.get('/api/analytics/raw', (req, res) => {
  const file = path.join(__dirname, 'analytics_data.json');
  if (fs.existsSync(file)) {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } else {
    res.json({ queries: [] });
  }
});

// ─── Frontend ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Analytics dashboard running on http://localhost:${PORT}`);
});
