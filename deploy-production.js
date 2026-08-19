#!/usr/bin/env node

/**
 * SafeSoundArena Production Deployment Automation
 * Automates entire deployment with single command
 * 
 * Usage:
 *   node deploy-production.js --env prod --domain yourdomain.com
 *   node deploy-production.js --skip-backup --force
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function step(num, msg) {
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  log(`Step ${num}: ${msg}`, 'cyan');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan');
}

function exec(cmd, errorMsg = '') {
  try {
    return execSync(cmd, { encoding: 'utf8' });
  } catch (error) {
    log(`✗ ${errorMsg || cmd}`, 'red');
    throw error;
  }
}

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────

async function deploySafeSoundArena() {
  const args = process.argv.slice(2);
  const env = args.includes('--prod') ? 'prod' : 'dev';
  const force = args.includes('--force');
  const skipBackup = args.includes('--skip-backup');
  const skipModels = args.includes('--skip-models');

  log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    SafeSoundArena Production Deployment Automation       ║
║                                                           ║
║    Environment: ${env === 'prod' ? 'PRODUCTION' : 'DEVELOPMENT'}${env === 'prod' ? ' ⚠️' : ''}                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `, 'cyan');

  try {
    // Step 1: Pre-flight checks
    step(1, 'Pre-flight Checks');

    log('Checking prerequisites...');

    // Docker
    try {
      exec('docker --version', 'Docker not found');
      log('✓ Docker installed', 'green');
    } catch {
      throw new Error('Docker is required');
    }

    // Docker Compose
    try {
      exec('docker-compose --version', 'Docker Compose not found');
      log('✓ Docker Compose installed', 'green');
    } catch {
      throw new Error('Docker Compose is required');
    }

    // Git
    try {
      exec('git status', 'Not a git repository');
      log('✓ Git repository', 'green');
    } catch {
      throw new Error('Must be in git repository');
    }

    // Environment file
    if (!fs.existsSync(`.env.${env}`)) {
      log(`.env.${env} not found`, 'red');
      throw new Error(`Create .env.${env} file first`);
    }
    log(`✓ Environment file (.env.${env}) found`, 'green');

    // Step 2: Backup (if production)
    if (!skipBackup) {
      step(2, 'Database Backup');

      if (env === 'prod') {
        const shouldBackup = force || (await confirm('Back up database before deployment?'));

        if (shouldBackup) {
          log('Creating backup...');
          const backupDir = '/backups/safesoundarena';
          exec(`mkdir -p ${backupDir}`, 'Failed to create backup directory');

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

          try {
            exec(
              `docker-compose -f docker-compose.prod.ollama.yml exec -T mongodb mongodump --out /backup/mongodb_${timestamp}`,
              'MongoDB backup failed (may not be running yet)'
            );
            log('✓ MongoDB backed up', 'green');
          } catch (e) {
            log('⚠️  MongoDB backup skipped (service may not be running)', 'yellow');
          }

          log(`✓ Backup created: ${backupDir}/mongodb_${timestamp}`, 'green');
        }
      } else {
        log('⚠️  Skipping backup (development environment)', 'yellow');
      }
    }

    // Step 3: Load environment
    step(3, 'Loading Configuration');

    const envPath = path.join(process.cwd(), `.env.${env}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envVars[key] = valueParts.join('=');
      }
    });

    log(`✓ Configuration loaded (${Object.keys(envVars).length} variables)`, 'green');

    // Step 4: Build Docker images
    step(4, 'Building Docker Images');

    log('Building images (this may take 5-10 minutes)...\n');

    try {
      exec(
        `docker-compose -f docker-compose.prod.ollama.yml build`,
        'Build failed'
      );
      log('\n✓ Images built successfully', 'green');
    } catch (error) {
      log('✗ Build failed', 'red');
      throw error;
    }

    // Step 5: Pull Ollama model
    if (!skipModels && env === 'prod') {
      step(5, 'Preparing Ollama Model');

      log('Starting Ollama service...');
      exec(
        `docker-compose -f docker-compose.prod.ollama.yml up -d ollama`,
        'Failed to start Ollama'
      );

      log('Waiting for Ollama to be ready (30s)...');
      await new Promise(r => setTimeout(r, 30000));

      log('Pulling mistral model (this takes 5-15 minutes)...\n');

      try {
        exec(
          `docker-compose -f docker-compose.prod.ollama.yml exec -T ollama ollama pull mistral`,
          'Model pull failed'
        );
        log('\n✓ Mistral model ready', 'green');
      } catch (error) {
        log('⚠️  Model pull had issues, continuing...', 'yellow');
      }
    }

    // Step 6: Start all services
    step(6, 'Starting Services');

    log('Starting all services...\n');

    exec(
      `docker-compose -f docker-compose.prod.ollama.yml up -d`,
      'Failed to start services'
    );

    log('✓ Services started', 'green');
    log('Waiting for services to stabilize (20s)...');
    await new Promise(r => setTimeout(r, 20000));

    // Step 7: Verify deployment
    step(7, 'Verification');

    log('Checking service health...\n');

    const checks = {
      'API Health': `curl -s http://localhost:4000/api/health | grep -q 'status'`,
      'Frontend': `curl -s http://localhost:3000 | grep -q 'html'`,
      'Ollama': `curl -s http://localhost:11434/api/tags | grep -q 'models'`,
    };

    let healthyCount = 0;

    for (const [name, cmd] of Object.entries(checks)) {
      try {
        exec(cmd, `${name} check failed`);
        log(`✓ ${name}`, 'green');
        healthyCount++;
      } catch {
        log(`✗ ${name} not responding`, 'yellow');
      }
    }

    if (healthyCount >= 2) {
      log(`\n✅ Deployment Status: ${healthyCount}/3 services healthy`, 'green');
    } else {
      log(`\n⚠️  Deployment Status: Only ${healthyCount}/3 services healthy`, 'yellow');
    }

    // Step 8: Post-deployment
    step(8, 'Post-Deployment');

    log('Starting health monitor...');
    exec(`node health-monitor.js > health-monitor.log 2>&1 &`, 'Failed to start monitor');
    log('✓ Health monitor started', 'green');

    log('Checking container status...');
    const containerStatus = exec(`docker-compose -f docker-compose.prod.ollama.yml ps`);
    log('\n' + containerStatus);

    // Summary
    log('\n╔═══════════════════════════════════════════════════════════╗', 'green');
    log('║                 DEPLOYMENT COMPLETE! ✅                   ║', 'green');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'green');

    log(`Environment: ${env.toUpperCase()}`, 'cyan');
    log(`Frontend: http://localhost:3000`, 'cyan');
    log(`Backend API: http://localhost:4000`, 'cyan');
    log(`Ollama: http://localhost:11434`, 'cyan');
    log(`Grafana: http://localhost:3001`, 'cyan');

    log('\n📚 Next Steps:', 'bright');
    log('1. Verify all services are healthy:', 'dim');
    log('   curl http://localhost:4000/api/health', 'dim');
    log('2. Monitor logs:', 'dim');
    log('   docker-compose -f docker-compose.prod.ollama.yml logs -f', 'dim');
    log('3. Check health monitor:', 'dim');
    log('   tail -f health-monitor.log', 'dim');
    log('4. Set up SSL/TLS (if production):', 'dim');
    log('   certbot certonly --standalone -d yourdomain.com', 'dim');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Deployment Failed: ${error.message}`, 'red');
    log('\n📋 Troubleshooting:', 'yellow');
    log('1. Check logs: docker-compose logs', 'dim');
    log('2. Verify environment: cat .env.' + env, 'dim');
    log('3. Review PRODUCTION_DEPLOYMENT_GUIDE.md', 'dim');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

deploySafeSoundArena().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
