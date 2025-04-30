# SafeSoundArena

מערכת חכמה לניהול התראות, עיבוד תורים, וטפסים מאובטחים. הפרויקט משלב טכנולוגיות מתקדמות (Node.js, React, MongoDB, Redis, BullMQ, Pi Network, GPT-4.1) ומתאים לפריסה בענן או בלוקאלי.

---

## תוכן העניינים
- [התקנה והרצה](#התקנה-והרצה)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [בדיקות](#בדיקות)
- [CI/CD ודיפלוי](#cicd-ודיפלוי)
- [Best Practices](#best-practices)
- [סביבה ומשתני ENV](#סביבה-ומשתני-env)
- [מודולים עיקריים](#מודולים-עיקריים)
- [תרומות](#תרומות)

---

## התקנה והרצה

1. התקנת תלויות:
   ```bash
   npm install
   cd frontend && npm install
   ```
2. הפעלת מסד נתונים (MongoDB) ו-Redis:
   - ודא שמונגו ורדיס רצים בלוקאלי או העזר ב-Docker.
3. הרצת שרת:
   ```bash
   npm start
   ```
4. הרצת פרונט:
   ```bash
   cd frontend && npm start
   ```

## מבנה הפרויקט

- `server/` — שרת Node.js (Express), דגמי DB, תורים (bullmq)
- `frontend/` — אפליקציית React, טפסים, קומפוננטות
- `tests/` — בדיקות יחידה (Jest)
- `.github/workflows/` — pipeline ל-CI
- `Dockerfile` / `netlify.toml` — דיפלוי מהיר בענן

## בדיקות

להרצת בדיקות:
```bash
npm test
```
- בדיקות לדגמי DB קיימות (`tests/notification.test.js`).
- מומלץ להוסיף בדיקות ל-API ולפרונט (Jest/React Testing Library).

## CI/CD ודיפלוי
- pipeline אוטומטי ב-GitHub Actions (`.github/workflows/nodejs.yml`)
- קיימים Dockerfile ו-netlify.toml לדיפלוי מהיר (ראה בתיקיות המתאימות)
- תמיכה ב־Netlify, Docker, או דיפלוי עצמאי

## Best Practices
- ולידציה דו-צדדית (שרת + פרונט)
- שימוש ב-ENV לניהול סיסמאות/חיבורים
- אינדוקס שדות קריטיים ב-DB
- נגישות וטיפול בשגיאות ב-UI
- הפרדת אחריות בין מודולים, שמות ברורים, תיעוד קוד

## סביבה ומשתני ENV

להרצה יש להגדיר קבצי סביבה (למשל `.env.sandbox`, `.env.production`).
השתמש ב-`env.sandbox.example.txt` כתבנית.

### Environment Variables עיקריים:
- `NEXT_PUBLIC_APP_ENV` — מצב סביבתי (sandbox/production)
- `MONGO_URL` — כתובת MongoDB
- `REDIS_HOST`, `REDIS_PORT` — חיבור Redis
- `PI_JWT_SECRET` — סוד JWT
- משתנים נוספים ראה בקובץ הדוגמה.

## מודולים עיקריים
- Agent להרצת פקודות מערכת, משימות אוטומטיות, חיבור ל-API חיצוניים (GitHub, OpenAI, Ollama, אינטרנט).
- מערכת הרשאות, לוג Audit מלא, ואישור כפול לפעולות רגישות.
- תורים (BullMQ), ניהול התראות, cron, webhooks.
- פרונט React עם טפסים מאובטחים ונגישים.

## תרומות
הצעות, Pull Requests ודיווחי באגים יתקבלו בברכה!

---

## Environment Setup

To run this project, you need to create environment files for each environment (e.g., `.env.sandbox`, `.env.production`). Use the provided `env.sandbox.example.txt` as a template.

### Required Environment Variables

- `NEXT_PUBLIC_APP_ENV`: Set to `sandbox` or `production` to control environment.
- `NEXT_PUBLIC_PI_SANDBOX`: Set to `true` for sandbox/test mode.
- `NEXT_PUBLIC_DOMAIN_SANDBOX`: The base URL for the sandbox environment.
- `NEXT_PUBLIC_DOMAIN_1`, `NEXT_PUBLIC_DOMAIN_2`: Allowed domains for Next.js image and API config.
- `NEXT_PUBLIC_API_URL_SANDBOX`: API endpoint for sandbox.
- `NEXT_PUBLIC_API_URL`: Default API endpoint (used by frontend API client).
- `PI_JWT_SECRET`: Secret for JWT signing/verification (used in backend/API routes).
- `ANALYZE`: Set to `true` to enable bundle analyzer during build.

### How to Use

1. Copy `env.sandbox.example.txt` to `.env.sandbox` and fill in all required values.
2. For production, create `.env.production` with appropriate values for SafeSoundArena.
3. Restart your dev server after changing environment files.

# SafeSoundArena

<<<<<<< HEAD
[![CI](https://github.com/Hodi420/SafeSoundArena/actions/workflows/ci.yml/badge.svg)](https://github.com/Hodi420/SafeSoundArena/actions)

**English below | עברית בהמשך**

---

## תקציר בעברית
SafeSoundArena הוא פרויקט קוד פתוח המשלב בינה מלאכותית, בוטים, ניתוח נתונים, קהילה וגיימיפיקציה. המערכת בנויה בצורה מודולרית, תומכת בבוטים חכמים, ניהול קהילה, אינטגרציה עם טלגרם ו-LLM (GPT/Gemini), ומיועדת להרחבה ע"י הקהילה.

- תיעוד, דוגמאות והרצה: ראו [`examples/usageExamples.md`](examples/usageExamples.md)
- תרומות, דיווחי באגים, פיצ'רים: ראו [`CONTRIBUTING.md`](CONTRIBUTING.md)
- משתני סביבה: ראו `.env.example`
- קהילה: הצטרפו לדיונים ולשרת הדיסקורד!

---

## Project Overview (English)
SafeSoundArena is an open-source, modular, AI-powered game and bot framework. It features:
- Advanced bots (data analysis, strategy, community, hardware)
- Community integrations (Telegram, Discord)
- LLM support (OpenAI, Gemini, local LLMs)
- Automated tests & CI/CD

- See advanced usage: [`examples/usageExamples.md`](examples/usageExamples.md)
- Contribute: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Environment variables: see `.env.example`

---
=======
## Agent System – אוטומציה, Webhooks ו-Cron

### תכונות עיקריות
- Agent להרצת פקודות מערכת, משימות אוטומטיות, חיבור ל-API חיצוניים (GitHub, OpenAI, Ollama, אינטרנט).
- מערכת הרשאות, לוג Audit מלא, ואישור כפול לפעולות רגישות.
- תמיכה ב-webhooks (טריגרים חיצוניים) ו-cron (משימות מתוזמנות).
- כל פעולה נרשמת ל-agent.log.

### שימוש ב-API
- שלח POST ל-`/api/agent` עם `{ command, args, apiKey, confirm }`
- פקודות נתמכות:
  - `open_game` – הפעלת משחק (exePath)
  - `move_file` – העברת קובץ (`src`, `dest`)
  - `delete_temp` – מחיקת קובץ (`file`)
  - `run_update` – הפעלת סקריפט עדכון (`script`)
  - `fetch_github` – שכפול ריפו מגיטהאב (`repo`)
  - `query_openai` – פניה ל-OpenAI (דורש apiKey, `prompt`)
  - `query_ollama` – פניה ל-Ollama מקומי (`model`, `prompt`)
  - `fetch_url` – הבאת נתונים מכתובת אינטרנט (`url`)
- דוגמה:
```json
{
  "command": "query_openai",
  "args": { "prompt": "Say hello!" },
  "apiKey": "sk-...",
  "confirm": true
}
```

### Webhooks
- שלח POST ל-`/webhooks/github` (או הוסף endpoints נוספים ב-webhooks.js)
- כל טריגר חיצוני יכול להפעיל פקודות agent (למשל git pull אוטומטי)

### Cron (משימות מתוזמנות)
- ערוך את server/cron.js כדי להגדיר משימות (למשל, תחזוקה יומית, עדכונים)
- דוגמה: הפעלת סקריפט כל יום ב-03:00

### אבטחה
- כל פעולה נבדקת מול whitelist, שעות, תיקיות חסומות, ואישור כפול לפעולות מסוכנות.
- מפתחות API אינם נשמרים בדיסק.
- כל פעולה נרשמת ל-agent.log

### הרחבה
- הוסף פקודות חדשות ב-agent.js
- הוסף endpoints חדשים ב-webhooks.js
- הוסף משימות מתוזמנות ב-cron.js
- שלב עם AgentDialog.jsx ב-UI לשליטה אינטראקטיבית

---

לשאלות, הרחבות, או דוגמאות נוספות – פנה ל- Cascade!

SafeSoundArena is a blockchain-integrated AI-driven game that uses GPT-4.1 and Pi Network technologies.
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)

## Modules

- Scrolls Engine
- Bot Framework (AI)
- JAIL TIME (Conference/Event System)
- Proof of Activity
- Shame & Honor Boards

## Tech Stack

- React + TailwindCSS + Framer Motion
- Node.js / Express
- Pi Network SDK
- GPT-4.1 integration via Cascade
- Modular architecture with plugin support

## Authentication

- Pi Network based
- Multi-level verification

## Interaction

- Bots with facial expression engines
- Memory and context persistence
