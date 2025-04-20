// SafeSoundArena - Migration Script
// This script moves hooks and test files to the new folder structure.
// Run this in the frontend directory.
//
// 1. Move hooks
// 2. Move tests
// 3. Print next steps

const fs = require('fs');
const path = require('path');

const oldHooksDir = path.join(__dirname, 'src/services/api/hooks');
const newHooksDir = path.join(__dirname, 'src/hooks');
const testsDir = path.join(__dirname, 'src/tests');

// Ensure target directories exist
if (!fs.existsSync(newHooksDir)) fs.mkdirSync(newHooksDir, {recursive: true});
if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, {recursive: true});

// Move hooks
fs.readdirSync(oldHooksDir).forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.js')) {
    fs.renameSync(path.join(oldHooksDir, file), path.join(newHooksDir, file));
  }
});

// Move test files from hooks
fs.readdirSync(newHooksDir).forEach(file => {
  if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
    fs.renameSync(path.join(newHooksDir, file), path.join(testsDir, file));
  }
});

console.log('Hooks and tests migrated. Update import paths as needed.');
