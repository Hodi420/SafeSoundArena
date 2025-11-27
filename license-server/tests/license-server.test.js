/**
 * בדיקות יחידה עבור שרת הרישיונות
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../index');

// מוק למשתני סביבה לבדיקות
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ADMIN_PASSWORD = 'test_admin_password';
process.env.ENCRYPTION_KEY = 'test_encryption_key';
process.env.SIGNING_KEY = 'test_signing_key';

// נתיב לקובץ נתוני רישיונות זמני לבדיקות
const TEST_LICENSE_DATA_PATH = path.join(__dirname, 'test-licenses.json');

// נתוני בדיקה
let adminToken;
let testLicenseId;
let testLicenseKey;

// הכנה לפני כל הבדיקות
beforeAll(async () => {
  // יצירת טוקן מנהל לבדיקות
  adminToken = jwt.sign({ isAdmin: true, timestamp: Date.now() }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  // יצירת קובץ נתוני רישיונות ריק לבדיקות
  const initialData = {
    licenses: [],
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(TEST_LICENSE_DATA_PATH, JSON.stringify(initialData));
});

// ניקוי אחרי כל הבדיקות
afterAll(() => {
  // מחיקת קובץ נתוני הרישיונות הזמני
  if (fs.existsSync(TEST_LICENSE_DATA_PATH)) {
    fs.unlinkSync(TEST_LICENSE_DATA_PATH);
  }
});

describe('License Server API', () => {
  // בדיקת נקודת קצה לבדיקת בריאות
  describe('GET /healthz', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  // בדיקת התחברות מנהל
  describe('POST /admin/login', () => {
    it('should return JWT token with valid credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({ password: process.env.ADMIN_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app).post('/admin/login').send({ password: 'wrong_password' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  // בדיקת יצירת רישיון
  describe('POST /admin/licenses', () => {
    it('should create a new license', async () => {
      const licenseData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        licenseType: 'premium',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 5,
        maxInstances: 2,
        features: ['feature1', 'feature2'],
      };

      const response = await request(app)
        .post('/admin/licenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(licenseData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('licenseKey');
      expect(response.body).toHaveProperty('customerName', licenseData.customerName);
      expect(response.body).toHaveProperty('licenseType', licenseData.licenseType);

      // שמירת מזהה הרישיון ומפתח הרישיון לבדיקות הבאות
      testLicenseId = response.body.id;
      testLicenseKey = response.body.licenseKey;
    });

    it('should reject request without admin token', async () => {
      const response = await request(app).post('/admin/licenses').send({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        licenseType: 'premium',
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/admin/licenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Test Customer',
          // חסר שדות נדרשים
        });

      expect(response.status).toBe(400);
    });
  });

  // בדיקת קבלת רישיונות
  describe('GET /admin/licenses', () => {
    it('should return all licenses', async () => {
      const response = await request(app)
        .get('/admin/licenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('licenses');
      expect(Array.isArray(response.body.licenses)).toBe(true);
      expect(response.body.licenses.length).toBeGreaterThan(0);
    });
  });

  // בדיקת עדכון רישיון
  describe('PUT /admin/licenses/:id', () => {
    it('should update license', async () => {
      const updateData = {
        customerName: 'Updated Customer Name',
        maxUsers: 10,
      };

      const response = await request(app)
        .put(`/admin/licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customerName', updateData.customerName);
      expect(response.body).toHaveProperty('updated', true);
    });

    it('should return 404 for non-existent license', async () => {
      const response = await request(app)
        .put('/admin/licenses/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerName: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  // בדיקת אימות רישיון
  describe('POST /verify', () => {
    it('should verify valid license', async () => {
      const systemInfo = {
        instanceId: 'test-instance-id',
        hostname: 'test-hostname',
        platform: 'test-platform',
        cpuCores: 4,
        totalMemory: 8192,
        macAddress: '00:11:22:33:44:55',
      };

      const response = await request(app).post('/verify').send({
        licenseKey: testLicenseKey,
        systemInfo,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('customer');
    });

    it('should reject invalid license key', async () => {
      const response = await request(app)
        .post('/verify')
        .send({
          licenseKey: 'invalid-license-key',
          systemInfo: { instanceId: 'test-instance' },
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // בדיקת סטטיסטיקות
  describe('GET /admin/stats', () => {
    it('should return license statistics', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalLicenses');
      expect(response.body).toHaveProperty('activeLicenses');
      expect(response.body).toHaveProperty('licensesByType');
      expect(response.body).toHaveProperty('verificationCount');
    });
  });

  // בדיקת מחיקת רישיון
  describe('DELETE /admin/licenses/:id', () => {
    it('should delete license', async () => {
      const response = await request(app)
        .delete(`/admin/licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deleted', true);
      expect(response.body).toHaveProperty('id', testLicenseId);
    });

    it('should return 404 for non-existent license', async () => {
      const response = await request(app)
        .delete(`/admin/licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
