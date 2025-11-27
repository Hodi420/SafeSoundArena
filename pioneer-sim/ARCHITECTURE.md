Pioneer Pathways - Architecture (concise)

Components:

- Agent (off-chain): personal bot that collects behavioral events, signs them with user's identity key, stores local log.
- Aggregator / Relayer: collects signed events from agents, builds Merkle trees per epoch, publishes Merkle root on-chain.
- On-chain contract (PioneerPoH): stores epoch roots, allows relayers (with multisig/threshold options) to submit roots, exposes roots for verification and disputes.
- Storage: event logs stored off-chain (IPFS or S3), only content-addressed links or commitments stored on-chain.
- Dispute & Governance: dispute contract or DAO to resolve contested proofs, slashing, and appeals.

Data flow:

1. Agent -> signs events -> pushes to aggregator
2. Aggregator -> builds Merkle tree -> publishes root to contract
3. Consumers -> request Merkle proofs from aggregator/IPFS to verify user events against published root

Privacy note: only roots/commitments are on-chain; raw event logs are encrypted and stored off-chain.
