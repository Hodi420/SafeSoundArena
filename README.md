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
