const config = require('./mcp-config.json');
const connectDB = require('../server/db');
const User = require('../server/models/user');
const Task = require('../server/models/task');
const Notification = require('../server/models/notification');
const Agent = require('../server/models/agent');
const Hierarchy = require('../server/models/hierarchy');
const { sendMail } = require('../server/mailer');

const express = require('express');
const app = express();

app.get('/docs', (req, res) => {
  res.json({
    endpoints: [
      {
        path: '/api/root/overview', method: 'GET',
        description: 'Get status of all Mini-MCPs and standalone agents',
        example_request: '/api/root/overview',
        example_response: {
          miniMcpStatuses: [
            { name: 'MiniMCP-A', status: 'online', agents: [{ agentId: 'AGENT1', status: 'online' }] }
          ],
          standaloneStatuses: [
            { name: 'Agent-NLP', status: 'online' }
          ]
        }
      },
      {
        path: '/api/root/assign', method: 'POST',
        description: 'Assign a command to a Mini-MCP or standalone agent',
        example_request: { targetType: 'miniMCP', targetName: 'MiniMCP-A', command: 'open_game' },
        example_response: { ok: true, response: { result: 'Game launched' } }
      },
      {
        path: '/api/root/hierarchy', method: 'GET',
        description: 'Get the full MCP > Mini-MCP > Agents hierarchy',
        example_request: '/api/root/hierarchy',
        example_response: {
          rootMcpId: 'ROOT1',
          miniMcps: [
            { miniMcpId: 'MiniMCP-A', agents: [{ agentId: 'AGENT1', name: 'Agent-Image' }] }
          ],
          standaloneAgents: [{ agentId: 'Agent-NLP', name: 'NLP Agent' }]
        }
      }
    ]
  });
}); 