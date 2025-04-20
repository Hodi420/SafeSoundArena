// consensus.js
// Get consensus from multiple AI providers and print to console (with color)
require('dotenv').config();
const { askAI } = require('./aiClients');
let chalk;
try { chalk = require('chalk'); } catch { chalk = null; }

const providers = [
  'openai',
  'ollama',
  'claude',
  'gemini',
  'copilot',
  'grok',
  'huggingface',
  'deepseek',
  'telegram'
];

const weights = {
  openai: 2,
  ollama: 1,
  claude: 2,
  gemini: 1,
  copilot: 1,
  grok: 1,
  huggingface: 1,
  deepseek: 1,
  telegram: 1
};

function color(text, style) {
  if (!chalk) return text;
  if (style === 'error') return chalk.red.bold(text);
  if (style === 'provider') return chalk.cyan.bold(text);
  if (style === 'header') return chalk.green.bold(text);
  if (style === 'consensus') return chalk.yellow.bold(text);
  if (style === 'weight') return chalk.magenta.bold(text);
  return text;
}

const { logQuery } = require('./analytics');
let io = null;
try { io = require('socket.io')(3001, { cors: { origin: '*' } }); } catch { io = null; }

// Helper: get pioneerKey from process.env (for CLI) or from Pi Browser UA (for web/API)
function getPioneerKeyFromEnvOrRequest() {
  if (typeof window === 'undefined') {
    // Node.js CLI: fallback to process.env.PI_PIONEER_KEY if set
    return process.env.PI_PIONEER_KEY || null;
  }
  // In browser: not used here
  return null;
}

async function getConsensus(prompt, userId = 'anonymous', pioneerKey = null) {
  const results = {};
  await Promise.all(providers.map(async provider => {
    try {
      const response = await askAI(provider, prompt);
      results[provider] = response;
    } catch (err) {
      results[provider] = `[ERROR: ${err.message}]`;
    }
  }));

  // Tally identical answers (weighted)
  const tally = {};
  for (const provider of providers) {
    const answer = results[provider];
    if (!answer) continue;
    tally[answer] = (tally[answer] || 0) + (weights[provider] || 1);
  }

  // Find the answer with the highest weight
  let consensus = null, maxWeight = 0;
  for (const answer in tally) {
    if (tally[answer] > maxWeight) {
      consensus = answer;
      maxWeight = tally[answer];
    }
  }

  // Only log analytics if pioneerKey (Pi Browser)
  if (pioneerKey) {
    logQuery({ prompt, consensus, all: results, tally, userId, pioneerKey });
    // Emit update to WebSocket clients
    if (io) io.emit('analyticsUpdate', { prompt, consensus, all: results, tally, userId, pioneerKey });
  }

  // Output to console
  console.log('\n' + color('=== AI Consensus Result ===', 'header'));
  if (consensus) {
    console.log(color('Consensus:', 'consensus'), consensus);
    console.log(color('Weight:', 'weight'), maxWeight);
  } else {
    console.log(color('No consensus reached.', 'error'));
  }

  console.log('\n' + color('--- Provider Responses ---', 'header'));
  for (const provider of providers) {
    const val = results[provider];
    if (val && val.startsWith('[ERROR')) {
      console.log(color(`- ${provider}: ${val}`, 'error'));
    } else {
      console.log(color(`- ${provider}:`, 'provider'), val);
    }
  }

  console.log('\n' + color('--- Tally ---', 'header'));
  for (const answer in tally) {
    console.log(color(`'${answer}'`, 'consensus'), color(`=> ${tally[answer]}`, 'weight'));
  }

  return { consensus, all: results, tally };
}

// Example usage if run directly
if (require.main === module) {
  const prompt = process.argv[2] || 'Say hello from your AI!';
  getConsensus(prompt).catch(e => {
    console.error(color('Fatal error:', 'error'), e.message);
  });
}

module.exports = { getConsensus };
