// aiClients/llmConnector.js
// Unified connector for OpenAI GPT-4.1 and local LLMs (Ollama, etc)

const fetch = require('node-fetch');

class LLMConnector {
  constructor(options = {}) {
    this.provider = options.provider || 'openai'; // 'openai' | 'ollama' | 'gemini'
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434/api/generate';
    this.model = options.model || 'gpt-4.1';
    this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  }

  async ask(prompt, opts = {}) {
    if (this.provider === 'openai') {
      return this.askOpenAI(prompt, opts);
    } else if (this.provider === 'ollama') {
      return this.askOllama(prompt, opts);
    } else if (this.provider === 'gemini') {
      return this.askGemini(prompt, opts);
    } else {
      throw new Error('Unknown LLM provider');
    }
  }

  async askOpenAI(prompt, opts = {}) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: opts.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: opts.max_tokens || 512,
        temperature: opts.temperature || 0.7,
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async askOllama(prompt, opts = {}) {
    const res = await fetch(this.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        options: {
          temperature: opts.temperature || 0.7,
          num_predict: opts.max_tokens || 512
        }
      })
    });
    const data = await res.json();
    return data.response || '';
  }
  async askGemini(prompt, opts = {}) {
    // Gemini API (Google AI) – using generative language API v1beta
    // https://ai.google.dev/tutorials/rest_quickstart
    const apiKey = this.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model || 'gemini-pro'}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature || 0.7,
          maxOutputTokens: opts.max_tokens || 512
        }
      })
    });
    const data = await res.json();
    // Gemini returns response in data.candidates[0].content.parts[0].text
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

module.exports = LLMConnector;
