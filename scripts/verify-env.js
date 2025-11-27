const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Check if a command exists
const commandExists = (cmd) => {
  try {
    const check = process.platform === 'win32' ? 'where' : 'command -v';
    execSync(`${check} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
};

// Print status message
const printStatus = (name, status, message = '') => {
  const statusText =
    status === 'success'
      ? `${colors.green}✓${colors.reset}`
      : status === 'warning'
        ? `${colors.yellow}⚠${colors.reset}`
        : `${colors.red}✗${colors.reset}`;

  console.log(`[${statusText}] ${name} ${message}`);
};

// Check Node.js version
const checkNodeVersion = () => {
  const requiredVersion = '16.0.0';
  const nodeVersion = process.version.replace('v', '');
  const isCompatible = require('semver').gte(nodeVersion, requiredVersion);

  printStatus(
    'Node.js',
    isCompatible ? 'success' : 'error',
    isCompatible ? `v${nodeVersion}` : `v${nodeVersion} (requires v${requiredVersion}+)`
  );

  return isCompatible;
};

// Check Docker status
const checkDocker = () => {
  try {
    execSync('docker --version');

    // Check if Docker daemon is running
    try {
      execSync('docker ps');
      printStatus('Docker', 'success');
      return true;
    } catch (e) {
      printStatus('Docker', 'error', 'Docker daemon not running');
      return false;
    }
  } catch (e) {
    printStatus('Docker', 'error', 'Not installed');
    return false;
  }
};

// Check Docker Compose
const checkDockerCompose = () => {
  try {
    const version = execSync('docker-compose --version').toString();
    const versionMatch = version.match(/\d+\.\d+\.\d+/);
    printStatus('Docker Compose', 'success', `v${versionMatch[0]}`);
    return true;
  } catch (e) {
    printStatus('Docker Compose', 'error', 'Not installed');
    return false;
  }
};

// Check required environment variables
const checkEnvVars = () => {
  const requiredVars = [
    'NODE_ENV',
    'JWT_SECRET',
    'MONGODB_URI',
    'REDIS_URL',
    'BLOCKCHAIN_RPC_URL',
    'CONTRACT_ADDRESS',
  ];

  let allVarsPresent = true;

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      printStatus(`Env var ${varName}`, 'error', 'Not set');
      allVarsPresent = false;
    } else {
      const displayValue =
        varName.includes('SECRET') || varName.includes('KEY') ? '********' : process.env[varName];
      printStatus(`Env var ${varName}`, 'success', displayValue);
    }
  });

  return allVarsPresent;
};

// Check project structure
const checkProjectStructure = () => {
  const requiredDirs = ['contracts', 'server', 'frontend', 'blockchain', 'scripts'];

  let structureValid = true;

  requiredDirs.forEach((dir) => {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      printStatus(`Directory ${dir}`, 'success');
    } else {
      printStatus(`Directory ${dir}`, 'error', 'Not found');
      structureValid = false;
    }
  });

  return structureValid;
};

// Check if services are running
const checkServices = async () => {
  const services = [
    { name: 'MongoDB', port: 27017 },
    { name: 'Redis', port: 6379 },
    { name: 'Ganache', port: 8545 },
  ];

  let allServicesRunning = true;

  for (const service of services) {
    try {
      // Try to connect to the service port
      const net = require('net');
      const client = new net.Socket();

      await new Promise((resolve, reject) => {
        client.on('error', () => {
          client.destroy();
          reject();
        });

        client.connect(service.port, '127.0.0.1', () => {
          client.destroy();
          resolve();
        });
      });

      printStatus(`${service.name} (port ${service.port})`, 'success');
    } catch (e) {
      printStatus(`${service.name} (port ${service.port})`, 'error', 'Not running');
      allServicesRunning = false;
    }
  }

  return allServicesRunning;
};

// Main function
const main = async () => {
  console.log('\n🔍 Verifying SafeSoundArena development environment...\n');

  // Check system requirements
  console.log('\n📋 System Requirements:');
  const nodeOk = checkNodeVersion();
  const dockerOk = checkDocker();
  const composeOk = checkDockerCompose();

  // Check project setup
  console.log('\n🏗️  Project Setup:');
  const envOk = checkEnvVars();
  const structureOk = checkProjectStructure();

  // Check services
  console.log('\n🌐 Services:');
  const servicesOk = await checkServices();

  // Summary
  console.log('\n📊 Summary:');
  const allChecksPassed = nodeOk && dockerOk && composeOk && envOk && structureOk && servicesOk;

  if (allChecksPassed) {
    console.log(
      `\n${colors.green}✅ All checks passed! Your environment is ready for development.${colors.reset}\n`
    );
    console.log('To start the development environment, run:');
    console.log('  1. docker-compose -f docker-compose.dev.yml up -d');
    console.log('  2. cd blockchain && npm install && npm test');
    console.log('  3. cd ../server && npm install && npm run dev');
    console.log('  4. cd ../frontend && npm install && npm run dev\n');
  } else {
    console.log(
      `\n${colors.red}❌ Some checks failed. Please fix the issues above before proceeding.${colors.reset}\n`
    );
    process.exit(1);
  }
};

// Run the verification
main().catch(console.error);
