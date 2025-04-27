// aiClients/huggingface.js
// Integration for Hugging Face Inference API
const axios = require('axios');

/**
 * @param {string} prompt
 * @param {object} options (apiKey, model, etc)
 * @returns {Promise<string>}
 */
async function ask(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.HUGGINGFACE_API_KEY;
  const model = options.model || 'gpt2'; // Default model, can override
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    // Response may vary depending on model
    if (Array.isArray(response.data)) {
      return response.data[0]?.generated_text || JSON.stringify(response.data);
    } else if (response.data.generated_text) {
      return response.data.generated_text;
    } else {
      return JSON.stringify(response.data);
    }
  } catch (error) {
    console.error('Hugging Face API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ask };
