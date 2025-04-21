// aiClients/ollama.js
// Integration for Ollama local models (assumes Ollama REST API is available)
const axios = require('axios');

/**
 * @param {string} prompt
 * @param {object} options (model, baseUrl, etc)
 * @returns {Promise<string>}
 */
async function ask(prompt, options = {}) {
  const baseUrl = options.baseUrl || 'http://localhost:11434';
  const model = options.model || 'llama2'; // Default model, override as needed
  try {
    const response = await axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
    });
    return response.data.response || '';
  } catch (error) {
    console.error('Ollama error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ask };
