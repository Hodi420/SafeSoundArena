// web/server.js
// Express server entry point for DeciderBot UI API
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const DeciderBot = require('../aiClients/deciderBot');

const app = express();
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

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

// דיפולט: הגש index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`DeciderBot UI API running on http://localhost:${PORT}`);
});
