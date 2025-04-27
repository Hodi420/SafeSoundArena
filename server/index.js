const express = require('express');
const bodyParser = require('body-parser');
const moderationApi = require('./moderation-api');
const agentApp = require('./agent');
const setupSwagger = require('./swagger');
const fs = require('fs');
const path = require('path');
const myQueue = require('./queue');
const selfUpdate = require('./selfupdate');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount moderation API
app.use('/api/moderation', moderationApi);
// Mount agent API
app.use('/api/agent', agentApp);

// Agent log viewing for dashboard
app.get('/api/agent/log', (req, res) => {
  const logPath = path.join(__dirname, 'agent.log');
  if (fs.existsSync(logPath)) {
    res.type('text/plain').send(fs.readFileSync(logPath, 'utf8'));
  } else {
    res.type('text/plain').send('No log found.');
  }
});

// Self-update endpoint (secured in production)
app.post('/api/agent/selfupdate', selfUpdate);

// Example: add heavy job to BullMQ queue
app.post('/api/agent/heavy-task', (req, res) => {
  myQueue.add('heavy-task', req.body).then(job => {
    res.json({ ok: true, jobId: job.id });
  });
});

// Swagger API docs
setupSwagger(app);

// Health check endpoint for DevOps
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('SafeSoundArena API running');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
