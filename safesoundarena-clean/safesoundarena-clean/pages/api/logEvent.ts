import { NextApiRequest, NextApiResponse } from 'next';

// In-memory log store (for demo; use a DB for production)
let logs: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const event = req.body;
    logs.push(event);
    // Optionally: limit log size
    if (logs.length > 1000) logs = logs.slice(-1000);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'GET') {
    // Optional: filter by roomId
    const { roomId } = req.query;
    if (roomId) {
      return res.status(200).json(logs.filter(l => l.roomId === roomId));
    }
    return res.status(200).json(logs);
  }
  res.status(405).end();
}
