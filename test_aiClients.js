// test_aiClients.js
// Test script for all AI providers
require('dotenv').config();
const { askAI } = require('./aiClients');

const testProviders = [
  'ollama',
  'telegram',
  'openai',
  'claude',
  'gemini',
  'copilot',
  'grok',
  'huggingface',
  'deepseek',
];

async function main() {
  const prompt = 'Say hello from your AI!';
  for (const provider of testProviders) {
    try {
      console.log(`\n--- Testing ${provider} ---`);
      const response = await askAI(provider, prompt);
      console.log(response);
    } catch (err) {
      console.error(`Error with ${provider}:`, err.message);
    }
  }
}

main();
