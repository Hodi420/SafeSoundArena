// aiClients/index.js
// Unified interface for multiple AI providers

const ollama = require('./ollama');
const telegram = require('./telegram');
const openai = require('./openai');
const claude = require('./claude');
const gemini = require('./gemini');
const copilot = require('./copilot');
const grok = require('./grok');
const huggingface = require('./huggingface');
const deepseek = require('./deepseek');

const PROVIDERS = {
  ollama,
  telegram,
  openai,
  claude,
  gemini,
  copilot,
  grok,
  huggingface,
  deepseek,
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
  return PROVIDERS[provider].ask(prompt, options);
}

module.exports = { askAI };
