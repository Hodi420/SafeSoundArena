#!/usr/bin/env node

/**
 * SafeSoundArena Pioneer CLI Helper
 * Quick commands for common setup and development tasks
 *
 * Usage: node pioneer-cli.js [command]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const commands = {
  // Setup commands
  'setup': {
    description: 'Run interactive setup wizard',
    run: () => spawn('node', ['setup-wizard.js'], { stdio: 'inherit' }),
  },
  'db:init': {
    description: 'Initialize database with sample data',
    run: () => spawn('node', ['db-init.js'], {
      stdio: 'inherit',
      env: { ...process.env, SEED_DATA: 'true' },
    }),
  },
  'db:clear': {
    description: 'Clear database (remove all data)',
    run: () => spawn('node', ['db-init.js'], {
      stdio: 'inherit',
      env: { ...process.env, SEED_DATA: 'false' },
    }),
  },

  // Development commands
  'dev': {
    description: 'Start both backend and frontend in development',
    run: () => {
      console.log('Starting backend and frontend...\n');
      const backend = spawn('npm', ['start'], { stdio: 'inherit' });
      setTimeout(() => {
        const frontend = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          cwd: path.join(process.cwd(), 'frontend'),
        });
      }, 2000);
    },
  },
  'docker:up': {
    description: 'Start Docker Compose services',
    run: () => spawn('docker', ['compose', 'up', '--build'], { stdio: 'inherit' }),
  },
  'docker:down': {
    description: 'Stop Docker Compose services',
    run: () => spawn('docker', ['compose', 'down'], { stdio: 'inherit' }),
  },

  // Testing commands
  'test': {
    description: 'Run all tests',
    run: () => spawn('npm', ['test'], { stdio: 'inherit' }),
  },
  'lint': {
    description: 'Run ESLint with auto-fix',
    run: () => spawn('npm', ['run', 'lint', '--', '--fix'], { stdio: 'inherit' }),
  },

  // Status commands
  'status': {
    description: 'Check setup status and environment',
    run: checkStatus,
  },
  'info': {
    description: 'Show project information',
    run: showInfo,
  },

  // Help
  'help': {
    description: 'Show this help message',
    run: showHelp,
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = value ? value.trim() : '';
    }
  });
  return env;
}

// ─── Status Check ────────────────────────────────────────────────────────────

async function checkStatus() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║              SafeSoundArena Setup Status                   ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

  const checks = [];

  // Node.js
  const nodeVersion = process.version;
  checks.push({
    name: 'Node.js',
    status: true,
    value: nodeVersion,
  });

  // npm
  const hasNpm = require('child_process').execSync('npm --version', { encoding: 'utf-8' }).trim();
  checks.push({
    name: 'npm',
    status: !!hasNpm,
    value: hasNpm,
  });

  // Dependencies installed
  const nodeModulesExists = checkFileExists(path.join(process.cwd(), 'node_modules'));
  checks.push({
    name: 'Dependencies (node_modules)',
    status: nodeModulesExists,
    value: nodeModulesExists ? 'installed' : 'missing',
  });

  // .env file
  const envExists = checkFileExists('.env');
  checks.push({
    name: '.env configuration',
    status: envExists,
    value: envExists ? 'configured' : 'not configured',
  });

  // Database
  const env = readEnv();
  const mongoUri = env?.MONGO_URI;
  checks.push({
    name: 'Database (MONGO_URI)',
    status: !!mongoUri,
    value: mongoUri ? '✓ set' : '✗ not set',
  });

  // Display results
  checks.forEach(check => {
    const icon = check.status ? '✓' : '✗';
    const color = check.status ? 'green' : 'red';
    log(`  ${icon} ${check.name.padEnd(30)} ${check.value}`, color);
  });

  // Recommendations
  const allPassed = checks.every(c => c.status);
  log('\n' + (allPassed ? 'All checks passed! ✓' : 'Some issues found:'), allPassed ? 'green' : 'yellow');

  if (!nodeModulesExists) {
    log('  → Run: npm install', 'yellow');
  }
  if (!envExists) {
    log('  → Run: node setup-wizard.js', 'yellow');
  }

  log('\nNext steps:', 'bright');
  if (envExists && mongoUri) {
    log('  1. npm start         # Start backend', 'cyan');
    log('  2. cd frontend && npm run dev  # Start frontend', 'cyan');
  } else {
    log('  1. node setup-wizard.js  # Configure environment', 'cyan');
  }
  log('');
}

// ─── Project Info ────────────────────────────────────────────────────────────

function showInfo() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║           SafeSoundArena Project Information               ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

  // Read package.json
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  log('Project Details:', 'bright');
  log(`  Name:        ${pkg.name}`);
  log(`  Version:     ${pkg.version}`);
  log(`  Description: ${pkg.description || 'Production-ready gaming platform'}`);

  log('\nDependencies:', 'bright');
  Object.keys(pkg.dependencies || {}).forEach(dep => {
    log(`  • ${dep}: ${pkg.dependencies[dep]}`);
  });

  log('\nScripts:', 'bright');
  Object.keys(pkg.scripts || {}).slice(0, 5).forEach(script => {
    log(`  • ${script}: ${pkg.scripts[script].substring(0, 60)}...`);
  });

  log('\nDirectories:', 'bright');
  const dirs = ['frontend', 'backend', 'server', 'blockchain', 'k8s', 'devops'];
  dirs.forEach(dir => {
    const exists = fs.existsSync(dir);
    const icon = exists ? '✓' : '✗';
    const color = exists ? 'green' : 'reset';
    log(`  ${icon} ${dir}`, color);
  });

  log('\nDocumentation:', 'bright');
  log('  • DEVELOPMENT_GUIDE.md', 'cyan');
  log('  • PIONEER_SETUP_GUIDE.md', 'cyan');
  log('  • API_DOCUMENTATION.md', 'cyan');
  log('  • DEPLOYMENT_GUIDE.md', 'cyan');
  log('');
}

// ─── Help ────────────────────────────────────────────────────────────────────

function showHelp() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║           SafeSoundArena Pioneer CLI v1.0                  ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

  log('USAGE:', 'bright');
  log('  node pioneer-cli.js [command]\n');

  log('SETUP COMMANDS:', 'bright');
  log('  setup            ' + commands.setup.description);
  log('  db:init          ' + commands['db:init'].description);
  log('  db:clear         ' + commands['db:clear'].description);

  log('\nDEVELOPMENT COMMANDS:', 'bright');
  log('  dev              ' + commands.dev.description);
  log('  docker:up        ' + commands['docker:up'].description);
  log('  docker:down      ' + commands['docker:down'].description);

  log('\nTESTING COMMANDS:', 'bright');
  log('  test             ' + commands.test.description);
  log('  lint             ' + commands.lint.description);

  log('\nINFO COMMANDS:', 'bright');
  log('  status           ' + commands.status.description);
  log('  info             ' + commands.info.description);
  log('  help             ' + commands.help.description);

  log('\nEXAMPLES:', 'bright');
  log('  # Interactive setup wizard');
  log('  node pioneer-cli.js setup\n', 'cyan');
  log('  # Start development servers');
  log('  node pioneer-cli.js dev\n', 'cyan');
  log('  # Check setup status');
  log('  node pioneer-cli.js status\n', 'cyan');

  log('\nFOR MORE HELP:', 'bright');
  log('  • Read: PIONEER_SETUP_GUIDE.md', 'cyan');
  log('  • Read: DEVELOPMENT_GUIDE.md', 'cyan');
  log('  • Issues: https://github.com/Hodi420/SafeSoundArena/issues\n', 'cyan');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const cmd = process.argv[2] || 'help';

  if (!commands[cmd]) {
    log(`✗ Unknown command: ${cmd}\n`, 'red');
    log('Run "node pioneer-cli.js help" for available commands\n', 'yellow');
    process.exit(1);
  }

  const command = commands[cmd];
  command.run();
}

if (require.main === module) {
  main();
}

module.exports = { commands, checkStatus, showInfo, showHelp };
