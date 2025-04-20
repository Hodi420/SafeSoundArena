import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory bot registry for demonstration (replace with DB or smart contract for production)
export type Bot = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  weight: number;
  endpoint?: string; // For remote bots
};

// Example: Add more bots and capabilities as needed
export const bots: Bot[] = [
  {
    id: 'openai',
    name: 'OpenAI Chat',
    description: 'General-purpose AI chat and reasoning',
    capabilities: ['general', 'chat', 'summarize', 'code', 'creative'],
    weight: 0.9,
  },
  {
    id: 'echo',
    name: 'Echo Bot',
    description: 'Echoes input back for testing',
    capabilities: ['test', 'echo'],
    weight: 0.1,
  },
  // Add more bots here
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ bots });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
