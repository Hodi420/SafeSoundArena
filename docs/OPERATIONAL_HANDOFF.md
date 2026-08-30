# SafeSoundArena — Operational Handoff

מסמך זה הוא ההנחיה המעשית להפעלה מהעץ הקנוני:

`C:\Users\idanv\OneDrive\Desktop\SafeSoundArena`

## עדכון QA — 27 באוגוסט 2026

**לפני מעבר למיני־PC:** לקרוא את [מפת הפרויקט](PROJECT_FILE_MAP.md), [בדיקת המוכנות](MINI_PC_READINESS.md), [Runbook ה־Ubuntu](MINI_PC_RUNBOOK.md) ו־[גבול מסירת Git/MCP](GIT_MCP_HANDOFF.md). הוגדרו חיבורי תיעוד ותצורת יעד מדורגת, לא חיבור למכשיר. סקירת המקור מצאה חסמים; לא בוצעה התקנה או קבלת מערכת על יעד חדש.

**ארכיטקטורת היעד:** המיני־PC עם Ubuntu נשאר שרת ההרצה הראשי, וה־QNAP משמש אחסון וגיבוי. docker-compose.minipc.yml מפעיל API + Frontend בלבד תחת minipc, ללא build/pull על היעד, עם רשת פנימית, loopback, מגבלות ו־preflight מדורג. [QNAP NAS preflight and operator checklist](QNAP_NAS_CHECKLIST.md) שומר מסלול fallback נפרד בלבד. שני המסלולים אינם אישור פריסה או הוכחת בידוד רשת מלאה.

**ההגשה העדכנית:** [חבילת QA של RC-0](qa/rc0/README.md), הכוללת STP/STD/STR, מלאי בדיקות, עקיבות וממצאים. 46/46 בדיקות יחידה ואחסון נבחרות עברו בסביבה מבודדת; API/UI, בדיקות מערכת, CI ופריסה לא אומתו מחדש. מסמכי ההגשה ממתינים לסקירה, ואינם אישור שחרור.

הפקודות והאימותים בהמשך מתעדים מסלול תפעולי קודם. הם **אינם מתכון להרצה מבודדת של RC-0**: אין לבצע כעת העתקת `.env` עם overwrite, `up --build`, restart, הורדות או שימוש בנתוני השירותים הקיימים מכוח מסמך זה. להרצת API + Frontend נדרשים קודם [תנאי הכניסה ב־STP](qa/rc0/STP.md) ונתוני דמה נפרדים. דגלי PQS/auto-enrich ופרסום loopback לבדם אינם הוכחה לחסימת יציאה חיצונית.

ראיות ההרצה המקוריות נשמרות ללא שינוי תחת `temp/rc0-20260827-01`; [STR](qa/rc0/STR.md) מפריד ביניהן לבין תכנון ההמשך. שינוי Compose הקיים לא נערך בחידוד זה. אין להשתמש ב־image האריזה או בסקריפטי ה־scratch כ־artifact/Runbook למסירה.

## בסיס תפעולי קודם — לא אימות חוזר

- Backend קנוני: `backend/app.js`, פורט `4000`.
- Frontend קנוני: `frontend`, פורט `3000`.
- Docker Compose קנוני: `docker-compose.yml` בלבד.
- Agent lifecycle, heartbeat lease, checkpoint pause/resume ו־Jail enforcement.
- Global Safety Switch ו־role enforcement בצד השרת.
- MSHIX execution requests עוברים דרך `src/server/agentExecutionController.js`; במצב הנוכחי הגבול admission-only ואינו מפעיל worker.
- MSHIX Brain Kernel שומר זיכרונות מקומיים ב־JSONL, משתמש בזהות יציבה שמבוססת על `eventId` למניעת כפילויות replay, ושומר גם enrichment חלקי; הוא מעשיר אותם רק כאשר `MSHIX_BRAIN_AUTO_ENRICH=true`, אינו מאמן משקלים ואינו מבצע פעולות.
- Child-agent limits ללא הרצת worker חיצוני.
- MSHIX event hub מחובר ל־Control Room, Jail, PQS, Feature Store ו־Blockchain observer boundaries.
- MSHIX audit events נכנסים ל־hash chain הקיים; ה־event history וה־dead-letter memory עדיין bounded ו־single-node.
- Feature mutations כותבים ל־Durable MSHIX Outbox וממתינים ל־enqueue/dispatch לפני התשובה; ה־outbox מבצע retry ו־startup replay. עדיין אין transaction אטומי משותף בין קובץ Feature Store לקובץ ה־Outbox.
- JailTime events נכתבים בנוסף ל־`jailtime-events.jsonl` תחת `SAFESOUND_DATA_DIR`, עם schema יציב ומצב זמינות שמופיע ב־`/api/health`; כשל כתיבה מסומן `degraded`.
- Persistence מקומי ל־single-node עבור agents, checkpoints, audit ו־safety state.
- בדיקות: `npm test` — 80 passing, frontend Jest — 4/4, TypeScript, שני production builds, Docker build/container smoke ו־JailTime/Brain end-to-end smoke עברו.
- בדיקת readiness: `scripts/validate-runtime-config.ps1`.
- Runtime אחיד: Node `24.x LTS`; Docker images ו־CI עודכנו בהתאם.

## שער הפעלה היסטורי — 2026-08-19

- שלושת עצי התלויות אומתו ללא vulnerabilities: root/workspaces, `frontend` standalone ו־`next-app`.
- Root Mocha: `80 passing`; Frontend Jest: `4/4`; TypeScript, lint ו־production builds עברו. ה־lint מסתיים עם `0 errors` ו־`60 warnings` קיימים שאינם חוסמים את ההפעלה.
- Docker Compose אומת ונבנה בהצלחה עם Node `24.x`, Next `16.3.1` ו־ethers `6.x`.
- `api-server` עלה כ־`healthy` בפורט `4000`; `frontend` עלה כ־`healthy` ונגיש דרך `http://127.0.0.1:3000/`.
- ניקוי restart מלא בוצע: הוסרו `temp` ישן, caches של Next, coverage ו־TypeScript build-info; dependencies הותקנו מחדש לפי שלושת ה־lockfiles. נתוני runtime, volumes, audit ו־Git נשמרו.
- בדיקת Web חיה: שמונת הנתיבים הפעילים של ה־Frontend הקנוני (`/`, `/about`, `/ai-dashboard`, `/contact`, `/dashboard`, `/debug-room`, `/mshix`, `/theme-showcase`) מחזירים `200`, title ותוכן SSR.
- בדיקת `next-app`: `/` ו־`/marketplace` מחזירים `200`, title ותוכן SSR.
- נוסף `_document.tsx` פעיל בשני יישומי ה־Web כדי לספק `lang`, title ותיאור ברירת־מחדל; ה־build והבדיקה החיה אומתו מחדש.
- בדיקת API חיצונית: `/api/health` מחזיר `200`; MSHIX במצב `ready`, שישה connectors במצב `ready/ok`, Brain במצב `ready`, Outbox טעון, ו־JailTime log במצב `ok`.
- נתיבי MSHIX אומתו עם `X-Admin-Token`; ללא token מתקבל `401` כמצופה. אומתו `/api/mshix/health`, `/brain/health`, `/outbox/status` ו־`/connectors`.
- במהלך הבדיקה נמצא קונטיינר Compose ישן בשם `safesoundarena-web-1` שתפס את פורט `3000`. הוא נעצר בלבד ולא נמחק; לאחר `--force-recreate` מיפוי הפורט של ה־Frontend חזר לעבוד.
- בדיקת JailTime/Brain enrichment המקומית עברה קודם לכן עם `health ok`, הפעלה וכיבוי Jail, כתיבת שני אירועים, Brain enrichment ו־queue ריק. ב־Compose הנוכחי `MSHIX_BRAIN_AUTO_ENRICH=false` כברירת מחדל.
- לא בוצעו commit, push או deploy. שער זה מאשר הפעלה מקומית/פיתוח בלבד, לא production.

## מה אתה צריך לספק בעצמך

### חובה להפעלה מקומית או ב־Docker

1. `ADMIN_TOKEN` — סוד ניהולי ארוך. מומלץ 64 bytes לפחות.
2. `ALLOWED_ORIGINS` — כתובת הדפדפן המורשית.
3. החלטת target: Windows מקומי או Mini PC.
4. אם משתמשים ב־Control Room עם agent אמיתי: `AI_AGENT_TOKEN` וזהות `x-agent-id` לכל agent.

### רק אם מפעילים integration

- `PI_API_KEY`, `PI_PIONEER_KEY` — רק לאחר החלטה להפעיל Pi.
- `OPENAI_API_KEY`, `CLAUDE_API_KEY`, `GEMINI_API_KEY` — רק אם בוחרים provider חיצוני.
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` — רק אם Ollama קיים ומוכן.
- `MSHIX_BRAIN_CHAT_MODEL`, `MSHIX_BRAIN_EMBED_MODEL` — מודלים מקומיים חינמיים; ברירת המחדל היא `qwen3:4b` ו־`embeddinggemma:300m`.
- DNS, כתובת ציבורית, SSL certificates ו־reverse proxy — רק להפעלה מרחוק.
- GitHub token/permissions — רק לפני workflow או deploy; לא נדרש להפעלה מקומית.

אין לשלוח secrets בצ'אט או לשמור אותם ב־Git.

## בלוק קונפיגורציה למילוי

צור או עדכן `.env` בשורש הפרויקט:

```dotenv
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
BACKEND_URL=http://localhost:4000
ADMIN_TOKEN=<generate-strong-secret>
ALLOWED_ORIGINS=http://localhost:3000

AI_CONTROL_ROOM_ENV=development
GLOBAL_AI_ENABLED=true
AI_ADMIN_TOKEN=
AI_AGENT_TOKEN=
AI_ADMIN_PERSISTENCE=true
AI_ADMIN_RUNTIME_STATE_PATH=
AI_ADMIN_AUDIT_LOG_PATH=

AGENT_LEASE_MONITOR=true
AGENT_HEARTBEAT_TIMEOUT_MS=60000
AGENT_LEASE_SWEEP_INTERVAL_MS=15000
AGENT_MAX_CHILDREN_PER_PARENT=3
AGENT_MAX_TOTAL_AGENTS=16
AGENT_MAX_CHILD_DEPTH=1

MSHIX_MAX_EVENT_BYTES=65536
MSHIX_EVENT_HISTORY_LIMIT=500
MSHIX_HANDLER_TIMEOUT_MS=5000
MSHIX_ALLOW_UNAUTHENTICATED_DEV=false
MSHIX_BRAIN_AUTO_ENRICH=false
MSHIX_BRAIN_STORE_PAYLOAD=false
MSHIX_BRAIN_CHAT_MODEL=qwen3:4b
MSHIX_BRAIN_EMBED_MODEL=embeddinggemma:300m
MSHIX_BRAIN_MAX_MEMORIES=10000
MSHIX_BRAIN_QUEUE_LIMIT=100
MSHIX_BRAIN_STORE_PATH=
MSHIX_OUTBOX_PATH=
MSHIX_OUTBOX_MAX_ENTRIES=10000
MSHIX_OUTBOX_MAX_ATTEMPTS=10
MSHIX_OUTBOX_RETRY_BASE_MS=1000
MSHIX_OUTBOX_DISPATCH_LEASE_MS=30000
MSHIX_OUTBOX_REPLAY_INTERVAL_MS=5000
MSHIX_OUTBOX_REPLAY_BATCH=100
JAILTIME_LOG_PATH=
JAILTIME_LOG_MAX_ENTRIES=10000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_REQUEST_TIMEOUT_MS=30000

SAFESOUND_DATA_DIR=./backend/api/data
SEED_MCP_PERMISSIONS=false
```

השאר את נתיבי ה־Control Room, Brain, Outbox ו־JailTime ריקים אם אתה עובד עם ה־runtime הקנוני. ה־Backend יכוון אותם אוטומטית ל־`SAFESOUND_DATA_DIR`; בתוך Docker ה־Compose מכוון אותם ל־`/app/data`. ב־Windows Ollama משתמש ב־`http://127.0.0.1:11434`; בתוך קונטיינר API יש להשתמש ב־`http://host.docker.internal:11434`.

## הפעלה על Windows — סדר מומלץ

פתח PowerShell בשורש הפרויקט:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
Copy-Item .env.example .env -Force
notepad .env
```

צור secret חדש לכל token:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

בדוק את הקונפיגורציה:

```powershell
.\scripts\validate-runtime-config.ps1 -EnvFile .env -SkipDocker
```

אם אתה עובד רק דרך Docker, אפשר לדלג על בדיקת Node המקומית:

```powershell
.\scripts\validate-runtime-config.ps1 -EnvFile .env -SkipNode
```

בדוק והריץ Docker:

```powershell
docker compose -f docker-compose.yml config -q
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml ps
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:3000
```

לוגים:

```powershell
docker compose -f docker-compose.yml logs -f api-server
docker compose -f docker-compose.yml logs -f frontend
```

עצירה ללא מחיקת נתונים:

```powershell
docker compose -f docker-compose.yml stop
```

## אם עוברים ל־Mini PC

את ההכנות אפשר לבצע ב־Windows. ה־Mini PC נדרש רק כאשר רוצים שירות רציף, כתובת קבועה או הפעלה שאינה תלויה במחשב העבודה.

על ה־Mini PC צריך להכין:

- Ubuntu/Debian מעודכן.
- Docker Engine ו־Docker Compose plugin.
- כתובת IP קבועה או DHCP reservation.
- לפחות 4GB RAM ו־20GB פנויים עבור ה־single-node הבסיסי.
- SSH מאובטח.
- תיקיית נתונים מגובה.
- DNS/SSL רק אם השירות חשוף מחוץ לרשת המקומית.

העתק למיני־PC רק את עץ הפרויקט שנבדק, `.env` שנבנה שם מקומית, ונתוני `backend/api/data` או גיבוי Control Room רק אם רוצים לשמר אותם. אל תעתיק `node_modules`, `.next`, קונטיינרים, Docker volumes או את העץ הישן `D:\SafeSoundArena`.

## מה לא להפעיל עדיין

- `docker-compose.final.yml`, `docker-compose.prod.yml`, `docker-compose.prod.ollama.yml` ו־Kubernetes manifests — תצורות legacy/חלופיות שלא הוצלבו מול runtime קנוני זה.
- `server/queue.js` — queue ישן עם Redis/BullMQ שאינו מחובר ל־`backend/app.js`.
- `deploy-production.js` — לא להריץ לפני בחירת workflow יחיד ובדיקת deploy.
- Pi/blockchain/providers חיצוניים — רק אחרי credentials, owner ותרחיש rollback.

## בדיקת מסירה אליי

אחרי שמילאת את `.env`, שלח לי רק תוצאות בלי ערכי secrets:

```powershell
.\scripts\validate-runtime-config.ps1 -EnvFile .env -SkipDocker
docker compose -f docker-compose.yml config -q
docker compose -f docker-compose.yml ps
```

בנוסף ציין:

```yaml
deployment_target: Windows-Docker | mini-PC-Docker
environment: development | staging | production
public_url: <none-or-url>
socket_url: <none-or-url>
ai_provider: disabled | ollama | external
preserve_existing_data: yes | no
```

אין צורך לייבא או לשלוח לי את הסודות עצמם.

## חסמים שעדיין דורשים החלטה ופיתוח מורכב

- rollback אמיתי של קבצים/DB — כרגע נשמר checkpoint pointer, לא snapshot שניתן לשחזר.
- worker queue/process executor חיצוני.
- auth אמיתי למשתמשים, מעבר ל־admin/agent tokens.
- DB/locking עבור multi-node.
- חיבור UI מלא ל־Control Room כעמוד פעיל.
- MSHIX multi-node persistence/replay ו־external queue — קיים כעת Outbox durable ל־single-node עם retry/replay; ה־history וה־dead-letter עדיין בזיכרון התהליך.
- Worker adapter אמיתי, queue, rollback snapshot ו־remote kill path עדיין חסומים עד שיוגדרו חוזה ביצוע, identity ותרחיש התאוששות.
- Ollama מקומי הוא dependency אופציונלי: אם אינו זמין, ה־Brain עדיין שומר תצפיות בסיסיות וממשיך את השרת. ב־QA הנוכחי הותקנו Docker image ושני המודלים `qwen3:4b` ו־`embeddinggemma:300m`; יש להפעיל `MSHIX_BRAIN_AUTO_ENRICH=true` רק לאחר בדיקת משאבים.
