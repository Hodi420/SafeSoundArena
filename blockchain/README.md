# SafeSoundArena Blockchain

This directory contains the smart contracts and deployment scripts for the SafeSoundArena project.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Hardhat
- Ganache (for local development)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```env
   # Local development
   PRIVATE_KEY=your_private_key_here
   
   # Testnet (Goerli)
   GOERLI_RPC_URL=your_goerli_rpc_url
   ETHERSCAN_API_KEY=your_etherscan_api_key
   
   # Mainnet
   MAINNET_RPC_URL=your_mainnet_rpc_url
   ```

## Compiling Contracts

```bash
npm run compile
```

## Testing

Run tests:
```bash
npm test
```

## Local Development

1. Start a local blockchain node:
   ```bash
   npx hardhat node
   ```

2. Deploy contracts to the local network:
   ```bash
   npm run deploy:local
   ```

## Deployment

### Testnet (Goerli)
```bash
npm run deploy:testnet
```

### Mainnet
```bash
npm run deploy:mainnet
```

## Contract Verification

After deployment, verify your contracts on Etherscan:
```bash
npx hardhat verify --network <network> <contract_address> [constructor_args]
```

## Project Structure

- `contracts/` - Smart contracts
- `test/` - Test files
- `scripts/` - Deployment scripts
- `deployments/` - Deployment artifacts

## Security

- Use the latest version of Solidity
- Follow best practices for smart contract security
- Always test thoroughly before deploying to mainnet

## License

MIT
