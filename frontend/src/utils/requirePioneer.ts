import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.PI_JWT_SECRET || 'supersecret';

type PioneerSession = {
  pi_uid: string;
  username?: string;
  isPioneer?: boolean;
  [key: string]: unknown;
};

type SafeSoundSession = {
  isSafeSoundArena?: boolean;
  [key: string]: unknown;
};

function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || '';
  return cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function requirePioneer(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = readCookie(req, 'pioneer_session');
    if (!token) return res.status(401).json({ error: 'Not authenticated as Pioneer' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as PioneerSession;
      if (!decoded || !decoded.isPioneer || !decoded.pi_uid) {
        throw new Error('Not a Pioneer session');
      }
      (req as NextApiRequest & { pioneer: PioneerSession }).pioneer = decoded;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

export function requireSafeSound(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = readCookie(req, 'safesound_session');
    if (!token) return res.status(401).json({ error: 'Not authenticated as SafeSoundArena' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SafeSoundSession;
      if (!decoded || !decoded.isSafeSoundArena) throw new Error('Not a SafeSoundArena');
      (req as NextApiRequest & { safesound: SafeSoundSession }).safesound = decoded;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}
