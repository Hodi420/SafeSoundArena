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
let validAccessToken;
let validRefreshToken;

// Security test scenarios
describe('Authentication Security Tests', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Clear Redis
    await redisClient.flushAll();
    
    // Create a test user
    testUser = await User.create({
      username: 'securitytestuser',
      email: 'security@test.com',
      password: 'SecurePass123!',
      role: 'user'
    });
    
    // Generate valid tokens
    validAccessToken = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    validRefreshToken = jwt.sign(
      { userId: testUser._id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store refresh token in Redis
    await redisClient.set(`refresh_token:${testUser._id}`, validRefreshToken, {
      EX: 60 * 60 * 24 * 7 // 7 days
    });
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await redisClient.quit();
  });
  
  describe('Brute Force Protection', () => {
    test('should block after multiple failed login attempts', async () => {
      const loginAttempts = 6; // One more than our rate limit
      
      for (let i = 0; i < loginAttempts; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'wrongpassword'
          });
        
        if (i < 5) {
          // First 5 attempts should fail with 401
          expect(res.statusCode).toBe(401);
        } else {
          // 6th attempt should be rate limited (429)
          expect(res.statusCode).toBe(429);
          expect(res.body).toHaveProperty('message', 'Too many requests, please try again later.');
        }
      }
    });
  });
  
  describe('JWT Security', () => {
    test('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'Bearer invalid.token.here',
        jwt.sign({ userId: testUser._id }, 'wrong-secret'),
        jwt.sign({ userId: testUser._id }, JWT_SECRET, { expiresIn: '-1s' })
      ];
      
      for (const token of invalidTokens) {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(401);
      }
    });
    
    test('should reject tampered JWT tokens', async () => {
      // Create a valid token then tamper with it
      const tokenParts = validAccessToken.split('.');
      const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.tampered${tokenParts[2]}`;
      
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('Refresh Token Security', () => {
    test('should reject reused refresh tokens', async () => {
      // First use of refresh token should work
      const res1 = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken });
      
      expect(res1.statusCode).toBe(200);
      
      // Second use of same refresh token should fail
      const res2 = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken });
      
      expect(res2.statusCode).toBe(401);
      expect(res2.body).toHaveProperty('error', 'Invalid or expired refresh token');
    });
    
    test('should reject refresh tokens after logout', async () => {
      // First login to get tokens
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!'
        });
      
      const { refreshToken } = loginRes.body.tokens;
      
      // Logout to invalidate the refresh token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.tokens.accessToken}`)
        .send({ refreshToken });
      
      // Try to use the refresh token after logout
      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });
      
      expect(refreshRes.statusCode).toBe(401);
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
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email,
            password: 'ValidPass123!'
          });
        
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Validation Error');
      }
    });
    
    test('should enforce strong password policy', async () => {
      const weakPasswords = [
        'short',
        'noNumber!',
        'NoSpecialChar1',
        'lowercaseonly1!',
        'UPPERCASEONLY1!',
        'NoNumbers!'
      ];
      
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password
          });
        
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Password does not meet requirements');
      }
    });
  });
  
  describe('Session Management', () => {
    test('should invalidate all sessions on password change', async () => {
      // First login to get tokens
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!'
        });
      
      const { accessToken, refreshToken } = loginRes.body.tokens;
      
      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!'
        });
      
      // Try to use the old access token
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res1.statusCode).toBe(401);
      
      // Try to use the old refresh token
      const res2 = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });
      
      expect(res2.statusCode).toBe(401);
      
      // Change password back for other tests
      await User.findByIdAndUpdate(testUser._id, { 
        password: 'SecurePass123!' 
      });
    });
  });
  
  describe('Role-Based Access Control', () => {
    test('should restrict admin routes to admin users only', async () => {
      // Create a non-admin user
      const regularUser = await User.create({
        username: 'regularuser',
        email: 'regular@test.com',
        password: 'RegularPass123!',
        role: 'user'
      });
      
      const userToken = jwt.sign(
        { userId: regularUser._id, role: 'user' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      // Try to access admin route with user token
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Access denied');
    });
  });
});
