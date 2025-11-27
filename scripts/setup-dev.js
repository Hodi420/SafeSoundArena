const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

// Run a command and return the output
const runCommand = (command, cwd = process.cwd()) => {
  try {
    const options = { cwd, stdio: 'pipe' };
    return {
      success: true,
      output: execSync(command, options).toString().trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout ? error.stdout.toString().trim() : '',
      errorOutput: error.stderr ? error.stderr.toString().trim() : '',
    };
  }
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

// Check if Docker is installed and running
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

// Check if Docker Compose is installed
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

// Install dependencies for a directory
const installDependencies = (dir) => {
  console.log(`\n${colors.cyan}Installing dependencies in ${dir}...${colors.reset}`);

  const packageJsonPath = path.join(dir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    printStatus('package.json', 'warning', 'Not found, skipping');
    return false;
  }

  const result = runCommand('npm install', dir);
  if (result.success) {
    printStatus('Dependencies', 'success', 'Installed successfully');
    return true;
  } else {
    printStatus('Dependencies', 'error', 'Installation failed');
    console.error(result.errorOutput);
    return false;
  }
};

// Create .env file from example
const setupEnvFile = () => {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envExamplePath)) {
    printStatus('.env.example', 'warning', 'Not found, skipping');
    return false;
  }

  if (fs.existsSync(envPath)) {
    printStatus('.env', 'warning', 'Already exists, skipping');
    return true;
  }

  try {
    fs.copyFileSync(envExamplePath, envPath);
    printStatus('.env', 'success', 'Created from .env.example');
    return true;
  } catch (error) {
    printStatus('.env', 'error', 'Failed to create');
    console.error(error.message);
    return false;
  }
};

// Start Docker containers
const startDockerContainers = () => {
  console.log(`\n${colors.cyan}Starting Docker containers...${colors.reset}`);

  const dockerComposePath = path.join(process.cwd(), 'docker-compose.dev.yml');
  if (!fs.existsSync(dockerComposePath)) {
    printStatus('docker-compose.dev.yml', 'error', 'Not found');
    return false;
  }

  const result = runCommand('docker-compose -f docker-compose.dev.yml up -d');
  if (result.success) {
    printStatus('Docker containers', 'success', 'Started successfully');
    return true;
  } else {
    printStatus('Docker containers', 'error', 'Failed to start');
    console.error(result.errorOutput);
    return false;
  }
};

// Main function
const main = async () => {
  console.log(
    `\n${colors.cyan}🚀 Setting up SafeSoundArena development environment...${colors.reset}\n`
  );

  // Check system requirements
  console.log('📋 Checking system requirements:');
  const nodeOk = checkNodeVersion();
  const dockerOk = checkDocker();
  const composeOk = checkDockerCompose();

  if (!nodeOk || !dockerOk || !composeOk) {
    console.log(
      `\n${colors.red}❌ Please install the missing requirements before continuing.${colors.reset}\n`
    );
    process.exit(1);
  }

  // Setup .env file
  console.log(`\n⚙️  Setting up environment variables:`);
  setupEnvFile();

  // Install dependencies
  console.log(`\n📦 Installing dependencies:`);
  installDependencies(process.cwd());

  // Install blockchain dependencies
  const blockchainPath = path.join(process.cwd(), 'blockchain');
  if (fs.existsSync(blockchainPath)) {
    installDependencies(blockchainPath);
  }

  // Install server dependencies
  const serverPath = path.join(process.cwd(), 'server');
  if (fs.existsSync(serverPath)) {
    installDependencies(serverPath);
  }

  // Install frontend dependencies
  const frontendPath = path.join(process.cwd(), 'frontend');
  if (fs.existsSync(frontendPath)) {
    installDependencies(frontendPath);
  }

  // Start Docker containers
  console.log(`\n🐳 Starting development services:`);
  startDockerContainers();

  // Print next steps
  console.log(`\n${colors.green}✅ Setup completed successfully!${colors.reset}\n`);

  console.log('Next steps:');
  console.log(`  1. Start the development server: ${colors.cyan}npm run dev${colors.reset}`);
  console.log(`  2. Open your browser to: ${colors.cyan}http://localhost:3000${colors.reset}`);
  console.log(`  3. Run tests: ${colors.cyan}npm test${colors.reset}\n`);

  console.log('For more information, check the README.md file.\n');
};

// Run the setup
main().catch(console.error);
