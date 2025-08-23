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

describe('Security Tests', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Clear Redis
    await redisClient.flushAll();
    
    // Create test user
    testUser = await User.create({
      username: 'securitytestuser',
      email: 'security@test.com',
      password: 'SecurityTestPass123!',
      role: 'user',
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
      let response;
      
      // Make maxAttempts + 1 requests
      for (let i = 0; i < maxAttempts + 1; i++) {
        response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
        
        if (i < maxAttempts) {
          expect([401, 429]).toContain(response.status);
        }
      }
      
      // Should be rate limited
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests, please try again later');
    });

    test('should rate limit password reset requests', async () => {
      const maxAttempts = 3; // Should match your rate limit configuration
      let response;
      
      // Make maxAttempts + 1 requests
      for (let i = 0; i < maxAttempts + 1; i++) {
        response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail });
        
        if (i < maxAttempts) {
          expect([200, 202]).toContain(response.status);
        }
      }
      
      // Should be rate limited
      expect(response.status).toBe(429);
    });
  });

  describe('Account Lockout', () => {
    test('should lock account after multiple failed login attempts', async () => {
      const maxAttempts = 5;
      
      // Make maxAttempts failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'wrongpassword'
          });
      }
      
      // Next attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Account locked');
      
      // Check if account is actually locked in the database
      const user = await User.findOne({ email: 'security@test.com' });
      expect(user.isLocked).toBe(true);
      expect(user.lockUntil).toBeGreaterThan(Date.now());
    });

    test('should not allow login with locked account', async () => {
      // Lock the account
      await User.findByIdAndUpdate(testUser._id, { 
        isLocked: true,
        lockUntil: Date.now() + 3600000 // 1 hour from now
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Account locked');
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
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
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
      expect(response.body).toHaveProperty('error', 'Token revoked');
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
            username: `testuser_${Date.now()}`,
            email: `test-${Date.now()}@example.com`,
            password
          });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
      }
    });

    test('should prevent NoSQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null }, // NoSQL injection attempt
          password: { $gt: '' } // NoSQL injection attempt
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid input');
    });
  });

  describe('Session Management', () => {
    test('should invalidate all sessions on password change', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
        });
      
      const { accessToken, refreshToken } = loginResponse.body.tokens;
      
      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurityTestPass123!',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!'
        });
      
      // Try to use the old access token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token revoked');
      
      // Change password back for other tests
      await User.findByIdAndUpdate(testUser._id, { 
        password: 'SecurityTestPass123!' 
      });
    });

    test('should allow multiple concurrent sessions', async () => {
      // Create two separate logins
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
        });
      
      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
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

  describe('CSRF Protection', () => {
    test('should require CSRF token for state-changing requests', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurityTestPass123!'
        });
      
      const { accessToken } = loginResponse.body.tokens;
      
      // Try to change password without CSRF token
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurityTestPass123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });
      
      // Should be rejected with 403 Forbidden
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'CSRF token required');
    });
  });

  describe('Content Security Policy', () => {
    test('should have proper CSP headers', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Security-Policy', /default-src 'self'/);
      
      expect(response.status).toBe(200);
    });
  });

  describe('HTTP Headers', () => {
    test('should have security headers set', async () => {
      const response = await request(app)
        .get('/')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect('X-Frame-Options', 'DENY')
        .expect('X-XSS-Protection', '1; mode=block')
        .expect('Strict-Transport-Security', /max-age=\d+/);
      
      expect(response.status).toBe(200);
    });
  });
});
