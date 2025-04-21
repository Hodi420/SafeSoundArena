import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

// You should store this securely (e.g., in env vars)
const JWT_SECRET = process.env.PI_JWT_SECRET || 'supersecret';

// Pi Network verification endpoint
const PI_VERIFY_URL = 'https://api.minepi.com/v2/me';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { piToken } = req.body;
  if (!piToken) return res.status(400).json({ error: 'Missing Pi token' });

  // Verify token with Pi Network
  try {
    const piRes = await fetch(PI_VERIFY_URL, {
      headers: { Authorization: `Bearer ${piToken}` },
    });
    if (!piRes.ok) return res.status(401).json({ error: 'Invalid Pi token' });
    const pioneer = await piRes.json();

    // Optionally: check pioneer fields, e.g. username, roles, etc.
    // Issue JWT (or set HttpOnly cookie)
    const sessionToken = jwt.sign(
      { pi_uid: pioneer.uid, username: pioneer.username, isPioneer: true },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // For security, use HttpOnly cookie (or return token for client storage if needed)
    res.setHeader('Set-Cookie', `pioneer_session=${sessionToken}; HttpOnly; Path=/; Max-Age=43200; SameSite=Strict; Secure`);
    return res.status(200).json({ ok: true, pioneer: { username: pioneer.username, uid: pioneer.uid } });
  } catch (err) {
    return res.status(500).json({ error: 'Pi verification failed' });
  }
}
