#!/usr/bin/env node

/**
 * Ollama Closed-Box Setup Quick Start
 * Sets up SafeSoundArena with local Ollama LLM (no external APIs needed)
 * 
 * Usage: node ollama-quickstart.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function step(num, msg) {
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  log(`Step ${num}: ${msg}`, 'cyan');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan');
}

async function main() {
  log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    SafeSoundArena + Ollama Closed-Box Quick Start 🤖     ║
║                                                           ║
║    Set up a fully local, offline AI environment          ║
║    No API keys, no external services needed              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `, 'green');

  // Step 1: Check prerequisites
  step(1, 'Checking prerequisites');
  
  try {
    execSync('docker --version', { stdio: 'pipe' });
    log('✓ Docker installed', 'green');
  } catch (e) {
    log('✗ Docker not found. Install from: https://docker.com/products/docker-desktop', 'red');
    process.exit(1);
  }

  try {
    execSync('docker compose version', { stdio: 'pipe' });
    log('✓ Docker Compose installed', 'green');
  } catch (e) {
    log('✗ Docker Compose not found. Included with Docker Desktop.', 'red');
    process.exit(1);
  }

  try {
    execSync('node --version', { stdio: 'pipe' });
    log('✓ Node.js installed', 'green');
  } catch (e) {
    log('✗ Node.js not found. Install from: https://nodejs.org', 'red');
    process.exit(1);
  }

  // Step 2: Create/update .env
  step(2, 'Configuring environment');

  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync('.env.example', 'utf8');

  // Set Ollama as default
  envContent = envContent.replace(/AI_PROVIDER=.*/m, 'AI_PROVIDER=ollama');
  envContent = envContent.replace(/OLLAMA_BASE_URL=.*/m, 'OLLAMA_BASE_URL=http://ollama:11434');
  envContent = envContent.replace(/OLLAMA_MODEL=.*/m, 'OLLAMA_MODEL=mistral');
  
  // Comment out OpenAI
  envContent = envContent.replace(/^OPENAI_API_KEY=/m, '# OPENAI_API_KEY=');

  fs.writeFileSync(envPath, envContent);
  log(`✓ .env configured for Ollama`, 'green');

  // Step 3: Start Docker services
  step(3, 'Starting Docker services');

  try {
    log('Starting Ollama and other services...', 'yellow');
    log('(This may take a minute on first run)\n');
    
    execSync('docker-compose -f docker-compose.dev.yml up -d ollama mongodb redis', {
      stdio: 'inherit'
    });
    
    log('\n✓ Services started', 'green');
  } catch (e) {
    log('✗ Failed to start services', 'red');
    log('Try: docker-compose -f docker-compose.dev.yml up -d', 'yellow');
    process.exit(1);
  }

  // Step 4: Wait for Ollama
  step(4, 'Waiting for Ollama to be ready');

  let ollama_ready = false;
  let attempts = 0;
  const max_attempts = 30; // 30 seconds

  while (!ollama_ready && attempts < max_attempts) {
    try {
      execSync('curl -s http://localhost:11434/api/tags > /dev/null', { stdio: 'pipe' });
      ollama_ready = true;
      log('✓ Ollama is ready', 'green');
    } catch (e) {
      process.stdout.write('.');
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!ollama_ready) {
    log('\n✗ Ollama did not start in time', 'red');
    log('Run: docker logs $(docker ps -q -f ancestor=ollama/ollama)', 'yellow');
    process.exit(1);
  }

  // Step 5: Pull initial model
  step(5, 'Downloading AI model (mistral)');

  log('Checking if model needs download...', 'yellow');

  try {
    const modelsOutput = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
    const models = JSON.parse(modelsOutput).models || [];
    const hasMistral = models.some(m => m.name.includes('mistral'));

    if (!hasMistral) {
      log('Mistral model not found. Downloading...\n', 'yellow');
      log('⏳ This will take 5-15 minutes depending on connection speed\n', 'yellow');
      log('(You can cancel and resume later - Docker will keep the downloaded data)\n', 'yellow');
      
      execSync(`curl -X POST http://localhost:11434/api/pull -d '{"name":"mistral","stream":false}'`, {
        stdio: 'inherit'
      });
      
      log('\n✓ Mistral downloaded', 'green');
    } else {
      log('✓ Mistral already available', 'green');
    }
  } catch (e) {
    log('\n⚠️ Could not verify model. Will download on first use.', 'yellow');
  }

  // Step 6: Install dependencies
  step(6, 'Installing dependencies');

  try {
    log('Installing npm packages...\n');
    execSync('npm install', { stdio: 'inherit' });
    log('\n✓ Dependencies installed', 'green');
  } catch (e) {
    log('✗ npm install failed', 'red');
    process.exit(1);
  }

  // Step 7: Summary
  step(7, 'Setup Complete!');

  log(`
✅ SafeSoundArena is ready with Ollama!

📊 Status:
  • Ollama running on http://localhost:11434
  • MongoDB running on mongodb://localhost:27017
  • Backend ready on port 4000
  • Frontend ready on port 3000

🚀 Next Steps:

  1. Start the backend:
     $ npm start

  2. In another terminal, start frontend:
     $ cd frontend && npm run dev

  3. Open your browser:
     → http://localhost:3000

  4. The backend will auto-detect Ollama and use it for AI tasks

💡 Tips:
  • All AI processing is 100% local
  • No API keys needed
  • Works completely offline
  • Check logs: docker logs $(docker ps -q -f ancestor=ollama/ollama)

🛑 To stop services:
  $ docker-compose -f docker-compose.dev.yml down

📚 Learn more:
  → Read: OLLAMA_CLOSED_BOX_GUIDE.md
  → Docs: DEVELOPMENT_GUIDE.md

Happy building! 🚀
  `, 'green');
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
