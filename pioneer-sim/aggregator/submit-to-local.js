// Simple script to run aggregator and submit root to local Hardhat chain via scripts/submitRoot.js
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, 'out', 'root.txt');

try {
  console.log('Running aggregator to generate root...');
  execSync('node aggregator/aggregator.js', { stdio: 'inherit' });
  console.log('Attempting to submit root to local chain using Hardhat...');
  // set POH_ADDR env if you have contract address
  execSync('npx hardhat run --network localhost scripts/submitRoot.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Error running submit flow', e.message);
  process.exit(1);
}
