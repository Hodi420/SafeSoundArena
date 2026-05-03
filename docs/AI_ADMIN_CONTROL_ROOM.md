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
- `server/index.js`: מחבר את ה-API תחת `/api/admin/ai`.
- `server/data/ai-admin-commands.json`: תור פקודות מקומי.
- `server/data/ai-admin-audit.jsonl`: יומן ביקורת append-only בסגנון JSONL.

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

הקדמי מדבר רק עם `/api/admin/ai/commands` ו-`/api/admin/ai/logs`, ומפרק את התשובות לפי `data`. זה מיישר קו עם ההנחיה שכל API יחזיר `requestId`, `error`, `data`.

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
- לפתור conflict markers ב-frontend לפני build מלא.
