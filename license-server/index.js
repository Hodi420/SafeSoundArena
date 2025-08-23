/**
 * שרת רישיונות לפרויקט SafeSoundArena
 * License server for SafeSoundArena project
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// טען משתני סביבה
require('dotenv').config();

// קבועים
const PORT = process.env.LICENSE_SERVER_PORT || 3010;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_replace_in_production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const SIGNING_KEY = process.env.SIGNING_KEY || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const LICENSE_DATA_PATH = path.join(__dirname, 'data', 'licenses.json');
const VERIFICATION_LOG_PATH = path.join(__dirname, 'logs', 'verification.log');

// יצירת תיקיות נדרשות
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

// יצירת קובץ רישיונות אם לא קיים
if (!fs.existsSync(LICENSE_DATA_PATH)) {
  fs.writeFileSync(LICENSE_DATA_PATH, JSON.stringify({
    licenses: [],
    lastUpdated: new Date().toISOString()
  }));
}

// יצירת אפליקציית Express
const app = express();

// מידלוור בסיסי
app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// הגבלת קצב בקשות
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // מקסימום 100 בקשות לכל IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

app.use(apiLimiter);

// מידלוור לוג בקשות
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.path} - ${logEntry.ip}`);
  next();
});

/**
 * פונקציה לטעינת נתוני רישיונות
 * @returns {Object} - נתוני רישיונות
 */
const loadLicenseData = () => {
  try {
    const data = fs.readFileSync(LICENSE_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading license data:', error);
    return { licenses: [], lastUpdated: new Date().toISOString() };
  }
};

/**
 * פונקציה לשמירת נתוני רישיונות
 * @param {Object} data - נתוני רישיונות לשמירה
 */
const saveLicenseData = (data) => {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(LICENSE_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving license data:', error);
  }
};

/**
 * פונקציה לרישום אירוע אימות
 * @param {Object} data - נתוני אירוע האימות
 */
const logVerification = (data) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    fs.appendFileSync(VERIFICATION_LOG_PATH, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Error logging verification:', error);
  }
};

/**
 * מידלוור לאימות מנהל
 * @param {Object} req - בקשת HTTP
 * @param {Object} res - תשובת HTTP
 * @param {Function} next - פונקציית המשך
 */
const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// נקודת קצה לבדיקת בריאות
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// נקודת קצה להתחברות מנהל
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { isAdmin: true, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  res.json({ token });
});

// נקודת קצה ליצירת רישיון חדש
app.post('/admin/licenses', adminAuthMiddleware, (req, res) => {
  const {
    customerName,
    customerEmail,
    licenseType,
    expiresAt,
    maxUsers,
    maxInstances,
    features
  } = req.body;
  
  if (!customerName || !customerEmail || !licenseType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const licenseData = loadLicenseData();
  
  // יצירת מפתח רישיון ייחודי
  const licenseKey = crypto.randomBytes(16).toString('hex');
  
  // יצירת רישיון חדש
  const newLicense = {
    id: uuidv4(),
    licenseKey,
    customerName,
    customerEmail,
    licenseType,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    maxUsers: maxUsers || null,
    maxInstances: maxInstances || null,
    features: features || [],
    active: true,
    verifications: []
  };
  
  licenseData.licenses.push(newLicense);
  saveLicenseData(licenseData);
  
  res.status(201).json({
    id: newLicense.id,
    licenseKey,
    customerName,
    licenseType,
    createdAt: newLicense.createdAt,
    expiresAt: newLicense.expiresAt
  });
});

// נקודת קצה לקבלת כל הרישיונות
app.get('/admin/licenses', adminAuthMiddleware, (req, res) => {
  const licenseData = loadLicenseData();
  
  // הסרת מידע רגיש לפני שליחה
  const sanitizedLicenses = licenseData.licenses.map(license => ({
    id: license.id,
    customerName: license.customerName,
    customerEmail: license.customerEmail,
    licenseType: license.licenseType,
    createdAt: license.createdAt,
    expiresAt: license.expiresAt,
    active: license.active,
    verificationCount: license.verifications?.length || 0,
    lastVerification: license.verifications?.length ?
      license.verifications[license.verifications.length - 1].timestamp : null
  }));
  
  res.json({
    licenses: sanitizedLicenses,
    lastUpdated: licenseData.lastUpdated,
    count: sanitizedLicenses.length
  });
});

// נקודת קצה לעדכון רישיון
app.put('/admin/licenses/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const {
    customerName,
    customerEmail,
    licenseType,
    expiresAt,
    maxUsers,
    maxInstances,
    features,
    active
  } = req.body;
  
  const licenseData = loadLicenseData();
  const licenseIndex = licenseData.licenses.findIndex(license => license.id === id);
  
  if (licenseIndex === -1) {
    return res.status(404).json({ error: 'License not found' });
  }
  
  const license = licenseData.licenses[licenseIndex];
  
  // עדכון שדות
  if (customerName) license.customerName = customerName;
  if (customerEmail) license.customerEmail = customerEmail;
  if (licenseType) license.licenseType = licenseType;
  if (expiresAt !== undefined) license.expiresAt = expiresAt;
  if (maxUsers !== undefined) license.maxUsers = maxUsers;
  if (maxInstances !== undefined) license.maxInstances = maxInstances;
  if (features) license.features = features;
  if (active !== undefined) license.active = active;
  
  saveLicenseData(licenseData);
  
  res.json({
    id: license.id,
    customerName: license.customerName,
    licenseType: license.licenseType,
    active: license.active,
    updated: true
  });
});

// נקודת קצה למחיקת רישיון
app.delete('/admin/licenses/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  
  const licenseData = loadLicenseData();
  const licenseIndex = licenseData.licenses.findIndex(license => license.id === id);
  
  if (licenseIndex === -1) {
    return res.status(404).json({ error: 'License not found' });
  }
  
  // מחיקת הרישיון
  licenseData.licenses.splice(licenseIndex, 1);
  saveLicenseData(licenseData);
  
  res.json({ deleted: true, id });
});

// נקודת קצה לאימות רישיון
app.post('/verify', (req, res) => {
  const { licenseKey, systemInfo, signature } = req.body;
  
  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }
  
  const licenseData = loadLicenseData();
  const license = licenseData.licenses.find(lic => lic.licenseKey === licenseKey);
  
  if (!license) {
    logVerification({
      licenseKey,
      systemInfo,
      requestId: req.requestId,
      ip: req.ip,
      result: 'invalid_key',
      userAgent: req.get('User-Agent')
    });
    
    return res.status(404).json({ error: 'Invalid license key' });
  }
  
  // בדיקת תוקף הרישיון
  if (!license.active) {
    logVerification({
      licenseKey,
      licenseId: license.id,
      systemInfo,
      requestId: req.requestId,
      ip: req.ip,
      result: 'inactive',
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({ error: 'License is inactive' });
  }
  
  // בדיקת תאריך תפוגה
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    logVerification({
      licenseKey,
      licenseId: license.id,
      systemInfo,
      requestId: req.requestId,
      ip: req.ip,
      result: 'expired',
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({ error: 'License has expired' });
  }
  
  // בדיקת חתימה (אם סופקה)
  if (systemInfo && signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', SIGNING_KEY)
        .update(JSON.stringify(systemInfo))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        logVerification({
          licenseKey,
          licenseId: license.id,
          systemInfo,
          requestId: req.requestId,
          ip: req.ip,
          result: 'invalid_signature',
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
    }
  }
  
  // רישום אימות מוצלח
  const verificationData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    systemInfo: systemInfo || {},
    requestId: req.requestId
  };
  
  if (!license.verifications) {
    license.verifications = [];
  }
  
  license.verifications.push(verificationData);
  
  // שמירת רק 100 אימותים אחרונים
  if (license.verifications.length > 100) {
    license.verifications = license.verifications.slice(-100);
  }
  
  saveLicenseData(licenseData);
  
  logVerification({
    licenseKey,
    licenseId: license.id,
    systemInfo,
    requestId: req.requestId,
    ip: req.ip,
    result: 'success',
    userAgent: req.get('User-Agent')
  });
  
  // החזרת מידע הרישיון
  res.json({
    valid: true,
    type: license.licenseType,
    expiresAt: license.expiresAt,
    features: license.features,
    maxUsers: license.maxUsers,
    maxInstances: license.maxInstances,
    customer: {
      id: license.id,
      name: license.customerName
    }
  });
});

// נקודת קצה לקבלת סטטיסטיקות
app.get('/admin/stats', adminAuthMiddleware, (req, res) => {
  const licenseData = loadLicenseData();
  
  const stats = {
    totalLicenses: licenseData.licenses.length,
    activeLicenses: licenseData.licenses.filter(license => license.active).length,
    expiredLicenses: licenseData.licenses.filter(license => 
      license.expiresAt && new Date(license.expiresAt) < new Date()
    ).length,
    licensesByType: {},
    verificationCount: 0,
    lastUpdated: licenseData.lastUpdated
  };
  
  // חישוב סטטיסטיקות נוספות
  licenseData.licenses.forEach(license => {
    // ספירה לפי סוג רישיון
    if (!stats.licensesByType[license.licenseType]) {
      stats.licensesByType[license.licenseType] = 0;
    }
    stats.licensesByType[license.licenseType]++;
    
    // ספירת אימותים
    stats.verificationCount += license.verifications?.length || 0;
  });
  
  res.json(stats);
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});

module.exports = app;