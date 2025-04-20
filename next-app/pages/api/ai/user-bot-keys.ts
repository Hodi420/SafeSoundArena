import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for demo. Use DB in production!
const userBotKeys: Record<string, Record<string, { apiKey: string; endpoint?: string }>> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, botId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Missing userId' });
  if (req.method === 'GET') {
    return res.status(200).json({ keys: userBotKeys[userId] || {} });
  }
  if (req.method === 'POST') {
    const { apiKey, endpoint } = req.body;
    if (!botId || typeof botId !== 'string') return res.status(400).json({ error: 'Missing botId' });
    if (!userBotKeys[userId]) userBotKeys[userId] = {};
    userBotKeys[userId][botId] = { apiKey, endpoint };
    return res.status(200).json({ status: 'saved' });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
