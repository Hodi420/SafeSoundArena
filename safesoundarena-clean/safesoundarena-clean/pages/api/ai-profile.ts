import type { NextApiRequest, NextApiResponse } from 'next';
import { requirePioneer } from '../../src/utils/requirePioneer';
import { fetchProfile, saveProfile } from '../../src/services/aiProfileService';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();
  try {
  const user = (req as any).pioneer;
  if (req.method === 'GET') {
    const profile = fetchProfile(user.pi_uid);
    res.status(200).json(profile);
  } else if (req.method === 'POST') {
    const { avatarUrl, preferences } = req.body;
    saveProfile(user.pi_uid, { avatarUrl, preferences });
    res.status(200).json({ ok: true });
  } else {
    res.status(405).end();
  }
  } finally {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[API] /api/ai-profile ${req.method} took ${duration}ms`);
  }
};

export default requirePioneer(handler);
