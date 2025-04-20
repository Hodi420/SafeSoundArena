// web/server.js
// Express server entry point for DeciderBot UI API
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const DeciderBot = require('../aiClients/deciderBot');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const bcrypt = require('bcrypt');
const { sql, getPool } = require('./db');

// --- Permissions Matrix ---
const permissionsMatrix = {
  'admin': {
    users: ['create', 'read', 'update', 'delete', 'changePassword'],
    logs: ['read'],
    content: ['read', 'update'],
    stats: ['read'],
    reports: ['read']
  },
  'manager': {
    users: ['read'],
    logs: ['read'],
    content: ['read'],
    stats: ['read'],
    reports: ['read']
  },
  'viewer': {
    users: ['read'],
    logs: [],
    content: ['read'],
    stats: ['read'],
    reports: []
  }
};

function checkPermission(module, action) {
  return function(req, res, next) {
    const perm = req.user && req.user.permission;
    if (!perm || !permissionsMatrix[perm] || !permissionsMatrix[perm][module] || !permissionsMatrix[perm][module].includes(action)) {
      return res.status(403).json({ error: 'Insufficient permission' });
    }
    next();
  };
}

// JWT admin middleware
function adminOnly(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || payload.permission !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT TOP 1 * FROM Users WHERE username=@username');
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ permission: user.permission, sub: user.username, username: user.username, id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin users endpoint
app.get('/api/admin/users', adminOnly, checkPermission('users','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, username, permission, email, createdAt, updatedAt FROM Users');
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin stats endpoint
app.get('/api/admin/stats', adminOnly, checkPermission('stats','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const usersCount = await pool.request().query('SELECT COUNT(*) as cnt FROM Users');
    res.json({
      users: usersCount.recordset[0].cnt,
      serverTime: new Date().toISOString(),
      leaderboardRecords: typeof globalLeaderboard !== 'undefined' ? globalLeaderboard.length : 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Logs (Audit) ---
// GET logs
app.get('/api/admin/logs', adminOnly, checkPermission('logs','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const logs = await pool.request().query('SELECT TOP 50 * FROM AuditLogs ORDER BY [when] DESC');
    res.json(logs.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// POST log
app.post('/api/admin/logs', adminOnly, async (req, res) => {
  try {
    const { action, details } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('user', sql.NVarChar, req.user.username)
      .input('action', sql.NVarChar, action)
      .input('details', sql.NVarChar, details || null)
      .query('INSERT INTO AuditLogs ([user],[action],[details]) VALUES (@user,@action,@details)');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Content Management ---
// GET content
app.get('/api/admin/content', adminOnly, checkPermission('content','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP 1 content FROM Content ORDER BY id DESC');
    res.json({ content: result.recordset[0] ? result.recordset[0].content : '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// POST content
app.post('/api/admin/content', adminOnly, checkPermission('content','update'), async (req, res) => {
  try {
    const { content } = req.body;
    const pool = await getPool();
    await pool.request().input('content', sql.NVarChar, content).query('INSERT INTO Content (content) VALUES (@content)');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create user
app.post('/api/admin/users', adminOnly, checkPermission('users','create'), async (req, res) => {
  const { username, password, permission, email } = req.body;
  if (!username || !password || !permission) return res.status(400).json({ error: 'Missing fields' });
  try {
    const pool = await getPool();
    const hash = await bcrypt.hash(password, 10);
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('passwordHash', sql.NVarChar, hash)
      .input('permission', sql.NVarChar, permission)
      .input('email', sql.NVarChar, email || null)
      .query('INSERT INTO Users (username, passwordHash, permission, email) VALUES (@username, @passwordHash, @permission, @email)');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update user (permission/email)
app.put('/api/admin/users/:id', adminOnly, checkPermission('users','update'), async (req, res) => {
  const { permission, email } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('permission', sql.NVarChar, permission)
      .input('email', sql.NVarChar, email || null)
      .query('UPDATE Users SET permission=@permission, email=@email, updatedAt=GETDATE() WHERE id=@id');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Change password
app.put('/api/admin/users/:id/password', adminOnly, checkPermission('users','changePassword'), async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Missing password' });
  try {
    const pool = await getPool();
    const hash = await bcrypt.hash(password, 10);
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('passwordHash', sql.NVarChar, hash)
      .query('UPDATE Users SET passwordHash=@passwordHash, updatedAt=GETDATE() WHERE id=@id');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete user
app.delete('/api/admin/users/:id', adminOnly, checkPermission('users','delete'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Users WHERE id=@id');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Automatic Logging Middleware ---
async function autoLog(req, res, next) {
  // Only log admin API
  if (!req.path.startsWith('/api/admin/')) return next();
  // Don't log log-fetching itself
  if (req.path.startsWith('/api/admin/logs')) return next();
  // Log after response sent
  const oldSend = res.send;
  res.send = async function (body) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('user', sql.NVarChar, req.user && req.user.username)
        .input('action', sql.NVarChar, req.method + ' ' + req.path)
        .input('details', sql.NVarChar, JSON.stringify({ body: req.body, params: req.params, query: req.query }))
        .query('INSERT INTO AuditLogs ([user],[action],[details]) VALUES (@user,@action,@details)');
    } catch (e) { /* ignore log errors */ }
    oldSend.apply(this, arguments);
  };
  next();
}
app.use(autoLog);

// Example protected route
app.get('/api/admin/test', adminOnly, (req, res) => {
  res.json({ ok: true, admin: req.user });
});

// --- Community Voting API ---
// POST /api/vote
app.post('/api/vote', async (req, res) => {
  const { username, voteOption, voteEvent } = req.body;
  if (!username || !voteOption || !voteEvent) return res.status(400).json({ error: 'Invalid input' });
  try {
    const pool = await getPool();
    // Check if user exists
    let result = await pool.request().input('username', sql.NVarChar, username).query('SELECT TOP 1 id FROM Users WHERE username=@username');
    let userId;
    if (result.recordset.length === 0) {
      // Create user with viewer permission
      let ins = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('passwordHash', sql.NVarChar, '')
        .input('permission', sql.NVarChar, 'viewer')
        .query('INSERT INTO Users (username, passwordHash, permission) OUTPUT INSERTED.id VALUES (@username, @passwordHash, @permission)');
      userId = ins.recordset[0].id;
    } else {
      userId = result.recordset[0].id;
    }
    // Check if already voted for this event
    let voteRes = await pool.request().input('userId', sql.Int, userId).input('voteEvent', sql.NVarChar, voteEvent)
      .query('SELECT TOP 1 id FROM Votes WHERE userId=@userId AND voteEvent=@voteEvent');
    if (voteRes.recordset.length > 0) {
      // Update vote
      await pool.request().input('voteOption', sql.NVarChar, voteOption).input('id', sql.Int, voteRes.recordset[0].id)
        .query('UPDATE Votes SET voteOption=@voteOption WHERE id=@id');
    } else {
      // Insert new vote
      await pool.request().input('userId', sql.Int, userId).input('voteOption', sql.NVarChar, voteOption).input('voteEvent', sql.NVarChar, voteEvent)
        .query('INSERT INTO Votes (userId, voteOption, voteEvent) VALUES (@userId, @voteOption, @voteEvent)');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// GET /api/votes?event=...
app.get('/api/votes', async (req, res) => {
  const voteEvent = req.query.event;
  if (!voteEvent) return res.status(400).json({ error: 'Missing event' });
  try {
    const pool = await getPool();
    const result = await pool.request().input('voteEvent', sql.NVarChar, voteEvent)
      .query('SELECT V.voteOption, U.username FROM Votes V INNER JOIN Users U ON V.userId=U.id WHERE V.voteEvent=@voteEvent');
    // Aggregate results
    const agg = {};
    for (const row of result.recordset) {
      if (!agg[row.voteOption]) agg[row.voteOption] = { option: row.voteOption, count: 0, voters: [] };
      agg[row.voteOption].count++;
      agg[row.voteOption].voters.push(row.username);
    }
    res.json(Object.values(agg));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Public Leaderboard & Score API ---
// POST /api/score
app.post('/api/score', async (req, res) => {
  const { username, score } = req.body;
  if (!username || !score || isNaN(score) || score < 0) return res.status(400).json({ error: 'Invalid input' });
  try {
    const pool = await getPool();
    // Check if user exists
    let result = await pool.request().input('username', sql.NVarChar, username).query('SELECT TOP 1 id FROM Users WHERE username=@username');
    let userId;
    if (result.recordset.length === 0) {
      // Create user with viewer permission
      let ins = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('passwordHash', sql.NVarChar, '')
        .input('permission', sql.NVarChar, 'viewer')
        .query('INSERT INTO Users (username, passwordHash, permission) OUTPUT INSERTED.id VALUES (@username, @passwordHash, @permission)');
      userId = ins.recordset[0].id;
    } else {
      userId = result.recordset[0].id;
    }
    // Insert score
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('score', sql.Int, score)
      .query('INSERT INTO Scores (userId, score) VALUES (@userId, @score)');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// GET /api/leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP 10 S.score, S.createdAt, U.username FROM Scores S INNER JOIN Users U ON S.userId=U.id ORDER BY S.score DESC, S.createdAt ASC');
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Advanced Reports ---
app.get('/api/admin/reports/user-permissions', adminOnly, checkPermission('reports','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT permission, COUNT(*) as count FROM Users GROUP BY permission');
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/admin/reports/activity', adminOnly, checkPermission('reports','read'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT action, COUNT(*) as count FROM AuditLogs GROUP BY action");
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
// Admin dashboard (HTML)
app.get('/admin', adminOnly, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Dashboard</title>
  <style>
    body { background: #232323; color: #ffd700; font-family: Arial,sans-serif; text-align: center; margin: 0; }
    .card { margin: 60px auto; padding: 34px 22px; background: #333; border-radius: 18px; max-width: 420px; box-shadow: 0 4px 24px #0008; }
    h1 { color: #fffbe6; }
    .info { background: #222; border-radius: 10px; color: #fff; padding: 14px; margin: 18px 0; }
    a, button.logout { color: #ffd700; text-decoration: underline; font-size:1.04em; background:none; border:none; cursor:pointer; margin:0 8px; }
    .section { margin: 24px 0; background: #252525; border-radius: 10px; padding: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 0 auto; }
    th, td { padding: 6px 10px; border-bottom: 1px solid #444; text-align: left; }
    th { color: #fffbe6; background: #232323; }
    td { color: #ffd700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Dashboard</h1>
    <button class="logout" onclick="localStorage.removeItem('admin_jwt');location='/admin/login'">Logout</button>
    <div class="info">
      <b>Welcome, ${req.user.sub || 'Admin'}!</b><br>
      <pre style="text-align:left;">${JSON.stringify(req.user, null, 2)}</pre>
    </div>
    <div class="section">
      <h3>Users</h3>
      <table id="users-table"><thead><tr><th>Username</th><th>Permission</th></tr></thead><tbody></tbody></table>
    </div>
    <div class="section">
      <h3>Stats</h3>
      <pre id="stats">Loading...</pre>
    </div>
    <a href="/api/admin/test">Test Admin API</a>
  </div>
  <script>
    const jwt = localStorage.getItem('admin_jwt');
    if (!jwt) location='/admin/login';
    fetch('/api/admin/users', { headers: { Authorization: 'Bearer ' + jwt } })
      .then(r=>r.json()).then(users => {
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
          tbody.innerHTML += `<tr><td>${u.username}</td><td>${u.permission}</td></tr>`;
        });
      });
    fetch('/api/admin/stats', { headers: { Authorization: 'Bearer ' + jwt } })
      .then(r=>r.json()).then(stats => {
        document.getElementById('stats').innerText = JSON.stringify(stats, null, 2);
      });
  </script>
</body>
</html>`);
});

// Admin login page
app.get('/admin/login', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Login</title>
  <style>
    body { background: #232323; color: #ffd700; font-family: Arial,sans-serif; text-align: center; margin: 0; }
    .card { margin: 80px auto; padding: 34px 22px; background: #333; border-radius: 18px; max-width: 340px; box-shadow: 0 4px 24px #0008; }
    h1 { color: #fffbe6; }
    input { background: #181818; color: #ffd700; border: 1px solid #444; border-radius: 8px; padding: 7px 12px; font-size: 1.1em; margin: 7px 0; width: 90%; }
    button { background: #ffd700; color: #232323; border: none; border-radius: 8px; padding: 8px 22px; font-size: 1.1em; font-weight: bold; cursor: pointer; margin-top: 12px; }
    button:hover { background: #fffbe6; }
    .err { color: #ff5252; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Login</h1>
    <form id="login-form">
      <input id="username" placeholder="Username" autocomplete="username" required><br>
      <input id="password" type="password" placeholder="Password" autocomplete="current-password" required><br>
      <button type="submit">Login</button>
    </form>
    <div id="err" class="err"></div>
  </div>
  <script>
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('admin_jwt', data.token);
        window.location = '/admin';
      } else {
        document.getElementById('err').innerText = data.error || 'Login failed';
      }
    };
  </script>
</body>
</html>`);
        const password = document.getElementById('password').value;
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem('admin_jwt', data.token);
          window.location = '/admin';
        } else {
          document.getElementById('err').innerText = data.error || 'Login failed';
        }
      };
    </script>
  </body>
  </html>`);
});

// בוט קובע יחיד (אפשר להרחיב למספר בוטים)
const decider = new DeciderBot();

// משתמשים והרשאות (דמו)
let users = [
  { name: 'admin', permission: 'admin' },
  { name: 'manager', permission: 'manager' },
  { name: 'viewer', permission: 'viewer' }
];

// שליחת פקודה לבוט (כולל בקשת אישור)
app.post('/api/command', async (req, res) => {
  const { prompt, approve } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {
    const result = await decider.operate({ consensusPrompt: prompt, approve });
    console.log('[API] /api/command', prompt, approve, result.status);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// קבלת לוג החלטות
app.get('/api/log', (req, res) => {
  const { type, status } = req.query;
  const log = decider.getDecisionLog({ type, status });
  console.log('[API] /api/log', type, status, log.length);
  res.json(log);
});

// קבלת שאלות אימות לפעולות שממתינות לאישור
app.get('/api/pending', (req, res) => {
  const pending = decider.getDecisionLog({ status: 'pending_approval' });
  console.log('[API] /api/pending', pending.length);
  res.json(pending);
});

// שליחת התראה (דמו בלבד)
app.post('/api/notify', (req, res) => {
  const { type, to } = req.body;
  if (type === 'email') {
    console.log(`[NOTIFY] Email sent to ${to}`);
    return res.json({ ok: true });
  }
  if (type === 'telegram') {
    console.log(`[NOTIFY] Telegram sent to ${to}`);
    return res.json({ ok: true });
  }
  res.json({ ok: false });
});

// ניהול הרשאות משתמשים (דמו)
app.get('/api/users', (req, res) => {
  res.json(users);
});
app.post('/api/users', (req, res) => {
  const { name, permission } = req.body;
  const idx = users.findIndex(u => u.name === name);
  if (idx >= 0) users[idx].permission = permission;
  else users.push({ name, permission });
  console.log('[API] /api/users', name, permission);
  res.json({ ok: true });
});

// --- GLOBAL LEADERBOARD (memory only) ---
let globalLeaderboard = [
  // Example: { name: 'Player1', avatar: '', score: 5, date: '2025-04-21T00:00:00Z' }
];

// Get top 10 scores
app.get('/api/leaderboard', (req, res) => {
  const sorted = [...globalLeaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(sorted);
});

// Submit new score
app.post('/api/leaderboard', (req, res) => {
  const { name, avatar, score } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Missing name or score' });
  }
  const entry = {
    name: String(name).slice(0, 24),
    avatar: avatar || '',
    score,
    date: new Date().toISOString()
  };
  globalLeaderboard.push(entry);
  // Keep only top 10
  globalLeaderboard = [...globalLeaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  res.json({ ok: true, leaderboard: globalLeaderboard });
});

// דיפולט: הגש index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`DeciderBot UI API running on http://localhost:${PORT}`);
});
