// test_aiClients.js
// Test script for all AI providers
try {
  require('dotenv').config();
} catch {
  // dotenv is optional for the offline smoke path.
}

const assert = require('assert');
const { askAI, listProviders } = require('./aiClients');

const liveProviders = new Set(['ollama', 'openai', 'claude', 'gemini', 'huggingface', 'deepseek']);
const offlineProviders = new Set(['telegram', 'copilot', 'grok']);

async function main() {
  const providers = listProviders();
  assert.deepStrictEqual(
    providers.sort(),
    ['claude', 'copilot', 'deepseek', 'gemini', 'grok', 'huggingface', 'ollama', 'openai', 'telegram'].sort()
  );

  const runLive = process.env.RUN_AI_PROVIDER_SMOKE === '1';
  const prompt = 'Say hello from your AI!';
  for (const provider of providers) {
    if (!runLive && liveProviders.has(provider)) {
      console.log(`Skipping ${provider}: set RUN_AI_PROVIDER_SMOKE=1 for live provider calls.`);
      continue;
    }

    try {
      console.log(`\n--- Testing ${provider} ---`);
      const response = await askAI(provider, prompt);
      if (offlineProviders.has(provider)) assert.ok(response);
      console.log(response);
    } catch (err) {
      if (!runLive) throw err;
      console.error(`Error with ${provider}:`, err.message);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
