import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory audit log for demo. Use a DB or log service for production!
let auditLog: any[] = [];

export function logAIAction(entry: any) {
  auditLog.push({ ...entry, timestamp: Date.now() });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ log: auditLog });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
