/**
 * מודול לאימות רישיון ובדיקת אותנטיות קוד
 * License validation and code authenticity verification module
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// טען משתני סביבה
require('dotenv').config();

// כתובת שרת האימות (במערכת אמיתית זה יהיה שרת חיצוני)
const LICENSE_SERVER = process.env.LICENSE_SERVER || 'https://license.safesoundarena.com/verify';

// מפתח להצפנת מידע רגיש
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// מפתח לחתימת נתונים
const SIGNING_KEY = process.env.SIGNING_KEY || crypto.randomBytes(32).toString('hex');

/**
 * פונקציה לחישוב חתימה דיגיטלית של קובץ
 * @param {string} filePath - נתיב הקובץ
 * @returns {string} - חתימה דיגיטלית של הקובץ
 */
const calculateFileSignature = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  } catch (error) {
    console.error(`Error calculating file signature for ${filePath}:`, error);
    return null;
  }
};

/**
 * פונקציה לבדיקת אותנטיות קבצי קוד קריטיים
 * @returns {Object} - תוצאות הבדיקה
 */
const verifyCodeIntegrity = () => {
  // רשימת קבצים קריטיים לבדיקה
  const criticalFiles = [
    { path: path.join(__dirname, '..', 'server', 'index.js'), expectedHash: null },
    { path: path.join(__dirname, '..', 'server', 'agent.js'), expectedHash: null },
    { path: path.join(__dirname, '..', 'middleware', 'authMiddleware.js'), expectedHash: null },
    { path: path.join(__dirname, '..', 'SECURITY.md'), expectedHash: null },
    { path: path.join(__dirname, '..', 'LICENSE.md'), expectedHash: null }
  ];
  
  const results = {
    success: true,
    verifiedFiles: [],
    failedFiles: []
  };
  
  // בדיקת כל הקבצים הקריטיים
  for (const file of criticalFiles) {
    try {
      if (!fs.existsSync(file.path)) {
        results.success = false;
        results.failedFiles.push({
          path: file.path,
          error: 'File not found'
        });
        continue;
      }
      
      const actualHash = calculateFileSignature(file.path);
      
      // במערכת אמיתית, ה-expectedHash יהיה מאוחסן במקום בטוח או יתקבל משרת אימות
      // כאן אנחנו פשוט בודקים שהקובץ קיים ושניתן לחשב את החתימה שלו
      if (actualHash) {
        results.verifiedFiles.push({
          path: file.path,
          hash: actualHash
        });
      } else {
        results.success = false;
        results.failedFiles.push({
          path: file.path,
          error: 'Failed to calculate hash'
        });
      }
    } catch (error) {
      results.success = false;
      results.failedFiles.push({
        path: file.path,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * פונקציה לאימות מפתח רישיון מול שרת האימות
 * @param {string} licenseKey - מפתח הרישיון לאימות
 * @returns {Promise<Object>} - תוצאות האימות
 */
const verifyLicense = async (licenseKey) => {
  if (!licenseKey) {
    return {
      valid: false,
      error: 'License key is required'
    };
  }
  
  try {
    // איסוף מידע על המערכת לצורך אימות
    const systemInfo = {
      hostname: require('os').hostname(),
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMem: require('os').totalmem(),
      nodeVersion: process.version,
      instanceId: process.env.INSTANCE_ID || 'development'
    };
    
    // חתימת המידע למניעת זיוף
    const signature = crypto
      .createHmac('sha256', SIGNING_KEY)
      .update(JSON.stringify(systemInfo))
      .digest('hex');
    
    // במערכת אמיתית, כאן תהיה קריאה לשרת אימות חיצוני
    // לצורך הדוגמה, נדמה תשובה חיובית
    /* 
    const response = await axios.post(LICENSE_SERVER, {
      licenseKey,
      systemInfo,
      signature
    });
    
    return response.data;
    */
    
    // דוגמה לתשובה חיובית
    return {
      valid: true,
      type: 'commercial',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      features: ['basic', 'advanced', 'premium'],
      maxUsers: 100,
      maxInstances: 5,
      customer: {
        id: 'cust_123456',
        name: 'Example Organization'
      }
    };
  } catch (error) {
    console.error('License verification error:', error);
    return {
      valid: false,
      error: 'Failed to verify license: ' + error.message
    };
  }
};

/**
 * פונקציה להוספת סימן מים דיגיטלי לתוכן
 * @param {string} content - התוכן להוספת סימן מים
 * @param {Object} metadata - מטא-דאטה להוספה לסימן המים
 * @returns {string} - התוכן עם סימן המים
 */
const addDigitalWatermark = (content, metadata = {}) => {
  if (!content) return content;
  
  try {
    // הוספת מידע נוסף למטא-דאטה
    const watermarkData = {
      timestamp: new Date().toISOString(),
      instanceId: process.env.INSTANCE_ID || 'development',
      licenseId: process.env.LICENSE_ID || 'development',
      ...metadata
    };
    
    // הצפנת מידע סימן המים
    const watermarkString = JSON.stringify(watermarkData);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(watermarkString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // שילוב ה-IV עם הטקסט המוצפן
    const watermark = iv.toString('hex') + ':' + encrypted;
    
    // הוספת סימן המים בצורה נסתרת
    if (typeof content === 'string') {
      if (content.includes('</body>')) {
        // הוספה כתגובה HTML נסתרת
        return content.replace('</body>', `<!-- SSA-WM:${watermark} --></body>`);
      } else if (content.includes('</svg>')) {
        // הוספה כתגובה SVG נסתרת
        return content.replace('</svg>', `<!-- SSA-WM:${watermark} --></svg>`);
      } else if (content.startsWith('{') && content.endsWith('}')) {
        // הוספה כשדה נסתר ב-JSON
        const jsonContent = JSON.parse(content);
        jsonContent._wm = watermark;
        return JSON.stringify(jsonContent);
      } else {
        // הוספה כתגובה נסתרת בסוף הקובץ
        return `${content}\n<!-- SSA-WM:${watermark} -->`;
      }
    }
    
    return content;
  } catch (error) {
    console.error('Error adding digital watermark:', error);
    return content;
  }
};

/**
 * פונקציה לחילוץ סימן מים דיגיטלי מתוכן
 * @param {string} content - התוכן לחילוץ סימן המים ממנו
 * @returns {Object|null} - מידע סימן המים או null אם לא נמצא
 */
const extractDigitalWatermark = (content) => {
  if (!content || typeof content !== 'string') return null;
  
  try {
    // חיפוש סימן המים בתוכן
    const watermarkRegex = /<!-- SSA-WM:([a-f0-9]+:[a-f0-9]+) -->/;
    const jsonWatermarkRegex = /"_wm":"([a-f0-9]+:[a-f0-9]+)"/;
    
    let watermark = null;
    
    // חיפוש בתגובה HTML
    const htmlMatch = content.match(watermarkRegex);
    if (htmlMatch && htmlMatch[1]) {
      watermark = htmlMatch[1];
    }
    
    // חיפוש ב-JSON
    if (!watermark) {
      const jsonMatch = content.match(jsonWatermarkRegex);
      if (jsonMatch && jsonMatch[1]) {
        watermark = jsonMatch[1];
      }
    }
    
    if (!watermark) return null;
    
    // פיצול ה-IV והטקסט המוצפן
    const [ivHex, encrypted] = watermark.split(':');
    if (!ivHex || !encrypted) return null;
    
    // פענוח סימן המים
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error extracting digital watermark:', error);
    return null;
  }
};

/**
 * פונקציה לבדיקת תוקף רישיון ואותנטיות קוד
 * @param {string} licenseKey - מפתח הרישיון לבדיקה
 * @returns {Promise<Object>} - תוצאות הבדיקה
 */
const validateEnvironment = async (licenseKey) => {
  // בדיקת אותנטיות הקוד
  const integrityResults = verifyCodeIntegrity();
  
  // בדיקת תוקף הרישיון
  const licenseResults = await verifyLicense(licenseKey);
  
  return {
    valid: integrityResults.success && licenseResults.valid,
    codeIntegrity: integrityResults,
    license: licenseResults,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  verifyCodeIntegrity,
  verifyLicense,
  validateEnvironment,
  addDigitalWatermark,
  extractDigitalWatermark,
  calculateFileSignature
};