const express = require('express');
const fetch = require('node-fetch');

const agents = [
  { name: 'Agent1', url: 'http://localhost:3001' },
  { name: 'Agent2', url: 'http://localhost:3002' }
  // ניתן להוסיף עוד agents
];

const app = express();
app.use(express.json());

// קבלת סטטוס מכל ה-Agents
app.get('/api/mcp/agents', async (req, res) => {
  const statuses = await Promise.all(agents.map(async agent => {
    try {
      const r = await fetch(agent.url + '/healthz');
      const status = await r.json();
      return { ...agent, status: status.status, time: status.time };
    } catch {
      return { ...agent, status: 'offline' };
    }
  }));
  res.json(statuses);
});

// שליחת פקודה ל-Agent
app.post('/api/mcp/agents/:name/command', async (req, res) => {
  const agent = agents.find(a => a.name === req.params.name);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    const r = await fetch(agent.url + '/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json({ ok: true, response: data });
  } catch (err) {
    res.status(500).json({ error: 'Agent unreachable' });
  }
});

app.listen(3005, () => console.log('MCP running on port 3005'));
