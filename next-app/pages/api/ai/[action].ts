import type { NextApiRequest, NextApiResponse } from 'next';

// Example AI action handlers
type AIActionHandler = (payload: any) => Promise<any>;

const handlers: Record<string, AIActionHandler> = {
  echo: async (payload) => ({ echo: payload }),
  chat: async (payload) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OpenAI API key');
    const { prompt, model = 'gpt-3.5-turbo', max_tokens = 128 } = payload;
    if (!prompt) throw new Error('Missing prompt');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  if (typeof action !== 'string') {
    return res.status(400).json({ error: 'Invalid action parameter' });
  }
  const handlerFn = handlers[action];
  if (!handlerFn) {
    return res.status(404).json({ error: `Unknown AI action: ${action}` });
  }
  try {
    const result = await handlerFn(req.body);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
