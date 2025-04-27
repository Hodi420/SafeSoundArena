const mongoose = require('mongoose');

const HierarchySchema = new mongoose.Schema({
  rootMcpId: { type: String, required: true },
  miniMcps: [
    {
      miniMcpId: { type: String, required: true },
      name: { type: String },
      weight: { type: Number, default: 1 },
      agents: [{ agentId: String, name: String, type: String, weight: Number }]
    }
  ],
  standaloneAgents: [{ agentId: String, name: String, type: String, weight: Number }]
});

module.exports = mongoose.model('Hierarchy', HierarchySchema);
