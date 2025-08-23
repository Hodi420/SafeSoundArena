console.log('Test script started');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// Try to load a core module
console.log('Loading fs module...');
const fs = require('fs');
console.log('fs module loaded successfully');

// Try to load a local file
console.log('Trying to load database.js...');
try {
  const db = require('./config/database');
  console.log('database.js loaded successfully');
} catch (error) {
  console.error('Error loading database.js:', error.message);
}

console.log('Test script completed');
