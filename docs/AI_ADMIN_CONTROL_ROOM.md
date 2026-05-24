# SafeSoundArena Command Control Room

מסוף הפיקוד הוא שכבת ניהול פקודות בין UI, Root MCP, Mini-MCP, Agents ומנהל אנושי. הוא נבנה לפי עקרונות `docs/README.md`: משימה נכנסת מה-UI, מוקצית לרכיב מתאים, מתבצעת על ידי Agent, חוזרת עם תשובה, ונרשמת בלוג.

## המבנה החיצוני

מה שהמנהל רואה:

- טופס יצירת פקודה: `command`, יעד, רמת סיכון, משימה, שאלות וחוזה תשובה.
- טבלת פקודות: סטטוס, יעד, סיכון, משימה, תשובה ופעולות.
- פעולות ניהול: בדיקה, אישור, דחייה, שליחה, מענה.
- פאנל ביקורת: אירועים אחרונים עם actor, זמן ו-requestId.
- פאנל תשובת בדיקה: פלט סימולציה בפורמט אחיד.

המסוף אינו נותן ל-AI לבצע פעולות קריטיות לבד. הוא נותן ל-AI ולמערכת ליצור פקודות, אבל מנהל מאשר או דוחה לפי policy.

## יישומי פיקוד במסוף

המסוף מחולק ליישומים תפעוליים, וכל יישום מכיל תבניות פקודה עם role, risk, יעד, שאלות, payload ו-impact:

- בריאות מערכת: בדיקת חיים, פורטים, תהליכים ותלויות.
- ולידציה: בדיקת repo לפני דחיפה ובדיקת מסמכים מול policy.
- לוגים וביקורת: קריאת לוגים, סיכום שגיאות, audit review ושאלות פתוחות.
- סוכנים ומשימות: מצב agents, סטטוס משימה, בקשת תשובה, דיאגנוסטיקה, restart ו-dispatch.
- אבטחה: פתיחת incident וסיבוב token.
- קהילה ומודרציה: סיכום משתמשים, דיווחים, moderation review וחסימות מוצעות.
- GitHub ו-CI: בדיקת CI, סקירת PR, בקשת code review והרצת בדיקות.
- פריסה ושחרור: deploy, rollback, merge PR ושינוי ENV.
- תשלומים וכלכלה: payment hold וסיבוב מפתחות תשלום.
- ממשל והרשאות: משימות מערכת רגישות וקידום מנהלים ידני.

כל תבנית מייצרת פקודה בפורמט אחיד, אבל ה-policy עדיין קובע אם היא `ready`, `pending_approval`, או חסומה ל-dispatch.

## המבנה הפנימי

זרימת הפקודה:

```text
UI / AI Agent
  -> create command
  -> policy assessment
  -> pending_approval or ready
  -> approve / reject
  -> dispatch
  -> answer
  -> audit log
```

בשלב הפיתוח הנוכחי יש executor מקומי מוגבל לפקודות בטוחות. הוא לא מבצע פעולות הרסניות, אלא מחזיר snapshot מבוקר לפקודות כמו:

- `inspect_health`
- `inspect_runtime_ports`
- `inspect_dependencies`
- `validate_repository`
- `validate_documents`
- `inspect_logs`
- `summarize_errors`
- `audit_review`
- `question_status`
- `summarize_agent_status`
- `task_status`
- `inspect_ci_status`
- `inspect_github_pr`

פקודות בקשה כמו `request_test_run`, `request_code_review` ו-`request_agent_answer` נרשמות כמשימה לסוכן ומחזירות חוזה פעולה, בלי להריץ shell חופשי. פקודות קריטיות או אסורות ל-AI ממשיכות להידרש לאישור מנהל ולתהליך ידני.

סטטוסים:

- `pending_approval`: דורש אישור מנהל.
- `ready`: ניתן לשליחה ללא אישור נוסף.
- `approved`: אושר על ידי מנהל.
- `rejected`: נדחה.
- `executed`: נשלח או נרשם כפעולה שהופעלה.
- `answered`: חזרה תשובה.
- `expired`: פג תוקף.

מבנה פקודה:

```json
{
  "id": "uuid",
  "command": "dispatch_agent_command",
  "status": "pending_approval",
  "risk": "high",
  "target": {
    "type": "agent",
    "name": "Agent-Image",
    "url": null
  },
  "task": {
    "title": "בדיקת קבצי תמונה",
    "description": ""
  },
  "questions": [
    "מה נשבר?",
    "מה נדרש לאישור?"
  ],
  "answerRequest": "Return { requestId, error, data } with a short operational answer.",
  "answer": null
}
```

## המבנה האחורי

קבצים:

- `server/ai-admin-policy.json`: חוקה לפקודות, סיכונים, פעולות אסורות ופעולות שדורשות אישור.
- `server/aiAdminGovernance.js`: API לניהול פקודות, אישורים, סימולציה, שליחה, תשובות וביקורת.
- `server/proofLayer.js`: שכבת הוכחות append-only עם activity, checkpoints, bot responses ושרשרת `previousHash`.
- `server/index.js`: מחבר את ה-API תחת `/api/admin/ai`.
- `server/data/ai-admin-commands.json`: תור פקודות מקומי.
- `server/data/ai-admin-audit.jsonl`: יומן ביקורת append-only בסגנון JSONL.
- `server/data/proof-events.jsonl`: יומן Proof Layer מקומי, לא מנוהל ב-Git.

חוזה תגובה אחיד:

```json
{
  "requestId": "uuid",
  "error": null,
  "data": {}
}
```

במקרה שגיאה:

```json
{
  "requestId": "uuid",
  "error": {
    "message": "Admin approval required",
    "details": null
  },
  "data": null
}
```

Endpoints:

```http
GET  /api/admin/ai/healthz
GET  /api/admin/ai/meta
GET  /api/admin/ai/capabilities
GET  /api/admin/ai/docs
GET  /api/admin/ai/settings
GET  /api/admin/ai/commands?status=pending_approval
POST /api/admin/ai/commands
GET  /api/admin/ai/commands/:id
POST /api/admin/ai/commands/:id/approve
POST /api/admin/ai/commands/:id/reject
POST /api/admin/ai/commands/:id/simulate
POST /api/admin/ai/commands/:id/dispatch
POST /api/admin/ai/commands/:id/answer
GET  /api/admin/ai/logs?limit=100
GET  /api/admin/ai/proof?limit=20
GET  /api/admin/ai/proof/verify
GET  /api/admin/ai/proof/activity?limit=100
GET  /api/admin/ai/proof/checkpoints?limit=100
POST /api/admin/ai/proof/checkpoints
GET  /api/admin/ai/proof/bot-responses?limit=100
```

## Proof Layer

כל אירוע Proof נשמר כ-JSONL עם:

- `type`: `activity`, `checkpoint`, או `bot_response`.
- `payload`: פרטי האירוע.
- `algorithm`: `sha256` כברירת מחדל, או `sha512` כאשר נשלח `hashAlgorithm`.
- `previousHash`: hash הרשומה הקודמת בשרשרת.
- `hash`: digest של הרשומה הנוכחית ללא שדה `hash`.

`writeAudit` מוסיף activity אוטומטי לכל פעולת ניהול. יצירה, אישור, דחייה ושליחת פקודה מוסיפים checkpoints. מענה של bot או agent דרך `/commands/:id/answer` נשמר גם כ-`bot_response`, כולל hash של גוף התשובה.

דוגמת checkpoint עם SHA-512:

```http
POST /api/admin/ai/proof/checkpoints
x-agent-token: <AI_AGENT_TOKEN>

{
  "label": "post-validation",
  "scope": "local-build",
  "hashAlgorithm": "sha512",
  "payload": {
    "commands": ["npm run test:all", "npm --prefix frontend run build"],
    "status": "passed"
  }
}
```

בדיקת שלמות:

```http
GET /api/admin/ai/proof/verify
x-admin-token: <ADMIN_TOKEN>
```

תאימות לאחור:

```http
GET  /api/admin/ai/actions
POST /api/admin/ai/actions/propose
POST /api/admin/ai/actions/:id/approve
POST /api/admin/ai/actions/:id/reject
POST /api/admin/ai/actions/:id/simulate
```

אבטחה:

- קריאה וניהול דורשים `x-admin-token`.
- יצירת פקודה ומענה יכולים להגיע מ-`x-agent-token` או `x-admin-token`.
- פקודות ברמת `high` או `critical` עוברות ל-`pending_approval`.
- פקודות שמופיעות ב-`forbiddenForAiExecution` לא נשלחות על ידי AI.

משתני סביבה:

```env
ADMIN_TOKEN=replace-with-secure-secret
AI_AGENT_TOKEN=replace-with-agent-secret
```

## המבנה הקדמי

קבצים:

- `frontend/pages/admin-ai.jsx`: עמוד כניסה למסוף.
- `frontend/src/ui/AiAdminControlRoom.jsx`: רכיב המסוף.

הקדמי מדבר עם `/api/admin/ai/commands`, `/api/admin/ai/logs` ו-`/api/admin/ai/capabilities`, ומפרק את התשובות לפי `data`. זה מיישר קו עם ההנחיה שכל API יחזיר `requestId`, `error`, `data`.

בסביבת פיתוח מקומית `frontend/next.config.js` יכול לבצע rewrite מ-`/api/admin/ai/*` אל שרת ה-API המקומי, למשל `http://localhost:4000`.

## הפעלה כדוגמת פיתוח

יצירת פקודה:

```http
POST /api/admin/ai/commands
Content-Type: application/json
x-agent-token: <AI_AGENT_TOKEN>

{
  "command": "audit_review",
  "targetType": "root-mcp",
  "targetName": "SafeSoundArena",
  "risk": "medium",
  "taskTitle": "בדיקת ביקורת הרשאות",
  "reason": "בדיקה יומית של פעולות ניהול",
  "questions": [
    "האם יש פעולות קריטיות ללא אישור?",
    "האם יש token ברירת מחדל?"
  ]
}
```

אישור:

```http
POST /api/admin/ai/commands/:id/approve
x-admin-token: <ADMIN_TOKEN>

{
  "note": "מאושר להפעלה"
}
```

מענה:

```http
POST /api/admin/ai/commands/:id/answer
x-agent-token: <AI_AGENT_TOKEN>

{
  "data": {
    "summary": "נמצאו 2 סיכונים",
    "requiredApproval": true
  }
}
```

## מה עדיין צריך להשלים

- לחבר executor אמיתי שמבצע רק פקודות `ready` או `approved`.
- לחבר הרשאות מנהל אמיתיות במקום `window.ADMIN_TOKEN`.
- להעביר את תור הפקודות מ-JSON ל-DB.
- להחליף את `ignoreBuildErrors`/`ignoreDuringBuilds` בניקוי TypeScript ו-ESLint מלא.
