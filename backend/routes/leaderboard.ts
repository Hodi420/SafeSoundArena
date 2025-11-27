import express, { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';
import { PubSub } from 'graphql-subscriptions';

const router: Router = express.Router();
const pubsub = new PubSub();

const LEADERBOARD_TYPES = ['overall', 'scam_detection', 'community_impact'];

// Helper function to map leaderboard type to stored score key
function scoreKeyFromType(type: string): 'overall' | 'scamDetection' | 'communityImpact' {
  if (type === 'scam_detection') return 'scamDetection';
  if (type === 'community_impact') return 'communityImpact';
  return 'overall';
}

// Helper to return a collection-like API backed by Redis for tests/dev
const getUsersCollection = () => {
  return {
    find: (query: any = {}) => ({
      sort: (sortCriteria: { [k: string]: number }) => ({
        limit: (limit: number) => ({
          project: (projection: { [k: string]: number }) => ({
            toArray: async (): Promise<User[]> => {
              const [[field, direction]] = Object.entries(sortCriteria) as [string, number][];
              const scoreType = field.replace('scores.', '');
              const leaderboardKey = `leaderboard:${scoreType}`;
              const userIds = await (redisClient as any).zRange(
                leaderboardKey,
                0,
                limit ? limit - 1 : -1,
                { REV: direction === -1 }
              );
              const users: User[] = [];
              for (const id of userIds) {
                const raw = await redisClient.hGetAll(`user:${id}`);
                const userData = raw as unknown as Record<string, string>;
                if (userData && Object.keys(userData).length) {
                  users.push({
                    _id: id,
                    username: userData.username,
                    avatar: userData.avatar,
                    scores: {
                      overall: Number(userData.overall || 0),
                      scamDetection: Number(userData.scamDetection || 0),
                      communityImpact: Number(userData.communityImpact || 0),
                    },
                  });
                }
              }
              return users;
            },
          }),
        }),
      }),
    }),
    findOne: async (query: { [k: string]: any }) => {
      if (query._id) {
        const raw = await redisClient.hGetAll(`user:${query._id}`);
        const userData = raw as unknown as Record<string, string>;
        if (!userData || Object.keys(userData).length === 0) return null;
        return {
          _id: query._id,
          username: userData.username,
          avatar: userData.avatar,
          scores: {
            overall: Number(userData.overall || 0),
            scamDetection: Number(userData.scamDetection || 0),
            communityImpact: Number(userData.communityImpact || 0),
          },
        };
      }
      return null;
    },
    updateOne: async (
      filter: { [k: string]: any },
      update: any,
      options?: { upsert?: boolean }
    ) => {
      let userId = filter._id;
      if (!userId && options?.upsert) {
        userId = uuidv4();
      }
      if (!userId) return { result: { n: 0, ok: 1 } };
      const userKey = `user:${userId}`;

      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
          if (key.startsWith('scores.')) {
            const scoreType = key.split('.')[1];
            const current = Number((await redisClient.hGet(userKey, scoreType)) || 0);
            const incValue = Number(value || 0);
            const newVal = current + incValue;
            await redisClient.hSet(userKey, scoreType, String(newVal));
            await (redisClient as any).zAdd(`leaderboard:${scoreType}`, {
              score: newVal,
              value: userId,
            });
            const updatedUser = await getUsersCollection().findOne({ _id: userId });
            await pubsub.publish(`LEADERBOARD_UPDATED_${scoreType.toUpperCase()}`, {
              leaderboardUpdated: updatedUser,
            });
          }
        }
      }

      if (update.$set) {
        for (const [key, value] of Object.entries(update.$set)) {
          if (key.startsWith('scores.')) {
            const scoreType = key.split('.')[1];
            await redisClient.hSet(userKey, scoreType, String(value));
            // update sorted set as well
            const newVal = Number(value || 0);
            await (redisClient as any).zAdd(`leaderboard:${scoreType}`, {
              score: newVal,
              value: userId,
            });
          } else {
            await redisClient.hSet(userKey, key, String(value));
          }
        }
      }

      // Ensure scores object exists on insert
      if (options?.upsert && update.$setOnInsert) {
        const s = update.$setOnInsert.scores || {};
        await redisClient.hSet(userKey, 'overall', String(s.overall || 0));
        await redisClient.hSet(userKey, 'scamDetection', String(s.scamDetection || 0));
        await redisClient.hSet(userKey, 'communityImpact', String(s.communityImpact || 0));
      }

      return { result: { n: 1, ok: 1 } };
    },
  };
};

// Get leaderboard by type
router.get('/:type?', async (req, res) => {
  try {
    const type = req.params.type || 'overall';

    if (!LEADERBOARD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const key = scoreKeyFromType(type);
    const sortField = `scores.${key}`;

    const collection = getUsersCollection();
    const leaderboard = await collection
      .find({})
      .sort({ [sortField]: -1 })
      .limit(100)
      .project({ username: 1, avatar: 1, [sortField]: 1 })
      .toArray();

    const rankedLeaderboard = leaderboard.map((user, index) => {
      const score = user.scores ? (user.scores as any)[key] || 0 : 0;
      return { rank: index + 1, username: user.username, avatar: user.avatar, score };
    });

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user score
router.post('/update-score', async (req, res) => {
  try {
    const { userId, type, score, action } = req.body;

    if (!userId || !type || (score === undefined && !action)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!LEADERBOARD_TYPES.includes(type) && type !== 'all') {
      return res.status(400).json({ error: 'Invalid score type' });
    }

    const collection = getUsersCollection();
    const updateQuery: any = {};

    if (action) {
      updateQuery.$inc = {};
      const scoreValue = Number(score || 1);
      if (type === 'all') {
        updateQuery.$inc['scores.overall'] = scoreValue;
        updateQuery.$inc['scores.scamDetection'] = scoreValue;
        updateQuery.$inc['scores.communityImpact'] = scoreValue;
      } else {
        const key = scoreKeyFromType(type);
        updateQuery.$inc[`scores.${key}`] = scoreValue;
      }
    } else {
      updateQuery.$set = updateQuery.$set || {};
      if (type === 'all') {
        updateQuery.$set['scores.overall'] = score;
        updateQuery.$set['scores.scamDetection'] = score;
        updateQuery.$set['scores.communityImpact'] = score;
      } else {
        const key = scoreKeyFromType(type);
        updateQuery.$set[`scores.${key}`] = score;
      }
    }

    updateQuery.$setOnInsert = {
      scores: { overall: 0, scamDetection: 0, communityImpact: 0 },
    };

    const result = await collection.updateOne({ _id: userId }, updateQuery, { upsert: true });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().catch((err) => console.error('Redis connect error', err));

interface User {
  _id: string;
  username: string;
  avatar: string;
  scores: {
    overall: number;
    scamDetection: number;
    communityImpact: number;
  };
}

export default router;
