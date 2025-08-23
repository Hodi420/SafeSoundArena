const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testLeaderboard() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safesoundarena';
  let client;
  
  try {
    // Connect to MongoDB
    client = await MongoClient.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const db = client.db();
    console.log('Successfully connected to MongoDB');
    
    // Check if users collection exists
    const collections = await db.listCollections().toArray();
    const usersCollectionExists = collections.some(c => c.name === 'users');
    
    if (!usersCollectionExists) {
      console.log('Creating users collection with sample data...');
      await db.createCollection('users');
      
      // Insert sample users with scores
      await db.collection('users').insertMany([
        {
          username: 'user1',
          avatar: 'https://i.pravatar.cc/150?img=1',
          scores: {
            overall: 1000,
            scamDetection: 400,
            communityImpact: 600
          }
        },
        {
          username: 'user2',
          avatar: 'https://i.pravatar.cc/150?img=2',
          scores: {
            overall: 800,
            scamDetection: 600,
            communityImpact: 200
          }
        },
        {
          username: 'user3',
          avatar: 'https://i.pravatar.cc/150?img=3',
          scores: {
            overall: 1200,
            scamDetection: 200,
            communityImpact: 1000
          }
        }
      ]);
      
      console.log('Added sample users to the database');
    }
    
    // Test leaderboard queries
    console.log('\nTesting leaderboard queries...');
    
    // Overall leaderboard
    const overallLeaderboard = await db.collection('users')
      .find({})
      .sort({ 'scores.overall': -1 })
      .project({ username: 1, 'scores.overall': 1, _id: 0 })
      .toArray();
    
    console.log('\nOverall Leaderboard:');
    console.table(overallLeaderboard);
    
    // Scam Detection leaderboard
    const scamLeaderboard = await db.collection('users')
      .find({})
      .sort({ 'scores.scamDetection': -1 })
      .project({ username: 1, 'scores.scamDetection': 1, _id: 0 })
      .toArray();
    
    console.log('\nScam Detection Leaderboard:');
    console.table(scamLeaderboard);
    
    // Community Impact leaderboard
    const communityLeaderboard = await db.collection('users')
      .find({})
      .sort({ 'scores.communityImpact': -1 })
      .project({ username: 1, 'scores.communityImpact': 1, _id: 0 })
      .toArray();
    
    console.log('\nCommunity Impact Leaderboard:');
    console.table(communityLeaderboard);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the test
testLeaderboard();
