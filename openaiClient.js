// openaiClient.js
// Utility module for OpenAI integration
require('dotenv').config();
const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY in environment variables. Please set it in your .env file.');
}
const openai = new OpenAI({ apiKey });

/**
 * Send a prompt to OpenAI's GPT model and get a response
 * @param {string} prompt - The input prompt for the model
 * @param {object} [options] - Optional parameters (model, temperature, etc.)
 * @returns {Promise<string>} - The model's response
 */
async function askOpenAI(prompt, options = {}) {
  try {
    const response = await openai.chat.completions.create({
      ...options,
      model: options.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorCode = error.response?.status || 'UNKNOWN';
    console.error(`OpenAI API error [${errorCode}]: ${errorMsg}`);
    throw error;
  }
}

module.exports = { askOpenAI };
