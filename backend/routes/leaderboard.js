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
      sort: (sortCriteria) => ({
        limit: (limit) => ({
          project: (projection) => ({
            toArray: async () => {
              // Apply query filter
              let results = [...db.users];
              
              // Apply sorting
              const [field, direction] = Object.entries(sortCriteria)[0];
              const sortField = field.replace('scores.', '');
              
              results.sort((a, b) => {
                const aScore = sortField in a.scores ? a.scores[sortField] : 0;
                const bScore = sortField in b.scores ? b.scores[sortField] : 0;
                return direction === 1 ? aScore - bScore : bScore - aScore;
              });
              
              // Apply limit
              if (limit) {
                results = results.slice(0, limit);
              }
              
              // Apply projection
              if (projection) {
                const includeFields = Object.entries(projection)
                  .filter(([_, value]) => value === 1)
                  .map(([key]) => key);
                
                if (includeFields.length > 0) {
                  results = results.map(user => {
                    const filtered = {};
                    includeFields.forEach(field => {
                      if (field.includes('.')) {
                        // Handle nested fields (e.g., 'scores.overall')
                        const [parent, child] = field.split('.');
                        if (parent in user && child in user[parent]) {
                          filtered[parent] = { [child]: user[parent][child] };
                        }
                      } else if (field in user) {
                        filtered[field] = user[field];
                      }
                    });
                    return filtered;
                  });
                }
              }
              
              return results;
            }
          })
        })
      })
    }),
    
    findOne: async (query) => {
      return db.users.find(user => {
        return Object.entries(query).every(([key, value]) => {
          if (key === '_id') return user._id === value;
          return user[key] === value;
        });
      });
    },
    
    updateOne: async (filter, update, options) => {
      const userIndex = db.users.findIndex(user => {
        return Object.entries(filter).every(([key, value]) => {
          if (key === '_id') return user._id === value;
          return user[key] === value;
        });
      });
      
      if (userIndex === -1) {
        if (options?.upsert) {
          // Create new user
          const newUser = {
            _id: uuidv4(),
            ...update.$setOnInsert,
            scores: {
              overall: 0,
              scamDetection: 0,
              communityImpact: 0,
              ...(update.$setOnInsert?.scores || {})
            }
          };
          
          if (update.$inc) {
            Object.entries(update.$inc).forEach(([key, value]) => {
              if (key.startsWith('scores.')) {
                const scoreType = key.split('.')[1];
                newUser.scores[scoreType] = (newUser.scores[scoreType] || 0) + value;
              } else {
                newUser[key] = (newUser[key] || 0) + value;
              }
            });
          }
          
          db.users.push(newUser);
          return { result: { n: 1, ok: 1 } };
        }
        return { result: { n: 0, ok: 1 } };
      }
      
      // Update existing user
      const user = { ...db.users[userIndex] };
      
      if (update.$set) {
        Object.entries(update.$set).forEach(([key, value]) => {
          if (key.startsWith('scores.')) {
            const scoreType = key.split('.')[1];
            user.scores = user.scores || {};
            user.scores[scoreType] = value;
          } else {
            user[key] = value;
          }
        });
      }
      
      if (update.$inc) {
        Object.entries(update.$inc).forEach(([key, value]) => {
          if (key.startsWith('scores.')) {
            const scoreType = key.split('.')[1];
            user.scores = user.scores || {};
            user.scores[scoreType] = (user.scores[scoreType] || 0) + value;
          } else {
            user[key] = (user[key] || 0) + value;
          }
        });
      }
      
      // Update overall score if it's not being set directly
      if (!update.$set?.['scores.overall'] && !update.$inc?.['scores.overall']) {
        user.scores.overall = (user.scores.scamDetection || 0) + (user.scores.communityImpact || 0);
      }
      
      db.users[userIndex] = user;
      return { result: { n: 1, nModified: 1, ok: 1 } };
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
