const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const outDir = path.join(__dirname, 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'diagnostics.jsonl');
const agentsFile = path.join(outDir, 'agents.json');

// load or init agents registry
let agents = {};
if (fs.existsSync(agentsFile)) {
  try {
    agents = JSON.parse(fs.readFileSync(agentsFile, 'utf8') || '{}');
  } catch (e) {
    agents = {};
  }
}

function saveAgents() {
  fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2));
}

app.get('/health', (req, res) => res.json({ ok: true }));

// register agent public key
app.post('/api/register-agent', (req, res) => {
  const { agentKeyId, publicKeyPem } = req.body || {};
  if (!agentKeyId || !publicKeyPem)
    return res.status(400).json({ error: 'agentKeyId and publicKeyPem required' });
  agents[agentKeyId] = { publicKeyPem, registeredAt: new Date().toISOString() };
  saveAgents();
  res.json({ registered: true, agentKeyId });
});

// accept diagnostics snapshots and verify signatures when provided
app.post('/api/diagnostics', (req, res) => {
  const snapshot = req.body || {};
  snapshot.receivedAt = new Date().toISOString();
  if (!snapshot.userAgent) snapshot.userAgent = req.get('User-Agent') || '';

  // verify signature if present
  let verified = false;
  try {
    if (snapshot.signature && snapshot.agentKeyId) {
      const pub = agents[snapshot.agentKeyId] && agents[snapshot.agentKeyId].publicKeyPem;
      if (pub) {
        // verify ed25519 signature over canonical payload (exclude signature)
        const sig = Buffer.from(snapshot.signature, 'base64');
        const payloadObj = Object.assign({}, snapshot);
        delete payloadObj.signature;
        const payload = Buffer.from(JSON.stringify(payloadObj));
        const crypto = require('crypto');
        verified = crypto.verify(null, payload, pub, sig);
      }
    }
  } catch (e) {
    console.warn('verification error', e.message);
    verified = false;
  }
  snapshot.verified = !!verified;

  const line = JSON.stringify(snapshot) + '\n';
  fs.appendFileSync(outFile, line);
  res.json({ saved: true, verified: snapshot.verified });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Diagnostics server listening on http://localhost:${port}`));
