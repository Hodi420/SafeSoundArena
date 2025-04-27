import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.PI_JWT_SECRET || 'supersecret';

export function requireSafeSound(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/safesound_session=([^;]+)/);
    if (!match) return res.status(401).json({ error: 'Not authenticated as SafeSoundArena' });
    try {
<<<<<<< HEAD
      const decoded = jwt.verify(match[1], JWT_SECRET) as Record<string, unknown>;
      if (!decoded || !decoded.isSafeSoundArena) throw new Error('Not a SafeSoundArena');
      // Attach SafeSoundArena info to req for downstream use
      (req as Record<string, unknown>).safesound = decoded;
=======
      const decoded = jwt.verify(match[1], JWT_SECRET) as any;
      if (!decoded || !decoded.isSafeSoundArena) throw new Error('Not a SafeSoundArena');
      // Attach SafeSoundArena info to req for downstream use
      (req as any).safesound = decoded;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}
