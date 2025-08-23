// Simple test script to verify Node.js environment
console.log('=== Starting Simple Test ===');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? '***MONGODB_URI is set***' : 'MONGODB_URI is not set'
});

// Test basic functionality
try {
  const fs = require('fs');
  console.log('✅ Core module (fs) loaded successfully');
  
  // Check if we can read the current directory
  const files = fs.readdirSync('.');
  console.log(`📂 Found ${files.length} files in current directory`);
  
  // Try to load a simple module
  const path = require('path');
  console.log('✅ Path module loaded successfully');
  
  // Try to load a local file
  try {
    const packageJson = require('./package.json');
    console.log('✅ package.json loaded successfully');
    console.log('   - Name:', packageJson.name);
    console.log('   - Version:', packageJson.version);
  } catch (e) {
    console.error('❌ Error loading package.json:', e.message);
  }
  
  console.log('=== Test Completed Successfully ===');
} catch (error) {
  console.error('❌ Test Failed:', error);
  process.exit(1);
}
