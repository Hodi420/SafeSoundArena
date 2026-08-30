// backend/ollama-init.js
// Initialize Ollama LLM on server startup
require('dotenv').config();
const axios = require('axios');

/**
 * Initialize Ollama: check connectivity, verify model, test inference
 * Gracefully continues if Ollama unavailable (for backwards compatibility)
 */
async function initOllama() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  console.log(`\n🤖 Initializing Ollama...`);
  console.log(`   Model: ${model}`);
  console.log(`   Base URL: ${baseUrl}\n`);
  
  try {
    // 1. Check connectivity
    console.log(`   ⏳ Checking Ollama connectivity...`);
    let tags;
    try {
      const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
      tags = response.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('ENOTFOUND')) {
        console.log(`   ❌ Ollama not reachable at ${baseUrl}`);
        console.log(`      → Start it with: docker-compose up -d ollama`);
        console.log(`      → Or install locally: https://ollama.ai\n`);
        return false;
      }
      throw err;
    }
    console.log(`   ✓ Ollama reachable\n`);
    
    // 2. Check if model exists
    console.log(`   ⏳ Checking models...`);
    const availableModels = tags.models?.map(m => m.name) || [];
    const hasModel = availableModels.some(m => m.startsWith(model));
    
    if (availableModels.length === 0) {
      console.log(`   ⚠️  No models downloaded yet\n`);
    } else {
      console.log(`   ✓ Available models: ${availableModels.join(', ')}\n`);
    }
    
    // 3. Pull model if needed (non-blocking, user can do manually)
    if (!hasModel) {
      console.log(`   ⏳ Model "${model}" not found locally`);
      console.log(`      To download, run in another terminal:\n`);
      console.log(`      $ curl -X POST ${baseUrl}/api/pull -d '{"name":"${model}","stream":false}'\n`);
      console.log(`      Or: docker-compose exec ollama ollama pull ${model}\n`);
      console.log(`      Then restart this server.\n`);
      return false;
    }
    console.log(`   ✓ Model ${model} available\n`);
    
    // 4. Test inference
    console.log(`   ⏳ Testing inference...`);
    const testResponse = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt: 'Respond with "OK" only.',
        stream: false
      },
      { timeout: 30000 }
    );
    
    if (testResponse.data.response) {
      const responsePreview = testResponse.data.response.substring(0, 40).trim();
      console.log(`   ✓ Inference successful`);
      console.log(`     Sample: "${responsePreview}..."\n`);
    }
    
    console.log(`✅ Ollama initialized successfully\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Ollama initialization failed:`, error.message);
    console.log(`   Continuing without AI provider...\n`);
    return false;
  }
}

/**
 * Get Ollama status (for health checks)
 */
async function getOllamaStatus() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  try {
    const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
    return {
      available: true,
      models: response.data.models?.map(m => m.name) || [],
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Ask Ollama a question
 */
async function askOllama(prompt, options = {}) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  try {
    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        temperature: options.temperature || 0.7,
        ...options,
      },
      { timeout: 60000 }
    );
    
    return response.data.response || '';
  } catch (error) {
    console.error('Ollama inference error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  initOllama().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { initOllama, getOllamaStatus, askOllama };
