// analytics.js
// Simple analytics for AI consensus system
const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, 'analytics_data.json');

function loadAnalytics() {
  if (!fs.existsSync(ANALYTICS_FILE)) return { queries: [] };
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
  } catch {
    return { queries: [] };
  }
}

function saveAnalytics(data) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function logQuery({ prompt, consensus, all, tally, userId = 'anonymous', pioneerKey = null, timestamp = new Date().toISOString() }) {
  const data = loadAnalytics();
  data.queries.push({ prompt, consensus, all, tally, userId, pioneerKey, timestamp });
  saveAnalytics(data);
}

function getStats() {
  const data = loadAnalytics();
  return {
    totalQueries: data.queries.length,
    mostCommonConsensus: getMostCommonConsensus(data.queries),
    providerUsage: getProviderUsage(data.queries),
    last10: data.queries.slice(-10),
    userBreakdown: getUserBreakdown(data.queries)
  };
}

function getUserBreakdown(queries) {
  const users = {};
  for (const q of queries) {
    const user = q.userId || 'anonymous';
    users[user] = users[user] || { count: 0, queries: [] };
    users[user].count++;
    users[user].queries.push(q);
  }
  return users;
}

function getMostCommonConsensus(queries) {
  const counts = {};
  for (const q of queries) {
    if (!q.consensus) continue;
    counts[q.consensus] = (counts[q.consensus] || 0) + 1;
  }
  let max = 0, most = null;
  for (const k in counts) {
    if (counts[k] > max) {
      max = counts[k];
      most = k;
    }
  }
  return { consensus: most, count: max };
}

function getProviderUsage(queries) {
  const usage = {};
  for (const q of queries) {
    if (!q.all) continue;
    for (const provider in q.all) {
      usage[provider] = (usage[provider] || 0) + 1;
    }
  }
  return usage;
}

module.exports = { logQuery, getStats };
