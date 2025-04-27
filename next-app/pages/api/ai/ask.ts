import type { NextApiRequest, NextApiResponse } from 'next';
import { bots, Bot } from './bots';

// Use OpenAI or another AI service for advanced intent/capability extraction
async function classifyIntent(question: string): Promise<string[]> {
  // For production, call an LLM to extract possible intents/capabilities
  // Here, we use OpenAI for demonstration (requires OPENAI_API_KEY)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OpenAI API key');
  const prompt = `Given the following user question, return a JSON array of all relevant capabilities or intents (e.g., chat, summarize, code, creative, echo, test, general, etc.):\n\nQuestion: "${question}"\n\nCapabilities:`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error('OpenAI intent classification failed');
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '[]';
  try {
    const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
<<<<<<< HEAD
    return Array.isArray(arr) ? arr.map((x: unknown) => String(x).toLowerCase()) : [];
=======
    return Array.isArray(arr) ? arr.map((x: any) => String(x).toLowerCase()) : [];
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  } catch {
    return [];
  }
}

// Select best bot(s) based on capabilities and weight
function selectBestBot(intents: string[]): Bot | null {
  let best: Bot | null = null;
  let bestScore = -1;
  for (const bot of bots) {
    const matchCount = bot.capabilities.filter(cap => intents.includes(cap)).length;
    const score = matchCount * bot.weight;
    if (score > bestScore) {
      best = bot;
      bestScore = score;
    }
  }
  return best;
}

// Fetch user-specific bot keys/endpoints
async function getUserBotKey(userId: string, botId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ai/user-bot-keys?userId=${encodeURIComponent(userId)}&botId=${encodeURIComponent(botId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.keys?.[botId] || null;
}

// Route question to the selected bot, using user credentials if present
async function callBot(bot: Bot, question: string, userId: string) {
  const userKey = userId ? await getUserBotKey(userId, bot.id) : null;
  if (bot.id === 'openai') {
    // Use chat action, override API key if user provided
    const apiKey = userKey?.apiKey || process.env.OPENAI_API_KEY;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
        max_tokens: 256,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } else if (bot.id === 'echo') {
    // Use echo action
    const endpoint = userKey?.endpoint || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ai/echo`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.result?.echo || '';
  }
  // Add more bot integrations here
  return 'No handler for selected bot.';
}

import { logAIAction } from './audit-log';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { question, userId } = req.body;
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Missing question' });
  try {
    // Step 1: Classify all possible intents/capabilities
    const intents = await classifyIntent(question);
    // Step 2: Select the best bot
    const bot = selectBestBot(intents);
    if (!bot) return res.status(404).json({ error: 'No suitable bot found' });
    // Step 3: Call the bot with user credentials if present
    let result = '';
    let usedKey = null;
    let usedEndpoint = null;
    try {
      const userKey = userId ? await getUserBotKey(userId, bot.id) : null;
      usedKey = userKey?.apiKey ? 'user-provided' : 'default';
      usedEndpoint = userKey?.endpoint || null;
      result = await callBot(bot, question, userId);
<<<<<<< HEAD
    } catch (botErr: unknown) {
      let msg = 'Unknown error';
      if (typeof botErr === 'object' && botErr !== null && 'message' in botErr) {
        msg = (botErr as { message?: string }).message || 'Unknown error';
      } else if (typeof botErr === 'string') {
        msg = botErr;
      }
      result = `Bot error: ${msg}`;
=======
    } catch (botErr: any) {
      result = `Bot error: ${botErr.message || botErr}`;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
    }
    // Log the decision and context
    logAIAction({
      userId,
      question,
      intents,
      selectedBot: bot.id,
      usedKey,
      usedEndpoint,
      result,
    });
    res.status(200).json({ result, bot: bot.name });
<<<<<<< HEAD
  } catch (err: unknown) {
    logAIAction({ userId, question, error: (typeof err === 'object' && err !== null && 'message' in err) ? (err as { message?: string }).message : 'Internal error' });
    res.status(500).json({ error: (typeof err === 'object' && err !== null && 'message' in err) ? (err as { message?: string }).message : 'Internal error' });
=======
  } catch (err: any) {
    logAIAction({ userId, question, error: err.message || 'Internal error' });
    res.status(500).json({ error: err.message || 'Internal error' });
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  }
}
