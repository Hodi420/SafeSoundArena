const express = require('express');
const createAiAdminGovernanceRouter = require('./aiAdminGovernance');

function createAiAdminApp(options) {
  const config = options || {};
  const app = express();
  const basePath = config.basePath || process.env.AI_ADMIN_BASE_PATH || '/api/ai-admin';

  app.use(basePath, createAiAdminGovernanceRouter(config));

  app.get('/healthz', (req, res) => {
    res.json({
      requestId: req.get('x-request-id') || null,
      error: null,
      data: {
        status: 'ok',
        service: 'ai-admin-control-room',
      },
    });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4317);
  createAiAdminApp().listen(port, () => {
    console.log(`AI Admin Control Room listening on http://localhost:${port}`);
  });
}

module.exports = {
  createAiAdminApp,
};
