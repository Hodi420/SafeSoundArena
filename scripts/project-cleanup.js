const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'build',
  'dist',
  'coverage',
  'deploy',
  'logs',
  'temp',
];

const IGNORE_EXTENSIONS = [
  '.log',
  '.tmp',
  '.swp',
  '.swo',
  '.DS_Store',
  '.env',
  '.env.*',
  '*.min.*',
  '*.bundle.*',
];

// Stats
const stats = {
  filesScanned: 0,
  duplicatesFound: 0,
  largeFiles: [],
  potentialIssues: [],
  configIssues: [],
  compatibilityIssues: [],
};

// Colors
const colors = {
  error: chalk.red,
  warning: chalk.yellow,
  success: chalk.green,
  info: chalk.blue,
  highlight: chalk.cyan.bold,
  section: chalk.underline.bold,
};

// Helper function to calculate file hash
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Check for large files
function checkFileSize(filePath, size) {
  const sizeInMB = size / (1024 * 1024);
  if (sizeInMB > 1) {
    // Files larger than 1MB
    stats.largeFiles.push({
      path: filePath,
      size: `${sizeInMB.toFixed(2)}MB`,
    });
  }
}

// Check for potential issues in file content
function checkFileContent(filePath, content) {
  const fileName = path.basename(filePath);

  // Check for hardcoded credentials
  const credentialPatterns = [
    /password\s*[=:]\s*['"].*?['"]/gi,
    /api[_-]?key\s*[=:]\s*['"].*?['"]/gi,
    /secret[_-]?key\s*[=:]\s*['"].*?['"]/gi,
  ];

  credentialPatterns.forEach((pattern, index) => {
    if (content.match(pattern)) {
      stats.potentialIssues.push({
        file: filePath,
        issue: 'Potential hardcoded credential',
        pattern: pattern.toString(),
      });
    }
  });

  // Check for deprecated APIs
  const deprecatedApis = [
    'componentWillMount',
    'componentWillReceiveProps',
    'UNSAFE_componentWillMount',
    'UNSAFE_componentWillReceiveProps',
  ];

  deprecatedApis.forEach((api) => {
    if (content.includes(api)) {
      stats.compatibilityIssues.push({
        file: filePath,
        issue: 'Deprecated React API',
        details: `Found usage of ${api}`,
      });
    }
  });
}

// Check package.json for issues
function checkPackageJson(filePath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check for missing fields
    const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
    requiredFields.forEach((field) => {
      if (!pkg[field]) {
        stats.configIssues.push({
          file: filePath,
          issue: 'Missing required field',
          field: field,
        });
      }
    });

    // Check for outdated dependencies
    if (pkg.dependencies) {
      Object.entries(pkg.dependencies).forEach(([name, version]) => {
        if (version.match(/^\^|~/)) {
          stats.compatibilityIssues.push({
            file: filePath,
            issue: 'Potentially unstable dependency version',
            package: name,
            version: version,
            recommendation: 'Use exact versions in production',
          });
        }
      });
    }
  } catch (error) {
    console.error(colors.error(`Error parsing ${filePath}:`), error.message);
  }
}

// Process a single file
function processFile(filePath) {
  try {
    stats.filesScanned++;

    // Skip ignored files
    if (IGNORE_EXTENSIONS.some((ext) => filePath.endsWith(ext))) {
      return;
    }

    const stats = fs.statSync(filePath);

    // Check file size
    checkFileSize(filePath, stats.size);

    // Skip binary files
    if (!filePath.match(/\.(js|jsx|ts|tsx|json|html|css|scss|md)$/i)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Check file content
    checkFileContent(filePath, content);

    // Special checks for package.json
    if (filePath.endsWith('package.json')) {
      checkPackageJson(filePath);
    }
  } catch (error) {
    console.error(colors.error(`Error processing ${filePath}:`), error.message);
  }
}

// Find duplicate files
function findDuplicateFiles(dir, fileHashes = new Map()) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);

    // Skip ignored directories
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        findDuplicateFiles(fullPath, fileHashes);
      }
      return;
    }

    try {
      const fileHash = calculateFileHash(fullPath);

      if (fileHashes.has(fileHash)) {
        fileHashes.get(fileHash).push(fullPath);
        stats.duplicatesFound++;
      } else {
        fileHashes.set(fileHash, [fullPath]);
      }

      processFile(fullPath);
    } catch (error) {
      console.error(colors.error(`Error hashing ${fullPath}:`), error.message);
    }
  });

  return fileHashes;
}

// Find node_modules inconsistencies
function checkNodeModules() {
  try {
    console.log(colors.section('\n🔍 Checking node_modules consistency...'));

    // Check for missing dependencies
    const missingDeps = execSync('npm ls --json', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const missing = JSON.parse(missingDeps).problems || [];

    if (missing.length > 0) {
      console.log(colors.warning('\n⚠️  Found issues in node_modules:'));
      missing.forEach((issue) => console.log(`- ${issue}`));

      stats.compatibilityIssues.push({
        issue: 'Dependency issues found',
        details: 'Run `npm install` to fix dependency issues',
        problems: missing,
      });
    } else {
      console.log(colors.success('✓ node_modules is consistent'));
    }
  } catch (error) {
    console.error(colors.error('Error checking node_modules:'), error.message);
  }
}

// Check for configuration issues
function checkConfiguration() {
  console.log(colors.section('\n🔧 Checking configuration...'));

  // Check for .env file
  if (!fs.existsSync(path.join(PROJECT_ROOT, '.env'))) {
    console.log(colors.warning('⚠️  No .env file found'));
    stats.configIssues.push({
      issue: 'Missing .env file',
      recommendation: 'Create a .env file with required environment variables',
    });
  }

  // Check for required config files
  const requiredConfigFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'deploy/docker-compose.yml',
  ];

  requiredConfigFiles.forEach((file) => {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      stats.configIssues.push({
        issue: 'Missing required config file',
        file: file,
        impact: 'Project may not build or run correctly',
      });
    }
  });

  // Check for TypeScript configuration
  if (fs.existsSync(path.join(PROJECT_ROOT, 'tsconfig.json'))) {
    try {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8')
      );

      if (!tsconfig.compilerOptions?.strict) {
        stats.compatibilityIssues.push({
          issue: 'TypeScript strict mode is disabled',
          file: 'tsconfig.json',
          impact: 'May lead to runtime errors',
          recommendation: 'Enable "strict: true" in tsconfig.json',
        });
      }
    } catch (error) {
      console.error(colors.error('Error parsing tsconfig.json:'), error.message);
    }
  }
}

// Generate report
function generateReport(duplicates) {
  console.log(colors.section('\n📊 Project Analysis Report'));
  console.log(`\n📂 Files scanned: ${stats.filesScanned}`);

  // Duplicates
  if (stats.duplicatesFound > 0) {
    console.log(colors.warning(`\n⚠️  Found ${stats.duplicatesFound} duplicate files:`));
    for (const [hash, files] of duplicates.entries()) {
      if (files.length > 1) {
        console.log(`\n${files.length} identical files (${hash}):`);
        files.forEach((file) => console.log(`- ${file}`));
      }
    }
  } else {
    console.log(colors.success('\n✓ No duplicate files found'));
  }

  // Large files
  if (stats.largeFiles.length > 0) {
    console.log(colors.warning(`\n⚠️  Found ${stats.largeFiles.length} large files:`));
    stats.largeFiles.forEach((file) => {
      console.log(`- ${file.path} (${file.size})`);
    });
  }

  // Potential issues
  if (stats.potentialIssues.length > 0) {
    console.log(colors.warning(`\n⚠️  Found ${stats.potentialIssues.length} potential issues:`));
    stats.potentialIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.issue} in ${issue.file}`);
      console.log(`   Pattern: ${issue.pattern}`);
    });
  }

  // Configuration issues
  if (stats.configIssues.length > 0) {
    console.log(colors.warning(`\n⚠️  Found ${stats.configIssues.length} configuration issues:`));
    stats.configIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.issue}`);
      if (issue.file) console.log(`   File: ${issue.file}`);
      if (issue.field) console.log(`   Field: ${issue.field}`);
      if (issue.recommendation) console.log(`   Recommendation: ${issue.recommendation}`);
    });
  }

  // Compatibility issues
  if (stats.compatibilityIssues.length > 0) {
    console.log(
      colors.warning(`\n⚠️  Found ${stats.compatibilityIssues.length} compatibility issues:`)
    );
    stats.compatibilityIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.issue}`);
      if (issue.file) console.log(`   File: ${issue.file}`);
      if (issue.details) console.log(`   Details: ${issue.details}`);
      if (issue.recommendation) console.log(`   Recommendation: ${issue.recommendation}`);
    });
  }

  // Summary
  console.log(colors.section('\n📋 Summary'));
  console.log(`- Files scanned: ${stats.filesScanned}`);
  console.log(`- Duplicate files: ${stats.duplicatesFound}`);
  console.log(`- Large files: ${stats.largeFiles.length}`);
  console.log(`- Potential issues: ${stats.potentialIssues.length}`);
  console.log(`- Configuration issues: ${stats.configIssues.length}`);
  console.log(`- Compatibility issues: ${stats.compatibilityIssues.length}`);

  if (
    stats.duplicatesFound > 0 ||
    stats.potentialIssues.length > 0 ||
    stats.configIssues.length > 0 ||
    stats.compatibilityIssues.length > 0
  ) {
    console.log(colors.warning('\n⚠️  Issues found that need attention'));
  } else {
    console.log(colors.success('\n✓ No major issues found'));
  }
}

// Main function
async function main() {
  console.log(colors.highlight('\n🔍 SafeSoundArena Project Analysis'));

  try {
    // Check node_modules first
    checkNodeModules();

    // Check configuration
    checkConfiguration();

    // Find and process files
    console.log(colors.section('\n🔍 Scanning project files...'));
    const duplicates = findDuplicateFiles(PROJECT_ROOT);

    // Generate report
    generateReport(duplicates);

    // Next steps
    console.log(colors.section('\n🚀 Next Steps'));
    if (stats.duplicatesFound > 0) {
      console.log('- Review and remove duplicate files');
    }
    if (stats.potentialIssues.length > 0) {
      console.log('- Address potential security issues (e.g., hardcoded credentials)');
    }
    if (stats.configIssues.length > 0) {
      console.log('- Fix configuration issues');
    }
    if (stats.compatibilityIssues.length > 0) {
      console.log('- Resolve compatibility issues');
    }

    console.log(colors.success('\n✅ Analysis complete!'));
  } catch (error) {
    console.error(colors.error('\n❌ Error during analysis:'), error.message);
    process.exit(1);
  }
}

// Run the analysis
main();
