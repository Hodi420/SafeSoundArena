const express = require('express');
const fs = require('fs');
const router = express.Router();

// Example: GitHub webhook for repo updatesouter.post('/github', (req, res) => {
  fs.appendFileSync('agent.log', `${new Date().toISOString()} WEBHOOK: github ${JSON.stringify(req.body)}\n`);
  // You can trigger agent actions here, e.g. auto-pull or notify
  res.json({ ok: true });
});

// Add more webhook endpoints as needed

module.exports = router;
