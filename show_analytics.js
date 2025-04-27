// show_analytics.js
// Advanced analytics reporting for AI consensus system
const { getStats } = require('./analytics');
const fs = require('fs');
const path = require('path');
let chalk = null;
try { chalk = require('chalk'); } catch { chalk = null; }
function color(text, style) {
  if (!chalk) return text;
  // Only use basic color functions, no .bold for v5+
  if (style === 'header' && chalk.green) return chalk.green(text);
  if (style === 'total' && chalk.yellow) return chalk.yellow(text);
  if (style === 'consensus' && chalk.cyan) return chalk.cyan(text);
  if (style === 'count' && chalk.yellow) return chalk.yellow(text);
  if (style === 'provider' && chalk.magenta) return chalk.magenta(text);
  if (style === 'error' && chalk.red) return chalk.red(text);
  if (style === 'prompt' && chalk.cyan) return chalk.cyan(text);
  if (style === 'tally' && chalk.gray) return chalk.gray(text);
  if (style === 'timestamp' && chalk.gray) return chalk.gray(text);
  return text;
}

const ANALYTICS_FILE = path.join(__dirname, 'analytics_data.json');

function printAdvancedAnalytics() {
  const stats = getStats();
  console.log(color('\n=== AI Consensus Analytics ===', 'header'));
  console.log(color('Total queries:', 'total'), stats.totalQueries);
  if (stats.mostCommonConsensus.consensus) {
    console.log(color('Most common consensus:', 'consensus'), color(stats.mostCommonConsensus.consensus, 'count'));
    console.log(color('Count:', 'consensus'), stats.mostCommonConsensus.count);
  } else {
    console.log(color('No consensus reached yet.', 'error'));
  }
  console.log(color('\nProvider Usage:', 'provider'));
  for (const [provider, count] of Object.entries(stats.providerUsage)) {
    console.log(color(`- ${provider}:`, 'provider'), count);
  }
  console.log(color('\nLast 10 Queries:', 'header'));
  stats.last10.forEach((q, idx) => {
    console.log(color(`\n#${stats.totalQueries - stats.last10.length + idx + 1}`, 'header'));
    console.log(color('Prompt:', 'prompt'), q.prompt);
    console.log(color('Consensus:', 'consensus'), q.consensus);
    console.log(color('Tally:', 'tally'), JSON.stringify(q.tally));
    console.log(color('Timestamp:', 'timestamp'), q.timestamp);
  });

  // Extra: Show provider error rates and consensus rates
  if (fs.existsSync(ANALYTICS_FILE)) {
    const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    const errorCounts = {};
    let consensusCount = 0;
    for (const q of data.queries) {
      if (q.consensus) consensusCount++;
      for (const [provider, answer] of Object.entries(q.all || {})) {
        if (typeof answer === 'string' && answer.startsWith('[ERROR')) {
          errorCounts[provider] = (errorCounts[provider] || 0) + 1;
        }
      }
    }
    console.log(color('\nProvider Error Rates:', 'error'));
    for (const [provider, count] of Object.entries(errorCounts)) {
      console.log(color(`- ${provider}:`, 'error'), count);
    }
    const consensusRate = (consensusCount / (data.queries.length || 1) * 100).toFixed(2);
    console.log(color(`\nConsensus Rate: ${consensusRate}%`, 'header'));
  }
}

printAdvancedAnalytics();
