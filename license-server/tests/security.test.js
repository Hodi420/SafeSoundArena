/**
 * בדיקות אבטחה עבור שרת הרישיונות
 * Security tests for the license server
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

// מוק למשתני סביבה לבדיקות
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ADMIN_PASSWORD = 'test_admin_password';

// נתוני בדיקה
let validToken;
let expiredToken;
let invalidToken;
let tamperToken;

// הכנה לפני כל הבדיקות
beforeAll(() => {
  // יצירת טוקן תקף
  validToken = jwt.sign({ isAdmin: true, timestamp: Date.now() }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  // יצירת טוקן שפג תוקפו
  expiredToken = jwt.sign(
    { isAdmin: true, timestamp: Date.now() - 3600000 * 2 }, // לפני שעתיים
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // יצירת טוקן לא תקף (חתום עם מפתח שגוי)
  invalidToken = jwt.sign({ isAdmin: true, timestamp: Date.now() }, 'wrong_secret', {
    expiresIn: '1h',
  });

  // יצירת טוקן שהוחלף (חתום נכון אבל עם תוכן שונה)
  tamperToken = jwt.sign({ isAdmin: false, timestamp: Date.now() }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
});

describe('License Server Security Tests', () => {
  // בדיקות אבטחת JWT
  describe('JWT Authentication Security', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/admin/licenses');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with expired token', async () => {
      const response = await request(app)
        .get('/admin/licenses')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/admin/licenses')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with tampered token', async () => {
      const response = await request(app)
        .get('/admin/licenses')
        .set('Authorization', `Bearer ${tamperToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with malformed token', async () => {
      const response = await request(app)
        .get('/admin/licenses')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  // בדיקות אבטחת התחברות
  describe('Login Security', () => {
    it('should reject login with missing password', async () => {
      const response = await request(app).post('/admin/login').send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with empty password', async () => {
      const response = await request(app).post('/admin/login').send({ password: '' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app).post('/admin/login').send({ password: 'wrong_password' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  // בדיקות אבטחת אימות רישיון
  describe('License Verification Security', () => {
    it('should reject verification without license key', async () => {
      const response = await request(app).post('/verify').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject verification with empty license key', async () => {
      const response = await request(app).post('/verify').send({ licenseKey: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid signature', async () => {
      const systemInfo = {
        instanceId: 'test-instance-id',
        hostname: 'test-hostname',
      };

      // חתימה לא תקפה
      const invalidSignature = 'invalid_signature';

      const response = await request(app).post('/verify').send({
        licenseKey: 'some-license-key',
        systemInfo,
        signature: invalidSignature,
      });

      // הבדיקה תלויה בהתנהגות השרת - אם הרישיון לא קיים, נקבל 404
      // אם הרישיון קיים אבל החתימה לא תקפה, נקבל 403
      expect([403, 404]).toContain(response.status);
    });
  });

  // בדיקות הגנה מפני התקפות
  describe('Attack Protection', () => {
    // בדיקת הגנה מפני SQL Injection
    it('should be protected against SQL injection attempts', async () => {
      const sqlInjectionAttempt = "' OR '1'='1";

      const response = await request(app).post('/verify').send({ licenseKey: sqlInjectionAttempt });

      // מצפים שהשרת יטפל בזה כמו בכל מפתח רישיון לא תקף
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Invalid license key');
    });

    // בדיקת הגנה מפני NoSQL Injection
    it('should be protected against NoSQL injection attempts', async () => {
      const noSqlInjectionAttempt = { $ne: null };

      const response = await request(app)
        .post('/verify')
        .send({ licenseKey: noSqlInjectionAttempt });

      // מצפים לשגיאת בקשה לא תקפה או טיפול כמו בכל מפתח רישיון לא תקף
      expect([400, 404]).toContain(response.status);
    });

    // בדיקת הגנה מפני XSS
    it('should be protected against XSS attempts', async () => {
      const xssAttempt = '<script>alert("XSS")</script>';

      const response = await request(app).post('/admin/login').send({ password: xssAttempt });

      // מצפים שהשרת יטפל בזה כמו בכל סיסמה לא תקפה
      expect(response.status).toBe(401);

      // בדיקה שהתגובה לא מכילה את קוד ה-script
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });
  });

  // בדיקת הגבלת קצב בקשות
  describe('Rate Limiting', () => {
    it('should have rate limiting headers', async () => {
      const response = await request(app).get('/healthz');

      // בדיקת קיום כותרות הגבלת קצב
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
});
