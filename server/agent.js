const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./agent-config.json');

const app = express();
app.use(express.json());

function isAllowed(command) {
  return config.allowedCommands.includes(command);
}

function isRestrictedPath(targetPath) {
  return config.restrictedFolders.some(folder =>
    path.resolve(targetPath).startsWith(path.resolve(folder))
  );
}

function isActiveHour() {
  const now = new Date();
  const [start, end] = config.activeHours;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

app.post('/api/agent', (req, res) => {
  const { command, args, targetPath, confirm, apiKey } = req.body;
  if (!isAllowed(command)) return res.status(403).json({ error: 'Command not allowed' });
  if (targetPath && isRestrictedPath(targetPath)) return res.status(403).json({ error: 'Target path restricted' });
  if (!isActiveHour()) return res.status(403).json({ error: 'Outside active hours' });
  if (config.requireConfirmation.includes(command) && !confirm) {
    return res.status(403).json({ error: 'Confirmation required for this command' });
  }

  // Audit log
  fs.appendFileSync('agent.log', `${new Date().toISOString()} EXEC: ${command} ${args ? JSON.stringify(args) : ''} ${targetPath || ''}\n`);

  // Real execution for local commands
  if (command === 'open_game' && args && args.exePath) {
    // Example: Open a game executable
    exec(`start "" "${args.exePath}"`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Game launched: ${args.exePath}` });
    });
    return;
  }
  if (command === 'move_file' && args && args.src && args.dest) {
    // Move file
    fs.rename(args.src, args.dest, err => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ ok: true, message: `File moved from ${args.src} to ${args.dest}` });
    });
    return;
  }
  if (command === 'delete_temp' && args && args.file) {
    // Delete file
    fs.unlink(args.file, err => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ ok: true, message: `File deleted: ${args.file}` });
    });
    return;
  }
  if (command === 'run_update' && args && args.script) {
    // Run update script
    exec(`powershell ./scripts/${args.script}`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Update script executed: ${args.script}` });
    });
    return;
  }

  // Internet/API actions - now enabled!
  if (command === 'fetch_github') {
    if (!args || !args.repo) return res.status(400).json({ error: 'Missing repo' });
    exec(`git clone ${args.repo}`, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
      return res.json({ ok: true, message: `Repo cloned: ${args.repo}` });
    });
    return;
  }
  if (command === 'query_openai') {
    if (!apiKey) return res.status(400).json({ error: 'API key required' });
    // Minimal OpenAI call (text completion)
    const https = require('https');
    const payload = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: args && args.prompt ? args.prompt : 'Hello!' }]
    });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const reqOpenAI = https.request(options, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json({ ok: true, result: parsed.choices ? parsed.choices[0].message.content : data });
        } catch {
          res.json({ ok: true, result: data });
        }
      });
    });
    reqOpenAI.on('error', e => res.status(500).json({ error: e.message }));
    reqOpenAI.write(payload);
    reqOpenAI.end();
    return;
  }
  if (command === 'query_ollama') {
    // Minimal Ollama local API call
    const http = require('http');
    const ollamaReq = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json({ ok: true, result: parsed.message || data });
        } catch {
          res.json({ ok: true, result: data });
        }
      });
    });
    ollamaReq.on('error', e => res.status(500).json({ error: e.message }));
    ollamaReq.write(JSON.stringify({ model: args && args.model ? args.model : 'llama2', messages: [{ role: 'user', content: args && args.prompt ? args.prompt : 'Hello Ollama!' }] }));
    ollamaReq.end();
    return;
  }
  if (command === 'fetch_url') {
    if (!args || !args.url) return res.status(400).json({ error: 'Missing URL' });
    const https = require('https');
    https.get(args.url, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => res.json({ ok: true, result: data.substring(0, 1000) })); // Limit output
    }).on('error', e => res.status(500).json({ error: e.message }));
    return;
  }

  // Unknown command
  res.status(400).json({ error: 'Unknown or unimplemented command' });
});

module.exports = app;
