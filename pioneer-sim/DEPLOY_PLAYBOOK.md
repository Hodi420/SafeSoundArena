Pioneer Pathways - Self‑hosted Deployment Playbook

Goals: run aggregator + relayer + smart contract infrastructure with secure defaults.

Prereqs:

- Node.js 18+ and npm
- Docker + Docker Compose
- Ethereum node or RPC provider (geth, Erigon or Alchemy/Infura)
- Hardhat for local testing

Components to deploy:

- Aggregator service (Node.js) - runs periodic epochs, builds Merkle roots, uploads event logs to IPFS/S3, and calls smart contract.
- Relayer service (Node.js) - signs and submits roots to the blockchain (can be same as aggregator or separate).
- Smart contract deployed to target network (L1 or L2). Use Hardhat scripts to deploy.
- Storage backend (IPFS cluster or object storage) for event logs.

Security & Ops:

- Run relayer behind an HSM or KMS; keep relayer key offline and use signed transactions from secure environment.
- Use rate limiting and request authentication on aggregation endpoints.
- Run health checks and monitor epoch submission success/failures.
- Use role-based access for contracts: owner, relayer, governance multisig.

CI/CD:

- Build and test smart contracts with GitHub Actions on PRs.
- Deploy contract to testnets on push to `develop`, to mainnet after multi-sig approval.
- Containerize aggregator and relayer; use Docker Compose or Kubernetes for orchestration.

Operational runbook (simple):

1. Start IPFS or S3 storage
2. Start aggregator (`npm run agg`)
3. Start relayer with env vars for RPC and relayer key
4. Monitor logs, verify roots appear on-chain

Backup: keep snapshots of event-log storage, and automatic export of merkle roots for audits.
