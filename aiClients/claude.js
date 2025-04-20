// aiClients/claude.js
// Integration for Claude AI (Anthropic)
const axios = require('axios');

/**
 * @param {string} prompt
 * @param {object} options (apiKey, model, etc)
 * @returns {Promise<string>}
 */
async function ask(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.CLAUDE_API_KEY;
  const model = options.model || 'claude-3-opus-20240229';
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: options.max_tokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.content?.[0]?.text || '';
  } catch (error) {
    console.error('Claude API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ask };
