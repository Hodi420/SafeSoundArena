const express = require('express');
const fetch = require('node-fetch');
const connectDB = require('./db');
const User = require('./models/user');
const Agent = require('./models/agent');
const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();
// סטטוס כל ה-Agents
app.get('/api/mcp/overview', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(403).json({ error: 'User not found' });
    if (!user.onboardingComplete) return res.status(403).json({ error: 'User must complete onboarding' });
    // מצא את כל ה-Agents של המיני-MCP הזה
    const agents = await Agent.find({ miniMcpId: process.env.MINI_MCP_ID });
    const agentStatuses = await Promise.all(agents.map(async agent => {
      try {
        const r = await fetch(agent.url + '/healthz');
        const status = await r.json();
        return { ...agent.toObject(), status: status.status };
      } catch {
        return { ...agent.toObject(), status: 'offline' };
      }
    }));
    res.json(agentStatuses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents', details: err.message });
  }
});

// הקצאת משימה ל-Agent
app.post('/api/mcp/assign', async (req, res) => {
  const { userId, command, agentId } = req.body;
  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(403).json({ error: 'User not found' });
    if (!user.onboardingComplete) return res.status(403).json({ error: 'User must complete onboarding' });

    let agent;
    if (agentId) {
      agent = await Agent.findOne({ agentId, miniMcpId: process.env.MINI_MCP_ID });
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
    } else {
      // בחירה לפי משקל
      const agents = await Agent.find({ miniMcpId: process.env.MINI_MCP_ID });
      const total = agents.reduce((sum, a) => sum + (a.weight || 1), 0);
      let r = Math.random() * total;
      for (const a of agents) {
        r -= a.weight || 1;
        if (r <= 0) { agent = a; break; }
      }
      if (!agent && agents.length > 0) agent = agents[0];
    }
    if (!agent) return res.status(404).json({ error: 'No agents available' });
    try {
      const r = await fetch(agent.url + '/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, userId })
      });
      const data = await r.json();
      res.json({ ok: true, agent: agent.agentId, response: data });
    } catch {
      res.status(500).json({ error: 'Agent unreachable' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign agent', details: err.message });
  }
});

app.listen(4001, () => console.log('Mini-MCP running on port 4001'));
