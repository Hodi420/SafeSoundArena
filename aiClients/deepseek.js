// aiClients/deepseek.js
// Integration for DeepSeek LLM API (if available)
const axios = require('axios');

/**
 * @param {string} prompt
 * @param {object} options (apiKey, model, etc)
 * @returns {Promise<string>}
 */
async function ask(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  const model = options.model || 'deepseek-chat'; // Default model, can override
  try {
    const response = await axios.post(
      `https://api.deepseek.com/v1/chat/completions`,
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        ...options
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ask };
