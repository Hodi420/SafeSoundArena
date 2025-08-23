const fs = require('fs');
const crypto = require('crypto');
const { create } = require('ipfs-http-client');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest();
}

function toHex(buf) { return '0x' + Buffer.from(buf).toString('hex'); }

function hashLeaf(data) {
  // data is Buffer or string
  const d = (typeof data === 'string') ? Buffer.from(data) : data;
  return sha256(Buffer.concat([Buffer.from([0x00]), d]));
}

function hashNode(a, b) {
  // sort to make tree order-independent
  const aBuf = Buffer.isBuffer(a) ? a : Buffer.from(a);
  const bBuf = Buffer.isBuffer(b) ? b : Buffer.from(b);
  if (Buffer.compare(aBuf, bBuf) === 1) [aBuf, bBuf] = [bBuf, aBuf];
  return sha256(Buffer.concat([Buffer.from([0x01]), aBuf, bBuf]));
}

function buildMerkleTree(leaves) {
  if (!leaves || leaves.length === 0) return {layers: [], root: null};
  let layer = leaves.map(l => hashLeaf(l));
  const layers = [layer];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) {
        // duplicate last
        next.push(hashNode(layer[i], layer[i]));
      } else {
        next.push(hashNode(layer[i], layer[i+1]));
      }
    }
    layer = next;
    layers.push(layer);
  }
  const root = layers[layers.length - 1][0];
  return {layers, root};
}

function merkleProofForIndex(layers, index) {
  const proof = [];
  let idx = index;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const pairIndex = (idx % 2 === 0) ? idx + 1 : idx - 1;
    if (pairIndex < layer.length) proof.push(layer[pairIndex]);
    else proof.push(layer[idx]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function generateSampleEvents(usersCount) {
  const events = [];
  for (let i = 0; i < usersCount; i++) {
    const userId = `user-${i}`;
    // event: timestamp | userId | score | nonce
    const ev = `${Date.now()}|${userId}|${Math.floor(Math.random()*100)}|${crypto.randomBytes(8).toString('hex')}`;
    events.push(ev);
  }
  return events;
}

async function runExample() {
  const users = parseInt(process.env.SAMPLE_USERS || '32', 10); // small tree by default
  const events = generateSampleEvents(users);
  const {layers, root} = buildMerkleTree(events);
  console.log('Merkle root:', toHex(root));

  // create proofs for first 3 users
  const proofs = {};
  for (let i = 0; i < 3; i++) {
    const proof = merkleProofForIndex(layers, i).map(toHex);
    proofs[`user-${i}`] = {leaf: toHex(hashLeaf(events[i])), proof};
  }

  // write files
  const outDir = __dirname + '/out';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(outDir + '/root.txt', toHex(root));
  fs.writeFileSync(outDir + '/proofs.json', JSON.stringify(proofs, null, 2));
  console.log('Wrote out/root.txt and out/proofs.json');

  // upload event logs to IPFS in chunks (optional)
  const ipfsApi = process.env.IPFS_API || 'http://127.0.0.1:5001';
  const eventsPerChunk = parseInt(process.env.EVENTS_PER_CHUNK || '1000', 10);
  try {
    const client = create({ url: ipfsApi });
    const chunks = [];
    for (let i = 0; i < events.length; i += eventsPerChunk) {
      const slice = events.slice(i, i + eventsPerChunk);
      const payload = JSON.stringify({ root: toHex(root), index: Math.floor(i / eventsPerChunk), events: slice });
      const result = await client.add(payload);
      const cid = result.cid.toString();
      chunks.push({ index: Math.floor(i / eventsPerChunk), cid, count: slice.length });
      console.log(`Uploaded chunk ${chunks.length} -> ${cid} (${slice.length} events)`);
    }

    // publish manifest
    const manifest = {
      root: toHex(root),
      epoch: Math.floor(Date.now() / 1000),
      totalEvents: events.length,
      eventsPerChunk,
      chunks,
      createdAt: new Date().toISOString()
    };
    const manifestRes = await client.add(JSON.stringify(manifest));
    const manifestCid = manifestRes.cid.toString();
    fs.writeFileSync(outDir + '/manifest.json', JSON.stringify(manifest, null, 2));
    fs.writeFileSync(outDir + '/manifest-cid.txt', manifestCid);
    console.log('Published manifest to IPFS. CID:', manifestCid);
  } catch (e) {
    console.warn('IPFS chunk upload skipped (client error):', e.message);
  }
}

if (require.main === module) runExample().catch(e => { console.error('aggregator run error', e); process.exit(1); });

function bufferEqHex(buf, hexStr) {
  return toHex(buf).toLowerCase() === hexStr.toLowerCase();
}

function verifyProof(leafData, proofHexArray, rootHex) {
  // leafData: original event string
  // proofHexArray: array of hex strings (0x...)
  // rootHex: 0x...
  let current = hashLeaf(leafData);
  for (const pHex of proofHexArray) {
    const p = Buffer.from(pHex.replace(/^0x/, ''), 'hex');
    current = hashNode(current, p);
  }
  return bufferEqHex(current, rootHex);
}

module.exports = { buildMerkleTree, hashLeaf, hashNode, merkleProofForIndex, verifyProof };
