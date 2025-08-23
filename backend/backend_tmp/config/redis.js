const redis = require('redis');
const { promisify } = require('util');

// Create Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many retries on Redis. Connection terminated.');
        return new Error('Too many retries');
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 12800ms, 25600ms, 51200ms
      return Math.min(retries * 100, 1000 * 60 * 5); // Max 5 minutes
    }
  }
});

// Promisify Redis methods
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);

// Error handling
client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connection handling
client.on('connect', () => {
  console.log('Connected to Redis');});

client.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

client.on('end', () => {
  console.log('Redis connection closed');
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  }
})();

// Export promisified methods and client
module.exports = {
  client,
  get: getAsync,
  set: setAsync,
  del: delAsync,
  // Add other Redis commands as needed
};
