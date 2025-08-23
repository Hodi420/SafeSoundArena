const { execSync } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
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
  const statusText = status === 'success' 
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
const checkDocker = async () => {
  try {
    await exec('docker --version');
    
    // Check if Docker daemon is running
    try {
      await exec('docker ps');
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
const checkDockerCompose = async () => {
  try {
    const { stdout } = await exec('docker-compose --version');
    const version = stdout.match(/\d+\.\d+\.\d+/)[0];
    printStatus('Docker Compose', 'success', `v${version}`);
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
    'CONTRACT_ADDRESS'
  ];
  
  let allVarsPresent = true;
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      printStatus(`Env var ${varName}`, 'error', 'Not set');
      allVarsPresent = false;
    } else {
      const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
        ? '********' 
        : process.env[varName];
      printStatus(`Env var ${varName}`, 'success', displayValue);
    }
  });
  
  return allVarsPresent;
};

// Check project structure
const checkProjectStructure = () => {
  const requiredDirs = [
    'contracts',
    'server',
    'frontend',
    'blockchain',
    'scripts'
  ];
  
  let structureValid = true;
  
  requiredDirs.forEach(dir => {
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

// Main function
const main = async () => {
  console.log('\n🔍 Verifying SafeSoundArena development environment...\n');
  
  // Check system requirements
  console.log('\n📋 System Requirements:');
  const nodeOk = checkNodeVersion();
  const dockerOk = await checkDocker();
  const composeOk = await checkDockerCompose();
  
  // Check project setup
  console.log('\n🏗️  Project Setup:');
  const envOk = checkEnvVars();
  const structureOk = checkProjectStructure();
  
  // Summary
  console.log('\n📊 Summary:');
  const allChecksPassed = nodeOk && dockerOk && composeOk && envOk && structureOk;
  
  if (allChecksPassed) {
    console.log(`\n${colors.green}✅ All checks passed! Your environment is ready for development.${colors.reset}\n`);
    console.log('To start the development environment, run:');
    console.log('  1. docker-compose -f docker-compose.dev.yml up -d');
    console.log('  2. cd blockchain && npm install && npm test');
    console.log('  3. cd ../server && npm install && npm run dev');
    console.log('  4. cd ../frontend && npm install && npm run dev\n');
  } else {
    console.log(`\n${colors.red}❌ Some checks failed. Please fix the issues above before proceeding.${colors.reset}\n`);
    process.exit(1);
  }
};

// Run the verification
main().catch(console.error);
