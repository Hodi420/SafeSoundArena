const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

// Configuration validation
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'PI_API_KEY',
  'JWT_SECRET'
];

function checkPrerequisites() {
  console.log(`${colors.bright}Checking prerequisites...${colors.reset}`);
  
  // Check Node.js version
  const nodeVersion = process.version;
  if (nodeVersion.split('.')[0] < 16) {
    throw new Error('Node.js 16+ is required');
  }
  
  // Check Docker
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('Docker is not installed');
  }
  
  // Check environment variables
  if (!fs.existsSync('.env')) {
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      console.log(`${colors.yellow}Created .env file from .env.example${colors.reset}`);
    } else {
      throw new Error('.env.example file not found');
    }
  }
  
  // Check required directories
  const requiredDirs = ['frontend', 'backend', 'ai', 'blockchain'];
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      throw new Error(`Required directory '${dir}' not found`);
    }
  });
}

function installDependencies() {
  console.log(`${colors.bright}Installing dependencies...${colors.reset}`);
  
  // Install root dependencies
  execSync('npm install', { stdio: 'inherit' });
  
  // Install frontend dependencies
  if (fs.existsSync('frontend/package.json')) {
    console.log(`${colors.bright}Installing frontend dependencies...${colors.reset}`);
    execSync('cd frontend && npm install', { stdio: 'inherit' });
  }
}

function setupLocalServices() {
  console.log(`${colors.bright}Setting up local services...${colors.reset}`);
  
  // Start Docker services
  execSync('docker-compose up -d', { stdio: 'inherit' });
  
  // Wait for services to be ready
  console.log(`${colors.yellow}Waiting for services to be ready...${colors.reset}`);
  setTimeout(() => {
    console.log(`${colors.green}Services are ready!${colors.reset}`);
  }, 10000);
}

function startDevelopment() {
  console.log(`${colors.bright}Starting development environment...${colors.reset}`);
  
  // Start backend services
  execSync('npm run start', { stdio: 'inherit' });
}

async function main() {
  try {
    checkPrerequisites();
    installDependencies();
    setupLocalServices();
    startDevelopment();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main(); 