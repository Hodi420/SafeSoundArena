const { createAiAdminApp } = require('../../src/server/index.cjs');

const port = Number(process.env.PORT || 4317);
const app = createAiAdminApp({
  basePath: '/api/ai-admin',
});

app.listen(port, () => {
  console.log(`AI Admin Control Room example listening on http://localhost:${port}`);
});
