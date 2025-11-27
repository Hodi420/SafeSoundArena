# שרת רישיונות SafeSoundArena

שרת זה מספק מערכת ניהול רישיונות מלאה עבור פרויקט SafeSoundArena. הוא מאפשר יצירה, אימות, עדכון ומחיקה של רישיונות, וכן מספק סטטיסטיקות שימוש.

## תכונות עיקריות

- **ניהול רישיונות**: יצירה, עדכון, מחיקה וצפייה ברישיונות
- **אימות רישיונות**: בדיקת תוקף רישיונות בזמן אמת
- **אבטחה**: אימות JWT, הגבלת קצב בקשות, CORS, ועוד
- **תיעוד**: רישום מפורט של כל פעולות האימות
- **סטטיסטיקות**: מידע מקיף על השימוש ברישיונות

## התקנה

```bash
npm install
```

## הגדרת משתני סביבה

צור קובץ `.env` בתיקיית השורש של שרת הרישיונות עם המשתנים הבאים:

```
LICENSE_SERVER_PORT=3010
JWT_SECRET=your_secure_jwt_secret
ENCRYPTION_KEY=your_secure_encryption_key
SIGNING_KEY=your_secure_signing_key
ADMIN_PASSWORD=your_secure_admin_password
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## הפעלה

```bash
node index.js
```

או עם nodemon לפיתוח:

```bash
nodemon index.js
```

## נקודות קצה API

### בריאות המערכת

```
GET /healthz
```

בודק אם השרת פעיל ומחזיר מידע בסיסי.

### התחברות מנהל

```
POST /admin/login
Body: { "password": "your_admin_password" }
```

מחזיר JWT לשימוש בנקודות קצה מוגנות.

### ניהול רישיונות (דורש אימות מנהל)

#### יצירת רישיון חדש

```
POST /admin/licenses
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "customerName": "שם הלקוח",
  "customerEmail": "email@example.com",
  "licenseType": "premium",
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxUsers": 10,
  "maxInstances": 3,
  "features": ["feature1", "feature2"]
}
```

#### קבלת כל הרישיונות

```
GET /admin/licenses
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

#### עדכון רישיון

```
PUT /admin/licenses/:id
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "customerName": "שם הלקוח המעודכן",
  "active": true,
  ...
}
```

#### מחיקת רישיון

```
DELETE /admin/licenses/:id
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

#### קבלת סטטיסטיקות

```
GET /admin/stats
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### אימות רישיון

```
POST /verify
Body: {
  "licenseKey": "your_license_key",
  "systemInfo": {
    "instanceId": "unique_instance_id",
    "hostname": "user_hostname",
    "platform": "win32",
    "cpuCores": 8,
    "totalMemory": 16384,
    "macAddress": "00:1A:2B:3C:4D:5E"
  },
  "signature": "hmac_signature_of_system_info"
}
```

## אבטחה

שרת הרישיונות כולל מספר שכבות אבטחה:

1. **JWT לאימות**: כל פעולות הניהול דורשות JWT תקף
2. **הגבלת קצב בקשות**: מניעת התקפות brute-force
3. **CORS**: הגבלת גישה למקורות מורשים בלבד
4. **Helmet**: הגנות HTTP בסיסיות
5. **חתימות HMAC**: אימות מידע המערכת
6. **תיעוד**: רישום מפורט של כל פעולות האימות

## מבנה נתונים

הרישיונות נשמרים בקובץ JSON בנתיב `data/licenses.json` עם המבנה הבא:

```json
{
  "licenses": [
    {
      "id": "uuid",
      "licenseKey": "hex_string",
      "customerName": "שם הלקוח",
      "customerEmail": "email@example.com",
      "licenseType": "premium",
      "createdAt": "ISO_date_string",
      "expiresAt": "ISO_date_string",
      "maxUsers": 10,
      "maxInstances": 3,
      "features": ["feature1", "feature2"],
      "active": true,
      "verifications": [
        {
          "timestamp": "ISO_date_string",
          "ip": "127.0.0.1",
          "userAgent": "User-Agent string",
          "systemInfo": { ... },
          "requestId": "uuid"
        }
      ]
    }
  ],
  "lastUpdated": "ISO_date_string"
}
```

## שימוש בספריית הלקוח

כדי לשלב את אימות הרישיונות באפליקציה, השתמש בספריית הלקוח המסופקת:

```javascript
const { verifyLicense } = require('../utils/license-validator');

// בדיקת רישיון
const licenseStatus = await verifyLicense(licenseKey);

if (licenseStatus.valid) {
  console.log('רישיון תקף:', licenseStatus);
} else {
  console.error('רישיון לא תקף:', licenseStatus.error);
}
```

## פיתוח

### דרישות מערכת

- Node.js 18 ומעלה
- npm או yarn

### מבנה הפרויקט

```
/license-server
  /data          - נתוני רישיונות
  /logs          - לוגים של אימותים
  index.js       - קוד השרת הראשי
  package.json   - תלויות הפרויקט
  .env           - משתני סביבה (לא תחת גרסאות)
  README.md      - תיעוד
```

## רישיון

קוד זה מוגן תחת רישיון הדואלי של פרויקט SafeSoundArena. ראה קובץ LICENSE.md בתיקיית השורש של הפרויקט.
