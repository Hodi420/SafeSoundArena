const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  agentId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  type: { type: String },
  url: { type: String },
  ownerUserId: { type: String }, // For personal agents
  miniMcpId: { type: String },
  rootMcpId: { type: String },
  weight: { type: Number, default: 1 },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', AgentSchema);
