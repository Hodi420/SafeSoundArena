// aiClients/index.js
// Unified interface for multiple AI providers

const PROVIDERS = {
  ollama: () => require('./ollama'),
  telegram: () => require('./telegram'),
  openai: () => require('./openai'),
  claude: () => require('./claude'),
  gemini: () => require('./gemini'),
  copilot: () => require('./copilot'),
  grok: () => require('./grok'),
  huggingface: () => require('./huggingface'),
  deepseek: () => require('./deepseek'),
};

/**
 * Ask any supported AI provider
 * @param {string} provider - One of: ollama, telegram, openai, claude, gemini, copilot, grok, huggingface, deepseek
 * @param {string} prompt - The input prompt
 * @param {object} [options] - Provider-specific options
 * @returns {Promise<string>} - The AI's response
 */
async function askAI(provider, prompt, options = {}) {
  if (!PROVIDERS[provider]) throw new Error(`Provider ${provider} not supported`);
  return PROVIDERS[provider]().ask(prompt, options);
}

function listProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = { askAI, listProviders };
