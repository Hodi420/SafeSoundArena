import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory notification store for demo (replace with DB or cache in production)
const notifications: Record<string, { message: string; timestamp: number }[]> = {};

// Utility to add a notification (called from dispatcher)
export function addInAppNotification(userId: string, message: string) {
  if (!userId) return;
  if (!notifications[userId]) notifications[userId] = [];
  notifications[userId].push({ message, timestamp: Date.now() });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, since } = req.query;
  if (typeof userId !== 'string') return res.status(400).json({ notifications: [] });
  const sinceTs = since ? Number(since) : 0;
  const userNotifs = notifications[userId] || [];
  const newNotifs = userNotifs.filter(n => n.timestamp > sinceTs).map(n => n.message);
  res.status(200).json({ notifications: newNotifs });
}
