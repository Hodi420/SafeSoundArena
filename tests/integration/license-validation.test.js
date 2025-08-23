/**
 * בדיקת אינטגרציה של מערכת אימות רישיונות
 * Integration test for license validation system
 */

const axios = require('axios');
const crypto = require('crypto');
const { verifyLicense, calculateFileSignature } = require('../../utils/license-validator');

// מוק למשתני סביבה לבדיקות
process.env.LICENSE_SERVER_URL = 'http://localhost:3010';
process.env.SIGNING_KEY = 'test_signing_key';
process.env.INSTANCE_ID = 'test-instance-id';

// מוק לפונקציית axios
jest.mock('axios');

describe('License Validation Integration', () => {
  // איפוס המוקים לפני כל בדיקה
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyLicense', () => {
    it('should verify a valid license successfully', async () => {
      // הגדרת תשובה מוקית מהשרת
      const mockResponse = {
        data: {
          valid: true,
          type: 'premium',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: ['feature1', 'feature2'],
          maxUsers: 10,
          maxInstances: 3,
          customer: {
            id: 'test-customer-id',
            name: 'Test Customer'
          }
        }
      };

      // הגדרת המוק של axios להחזיר את התשובה המוקית
      axios.post.mockResolvedValue(mockResponse);

      // קריאה לפונקציה שנבדקת
      const result = await verifyLicense('valid-license-key');

      // בדיקת התוצאה
      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith(
        `${process.env.LICENSE_SERVER_URL}/verify`,
        expect.objectContaining({
          licenseKey: 'valid-license-key',
          systemInfo: expect.any(Object),
          signature: expect.any(String)
        })
      );
    });

    it('should handle invalid license key', async () => {
      // הגדרת תשובה מוקית מהשרת עבור רישיון לא תקף
      const mockErrorResponse = {
        response: {
          status: 404,
          data: {
            error: 'Invalid license key'
          }
        }
      };

      // הגדרת המוק של axios לזרוק שגיאה
      axios.post.mockRejectedValue(mockErrorResponse);

      // קריאה לפונקציה שנבדקת
      const result = await verifyLicense('invalid-license-key');

      // בדיקת התוצאה
      expect(result).toEqual({
        valid: false,
        error: 'Invalid license key'
      });
    });

    it('should handle expired license', async () => {
      // הגדרת תשובה מוקית מהשרת עבור רישיון שפג תוקפו
      const mockErrorResponse = {
        response: {
          status: 403,
          data: {
            error: 'License has expired'
          }
        }
      };

      // הגדרת המוק של axios לזרוק שגיאה
      axios.post.mockRejectedValue(mockErrorResponse);

      // קריאה לפונקציה שנבדקת
      const result = await verifyLicense('expired-license-key');

      // בדיקת התוצאה
      expect(result).toEqual({
        valid: false,
        error: 'License has expired'
      });
    });

    it('should handle network errors', async () => {
      // הגדרת המוק של axios לזרוק שגיאת רשת
      axios.post.mockRejectedValue(new Error('Network Error'));

      // קריאה לפונקציה שנבדקת
      const result = await verifyLicense('valid-license-key');

      // בדיקת התוצאה
      expect(result).toEqual({
        valid: false,
        error: 'Network Error: Could not connect to license server'
      });
    });
  });

  describe('calculateFileSignature', () => {
    // מוק לפונקציית fs.readFileSync
    const fs = require('fs');
    jest.mock('fs');

    it('should calculate file signature correctly', () => {
      // הגדרת תוכן קובץ מוקי
      const mockFileContent = 'test file content';
      fs.readFileSync.mockReturnValue(Buffer.from(mockFileContent));

      // חישוב חתימה צפויה
      const expectedSignature = crypto
        .createHash('sha256')
        .update(mockFileContent)
        .digest('hex');

      // קריאה לפונקציה שנבדקת
      const signature = calculateFileSignature('test-file.js');

      // בדיקת התוצאה
      expect(signature).toBe(expectedSignature);
      expect(fs.readFileSync).toHaveBeenCalledWith('test-file.js');
    });

    it('should handle file read errors', () => {
      // הגדרת המוק של fs.readFileSync לזרוק שגיאה
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      // קריאה לפונקציה שנבדקת
      const signature = calculateFileSignature('non-existent-file.js');

      // בדיקת התוצאה
      expect(signature).toBe('');
    });
  });
});