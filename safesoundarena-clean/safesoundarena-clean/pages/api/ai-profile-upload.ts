import type { NextApiRequest, NextApiResponse } from 'next';
import { requirePioneer } from '../../src/utils/requirePioneer';
import { uploadTrainingData } from '../../src/services/aiProfileService';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();
  try {
  const user = (req as any).pioneer;
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing data' });
  uploadTrainingData(user.pi_uid, data);
  res.status(200).json({ ok: true });
  } finally {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[API] /api/ai-profile-upload POST took ${duration}ms`);
  }
};

export default requirePioneer(handler);
