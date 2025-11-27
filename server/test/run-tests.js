const { app } = require('../mcp');
const request = require('supertest');

(async () => {
  try {
    // healthz
    const h = await request(app).get('/healthz');
    if (h.status !== 200 || h.body.status !== 'ok') {
      console.error('healthz failed', h.status, h.text);
      process.exit(1);
    }
    // docs
    const d = await request(app).get('/docs/');
    if (d.status !== 200) {
      console.error('docs failed', d.status);
      process.exit(1);
    }
    // fs/read
    const fr = await request(app)
      .post('/api/mcp/fs/read')
      .send({ relPath: 'mcp.js', maxBytes: 1024 })
      .set('Content-Type', 'application/json');
    if (fr.status !== 200 || !fr.body || !fr.body.ok) {
      console.error('fs/read failed', fr.status, fr.text);
      process.exit(1);
    }
    console.log('OK');
    process.exit(0);
  } catch (e) {
    console.error('test_error', e.message);
    process.exit(1);
  }
})();
