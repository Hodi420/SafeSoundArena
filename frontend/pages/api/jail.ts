// pages/api/jail.ts
// Proxy API route to connect frontend to backend Jail Time endpoints
import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Proxy jail status
    const response = await fetch(`${BACKEND_URL}/api/jail-status`);
    const data = await response.json();
    return res.status(200).json(data);
  }
  if (req.method === 'POST') {
    // Proxy jail activate/deactivate (admin)
    const auth = req.headers.authorization || '';
    const response = await fetch(`${BACKEND_URL}/api/jail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
