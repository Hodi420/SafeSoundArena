const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend access

app.get('/', (req, res) => {
  res.send('Llama backend is running!');
});
app.post('/api/llama', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
      }),
    });
    const data = await response.json();
    res.json({ response: data.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});