import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from 'lib/authOptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GitHub OAuth: require authenticated session
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { limit = '10' } = req.query;
  try {
    const url = `https://fakestoreapi.com/products?limit=${encodeURIComponent(limit as string)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch items from external API');
    const items = await response.json();
    type StoreItem = {
  id: number;
  title: string;
  price: number;
  // add other fields if needed
};

    const mapped = (items as StoreItem[]).map((item) => ({
      id: item.id,
      name: item.title,
      price: item.price,
    }));
    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

