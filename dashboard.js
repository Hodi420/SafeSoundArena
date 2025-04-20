// dashboard.js
// Simple Express web dashboard for analytics visualization
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const { getStats } = require('./analytics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
global.io = io;

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// Simple login/logout for demo
app.post('/api/login', (req, res) => {
  const { userId } = req.body;
  if (userId) req.session.userId = userId;
  res.json({ userId: req.session.userId });
});
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
// Helper: get unique pioneer key (from Pi Browser UA + session)
function getPiUserKey(req) {
  // Use Pi username if present (from Pi SDK)
  if (req.headers['x-pi-username']) return String(req.headers['x-pi-username']);
  const ua = req.headers['user-agent'] || '';
  if (!ua.includes('PiBrowser')) return null;
  return ua;
}

app.get('/api/me', (req, res) => {
  const pioneerKey = getPioneerKey(req);
  res.json({ pioneer: !!pioneerKey, pioneerKey });
});

// Per-user analytics
// Expose user role
app.get('/api/me', (req, res) => {
  const piUsername = req.headers['x-pi-username'];
  const adminLevels = loadAdminLevels();
  function getUserRole(piUsername) {
    // TO DO: implement actual role logic
    return 'admin';
  }
  res.json({ piUsername, role: getUserRole(piUsername) });
});

// --- Voting Storage ---
function loadVotes() {
  try {
    return JSON.parse(fs.readFileSync(__dirname + '/votes.json', 'utf8'));
  } catch (e) {
    return { votes: [] };
  }
  const userQueries = data.queries.filter(q => q.pioneerKey === userKey || q.piUsername === userKey);
  res.json({ queries: userQueries });
});

// Profile management
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
  if (!userKey) return res.status(403).json({ error: 'Not a Pi Browser pioneer' });
  const profiles = loadProfiles();
  res.json(profiles[userKey] || { displayName: '', email: '' });
});
app.post('/api/my-profile', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not a Pi Browser pioneer' });
  const { displayName, email } = req.body;
  const profiles = loadProfiles();
  profiles[userKey] = { displayName, email };
  saveProfiles(profiles);
  res.json({ ok: true });
});

// Voting endpoints
function recalculateConsensus(timestamp) {
  // Get votes
  const votes = loadVotes().votes.filter(v => v.timestamp === timestamp);
  if (!votes.length) return;
  const agree = votes.filter(v => v.vote === 'agree').length;
  const disagree = votes.filter(v => v.vote === 'disagree').length;
  // Only update if there is a clear majority
  let newConsensus = null;
  if (agree > disagree) newConsensus = 'agree';
  else if (disagree > agree) newConsensus = 'disagree';
  // Update analytics.json
  if (newConsensus) {
    const analytics = loadAnalytics();
    const q = analytics.queries.find(q => String(q.timestamp) === String(timestamp));
    if (q && q.consensus !== newConsensus) {
      q.consensus = newConsensus;
      saveAnalytics(analytics);
      if (global.io) {
        global.io.emit('consensusUpdate', { timestamp, consensus: newConsensus });
      }
    }
  }
}

app.post('/api/vote', (req, res) => {
  const piUsername = req.headers['x-pi-username'];
  if (!piUsername) return res.status(403).json({ error: 'Not authenticated' });
  const { timestamp, vote } = req.body;
  if (!timestamp || !['agree','disagree'].includes(vote)) return res.status(400).json({ error: 'Invalid vote' });
  const votes = loadVotes();
  // Remove any previous vote by this user for this query
  votes.votes = votes.votes.filter(v => !(v.timestamp === timestamp && v.piUsername === piUsername));
  votes.votes.push({ timestamp, piUsername, vote });
  saveVotes(votes);
  recalculateConsensus(timestamp);
  // Emit vote update to all clients
  if (global.io) {
    global.io.emit('voteUpdate', { timestamp });
  }
  res.json({ ok: true });
});
app.get('/api/votes/:timestamp', (req, res) => {
  const timestamp = req.params.timestamp;
  const votes = loadVotes().votes.filter(v => v.timestamp === timestamp);
  const agree = votes.filter(v => v.vote === 'agree').length;
  const disagree = votes.filter(v => v.vote === 'disagree').length;
  res.json({ agree, disagree });
});

// GDPR: export/delete
app.get('/api/export-my-data', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not a Pi Browser pioneer' });
  const data = loadAnalytics();
  const userQueries = data.queries.filter(q => q.pioneerKey === userKey || q.piUsername === userKey);
  const profiles = loadProfiles();
  res.json({ profile: profiles[userKey] || null, queries: userQueries });
});
app.post('/api/delete-my-data', (req, res) => {
  const userKey = getPiUserKey(req);
  if (!userKey) return res.status(403).json({ error: 'Not a Pi Browser pioneer' });
  // Delete analytics
  const data = loadAnalytics();
  data.queries = data.queries.filter(q => q.pioneerKey !== userKey && q.piUsername !== userKey);
  saveAnalytics(data);
  // Delete profile
  const profiles = loadProfiles();
  delete profiles[userKey];
  saveProfiles(profiles);
  res.json({ ok: true });
});

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Analytics dashboard running on http://localhost:${PORT}`);
});
