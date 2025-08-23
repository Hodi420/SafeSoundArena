<div align="center">
  <h1>SafeSoundArena</h1>
  <p>A decentralized gaming platform built on blockchain technology, featuring real-time multiplayer gameplay, NFT integration, and a token-based economy.</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![GitHub release](https://img.shields.io/github/v/release/Hodi420/SafeSoundArena?include_prereleases&sort=semver)](https://github.com/Hodi420/SafeSoundArena/releases)
  [![Build Status](https://github.com/Hodi420/SafeSoundArena/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Hodi420/SafeSoundArena/actions)
  [![codecov](https://codecov.io/gh/Hodi420/SafeSoundArena/branch/main/graph/badge.svg?token=YOUR-TOKEN)](https://codecov.io/gh/Hodi420/SafeSoundArena)
  
  [![GitHub issues](https://img.shields.io/github/issues/Hodi420/SafeSoundArena)](https://github.com/Hodi420/SafeSoundArena/issues)
  [![GitHub stars](https://img.shields.io/github/stars/Hodi420/SafeSoundArena)](https://github.com/Hodi420/SafeSoundArena/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/Hodi420/SafeSoundArena)](https://github.com/Hodi420/SafeSoundArena/network)
  
  [![Twitter Follow](https://img.shields.io/twitter/follow/SafeSoundArena?style=social)](https://twitter.com/SafeSoundArena)
  [![Discord](https://img.shields.io/discord/YOUR_DISCORD_INVITE?logo=discord&label=Discord&style=social)](https://discord.gg/YOUR_DISCORD_INVITE)
</div>

## 🚀 Features

- **Blockchain-Powered**: Built on Ethereum with smart contracts for game logic and tokenomics
- **SSA Token**: Native ERC-20 token for in-game transactions and rewards
- **Smart Contracts**: Secure and transparent game logic on the blockchain
- **Real-time Gameplay**: WebSocket-based multiplayer experience
- **Player Stats**: On-chain tracking of player performance and achievements
- **Decentralized**: Player-owned assets and true digital ownership
- **Secure**: Built with security best practices and comprehensive testing

---

## 📁 Project Structure
```
SafeSoundArena/
  blockchain/       # Smart contracts and deployment scripts
  ├── contracts/    # Solidity smart contracts
  ├── test/         # Smart contract tests
  ├── scripts/      # Deployment and utility scripts
  └── hardhat.config.js  # Hardhat configuration
  
  server/           # Node.js/Express backend
  ├── controllers/  # API controllers
  ├── services/     # Business logic
  ├── models/       # Database models
  └── routes/       # API routes
  
  frontend/         # Next.js frontend
  ├── components/   # React components
  ├── pages/        # Next.js pages
  └── styles/       # CSS/SCSS files
  
  scripts/          # Utility scripts
  docker/           # Docker configuration
  .github/          # CI/CD workflows
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 16+
- Docker & Docker Compose
- Git

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/Hodi420/SafeSoundArena.git
cd SafeSoundArena

# Install root dependencies
npm install

# Install blockchain dependencies
cd blockchain
npm install

# Install server dependencies
cd ../server
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Environment
```bash
# Copy example environment files
cp .env.example .env

# Start development services (Ganache, MongoDB, Redis)
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Deploy Smart Contracts
```bash
# In the blockchain directory
cd blockchain

# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Start Development Servers

**Backend API:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`
  ```
- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```
- **MCP server:**
  ```bash
  cd server
  npm run dev
  ```
- Visit: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment

### Vercel (Frontend)
- Connect `frontend/` to Vercel
- Set environment variables in Vercel dashboard
- Build command: `npm run build`
- Output: `.next`

### 4. Deployment
- **Docker Compose:**
  ```bash
  docker-compose up --build
  ```
- **Kubernetes:**
  Apply the manifests in the `k8s/` directory.

### 5. Testing
- Ensure all tests pass before deployment.
- Run tests using:
  ```bash
  npm test
  ```

### 6. Documentation
- Update documentation as needed.
- Ensure all changes are reflected in the README and other relevant docs.

---

## 🔄 CI/CD (GitHub Actions)
- All pushes/PRs trigger build & test in `.github/workflows/`
- Example: Node.js build, test, and deploy

---

## 🧪 Testing
- **Frontend:**
  ```bash
  cd frontend
  npm run test
  ```
- **Backend:**
  ```bash
  npm run test
  ```

---

## 📚 Documentation

### Smart Contracts
- [SSAToken](/blockchain/contracts/SSAToken.sol): ERC-20 token contract
- [SafeSoundArena](/blockchain/contracts/SafeSoundArena.sol): Main game contract
- [Deployment Guide](/blockchain/README.md): How to deploy to testnet/mainnet

### API Endpoints
- `POST /api/games`: Create a new game
- `POST /api/games/:id/join`: Join an existing game
- `GET /api/players/:address`: Get player stats
- `WS /ws`: WebSocket connection for real-time gameplay

### Testing
```bash
# Run all tests
cd blockchain
npm test

# Run specific test file
npx hardhat test test/SafeSoundArena.test.js
```

---

## 📝 .env Example
```
# Root .env
MONGO_URI=mongodb://localhost:27017/safesoundarena
ADMIN_TOKEN=your_admin_token
# ...

# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3000
# ...
```

---

## 🤝 Contributing
Pull requests are welcome! For major changes, open an issue first to discuss what you would like to change.

---

## 📄 License
MIT

## Deployment Instructions

To deploy the SafeSoundArena application, follow these steps:

1. **Clone the Repository**: Clone the repository to your local machine using `git clone <repository-url>`.

2. **Navigate to the Project Directory**: Use `cd SafeSoundArena` to navigate to the project directory.

3. **Install Dependencies**: Run `npm install` to install all necessary dependencies.

4. **Build the Application**: Execute `npm run build` to build the application.

5. **Run the Application**: Start the application using `npm start`. The application will be available at `http://localhost:3000`.

## New Features

- **Wallet Connector Enhancements**: Added functions to estimate gas and fetch transaction receipts.
- **Dockerfile Optimization**: Updated Dockerfile for automated deployment with stable Node.js version and optimized build process.

---

## 🚦 MCP Permissions Backend Quick Start

### Run locally
```bash
npm install --prefix backend
npm run dev --prefix backend
```

### MCP Gateway (open‑source addons)
- Endpoints:
  - GET `/healthz`
  - GET `/metrics` (Prometheus)
  - GET `/api/mcp/agents`
  - POST `/api/mcp/agents/:name/command`
  - POST `/api/mcp/shell` `{ cmd, args?, cwd?, timeoutMs? }`
  - POST `/api/mcp/git` `{ action: status|pull|push|checkout|log, repoPath?, payload? }`


### Run with Docker
```bash
docker compose -f docker-compose.backend.yml up --build -d
```

### REST API
- GET    /api/mcp/permissions/:userId
- GET    /api/mcp/has-permission/:userId/:role
- GET    /api/mcp/users
- POST   /api/mcp/permissions
- DELETE /api/mcp/permissions

### Features
- Dynamic permissions (JSON, API, external import)
- Default roles
- Logging
- Docker & GitHub Actions ready

### CI/CD
- Every push to main runs tests, builds Docker, and pushes to GitHub Container Registry.

---
