// aiClients/gemini.js
// Integration for Google Gemini (PaLM API)
const axios = require('axios');

/**
 * @param {string} prompt
 * @param {object} options (apiKey, model, etc)
 * @returns {Promise<string>}
 */
async function ask(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-pro';
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ask };
