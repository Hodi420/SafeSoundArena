// Simple Express API for Community Boards (Hall of Shame/Fame/Sites)
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4001;

const piAuth = require('./pi-auth-middleware');

app.use(express.json());

const boardsDir = path.join(__dirname, '../lobbies');
const shameFile = path.join(boardsDir, 'hall_of_shame.json');
const fameFile = path.join(boardsDir, 'hall_of_fame.json');
const sitesFile = path.join(boardsDir, 'sites_registry.json');

// Utility: load/save JSON
function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// GET boards
app.get('/api/boards/shame', (req, res) => res.json(load(shameFile)));
app.get('/api/boards/fame', (req, res) => res.json(load(fameFile)));
app.get('/api/boards/sites', (req, res) => res.json(load(sitesFile)));

// POST report user (shame/fame) - requires Pi Network authentication
app.post('/api/boards/report', piAuth, (req, res) => {
  const { username, type, description, evidence } = req.body;
  if (!username || !type || !description) return res.status(400).json({ error: 'Missing fields' });
  const reporter = req.piUser?.username || 'Unknown';
  const report = {
    reporter,
    type: type === 'scam' ? 'scam' : 'commendation',
    description,
    evidence: evidence || [],
    ai_score: 0.5,
    date: Math.floor(Date.now() / 1000)
  };
  if (type === 'scam') {
    let shame = load(shameFile);
    shame.push({
      username,
      type: 'scammer',
      reports: [report],
      ai_summary: 'Under review',
      community_score: -1,
      badges: ['User Reported']
    });
    save(shameFile, shame);
    res.json({ status: 'ok', board: 'shame' });
  } else {
    let fame = load(fameFile);
    fame.push({
      username,
      type: 'leader',
      reports: [report],
      ai_summary: 'Under review',
      community_score: 1,
      badges: ['User Commended']
    });
    save(fameFile, fame);
    res.json({ status: 'ok', board: 'fame' });
  }
});

// (Optional) POST new site - requires Pi Network authentication
app.post('/api/boards/site', piAuth, (req, res) => {
  const { site, type, description, evidence } = req.body;
  if (!site || !type) return res.status(400).json({ error: 'Missing fields' });
  const reporter = req.piUser?.username || 'Unknown';
  let sites = load(sitesFile);
  sites.push({
    site,
    type,
    reports: [
      {
        reporter,
        type,
        description: description || '',
        evidence: evidence || [],
        ai_score: 0.5,
        date: Math.floor(Date.now() / 1000)
      }
    ],
    ai_summary: 'Under review',
    community_score: 0
  });
  save(sitesFile, sites);
  res.json({ status: 'ok', board: 'sites' });
});

app.listen(PORT, () => console.log('Community Boards API running on port', PORT));
