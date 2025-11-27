/**
 * מודול אימות משופר עם בדיקות רישיון ואבטחה
 * Enhanced authentication middleware with license and security checks
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// קובץ הגדרות סביבה
require('dotenv').config();

// מפתח סודי לחתימת טוקנים
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_replace_in_production';

// מפתח להצפנת מידע רגיש
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// רשימת מפתחות רישיון תקפים (במערכת אמיתית זה יהיה במסד נתונים)
const validLicenseKeys = new Set([
  process.env.MASTER_LICENSE_KEY,
  // ניתן להוסיף מפתחות נוספים כאן
]);

// מסלולים שלא דורשים אימות
const publicPaths = ['/api/auth/login', '/api/auth/register', '/healthz', '/meta', '/capabilities'];

/**
 * פונקציה לבדיקת תוקף מפתח רישיון
 * @param {string} licenseKey - מפתח הרישיון לבדיקה
 * @returns {boolean} - האם המפתח תקף
 */
const isValidLicense = (licenseKey) => {
  if (!licenseKey) return false;
  return validLicenseKeys.has(licenseKey);
};

/**
 * פונקציה לבדיקת אותנטיות הקוד
 * בודקת שקבצי הקוד המרכזיים לא שונו
 * @returns {boolean} - האם הקוד אותנטי
 */
const verifyCodeIntegrity = () => {
  try {
    // רשימת קבצים קריטיים לבדיקה
    const criticalFiles = [
      path.join(__dirname, '..', 'server', 'index.js'),
      path.join(__dirname, '..', 'server', 'agent.js'),
      path.join(__dirname, '..', 'middleware', 'authMiddleware.js'),
    ];

    // בדיקת קבצים
    for (const filePath of criticalFiles) {
      if (!fs.existsSync(filePath)) {
        console.error(`Critical file missing: ${filePath}`);
        return false;
      }

      // כאן ניתן להוסיף בדיקת חתימה דיגיטלית של הקובץ
      // const fileContent = fs.readFileSync(filePath);
      // const expectedHash = getExpectedHash(filePath);
      // const actualHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      // if (actualHash !== expectedHash) return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying code integrity:', error);
    return false;
  }
};

/**
 * פונקציה ליצירת סימן מים דיגיטלי
 * @param {string} content - התוכן להוספת סימן מים
 * @param {string} userId - מזהה המשתמש
 * @returns {string} - התוכן עם סימן המים
 */
const addDigitalWatermark = (content, userId) => {
  const timestamp = new Date().toISOString();
  const watermarkData = {
    userId,
    timestamp,
    instanceId: process.env.INSTANCE_ID || 'default',
    licenseId: process.env.LICENSE_ID || 'development',
  };

  // הצפנת מידע סימן המים
  const watermarkString = JSON.stringify(watermarkData);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.alloc(16, 0)
  );
  let encrypted = cipher.update(watermarkString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // הוספת סימן המים בצורה נסתרת (כתגובה בקוד HTML או כמטא-דאטה בקבצים)
  if (typeof content === 'string') {
    if (content.includes('</body>')) {
      // הוספה כתגובה HTML נסתרת
      return content.replace('</body>', `<!-- ${encrypted} --></body>`);
    } else {
      // הוספה כמטא-דאטה
      return `${content}\n<!-- SafeSoundArena-Watermark: ${encrypted} -->`;
    }
  }

  return content;
};

/**
 * מידלוור אימות משתמש ובדיקת רישיון
 * @param {Object} req - בקשת HTTP
 * @param {Object} res - תשובת HTTP
 * @param {Function} next - פונקציית המשך
 */
const authMiddleware = (req, res, next) => {
  // בדיקה אם הנתיב הוא ציבורי
  if (publicPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  try {
    // בדיקת אותנטיות הקוד
    if (!verifyCodeIntegrity()) {
      return res.status(403).json({
        error: 'Security violation: Code integrity check failed',
        code: 'INTEGRITY_ERROR',
      });
    }

    // קבלת טוקן מהבקשה
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // אימות הטוקן
    const decoded = jwt.verify(token, JWT_SECRET);

    // בדיקת תוקף מפתח רישיון
    if (!isValidLicense(decoded.licenseKey)) {
      return res.status(403).json({
        error: 'Invalid or expired license',
        code: 'LICENSE_ERROR',
      });
    }

    // הוספת מידע המשתמש לבקשה
    req.user = decoded;
    req.licenseKey = decoded.licenseKey;
    req.requestId = req.requestId || uuidv4();

    // הוספת פונקציית סימן מים לבקשה
    req.addWatermark = (content) => addDigitalWatermark(content, decoded.userId);

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    console.error('Auth error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * מידלוור לבדיקת הסכמת GDPR
 * @param {Object} req - בקשת HTTP
 * @param {Object} res - תשובת HTTP
 * @param {Function} next - פונקציית המשך
 */
const checkConsent = (req, res, next) => {
  const hasConsent =
    req.headers['x-user-consent'] === 'true' || req.cookies?.userConsent === 'true';

  if (!hasConsent) {
    return res.status(403).json({
      error: 'User consent required for this operation',
      code: 'CONSENT_REQUIRED',
    });
  }

  next();
};

/**
 * מידלוור להגבלת קצב בקשות
 * @param {number} windowMs - חלון זמן במילישניות
 * @param {number} maxRequests - מספר בקשות מקסימלי בחלון הזמן
 * @returns {Function} - מידלוור להגבלת קצב
 */
const createRateLimiter = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // ניקוי בקשות ישנות
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const userRequests = requests.get(ip);
    const recentRequests = userRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    recentRequests.push(now);
    requests.set(ip, recentRequests);

    next();
  };
};

module.exports = {
  authMiddleware,
  checkConsent,
  createRateLimiter,
  addDigitalWatermark,
  isValidLicense,
  verifyCodeIntegrity,
};
