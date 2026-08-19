#!/usr/bin/env node

/**
 * SafeSoundArena Interactive Setup Wizard
 * Guide pioneers through database initialization and configuration
 * 
 * Usage: node setup-wizard.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// State management
const state = {
  setupType: null,      // 'local', 'docker', 'cloud'
  dbEngine: null,       // 'mongodb-local', 'mongodb-atlas', 'postgresql'
  aiProviders: [],      // openai, claude, gemini, etc.
  piNetwork: false,
  seedData: false,
  environment: 'development',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─── Utilities ───────────────────────────────────────────────────────────────

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// ─── Setup Flow ──────────────────────────────────────────────────────────────

async function showWelcome() {
  console.clear();
  log(
    `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      SafeSoundArena Pioneer Setup Wizard 🚀               ║
║                                                            ║
║  This wizard will guide you through:                      ║
║  • Database configuration                                 ║
║  • API key setup                                          ║
║  • Environment variables                                  ║
║  • Sample data initialization                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `,
    'bright'
  );
  log('Estimated time: 5-10 minutes\n', 'dim');
}

async function selectSetupType() {
  log('Step 1: Setup Type', 'bright');
  log('How will you be running SafeSoundArena?\n', 'dim');

  log('1) Local Development (laptop/desktop)', 'cyan');
  log('   → MongoDB local, Node.js dev server, no cloud\n');

  log('2) Docker (local containers)', 'cyan');
  log('   → Docker Compose, MongoDB in container\n');

  log('3) Cloud (production-like)', 'cyan');
  log('   → MongoDB Atlas, Kubernetes-ready, multiple regions\n');

  const choice = await question('Select (1, 2, or 3): ');

  const typeMap = { '1': 'local', '2': 'docker', '3': 'cloud' };
  if (!typeMap[choice]) {
    error('Invalid selection. Try again.');
    return selectSetupType();
  }

  state.setupType = typeMap[choice];
  success(`Selected: ${state.setupType.toUpperCase()}`);
}

async function selectDatabase() {
  log('\nStep 2: Database Engine', 'bright');
  log('Which database are you using?\n', 'dim');

  if (state.setupType === 'local') {
    log('1) MongoDB Local (easier for first-time)', 'cyan');
    log('   → Install MongoDB Community Edition locally\n');
    log('2) MongoDB Docker (simpler setup)', 'cyan');
    log('   → Run MongoDB in Docker, easier to tear down\n');

    const choice = await question('Select (1 or 2): ');
    state.dbEngine = choice === '2' ? 'mongodb-docker' : 'mongodb-local';
  } else if (state.setupType === 'docker') {
    log('1) MongoDB in Docker (included in compose)', 'cyan');
    log('2) MongoDB Atlas (cloud, not in compose)\n', 'cyan');

    const choice = await question('Select (1 or 2): ');
    state.dbEngine = choice === '2' ? 'mongodb-atlas' : 'mongodb-docker';
  } else if (state.setupType === 'cloud') {
    log('1) MongoDB Atlas (managed cloud database)', 'cyan');
    log('   → Free tier available, global, automatic backups\n');
    log('2) PostgreSQL (alternative, requires setup)', 'cyan');
    log('   → More complex, better for scale\n');

    const choice = await question('Select (1 or 2): ');
    state.dbEngine = choice === '2' ? 'postgresql' : 'mongodb-atlas';
  }

  success(`Selected: ${state.dbEngine.toUpperCase()}`);
}

async function configureDatabase() {
  log('\nStep 3: Database Configuration', 'bright');
  log('Provide database connection details\n', 'dim');

  if (state.dbEngine === 'mongodb-local') {
    info('MongoDB local should be running on mongodb://localhost:27017');
    const confirm = await question('Is MongoDB running locally? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      warning('Please start MongoDB:');
      log('  macOS: brew services start mongodb-community', 'dim');
      log('  Linux: sudo systemctl start mongod', 'dim');
      log('  Windows: net start MongoDB', 'dim');
      const ready = await question('\nReady? (y/n): ');
      if (ready.toLowerCase() !== 'y') {
        error('Setup cancelled.');
        process.exit(1);
      }
    }
    state.mongoUri = 'mongodb://localhost:27017/safesoundarena';
  } else if (state.dbEngine === 'mongodb-docker') {
    info('MongoDB will run in Docker on mongodb://mongo:27017');
    state.mongoUri = 'mongodb://mongo:27017/safesoundarena';
  } else if (state.dbEngine === 'mongodb-atlas') {
    log('Get your MongoDB Atlas URI from: https://www.mongodb.com/cloud/atlas', 'cyan');
    log('Free tier available, no credit card needed\n', 'dim');
    state.mongoUri = await question('Paste your MongoDB Atlas URI: ');

    if (!state.mongoUri.startsWith('mongodb+srv://')) {
      warning('URI should start with mongodb+srv:// for Atlas');
      const correct = await question('Continue anyway? (y/n): ');
      if (correct.toLowerCase() !== 'y') {
        return configureDatabase();
      }
    }
  } else if (state.dbEngine === 'postgresql') {
    state.dbHost = await question('PostgreSQL host (default: localhost): ') || 'localhost';
    state.dbPort = await question('PostgreSQL port (default: 5432): ') || '5432';
    state.dbName = await question('Database name (default: safesoundarena): ') || 'safesoundarena';
    state.dbUser = await question('Database user: ');
    state.dbPassword = await question('Database password: ');
  }

  success('Database configured');
}

async function selectAIProviders() {
  log('\nStep 4: AI Providers (Optional)', 'bright');
  log('Which AI providers will you use? (select multiple, press Enter to skip)\n', 'dim');

  const providers = [
    { code: 'openai', name: 'OpenAI (GPT-4)', free: 'Trial credits' },
    { code: 'claude', name: 'Claude (Anthropic)', free: 'Trial credits' },
    { code: 'gemini', name: 'Google Gemini', free: 'Free tier' },
    { code: 'deepseek', name: 'DeepSeek', free: 'Free tier' },
    { code: 'huggingface', name: 'HuggingFace', free: 'Free tier' },
  ];

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    log(`${i + 1}) ${p.name} (${p.free})`, 'cyan');
  }
  log('0) Skip AI providers\n', 'dim');

  const choices = await question('Select (comma-separated, e.g. 1,2,3): ');

  if (choices !== '0' && choices.trim() !== '') {
    const indices = choices.split(',').map(c => parseInt(c.trim()) - 1);
    indices.forEach((i) => {
      if (providers[i]) {
        state.aiProviders.push(providers[i].code);
      }
    });
  }

  if (state.aiProviders.length > 0) {
    success(`Selected: ${state.aiProviders.join(', ').toUpperCase()}`);
  } else {
    info('Skipping AI providers');
  }
}

async function configurePiNetwork() {
  log('\nStep 5: Pi Network Integration (Optional)', 'bright');
  log('Do you need Pi Network support? (y/n): ', 'dim');

  const choice = await question('');
  if (choice.toLowerCase() === 'y') {
    state.piNetwork = true;
    state.piApiKey = await question('Pi Network API Key: ');
    state.piPioneerKey = await question('Pi Pioneer Key: ');
    success('Pi Network configured');
  } else {
    info('Skipping Pi Network');
  }
}

async function selectEnvironment() {
  log('\nStep 6: Environment', 'bright');
  log('Which environment are you setting up?\n', 'dim');

  log('1) Development (with debug logs, hot reload)', 'cyan');
  log('2) Staging (production-like, but test data)\n', 'cyan');
  log('3) Production (secure, monitoring enabled)\n', 'cyan');

  const choice = await question('Select (1, 2, or 3): ');
  const envMap = { '1': 'development', '2': 'staging', '3': 'production' };
  state.environment = envMap[choice] || 'development';

  success(`Environment: ${state.environment.toUpperCase()}`);
}

async function seedDataPrompt() {
  log('\nStep 7: Sample Data', 'bright');
  log('Would you like to seed sample data? (y/n): ', 'dim');

  const choice = await question('');
  if (choice.toLowerCase() === 'y') {
    state.seedData = true;
    success('Will seed sample data');
  } else {
    info('Skipping sample data');
  }
}

async function generateSecrets() {
  log('\nStep 8: Generating Secrets', 'bright');
  log('Creating secure tokens...\n', 'dim');

  state.secrets = {
    adminToken: generateSecret(),
    sessionSecret: generateSecret(),
    jwtSecret: generateSecret(),
    piJwtSecret: generateSecret(),
  };

  success('Secrets generated (will be saved to .env)');
}

async function reviewAndConfirm() {
  log('\nStep 9: Review Configuration', 'bright');
  log('Please review before proceeding:\n', 'dim');

  log(`Setup Type:        ${state.setupType.toUpperCase()}`, 'cyan');
  log(`Database:          ${state.dbEngine.toUpperCase()}`, 'cyan');
  if (state.mongoUri) {
    const uri = state.mongoUri.length > 50 ? state.mongoUri.substring(0, 50) + '...' : state.mongoUri;
    log(`Connection:        ${uri}`, 'cyan');
  }
  log(`AI Providers:      ${state.aiProviders.length > 0 ? state.aiProviders.join(', ') : 'None'}`, 'cyan');
  log(`Pi Network:        ${state.piNetwork ? 'Enabled' : 'Disabled'}`, 'cyan');
  log(`Environment:       ${state.environment.toUpperCase()}`, 'cyan');
  log(`Sample Data:       ${state.seedData ? 'Yes' : 'No'}\n`, 'cyan');

  const confirm = await question('Proceed? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    error('Setup cancelled.');
    process.exit(0);
  }
}

// ─── Environment File Generation ─────────────────────────────────────────────

function generateEnvFile() {
  log('\nGenerating .env file...', 'bright');
  
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const backupPath = path.join(process.cwd(), `.env.backup.${Date.now()}`);
    fs.copyFileSync(envPath, backupPath);
    warning(`Existing .env backed up to ${backupPath}`);
  }

  let envContent = `# SafeSoundArena Environment Configuration
# Generated by setup-wizard.js at ${new Date().toISOString()}
# Setup Type: ${state.setupType.toUpperCase()}
# Environment: ${state.environment.toUpperCase()}

# ─── Server ───────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=${state.environment}
LOG_LEVEL=${state.environment === 'production' ? 'error' : 'debug'}

# ─── Security ─────────────────────────────────────────────────────────────────
ADMIN_TOKEN=${state.secrets.adminToken}
SESSION_SECRET=${state.secrets.sessionSecret}
JWT_SECRET=${state.secrets.jwtSecret}
PI_JWT_SECRET=${state.secrets.piJwtSecret}

# ─── CORS ─────────────────────────────────────────────────────────────────────
`;

  if (state.setupType === 'local') {
    envContent += 'ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000\n';
  } else if (state.setupType === 'docker') {
    envContent += 'ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://frontend:3000\n';
  } else {
    const domain = 'yourdomain.com';
    envContent += `ALLOWED_ORIGINS=https://${domain},https://api.${domain}\n`;
  }

  envContent += '\n# ─── Database ───────────────────────────────────────────────────────────────────\n';

  if (state.dbEngine.includes('mongodb')) {
    envContent += `MONGO_URI=${state.mongoUri}\n`;
  } else if (state.dbEngine === 'postgresql') {
    envContent += `DB_HOST=${state.dbHost}\n`;
    envContent += `DB_PORT=${state.dbPort}\n`;
    envContent += `DB_NAME=${state.dbName}\n`;
    envContent += `DB_USER=${state.dbUser}\n`;
    envContent += `DB_PASSWORD=${state.dbPassword}\n`;
  }

  // AI Providers
  envContent += '\n# ─── AI Providers ─────────────────────────────────────────────────────────────────\n';
  if (state.aiProviders.includes('openai')) {
    envContent += 'OPENAI_API_KEY=sk-...\n';
  }
  if (state.aiProviders.includes('claude')) {
    envContent += 'CLAUDE_API_KEY=\n';
  }
  if (state.aiProviders.includes('gemini')) {
    envContent += 'GEMINI_API_KEY=\n';
  }
  if (state.aiProviders.includes('deepseek')) {
    envContent += 'DEEPSEEK_API_KEY=\n';
  }
  if (state.aiProviders.includes('huggingface')) {
    envContent += 'HUGGINGFACE_API_KEY=\n';
  }

  // Pi Network
  if (state.piNetwork) {
    envContent += '\n# ─── Pi Network ───────────────────────────────────────────────────────────────────\n';
    envContent += `PI_API_KEY=${state.piApiKey}\n`;
    envContent += `PI_PIONEER_KEY=${state.piPioneerKey}\n`;
  }

  // Frontend
  envContent += '\n# ─── Frontend (Next.js) ───────────────────────────────────────────────────────────────\n';
  if (state.setupType === 'docker') {
    envContent += 'NEXT_PUBLIC_API_URL=http://api-server:4000\n';
  } else {
    envContent += 'NEXT_PUBLIC_API_URL=http://localhost:4000\n';
  }

  fs.writeFileSync(envPath, envContent);
  success(`.env file created at ${envPath}`);
  
  // Check .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.env')) {
      warning('.env not found in .gitignore - add it to avoid committing secrets');
    }
  } else {
    warning('.gitignore not found - create it and add .env to avoid committing secrets');
  }
}

// ─── Database Initialization ──────────────────────────────────────────────────

async function initializeDatabase() {
  log('\nInitializing database...', 'bright');

  if (state.seedData) {
    log('Seeding sample data...', 'dim');
    // This will be called with spawn to run db-init.js
    await runDatabaseInit();
  }

  success('Database initialized');
}

async function runDatabaseInit() {
  return new Promise((resolve, reject) => {
    const initScript = path.join(__dirname, 'db-init.js');
    const child = spawn('node', [initScript], {
      stdio: 'inherit',
      env: {
        ...process.env,
        MONGO_URI: state.mongoUri,
        SEED_DATA: state.seedData ? 'true' : 'false',
      },
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Database initialization failed with code ${code}`));
      }
    });
  });
}

// ─── Docker Setup ─────────────────────────────────────────────────────────────

async function suggestDockerSetup() {
  if (state.setupType !== 'docker') return;

  log('\nNext Steps: Docker Setup', 'bright');
  log('To start your development environment:\n', 'dim');

  log('1. Ensure Docker & Docker Compose are installed:', 'cyan');
  log('   https://docs.docker.com/compose/install/\n', 'dim');

  log('2. Start the services:\n', 'cyan');
  log('   docker compose up --build\n', 'dim');

  log('3. Access the application:\n', 'cyan');
  log('   Frontend:  http://localhost:3000', 'dim');
  log('   Backend:   http://localhost:4000', 'dim');
  log('   MongoDB:   mongodb://localhost:27017\n', 'dim');
}

// ─── Summary & Next Steps ──────────────────────────────────────────────────────

async function showSummary() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║                 Setup Complete! ✓                          ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

  log('Configuration saved to: .env\n', 'green');

  log('Next Steps:', 'bright');
  log('1. Install dependencies: npm install\n', 'dim');

  if (state.setupType === 'local') {
    log('2. Start backend: npm start', 'dim');
    log('3. Start frontend: cd frontend && npm run dev\n', 'dim');
  } else if (state.setupType === 'docker') {
    log('2. Start services: docker compose up --build\n', 'dim');
  } else {
    log('2. Deploy to Kubernetes:', 'dim');
    log('   kubectl apply -k devops/k8s/overlays/${state.environment}\n', 'dim');
  }

  log('Documentation:', 'bright');
  log('• Development Guide: ./DEVELOPMENT_GUIDE.md', 'dim');
  log('• API Docs: ./API_DOCUMENTATION.md', 'dim');
  log('• Deployment Guide: ./DEPLOYMENT_GUIDE.md', 'dim');
  log('• Troubleshooting: ./devops/docs/TROUBLESHOOTING.md\n', 'dim');

  log('Need help?', 'bright');
  log('Join the community: https://github.com/Hodi420/SafeSoundArena/discussions', 'dim');
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

async function main() {
  try {
    await showWelcome();
    await selectSetupType();
    await selectDatabase();
    await configureDatabase();
    await selectAIProviders();
    await configurePiNetwork();
    await selectEnvironment();
    await seedDataPrompt();
    await generateSecrets();
    await reviewAndConfirm();
    
    generateEnvFile();
    await initializeDatabase();
    await suggestDockerSetup();
    await showSummary();

    rl.close();
    process.exit(0);
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    rl.close();
    process.exit(1);
  }
}

// ─── Signal Handling ──────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  log('\n\nSetup cancelled.', 'yellow');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { state, generateSecret };
