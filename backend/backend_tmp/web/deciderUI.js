// web/deciderUI.js
// Express.js REST API for communicating with DeciderBot
const express = require('express');
const bodyParser = require('body-parser');
const DeciderBot = require('../aiClients/deciderBot');

const app = express();
app.use(bodyParser.json());

// בוט קובע יחיד (אפשר להרחיב למספר בוטים)
const decider = new DeciderBot();

// שליחת פקודה לבוט (כולל בקשת אישור)
app.post('/api/command', async (req, res) => {
  const { prompt, approve } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {
    const result = await decider.operate({ consensusPrompt: prompt, approve });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// קבלת לוג החלטות
app.get('/api/log', (req, res) => {
  const { type, status } = req.query;
  const log = decider.getDecisionLog({ type, status });
  res.json(log);
});

// קבלת שאלות אימות לפעולות שממתינות לאישור
app.get('/api/pending', (req, res) => {
  const pending = decider.getDecisionLog({ status: 'pending_approval' });
  res.json(pending);
});

module.exports = app;
