# SafeSoundArena — מפרט הזנה והשלמות להפעלה

מסמך זה הוא טופס העבודה המרכזי למילוי החוסרים. הוא מתייחס רק לעץ העבודה הנוכחי:
`C:\Users\idanv\OneDrive\Desktop\SafeSoundArena`.

## 1. נקודת אמת להפעלה

| רכיב | נתיב/פקודה | ערך מחייב |
|---|---|---|
| Backend פעיל | `backend/app.js` | HTTP על `4000` |
| Frontend פעיל | `frontend/pages` | Next.js על `3000` |
| HTTP מהדפדפן | `/api/*` | עובר דרך Next proxy אל `BACKEND_URL` |
| Socket.IO | `NEXT_PUBLIC_SOCKET_URL` | כתובת ציבורית שהדפדפן יכול להגיע אליה |
| Docker API | `Dockerfile` + `docker-compose.yml` | שירות `api-server`, פורט פנימי `4000` |
| Docker Frontend | `frontend/Dockerfile` | שירות `frontend`, פורט `3000` |
| נתוני פיתוח | `SAFESOUND_DATA_DIR` | קובץ state מקומי, לא DB רב־מופעי |
| Node | כל הרכיבים הפעילים | `24.x LTS` |

פקודות Windows המקומיות:

```powershell
# חלון 1 — Backend
npm start

# חלון 2 — Frontend
cd frontend
npm run dev
```

בדיקת בסיס:

```powershell
Invoke-WebRequest http://localhost:4000/api/health
Invoke-WebRequest http://localhost:3000
```

## 2. קלט סביבתי — למילוי לפני הרצה

העתק את הבלוק, מלא רק ערכים חסרים, ושמור secrets מחוץ ל־Git:

```dotenv
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

# Browser -> Next.js. Do not put api-server here.
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
BACKEND_URL=http://localhost:4000

# Required before admin operations or production startup
ADMIN_TOKEN=<generate-a-long-random-token>
ALLOWED_ORIGINS=http://localhost:3000

# Single-node persistence for the current implementation
SAFESOUND_DATA_DIR=./backend/api/data
SEED_MCP_PERMISSIONS=false

# AI Control Room — keep empty until the admin/agent auth decision is finalized
AI_CONTROL_ROOM_ENV=development
AI_ADMIN_TOKEN=
AI_AGENT_TOKEN=
AI_ADMIN_AUDIT_LOG_PATH=
AI_ADMIN_PERSISTENCE=true
AI_ADMIN_RUNTIME_STATE_PATH=
AGENT_LEASE_MONITOR=true
AGENT_HEARTBEAT_TIMEOUT_MS=60000
AGENT_LEASE_SWEEP_INTERVAL_MS=15000
AGENT_MAX_CHILDREN_PER_PARENT=3
AGENT_MAX_TOTAL_AGENTS=16
AGENT_MAX_CHILD_DEPTH=1

# Pause/resume contract
# PAUSING -> PAUSED requires checkpointId; RESUMING must reuse the same ID.

# Optional integrations — leave empty until explicitly activated
PI_API_KEY=
PI_PIONEER_KEY=
OLLAMA_BASE_URL=
OLLAMA_MODEL=
OPENAI_API_KEY=
CLAUDE_API_KEY=
GEMINI_API_KEY=
```

ב־Docker הערכים הקריטיים הם:

```dotenv
NODE_ENV=production
PORT=4000
ADMIN_TOKEN=<secret-from-secret-store>
ALLOWED_ORIGINS=https://<public-frontend-domain>
SAFESOUND_DATA_DIR=/app/data
NEXT_PUBLIC_API_URL=/api
BACKEND_URL=http://api-server:4000
NEXT_PUBLIC_SOCKET_URL=https://<public-api-or-proxy-domain>
```

`BACKEND_URL=http://api-server:4000` הוא ערך שרת־לשרת בלבד. אסור להכניס אותו ל־`NEXT_PUBLIC_*`, כי הדפדפן אינו מכיר את שם השירות הפנימי של Docker.

ב־Docker יש להשאיר את `AI_ADMIN_RUNTIME_STATE_PATH` ו־`AI_ADMIN_AUDIT_LOG_PATH` ריקים או להגדיר אותם ל־`/app/data/...`; אין להשתמש בנתיב Windows מתוך הקונטיינר.

## 3. מה כבר מחובר

ה־API הפעיל ב־`backend/app.js` כולל:

| תחום | קריאות פעילות | מצב |
|---|---|---|
| Health | `GET /api/health` | מחובר ונבדק |
| Jail | `GET /api/jail-status`, `POST /api/jail` | מחובר דרך Next proxy; POST דורש `ADMIN_TOKEN` |
| Events | `GET /api/events`, join/leave | מחובר ל־file store |
| Marketplace | `GET /api/marketplace`, buy/sell | מחובר ל־file store |
| Quests | list/detail/progress | מחובר ל־file store |
| Guilds | list/detail/join/leave/messages | מחובר ל־file store |
| Notifications | list/read/read-all | מחובר ל־file store |
| Challenges | daily/weekly/claim | מחובר ל־file store |
| AI Control Room | `GET /api/ai-admin/meta`, Agent lifecycle, heartbeat lease, checkpoint pause/resume, Jail enforcement ו־Safety switch | מחובר ל־`backend/app.js`; state מקומי נשמר ב־JSON ב־single-node |
| MSHIX | `GET/POST /api/mshix/*` | מחובר כ־event hub bounded ל־Control Room, Jail, PQS, Feature Store ו־Blockchain observer boundaries; execution עובר דרך Agent Execution Controller admission-only |
| MCP permissions | `/api/mcp/*` | קיים, אך הרשאות production עדיין דורשות השלמת auth |

ה־Dashboard הפעיל (`frontend/pages/dashboard.tsx`) משתמש ברכיבים מתוך `frontend/src`, ולכן חוזי ה־API עבור events, marketplace, guilds, notifications ו־challenges חייבים להישאר מסונכרנים עם `frontend/src/endpoints.ts` ו־`backend/api/featureRoutes.js`.

ב־Control Room, פקודה שמיועדת ל־agent צריכה לכלול `agentId`. פקודה כזו תישלח רק כאשר ה־agent במצב `ACTIVE`; `JAILED` נחסם ב־`423 AGENT_JAILED`, וכל מצב אחר שאינו dispatchable נחסם ב־`409 AGENT_NOT_DISPATCHABLE`.

## 4. טופס השלמה לכל API חסר

אין להוסיף endpoint או integration בלי למלא את כל השדות הבאים:

```yaml
feature: <שם התחום>
owner: <מי מספק את המידע/האישור>
frontend_source: <page/component/hook>
backend_source: <route/service/file>
method: GET|POST|PUT|PATCH|DELETE
path: /api/<path>
request_headers:
  X-User-Id: <required|optional|not-used>
  Authorization: <required|optional|not-used>
request_body: {}
response_shape: {}
error_codes:
  - 400: <validation>
  - 401: <authentication>
  - 404: <not found>
  - 409: <conflict>
storage: file-store|database|external-service|mock
single_node_only: true|false
acceptance_check: <פקודת בדיקה או תרחיש קצר>
activation_decision: now|after-auth|after-db|after-external-approval
```

דוגמה מלאה:

```yaml
feature: social-profile
owner: product decision + auth owner
frontend_source: frontend/src/hooks/useSocial.ts
backend_source: backend/api/socialRoutes.js
method: GET
path: /api/social/profile/:userId
request_headers:
  X-User-Id: optional-for-read
  Authorization: required-in-production
request_body: {}
response_shape:
  id: string
  displayName: string
  reputation: number
error_codes:
  - 401: missing authenticated identity
  - 404: profile not found
storage: database
single_node_only: false
acceptance_check: GET /api/social/profile/demo-user returns the documented shape
activation_decision: after-auth
```

## 5. רשימת החוסרים הנוכחית

### דורש החלטה/פיתוח מורכב — לא למלא כערך קונפיגורציה

| פער | הסיבה שלא בוצע בתיקון מינורי |
|---|---|
| Auth אמיתי | `X-User-Id` הוא header שניתן לזיוף; נדרש session/JWT/Pi verification ומדיניות הרשאות |
| Control Room persistence רב־מופעי | single-node JSON persistence מוכנה; DB/locking נדרשים עבור multi-node |
| Database | ה־feature store הנוכחי הוא קובץ מקומי; אין נעילות/transaction/multi-instance |
| Socket transport | חלק מהקוד משתמש ב־Socket.IO וחלק ב־WebSocket גולמי; נדרש לבחור פרוטוקול ולאחד client/server |
| AI providers | קיימים מסלולי demo מקומיים לצד hooks שמצפים ל־AI API מלא; נדרש provider contract |
| Blockchain/Pi | נדרשים credentials, רשת, אימות עסקאות ומדיניות rollback |
| Combat / Inventory / Mini-games / Weather | קיימים hooks ונתיבי frontend, אך אין routes פעילים תואמים ב־backend |
| Social / Reputation / User | קיימים חוזים מקבילים ולא אחידים, ללא backend פעיל מלא |
| Production deployment | קיימות תצורות K8s/Compose ישנות עם פורטים, images ו־URLs שונים מה־runtime הקנוני |

### תיקונים מינוריים שכבר בוצעו בסבב זה

- `frontend/src/hooks/useJailTime.ts` משתמש עכשיו ב־`/api/jail-status`, ב־`NEXT_PUBLIC_SOCKET_URL` ובאירועי `joinJail/leaveJail` של השרת.
- `.env.example` מכוון את הדפדפן ל־`/api` ומוסיף `NEXT_PUBLIC_SOCKET_URL`.

## 6. מטריצת תקשורת מחייבת

```text
Browser HTTP
  -> http://<frontend>:3000/api/*
  -> Next pages/api/[...path].ts
  -> BACKEND_URL + /api/*
  -> backend/app.js
```

```text
Browser Socket.IO
  -> NEXT_PUBLIC_SOCKET_URL
  -> Socket.IO server attached to backend/app.js
```

כללים:

1. קריאת browser רגילה משתמשת ב־`/api/...`, לא ב־`http://api-server:4000`.
2. Socket.IO משתמש בכתובת שהדפדפן יכול לפתור; כתובת פנימית של Docker אינה תקינה עבורו.
3. אין לערבב `WebSocket` עם Socket.IO בלי adapter מפורש.
4. כל mutation production חייב זהות מאומתת, לא רק header ידני.
5. כל response חדש חייב להגדיר shape, status codes ותרחיש conflict.

## 7. בדיקות קבלה לפני הפעלה

```powershell
npm test
.\scripts\validate-runtime-config.ps1 -EnvFile .env -SkipNode
docker compose -f docker-compose.yml config -q
cd frontend
npm test -- --runInBand
npx tsc --noEmit
npm run build
```

בדיקות API מינימליות:

```powershell
Invoke-WebRequest http://localhost:4000/api/health
Invoke-WebRequest http://localhost:3000/api/events
Invoke-WebRequest http://localhost:3000/api/marketplace
Invoke-WebRequest http://localhost:3000/api/quests
Invoke-WebRequest http://localhost:3000/api/guilds
Invoke-WebRequest http://localhost:3000/api/notifications
Invoke-WebRequest http://localhost:3000/api/challenges/daily
```

## 8. מה לא לשנות במהלך מילוי החוסרים

- לא להכניס secrets, Pi keys או tokens לקבצי source או ל־Git.
- לא להפעיל integrations חיצוניים לפני שיש owner, credentials ותרחיש rollback.
- לא לשנות במקביל את `backend/app.js` ואת שרתי legacy (`backend/index.js`, `backend/server.js`, `server.js`).
- לא לבחור תצורת K8s/Compose ישנה בלי לסמן אותה במפורש כ־runtime חלופי.
- לא לבצע merge/push/deploy מתוך סביבת העבודה המלוכלכת הנוכחית לפני מיון השינויים.

## 9. החלטות נדרשות להמשך

```yaml
auth_provider: <Pi JWT | internal JWT | session | undecided>
database: <MongoDB | PostgreSQL | keep file-store temporarily>
socket_transport: <Socket.IO | native WebSocket>
ai_provider: <Ollama | OpenAI | other | disabled>
deployment_target: <Windows local | Docker single-node | mini-PC | Kubernetes>
first_release_features:
  - <feature>
  - <feature>
legacy_config_policy: <archive | keep-reference | remove-after-migration>
```

## 10. GitHub — נקודת עצירה לפני push/deploy

ה־workflow הקנוני לבדיקות הוא `.github/workflows/ci.yml` עם Node `24.x`. במקביל קיימים תחת `.github/workflows` workflows נוספים ש־GitHub כן יטען:

- `main.yml` עודכן ל־Node 24, אך עדיין workflow legacy שמנסה לפרוס ל־Kubernetes.
- `nodejs.yml` עודכן ל־Node 24, אך workflow selection עדיין דורש מיון נפרד.
- `backend-ci.yml` ו־`backend-cd.yml` בונים/מפרסמים את `backend/Dockerfile`, שאינו אותו runtime כמו ה־root `Dockerfile` הקנוני.
- `security-lint.yml` מריץ pipeline נוסף עם מדיניות שונה.

זהו קונפליקט CI/CD מורכב ולא בוצע בו שינוי אוטומטי. לפני push או deploy צריך לבחור workflow יחיד, לבטל/לארכב את השאר, ולהצליב את ה־Docker/K8s manifests מול `backend/app.js` על פורט `4000`.
