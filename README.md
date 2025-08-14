# SafeSoundArena

A full-stack, modular gaming and management platform with advanced UI, real-time dashboards, agent/MCP hierarchy, blockchain integration, and modern DevOps support.

---

## 🚀 Features
- **Modern UI**: React/Next.js, Tailwind, Framer Motion, dark/light mode
- **Admin Dashboard**: MCP > Mini-MCP > Agents hierarchy, user/task management, live stats
- **Game Components**: Notifications, Leaderboard, ProgressBar, Countdown, and more
- **Blockchain Ready**: Arena Credit, Pi Network, Proof-of-Activity
- **DevOps**: Docker, Kubernetes, GitHub Actions, cloud-ready
- **Extensible**: Modular backend, API-first, microservices support

---

## 📁 Project Structure
```
SafeSoundArena/
  frontend/         # Next.js app, UI components, dashboards
  server/           # Node.js/Express backend, MCP logic, models
  backend/          # Additional backend services (auth, events, etc)
  blockchain/       # Blockchain logic, contracts, docs
  k8s/              # Kubernetes manifests
  monitoring/       # Monitoring configs (Prometheus, etc)
  .github/workflows # CI/CD pipelines
  ...
```

---

## 🛠️ Local Development

### 1. Clone & Install
```bash
git clone https://github.com/Hodi420/SafeSoundArena.git
cd SafeSoundArena
npm install
cd frontend && npm install
```

### 2. Environment Variables
- Copy `.env.example` to `.env` (root and frontend if needed)
- Fill in required secrets (DB, API keys, etc)

### 3. Run Locally
- **Backend:**
  ```bash
  npm run start   # or node server.js
  ```
- **Frontend:**
  ```bash
  cd frontend
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
