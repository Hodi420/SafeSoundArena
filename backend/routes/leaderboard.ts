import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';
import { PubSub } from 'graphql-subscriptions';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory storage for development
let db = {
  users: [
    {
      _id: '1',
      username: 'user1',
      avatar: 'https://i.pravatar.cc/150?img=1',
      scores: {
        overall: 1000,
        scamDetection: 400,
        communityImpact: 600
      }
    },
    {
      _id: '2',
      username: 'user2',
      avatar: 'https://i.pravatar.cc/150?img=2',
      scores: {
        overall: 800,
        scamDetection: 600,
        communityImpact: 200
      }
    },
    {
      _id: '3',
      username: 'user3',
      avatar: 'https://i.pravatar.cc/150?img=3',
      scores: {
        overall: 1200,
        scamDetection: 200,
        communityImpact: 1000
      }
    }
  ]
};

const LEADERBOARD_TYPES = ['overall', 'scam_detection', 'community_impact'];

// Helper function to get users collection
const getUsersCollection = () => {
  return {
    find: (query = {}) => ({
      sort: (sortCriteria: { [key: string]: number }) => ({
        limit: (limit: number) => ({
          project: (projection: { [key: string]: number }) => ({
            toArray: async (): Promise<User[]> => {
              const [field, direction] = Object.entries(sortCriteria)[0];
              const scoreType = field.replace('scores.', '');
              const leaderboardKey = `leaderboard:${scoreType}`;
              const userIds = await redisClient.zRange(leaderboardKey, 0, limit ? limit - 1 : -1, { REV: direction === -1 });
              const users: User[] = [];
              for (const id of userIds) {
                const userData = await redisClient.hGetAll(`user:${id}`);
                if (userData) {
                  users.push({
                    _id: id,
                    username: userData.username,
                    avatar: userData.avatar,
                    scores: {
                      overall: parseInt(userData.overall || '0'),
                      scamDetection: parseInt(userData.scamDetection || '0'),
                      communityImpact: parseInt(userData.communityImpact || '0'),
                    }
                  });
                }
              }
              return users;
            }
          })
        })
      })
    }),
    findOne: async (query: { [key: string]: any }) => {
      if (query._id) {
        const userData = await redisClient.hGetAll(`user:${query._id}`);
        if (Object.keys(userData).length === 0) return null;
        return {
          _id: query._id,
          username: userData.username,
          avatar: userData.avatar,
          scores: {
            overall: parseInt(userData.overall || '0'),
            scamDetection: parseInt(userData.scamDetection || '0'),
            communityImpact: parseInt(userData.communityImpact || '0'),
          }
        };
      }
      return null;
    },
    updateOne: async (filter: { [key: string]: any }, update: { [key: string]: any }, options?: { upsert?: boolean }) => {
      let userId = filter._id;
      if (!userId && options?.upsert) {
        userId = uuidv4();
      }
      if (!userId) return { result: { n: 0, ok: 1 } };
      const userKey = `user:${userId}`;
      // Handle $set and $inc
      // For simplicity, assume $inc for scores
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
          if (key.startsWith('scores.')) {
            const scoreType = key.split('.')[1];
            const current = parseInt(await redisClient.hGet(userKey, scoreType) || '0');
            await redisClient.hSet(userKey, scoreType, current + value);
            await redisClient.zAdd(`leaderboard:${scoreType}`, { score: current + value, value: userId });
            // In updateOne, after updating scores
            // Fetch updated user data
            const updatedUser = await this.findOne({ _id: userId });
            pubsub.publish(`LEADERBOARD_UPDATED_${scoreType.toUpperCase()}`, { leaderboardUpdated: updatedUser });
          }
        }
      }
      // Update overall if needed
      // ... similar for other operations
      return { result: { n: 1, ok: 1 } };
    }
  };
};

// Get leaderboard by type
router.get('/:type?', async (req, res) => {
  try {
    const type = req.params.type || 'overall';
    
    if (!LEADERBOARD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const collection = getUsersCollection();
    let sortField = 'scores.overall';
    
    // Determine sort field based on leaderboard type
    switch(type) {
      case 'scam_detection':
        sortField = 'scores.scamDetection';
        break;
      case 'community_impact':
        sortField = 'scores.communityImpact';
        break;
      default: // overall
        sortField = 'scores.overall';
    }

    const leaderboard = await collection
      .find({})
      .sort({ [sortField]: -1 })
      .limit(100) // Top 100 users
      .project({
        username: 1,
        avatar: 1,
        [sortField]: 1
      })
      .toArray();

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => {
      const scoreField = sortField.replace('scores.', '');
      const score = user.scores ? user.scores[scoreField] || 0 : 0;
      
      return {
        rank: index + 1,
        username: user.username,
        avatar: user.avatar,
        score: score
      };
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
    const updateQuery = {};
    
    if (action) {
      // For actions like 'increment'
      updateQuery.$inc = {};
      const scoreValue = score || 1; // Default increment by 1 if no score provided
      
      if (type === 'all') {
        updateQuery.$inc['scores.overall'] = scoreValue;
        updateQuery.$inc['scores.scamDetection'] = scoreValue;
        updateQuery.$inc['scores.communityImpact'] = scoreValue;
      } else {
        updateQuery.$inc[`scores.${type}`] = scoreValue;
      }
    } else {
      // For absolute score updates
      updateQuery.$set = updateQuery.$set || {};
      
      if (type === 'all') {
        updateQuery.$set['scores.overall'] = score;
        updateQuery.$set['scores.scamDetection'] = score;
        updateQuery.$set['scores.communityImpact'] = score;
      } else {
        updateQuery.$set[`scores.${type}`] = score;
      }
    }

    // Ensure the scores object exists
    updateQuery.$setOnInsert = {
      scores: {
        overall: 0,
        scamDetection: 0,
        communityImpact: 0
      }
    };

    const result = await collection.updateOne(
      { _id: userId },
      updateQuery,
      { upsert: true }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));
await redisClient.connect();
// Remove in-memory db
// Replace with Redis operations in getUsersCollection
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

// Get leaderboard by type
router.get('/:type?', async (req, res) => {
  try {
    const type = req.params.type || 'overall';
    
    if (!LEADERBOARD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const collection = getUsersCollection();
    let sortField = 'scores.overall';
    
    // Determine sort field based on leaderboard type
    switch(type) {
      case 'scam_detection':
        sortField = 'scores.scamDetection';
        break;
      case 'community_impact':
        sortField = 'scores.communityImpact';
        break;
      default: // overall
        sortField = 'scores.overall';
    }

    const leaderboard = await collection
      .find({})
      .sort({ [sortField]: -1 })
      .limit(100) // Top 100 users
      .project({
        username: 1,
        avatar: 1,
        [sortField]: 1
      })
      .toArray();

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => {
      const scoreField = sortField.replace('scores.', '');
      const score = user.scores ? user.scores[scoreField] || 0 : 0;
      
      return {
        rank: index + 1,
        username: user.username,
        avatar: user.avatar,
        score: score
      };
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
    const updateQuery = {};
    
    if (action) {
      // For actions like 'increment'
      updateQuery.$inc = {};
      const scoreValue = score || 1; // Default increment by 1 if no score provided
      
      if (type === 'all') {
        updateQuery.$inc['scores.overall'] = scoreValue;
        updateQuery.$inc['scores.scamDetection'] = scoreValue;
        updateQuery.$inc['scores.communityImpact'] = scoreValue;
      } else {
        updateQuery.$inc[`scores.${type}`] = scoreValue;
      }
    } else {
      // For absolute score updates
      updateQuery.$set = updateQuery.$set || {};
      
      if (type === 'all') {
        updateQuery.$set['scores.overall'] = score;
        updateQuery.$set['scores.scamDetection'] = score;
        updateQuery.$set['scores.communityImpact'] = score;
      } else {
        updateQuery.$set[`scores.${type}`] = score;
      }
    }

    // Ensure the scores object exists
    updateQuery.$setOnInsert = {
      scores: {
        overall: 0,
        scamDetection: 0,
        communityImpact: 0
      }
    };

    const result = await collection.updateOne(
      { _id: userId },
      updateQuery,
      { upsert: true }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
