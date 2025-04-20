#!/usr/bin/env node

/**
 * Pioneer Pathways CLI
 *
 * A command-line tool to scaffold game modules for Pioneer Pathways with Pi Network authentication and automated testing:
 * - Authentication against Pi API
 * - Scrolls
 * - Bots
 * - Scenes
 * - Bridge integration
 * - Automated tests (unit & integration via Jest)
 *
 * Usage:
 *  $ pioneer-cli login --api-key <API_KEY>
 *  $ pioneer-cli create-scroll <name>
 *  $ pioneer-cli generate-bot <username>
 *  $ pioneer-cli create-scene <world>
 *  $ pioneer-cli deploy-bridge
 *  $ pioneer-cli test                    # Run unit & integration tests
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.pioneer-cli');
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');
const PI_API_BASE = 'https://api.minepi.com';

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

const program = new Command();
program
  .name('pioneer-cli')
  .description('CLI to scaffold Pioneer Pathways game modules with Pi authentication')
  .version('0.3.0');

// Utility to write files
function writeFile(dir, filename, content) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
  console.log(`Created: ${path.join(dir, filename)}`);
}

// Load auth token
function getAuth() {
  if (!fs.existsSync(AUTH_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(AUTH_FILE));
  return data.token;
}

// Save auth token
function saveAuth(token) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ token }, null, 2));
  console.log('Authentication token saved to', AUTH_FILE);
}

// Pi API login command
program
  .command('login')
  .description('Authenticate with Pi Network API using API key')
  .requiredOption('--api-key <key>', 'Pi Network API key')
  .action(async (options) => {
    try {
      const response = await axios.post(`${PI_API_BASE}/auth`, { apiKey: options.apiKey });
      const token = response.data.token;
      saveAuth(token);
    } catch (err) {
      console.error('Login failed:', err.response?.data || err.message);
      process.exit(1);
    }
  });

// Authentication guard
async function requireAuth() {
  const token = getAuth();
  if (!token) {
    console.error('Error: Not authenticated. Please run `pioneer-cli login --api-key <API_KEY>` first.');
    process.exit(1);
  }
  return token;
}

// create-scroll command
program
  .command('create-scroll <title>')
  .description('Generate a new Scroll smart contract (Solidity) and metadata JSON with Pi ownership')
  .action(async (title) => {
    const token = await requireAuth();
    let profile;
    try {
      profile = (await axios.get(`${PI_API_BASE}/user/profile`, { headers: { Authorization: `Bearer ${token}` } })).data;
    } catch (err) {
      console.error('Failed to fetch profile:', err.response?.data || err.message);
      process.exit(1);
    }

    const id = title.replace(/\s+/g, '_');
    const solContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Scroll_${id} {\n    string public title = "${title}";\n    address public owner = ${profile.address};\n    // Add your scroll logic here\n}`;
    const meta = {
      scrollId: id,
      title,
      owner: profile.username,
      auth_level: profile.verified ? 'verified' : 'unverified'
    };
    writeFile('scrolls', `Scroll_${id}.sol`, solContent);
    writeFile('scrolls', `Scroll_${id}.json`, JSON.stringify(meta, null, 2));
  });

// generate-bot command
program
  .command('generate-bot <username>')
  .description('Generate configuration for a personal bot')
  .action((username) => {
    const config = {
      username,
      personality: "aggressive",
      state: {},
      expressions: []
    };
    writeFile('bots', `${username}_bot.json`, JSON.stringify(config, null, 2));
  });

// create-scene command
program
  .command('create-scene <world>')
  .description('Scaffold a new interactive scene component (React/TSX)')
  .action((world) => {
    const component = `import React from 'react';\n\nexport default function Scene_${world}() {\n  return (\n    <div className=\"scene-container\">\n      <h2>Scene: ${world}</h2>\n      {/* Add interactive elements, avatars, and logic here */}\n    </div>\n  );\n}\n`;
    writeFile('scenes', `Scene_${world}.tsx`, component);
  });

// deploy-bridge command
program
  .command('deploy-bridge')
  .description('Deploy a blockchain bridge contract (Rust/CosmWasm stub)')
  .action(() => {
    const rustCode = `// Auto-generated BridgeManager.rs\npub struct BridgeManager;\n\nimpl BridgeManager {\n    pub fn deploy() {\n        // Bridge deployment logic here\n    }\n}\n`;
    writeFile('bridge', 'BridgeManager.rs', rustCode);
  });

// test command
program
  .command('test')
  .description('Run unit & integration tests (Jest)')
  .action(() => {
    const testProc = spawn('npx', ['jest'], { stdio: 'inherit' });
    testProc.on('close', (code) => process.exit(code));
  });

program.parse(process.argv);
