const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

let mongoServer;

// Mock Pi Network API
jest.mock('axios');
const axios = require('axios');

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test@1234',
  role: 'user'
};

// Setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  // Clear Redis
  await redisClient.flushAll();
  
  // Mock Pi Network API response
  axios.get.mockResolvedValueOnce({
    data: {
      publicKey: 'test-public-key'
    }
  });
  
  axios.get.mockResolvedValueOnce({
    data: {
      uid: 'pi-user-123',
      username: 'pi_test_user',
      kyc_verified: true,
      scopes: ['username', 'payments']
    }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await redisClient.quit();
  jest.clearAllMocks();
});

describe('Authentication System', () => {
  describe('JWT Authentication', () => {
    let accessToken;
    let refreshToken;
    
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
    });
    
    test('should login and get tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
    
    test('should access protected route with valid token', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Protected data');
    });
    
    test('should refresh access token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      
      // Update tokens for next tests
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
    
    test('should logout and invalidate tokens', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      
      expect(res.statusCode).toEqual(200);
      
      // Verify token is invalidated
      const verifyRes = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(verifyRes.statusCode).toEqual(401);
    });
  });
  
  describe('Pi Network Authentication', () => {
    test('should authenticate with Pi Network token', async () => {
      const piToken = 'test-pi-token';
      
      const res = await request(app)
        .get('/api/pi/user')
        .set('Authorization', `Bearer ${piToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('uid');
      expect(res.body.username).toBe('pi_test_user');
    });
    
    test('should enforce rate limiting', async () => {
      const piToken = 'test-pi-token-2';
      
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        const res = await request(app)
          .get('/api/pi/user')
          .set('Authorization', `Bearer ${piToken}`);
          
        if (i >= 10) {
          // After 10 requests, should be rate limited
          expect(res.statusCode).toEqual(429);
        }
      }
    });
  });
});
