const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const { redisClient } = require('../config/redis');
const { JWT_SECRET, REFRESH_TOKEN_SECRET } = process.env;

let mongoServer;
let testUser;
let adminUser;

// Helper function to generate test tokens
const generateTestTokens = (userId, role = 'user', expiresIn = '15m') => {
  const accessToken = jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

describe('Authentication Edge Cases', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Clear Redis
    await redisClient.flushAll();
    
    // Create test users
    testUser = await User.create({
      username: 'edgetestuser',
      email: 'edge@test.com',
      password: 'EdgeTestPass123!',
      role: 'user',
      isEmailVerified: true
    });
    
    adminUser = await User.create({
      username: 'admintestuser',
      email: 'admin@test.com',
      password: 'AdminTestPass123!',
      role: 'admin',
      isEmailVerified: true
    });
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await redisClient.quit();
  });
  
  afterEach(async () => {
    // Clean up Redis after each test
    await redisClient.flushAll();
  });
  
  describe('Account Lockout', () => {
    test('should lock account after multiple failed login attempts', async () => {
      const maxAttempts = 5;
      
      // Make maxAttempts failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'edge@test.com',
            password: 'wrongpassword'
          });
      }
      
      // Next attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Account locked');
    });
    
    test('should unlock account after lockout period', async () => {
      // This test would typically use jest.useFakeTimers() in a real implementation
      // For now, we'll test the unlock endpoint
      const unlockResponse = await request(app)
        .post('/api/auth/unlock-account')
        .send({
          email: 'edge@test.com',
          token: 'valid-unlock-token' // In a real test, this would come from the unlock email
        });
      
      expect(unlockResponse.status).toBe(200);
      
      // Verify account is unlocked
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      expect(loginResponse.status).toBe(200);
    });
  });
  
  describe('Token Security', () => {
    test('should reject expired access tokens', async () => {
      // Generate an expired token
      const expiredToken = jwt.sign(
        { userId: testUser._id, role: 'user' },
        JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token expired');
    });
    
    test('should reject tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(
        { userId: testUser._id, role: 'user' },
        'wrong-secret', // Different secret
        { expiresIn: '15m' }
      );
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
    
    test('should prevent token reuse after logout', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      const { accessToken, refreshToken } = loginResponse.body.tokens;
      
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      
      // Try to use the logged out access token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Role-Based Access Control', () => {
    test('should allow admin to access user list', async () => {
      const { accessToken } = generateTestTokens(adminUser._id, 'admin');
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('should prevent non-admin from accessing admin routes', async () => {
      const { accessToken } = generateTestTokens(testUser._id, 'user');
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });
  
  describe('Rate Limiting', () => {
    const testEmail = 'ratelimit@test.com';
    const testPassword = 'RateLimitPass123!';
    
    beforeAll(async () => {
      // Create a test user for rate limiting tests
      await User.create({
        username: 'ratelimitusertest',
        email: testEmail,
        password: testPassword,
        role: 'user',
        isEmailVerified: true
      });
    });
    
    test('should rate limit login attempts', async () => {
      const maxAttempts = 5; // Should match your rate limit configuration
      
      // Make maxAttempts + 1 requests
      for (let i = 0; i < maxAttempts + 1; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
        
        if (i < maxAttempts) {
          expect([401, 429]).toContain(response.status);
        } else {
          // Should be rate limited
          expect(response.status).toBe(429);
        }
      }
    });
    
    test('should rate limit password reset requests', async () => {
      const maxAttempts = 3; // Should match your rate limit configuration
      
      // Make maxAttempts + 1 requests
      for (let i = 0; i < maxAttempts + 1; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail });
        
        if (i < maxAttempts) {
          expect([200, 202]).toContain(response.status);
        } else {
          // Should be rate limited
          expect(response.status).toBe(429);
        }
      }
    });
  });
  
  describe('Input Validation', () => {
    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'user@.com',
        'user@domain',
        'user@domain.'
      ];
      
      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email,
            password: 'ValidPass123!'
          });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation Error');
      }
    });
    
    test('should reject weak passwords', async () => {
      const weakPasswords = [
        'short',
        'noNumber!',
        'NoSpecialChar1',
        'lowercaseonly1!',
        'UPPERCASEONLY1!',
        'NoNumbers!'
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: `test-${Date.now()}@example.com`,
            password
          });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
      }
    });
  });
  
  describe('Session Management', () => {
    test('should invalidate all sessions on password change', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      const { accessToken, refreshToken } = loginResponse.body.tokens;
      
      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'EdgeTestPass123!',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!'
        });
      
      // Try to use the old access token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(401);
      
      // Change password back for other tests
      await User.findByIdAndUpdate(testUser._id, { 
        password: 'EdgeTestPass123!' 
      });
    });
    
    test('should allow multiple concurrent sessions', async () => {
      // Create two separate logins
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'edge@test.com',
          password: 'EdgeTestPass123!'
        });
      
      // Both sessions should work
      const response1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session1.body.tokens.accessToken}`);
      
      const response2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session2.body.tokens.accessToken}`);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});
