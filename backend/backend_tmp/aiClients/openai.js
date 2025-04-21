// aiClients/openai.js
// Wrapper for OpenAI GPT models
require('dotenv').config();
let openai;
if (process.env.DECIDER_DEMO === '1') {
  // DEMO mode: no OpenAI
  openai = null;
} else {
  const { OpenAI } = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function ask(prompt, options = {}) {
  if (process.env.DECIDER_DEMO === '1') {
    // DEMO mode: return fake answer
    return `DEMO: ${prompt.slice(0, 30)}...`;
  }
  try {
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      ...options
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message || error);
    throw error;
  }
}

module.exports = { ask };
