// pages/api/jail.ts
// Proxy API route to connect frontend to backend Jail Time endpoints
import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 5000;

async function fetchBackend(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponse(response: Response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return { message: body || 'Backend returned an invalid response' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Proxy jail status
      const response = await fetchBackend(`${BACKEND_URL}/api/jail-status`);
      const data = await readResponse(response);
      return res.status(response.status).json(data);
    }
    if (req.method === 'POST') {
      // Proxy jail activate/deactivate (admin)
      const auth = req.headers.authorization || '';
      const response = await fetchBackend(`${BACKEND_URL}/api/jail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify(req.body)
      });
      const data = await readResponse(response);
      return res.status(response.status).json(data);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? 'Backend request timed out' : 'Backend unavailable',
    });
  }
}
