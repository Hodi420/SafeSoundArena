const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const { URL } = require('url');
const http = require('http');
const https = require('https');

function gb(x) {
  return Math.round((x / 1024 / 1024 / 1024) * 100) / 100;
}

function collectSnapshot() {
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0] ? cpus[0].model : null;
  const snapshot = {
    source: 'local-agent',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    osRelease: os.release(),
    totalMemoryGB: gb(os.totalmem()),
    freeMemoryGB: gb(os.freemem()),
    cpuCores: cpus.length,
    cpuModel,
    loadavg: os.loadavg ? os.loadavg() : null,
    uptimeSeconds: Math.round(os.uptime()),
    networkInterfaces: os.networkInterfaces ? Object.keys(os.networkInterfaces()) : null,
  };
  return snapshot;
}

function ensureKeypair(keyPath) {
  if (fs.existsSync(keyPath)) {
    const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    return {
      publicKey: Buffer.from(data.publicKey, 'base64'),
      privateKey: Buffer.from(data.privateKey, 'base64'),
      keyId: data.keyId,
    };
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const keyId = `agent-${Date.now()}`;
  fs.writeFileSync(
    keyPath,
    JSON.stringify({
      keyId,
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    })
  );
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    keyId,
  };
}

function signSnapshotEd25519(snapshot, privateKeyPem) {
  const payload = JSON.stringify(snapshot);
  const sign = crypto.createSign(null);
  sign.update(payload);
  sign.end();
  const sig = sign.sign(privateKeyPem);
  return sig.toString('base64');
}

function postJSON(urlStr, obj) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const data = Buffer.from(JSON.stringify(obj));
      const opts = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(body || '{}');
            resolve({ status: res.statusCode, body: j });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const server = process.env.DIAG_SERVER_URL || 'http://localhost:3001/api/diagnostics';

  const serverUrl = process.env.DIAG_SERVER_URL || 'http://localhost:3001';
  const keyPath = path.join(__dirname, 'data', 'agent-key.json');
  if (!fs.existsSync(path.dirname(keyPath)))
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  const kp = ensureKeypair(keyPath);

  const snapshot = collectSnapshot();
  snapshot.agentKeyId = kp.keyId;

  // register public key with server
  try {
    await postJSON(`${serverUrl}/api/register-agent`, {
      agentKeyId: kp.keyId,
      publicKeyPem: kp.publicKey,
    });
    console.log('Registered public key with server as', kp.keyId);
  } catch (e) {
    console.warn('Failed to register key (continuing):', e.message);
  }

  const signature = signSnapshotEd25519(snapshot, kp.privateKey);
  snapshot.signature = signature;

  console.log('Collected snapshot:', JSON.stringify(snapshot, null, 2));

  try {
    const res = await postJSON(server, snapshot);
    console.log('Server response:', res.status, res.body);
    process.exit(0);
  } catch (e) {
    console.error('Failed to post snapshot:', e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
