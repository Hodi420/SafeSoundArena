# SafeSoundArena – היררכיה ומבנה מערכת

## מבנה תיקיות
```
SafeSoundArena/
  agents/         # סוכנים חכמים (Agent)
    agent.js
    agent-config.json
    logs/
  mini-mcps/      # מנהלי משנה (Mini-MCP)
    miniMcp.js
    mini-mcp-config.json
    logs/
  root-mcp/       # מנהל ראשי (Root MCP)
    rootMcp.js
    mcp-config.json
    logs/
  frontend/       # ממשק משתמש
    ...
  docs/           # תיעוד, דוגמאות, תרשימים
    README.md
    API.md
    ARCHITECTURE.md
  k8s/            # Kubernetes
  monitoring/     # ניטור
  tests/          # בדיקות
  .github/        # CI/CD
  ...
```

## דוגמה לזרימת עבודה
1. Root MCP מקבל משימה מה-UI
2. Root MCP מקצה ל-Mini-MCP
3. Mini-MCP בוחר Agent מתאים
4. Agent מבצע פקודה, מחזיר תוצאה, נרשם בלוג

## עקרונות API היררכי
- כל רכיב מספק endpoint `/docs` עם תיעוד אוטומטי של כל ה-API
- שמות endpoints אחידים: `/healthz`, `/meta`, `/settings`, `/logs`, `/capabilities`, `/api/agent`, `/webhook`, `/self-update`
- כל תגובה כוללת requestId, error, ו-data
- קונפיגורציה ברורה, שמות שדות אחידים

## דוגמה לקריאת API
```http
GET /agents/agent.js/healthz
Response:
{
  "status": "online",
  "version": "1.0.0",
  "uptime": 123.45,
  "agentId": "Agent-Image",
  "type": "image-processing",
  "time": "2024-06-01T12:00:00Z"
}
```

## דוקומנטציה אוטומטית
- כל Agent, Mini-MCP ו-Root MCP מספקים `/docs` עם תיעוד מלא של כל ה-API, כולל דוגמאות בקשה/תגובה.

## Best Practices
- כל קובץ config כולל תיעוד קצר בראשו (מה כל שדה עושה)
- שמות משתנים ופונקציות ברורים
- קוד מחולק למודולים קצרים
- תיעוד קצר בראש כל קובץ

---

לשאלות, הרחבות, או דוגמאות נוספות – פנה ל־Cascade! 