// Example: Using Ollama in SafeSoundArena
// Add to any endpoint that needs AI capabilities

// ─── Method 1: Direct Ollama (Simplest) ───────────────────────────────────────

const axios = require('axios');

async function generateQuestDescription(questName) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  try {
    const response = await axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt: `Create a short fantasy game quest description for: "${questName}". Keep it under 50 words.`,
      stream: false,
      temperature: 0.7,
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Ollama error:', error.message);
    return 'Quest awaits brave adventurer!'; // Fallback
  }
}

// Usage:
// app.get('/api/quest/generate', async (req, res) => {
//   const description = await generateQuestDescription('Dragon Slayer');
//   res.json({ description });
// });


// ─── Method 2: Via aiClients (Recommended) ────────────────────────────────────

const { askAI } = require('../aiClients');

async function generateReward(playerLevel, questDifficulty) {
  const prompt = `
A player at level ${playerLevel} completed a ${questDifficulty} difficulty quest.
Suggest an appropriate reward amount (number only).
  `.trim();
  
  try {
    const response = await askAI(null, prompt, {
      model: process.env.OLLAMA_MODEL
    });
    
    const rewardAmount = parseInt(response.trim());
    return isNaN(rewardAmount) ? 100 : rewardAmount;
  } catch (error) {
    console.error('AI error:', error.message);
    return 100; // Fallback
  }
}

// Usage:
// app.post('/api/quest/complete', async (req, res) => {
//   const reward = await generateReward(10, 'hard');
//   res.json({ reward });
// });


// ─── Method 3: With Ollama Init Check (Production) ────────────────────────────

const { getOllamaStatus } = require('../backend/ollama-init');

async function generateGameMechanics() {
  // Check if Ollama is available
  const status = await getOllamaStatus();
  
  if (!status.available) {
    console.warn('Ollama unavailable, using defaults');
    return { mechanic: 'standard', multiplier: 1.0 };
  }
  
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  const response = await axios.post(`${baseUrl}/api/generate`, {
    model,
    prompt: `Suggest a simple game mechanic twist (under 20 words)`,
    stream: false,
  });
  
  return {
    mechanic: response.data.response.substring(0, 50),
    multiplier: Math.random() * 0.5 + 0.75
  };
}

// Usage in health check:
// app.get('/api/health', async (req, res) => {
//   const ollamaStatus = await getOllamaStatus();
//   res.json({
//     status: 'ok',
//     ai_provider: 'ollama',
//     ai_available: ollamaStatus.available,
//     models: ollamaStatus.models
//   });
// });


// ─── Method 4: Streaming Response (for longer outputs) ───────────────────────

const { Readable } = require('stream');

async function generateStoryChunk(context) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  return new Readable({
    async read() {
      try {
        const response = await axios.post(
          `${baseUrl}/api/generate`,
          {
            model,
            prompt: `Continue this story: "${context}". Add 2-3 sentences.`,
            stream: true, // Enable streaming
          },
          { responseType: 'stream' }
        );
        
        response.data.pipe(this);
      } catch (error) {
        this.destroy(error);
      }
    }
  });
}

// Usage:
// app.get('/api/story/stream', (req, res) => {
//   const stream = await generateStoryChunk('Once upon a time...');
//   stream.pipe(res);
// });


// ─── Method 5: Error Handling with Fallback ───────────────────────────────────

const openaiClient = require('./openaiClient');

async function askAIWithFallback(question, options = {}) {
  const provider = process.env.AI_PROVIDER || 'ollama';
  
  try {
    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'mistral';
      
      const response = await axios.post(
        `${baseUrl}/api/generate`,
        {
          model,
          prompt: question,
          stream: false,
          temperature: options.temperature || 0.7,
        },
        { timeout: 30000 } // 30 second timeout
      );
      
      return response.data.response;
    }
  } catch (error) {
    console.warn('Ollama failed, trying OpenAI fallback:', error.message);
    
    if (process.env.OPENAI_API_KEY) {
      try {
        return await openaiClient.askOpenAI(question, options);
      } catch (openaiError) {
        console.error('Both AI providers failed:', openaiError.message);
        throw new Error('AI services unavailable');
      }
    }
    
    throw error;
  }
}

// Usage:
// app.post('/api/ai/ask', async (req, res) => {
//   try {
//     const response = await askAIWithFallback(req.body.question);
//     res.json({ response });
//   } catch (error) {
//     res.status(503).json({ error: error.message });
//   }
// });


// ─── Performance: Batch Requests ──────────────────────────────────────────────

async function generateMultipleDescriptions(quests) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  // Run in parallel (respects Ollama thread limits automatically)
  const requests = quests.map(quest =>
    axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt: `Short description for quest: ${quest.name}`,
      stream: false,
    })
  );
  
  try {
    const results = await Promise.all(requests);
    return results.map((r, i) => ({
      quest: quests[i].name,
      description: r.data.response
    }));
  } catch (error) {
    console.error('Batch request error:', error.message);
    return quests.map(q => ({
      quest: q.name,
      description: 'Unknown quest' // Fallback
    }));
  }
}

// Usage:
// const descriptions = await generateMultipleDescriptions([
//   { name: 'Dragon Slayer' },
//   { name: 'Forest Explorer' },
//   { name: 'Mountain Climber' }
// ]);


module.exports = {
  generateQuestDescription,
  generateReward,
  generateGameMechanics,
  generateStoryChunk,
  askAIWithFallback,
  generateMultipleDescriptions,
};
