import type { NextApiRequest, NextApiResponse } from 'next';
import { requirePioneer } from '../../src/utils/requirePioneer';
import { fetchProfile, logHistory, callPersonalAI } from '../../src/services/aiProfileService';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();
  try {
  const user = (req as any).pioneer;
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Missing input' });
  const profile = fetchProfile(user.pi_uid);
  const output = await callPersonalAI(profile, input);
  logHistory(user.pi_uid, input, output);
  res.status(200).json({ output });
  } finally {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[API] /api/ai-interact POST took ${duration}ms`);
  }
};

export default requirePioneer(handler);
