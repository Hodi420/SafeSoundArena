import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 10000;

function getRequestBody(req: NextApiRequest) {
  if (req.body === undefined || req.body === null || req.body === '') {
    return undefined;
  }
  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
}

async function readResponse(response: Response) {
  const body = await response.text();
  const contentType = response.headers.get('content-type') || '';
  return {
    body,
    contentType,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
  if (!path) {
    return res.status(400).json({ error: 'Missing API path' });
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) query.append(key, item);
    }
  }

  const target = `${BACKEND_URL}/api/${path}${query.toString() ? `?${query}` : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    const authorization = req.headers.authorization;
    if (authorization) headers.Authorization = authorization;
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

    const response = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'DELETE'].includes(req.method || '') ? undefined : getRequestBody(req),
      signal: controller.signal,
    });
    const result = await readResponse(response);

    if (result.contentType) res.setHeader('Content-Type', result.contentType);
    return res.status(response.status).send(result.body);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? 'Backend request timed out' : 'Backend unavailable',
    });
  } finally {
    clearTimeout(timeout);
  }
}
