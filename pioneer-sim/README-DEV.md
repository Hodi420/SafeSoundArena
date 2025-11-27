Developer notes - running locally

1. Install dependencies:

```powershell
cd pioneer-sim
npm ci
```

2. Start a Hardhat node in a separate terminal:

```powershell
npx hardhat node
```

3. Deploy contract to local node:

```powershell
npm run deploy
```

4. Run aggregator and submit root:

```powershell
npm run submit
```

5. Run tests:

```powershell
npm test
```

Notes:

- `scripts/submitRoot.js` reads `aggregator/out/root.txt` and submits it. Set `POH_ADDR` env var to override contract address if needed.
- This is a prototype; in production use a relayer key stored in KMS/HSM and secure RPC endpoints.

IPFS:

- The aggregator can upload epoch events to IPFS. Start a local IPFS daemon (`ipfs daemon`) or set `IPFS_API` env to an HTTP API endpoint.
- The aggregator writes `aggregator/out/root-cid.txt` when upload succeeds.
- For large logs the aggregator will split events into chunks (controlled by `EVENTS_PER_CHUNK`) and upload each chunk to IPFS.
- The aggregator writes `aggregator/out/manifest.json` and `aggregator/out/manifest-cid.txt` containing the list of chunk CIDs and metadata.

Local diagnostics agent:

- `diagnostics-agent.js` collects OS-level metrics (totalmem, freemem, cpus, uptime) and POSTs a signed snapshot to the diagnostics server.
- Usage example:

```
export DIAG_AGENT_SECRET=your-secret
node diagnostics-agent.js
```

On Windows (PowerShell):

```
$env:DIAG_AGENT_SECRET='your-secret'
node diagnostics-agent.js
```

Agent key registration and signing:

- The agent now generates an ed25519 keypair on first run and attempts to register the public key with the diagnostics server (`/api/register-agent`).
- Snapshots are signed with the agent's private key and the server verifies the signature using the registered public key.
