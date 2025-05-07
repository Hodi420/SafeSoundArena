const config = require('./mini-mcp-config.json');
const connectDB = require('../server/db');
const User = require('../server/models/user');
const Agent = require('../server/models/agent');
const express = require('express');
const app = express();

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    endpoints: [
      {
        path: '/api/mcp/overview', method: 'GET',
        description: 'Get status of all agents for this Mini-MCP (requires userId)',
        example_request: '/api/mcp/overview?userId=USER123',
        example_response: [{ agentId: '...', status: 'online', ... }]
      },
      {
        path: '/api/mcp/assign', method: 'POST',
        description: 'Assign a task to an agent (requires userId, command, agentId optional)',
        example_request: { userId: 'USER123', command: 'open_game', agentId: 'AGENT1' },
        example_response: { ok: true, agent: 'AGENT1', response: { ... } }
      }
    ]
  });
}); 