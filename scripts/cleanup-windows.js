const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// Simple color implementation that works in all environments
const colorsEnabled = process.stdout.isTTY;
const colorize = (text, colorCode) => colorsEnabled ? `\x1b[${colorCode}m${text}\x1b[0m` : text;

// Project root directory
const PROJECT_ROOT = path.join(__dirname, '..');

// Colors for output (ANSI color codes)
const colors = {
  error: (text) => colorize(text, '31'),    // Red
  warning: (text) => colorize(text, '33'),  // Yellow
  success: (text) => colorize(text, '32'),  // Green
  info: (text) => colorize(text, '34'),     // Blue
  highlight: (text) => `\x1b[36;1m${text}\x1b[0m`,  // Cyan + Bold
  section: (text) => `\x1b[4;1m${text}\x1b[0m`     // Underline + Bold
};

// Directories and files to clean up
const CLEANUP_PATTERNS = [
  '**/__pycache__',
  '**/*.pyc',
  '**/*.pyo',
  '**/*.pyd',
  '**/.pytest_cache',
  '**/node_modules/.cache',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/.ipynb_checkpoints',
  '**/*.log',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/.env.local',
  '**/.env.development.local',
  '**/.env.test.local',
  '**/.env.production.local',
  '**/build',
  '**/dist',
  '**/coverage',
  '**/.next',
  '**/out',
  '**/.serverless',
  '**/.serverless_nextjs',
  '**/.vercel',
  '**/.netlify'
];

// Files to keep (won't be deleted)
const KEEP_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'tsconfig.json',
  'next.config.js',
  'README.md',
  '.gitignore',
  '.env.example',
  '.env.local.example',
  'docker-compose.yml',
  'deploy/docker-compose.yml'
];

// Check if a file should be kept
function shouldKeepFile(filePath) {
  return KEEP_FILES.some(keepFile => filePath.includes(keepFile));
}

// Delete a file or directory
function deleteFileOrDir(path) {
  try {
    if (fs.existsSync(path)) {
      const stat = fs.statSync(path);
      if (stat.isDirectory()) {
        fs.rmdirSync(path, { recursive: true });
      } else {
        fs.unlinkSync(path);
      }
      return true;
    }
  } catch (error) {
    console.error(colors.error(`Error deleting ${path}:`), error.message);
  }
  return false;
}

// Clean up files and directories
function cleanUp() {
  console.log(colors.section('🚀 Starting project cleanup...'));
  let deletedCount = 0;
  let skippedCount = 0;

  CLEANUP_PATTERNS.forEach(pattern => {
    const fullPattern = path.join(PROJECT_ROOT, pattern);
    const dir = path.dirname(fullPattern);
    const base = path.basename(fullPattern);
    
    try {
      // Handle wildcards in the pattern
      if (base.includes('*')) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        const regex = new RegExp('^' + base.replace(/\*/g, '.*') + '$');
        
        files.forEach(file => {
          if (regex.test(file.name)) {
            const fullPath = path.join(dir, file.name);
            if (!shouldKeepFile(fullPath)) {
              if (deleteFileOrDir(fullPath)) {
                console.log(colors.info(`Deleted: ${path.relative(PROJECT_ROOT, fullPath)}`));
                deletedCount++;
              }
            } else {
              console.log(colors.warning(`Skipped (protected): ${path.relative(PROJECT_ROOT, fullPath)}`));
              skippedCount++;
            }
          }
        });
      } else {
        // Handle exact path
        if (!shouldKeepFile(fullPattern)) {
          if (deleteFileOrDir(fullPattern)) {
            console.log(colors.info(`Deleted: ${path.relative(PROJECT_ROOT, fullPattern)}`));
            deletedCount++;
          }
        } else {
          console.log(colors.warning(`Skipped (protected): ${path.relative(PROJECT_ROOT, fullPattern)}`));
          skippedCount++;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(colors.error(`Error processing ${pattern}:`), error.message);
      }
    }
  });

  console.log(`\n${colors.success('✅ Cleanup complete!')}`);
  console.log(`- Deleted: ${deletedCount} files/directories`);
  console.log(`- Skipped: ${skippedCount} protected files/directories`);
}

// Check project configuration
function checkConfiguration() {
  console.log(colors.section('\n🔍 Checking project configuration...'));
  
  try {
    // Check Node.js version
    console.log('\nNode.js version:');
    execSync('node -v', { stdio: 'inherit' });
    
    // Check package manager
    const useYarn = fs.existsSync(path.join(PROJECT_ROOT, 'yarn.lock'));
    console.log('\nPackage manager:');
    if (useYarn) {
      execSync('yarn -v', { stdio: 'inherit' });
    } else {
      execSync('npm -v', { stdio: 'inherit' });
    }
    
    // Check TypeScript if used
    if (fs.existsSync(path.join(PROJECT_ROOT, 'tsconfig.json'))) {
      console.log('\nTypeScript:');
      try {
        execSync('npx tsc -v', { stdio: 'inherit' });
      } catch {
        console.log(colors.warning('TypeScript not installed. Run: npm install -g typescript'));
      }
    }
    
    // Check Next.js if used
    if (fs.existsSync(path.join(PROJECT_ROOT, 'next.config.js'))) {
      console.log('\nNext.js:');
      try {
        execSync('npx next -v', { stdio: 'inherit' });
      } catch {
        console.log(colors.warning('Next.js not installed. Run: npm install next'));
      }
    }
    
    console.log(colors.success('\n✅ Configuration check complete!'));
  } catch (error) {
    console.error(colors.error('Error checking configuration:'), error.message);
  }
}

// Check for compatibility issues
function checkCompatibility() {
  console.log(colors.section('\n🔍 Checking for compatibility issues...'));
  
  try {
    const useYarn = fs.existsSync(path.join(PROJECT_ROOT, 'yarn.lock'));
    
    // Check for vulnerable packages
    console.log('\nChecking for vulnerable packages:');
    try {
      if (useYarn) {
        execSync('yarn audit --level moderate', { stdio: 'inherit' });
      } else {
        execSync('npm audit --production', { stdio: 'inherit' });
      }
    } catch (error) {
      console.log(colors.warning('Vulnerabilities found. Run `npm audit fix` to fix them.'));
    }
    
    // Check for outdated packages
    console.log('\nChecking for outdated packages:');
    try {
      if (useYarn) {
        execSync('yarn outdated', { stdio: 'inherit' });
      } else {
        execSync('npm outdated', { stdio: 'inherit' });
      }
    } catch (error) {
      console.log(colors.warning('Some packages are outdated. Consider updating them.'));
    }
    
    console.log(colors.success('\n✅ Compatibility check complete!'));
  } catch (error) {
    console.error(colors.error('Error checking compatibility:'), error.message);
  }
}

// Main function
async function main() {
  console.log(colors.highlight('\n🔍 SafeSoundArena Project Cleanup'));
  
  // Show menu
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const showMenu = () => {
    console.log('\n' + colors.section('Main Menu'));
    console.log('1. Clean up project (remove node_modules, caches, etc.)');
    console.log('2. Check project configuration');
    console.log('3. Check for compatibility issues');
    console.log('4. Run full cleanup and checks');
    console.log('0. Exit');
    
    readline.question('\nChoose an option (0-4): ', async (choice) => {
      switch (choice) {
        case '1':
          cleanUp();
          showMenu();
          break;
        case '2':
          checkConfiguration();
          showMenu();
          break;
        case '3':
          checkCompatibility();
          showMenu();
          break;
        case '4':
          cleanUp();
          checkConfiguration();
          checkCompatibility();
          showMenu();
          break;
        case '0':
          console.log(colors.success('\n👋 Exiting...'));
          readline.close();
          process.exit(0);
          break;
        default:
          console.log(colors.error('\n❌ Invalid option. Please try again.'));
          showMenu();
      }
    });
  };
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    switch (args[0]) {
      case '--clean':
        cleanUp();
        break;
      case '--check':
        checkConfiguration();
        break;
      case '--compat':
        checkCompatibility();
        break;
      case '--all':
        cleanUp();
        checkConfiguration();
        checkCompatibility();
        break;
      default:
        console.log('Usage: node cleanup-windows.js [--clean|--check|--compat|--all]');
        process.exit(1);
    }
  } else {
    showMenu();
  }
}

// Run the script
main().catch(error => {
  console.error(colors.error('Unhandled error:'), error);
  process.exit(1);
});
