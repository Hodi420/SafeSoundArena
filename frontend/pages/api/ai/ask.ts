import type { NextApiRequest, NextApiResponse } from 'next';

// Proxy route to the backend Hybrid AI Router
// Maps frontend POST /api/ai/ask -> backend POST /api/ai/chat
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    const body = req.body || {};
    const prompt: string = body.prompt || body.question || body.input || '';
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const payload = {
      prompt,
      context: body.context,
      complexity: body.complexity,
      requiresAccuracy: body.requiresAccuracy,
      requiresLatency: body.requiresLatency,
      userPreference: body.userPreference,
      maxTokens: body.maxTokens,
    };

    const backendRes = await fetch(`${backend}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await backendRes.json();
    const duration = Date.now() - start;

    if (!backendRes.ok) {
      console.error(`[API] /api/ai/ask proxy error ${backendRes.status}:`, data);
      return res.status(backendRes.status).json({ error: data?.error || 'Upstream error', duration });
    }

    // Normalize response shape for existing components (expects { result, bot? })
    const result = data?.response ?? null;
    const provider = data?.metadata?.provider ?? 'unknown';
    const bot = provider === 'local' ? 'Echo Bot' : 'OpenAI Chat';

    return res.status(200).json({ result, bot, metadata: data?.metadata, duration });
  } catch (err: any) {
    console.error('[API] /api/ai/ask unexpected error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}