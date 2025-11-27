const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Health check endpoint
router.get('/health', (req, res) => {
  logger.info('Health check endpoint called');
  res.status(200).json({ status: 'ok', message: 'Agent service is running' });
});

// Add your agent-related routes here
// Example:
// router.post('/agents', agentController.createAgent);
// router.get('/agents', agentController.getAgents);

module.exports = router;
