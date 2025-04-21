import type { NextApiRequest, NextApiResponse } from 'next';
import { requirePioneer } from '../../src/utils/requirePioneer';
import { fetchHistory } from '../../src/services/aiProfileService';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();
  try {
  const user = (req as any).pioneer;
  const history = fetchHistory(user.pi_uid);
  res.status(200).json({ history });
  } finally {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[API] /api/ai-history GET took ${duration}ms`);
  }
};

export default requirePioneer(handler);
