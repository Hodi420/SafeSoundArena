# SafeSoundArena – היררכיה ומבנה מערכת

## כניסה לתיעוד הפעיל

- [מפת הקבצים והפרויקט](PROJECT_FILE_MAP.md) — runtime קנוני, legacy, packages, בדיקות ונתונים; baseline של 614 קבצים במעקב.
- [מוכנות למיני־PC](MINI_PC_READINESS.md) — סקירה סטטית, 14 פערים/שערים ופרטי היעד הנדרשים; עדיין לא אישור פריסה.
- [Runbook ל־Ubuntu Mini-PC](MINI_PC_RUNBOOK.md) — שכבת minipc, קובץ סביבה פרטי ו־preflight מדורג; אין בכך אישור התחלה או פריסה.
- [QNAP NAS fallback preflight](QNAP_NAS_CHECKLIST.md) — פרופיל run-only, בדיקות repository/staged/running ורשימת מפעיל; המיני־PC נשאר יעד ההרצה הראשי.
- [מסירת Git וחיבורי MCP](GIT_MCP_HANDOFF.md) — גבול הדחיפה, חיבורים שנבדקו, החרגות וגבולות CI.
- [חבילת הגשה ל־QA / RC-0](qa/rc0/README.md) — תוכנית, תרחישים, תוצאות, עקיבות וממצאים, מעודכן ל־2026-08-27. 46 בדיקות יחידה נבחרות עברו; אין אישור RC מלא או שחרור.
- [Operational Handoff](OPERATIONAL_HANDOFF.md) — מסלול תפעולי קנוני והבחנה בין אימות היסטורי להרצה מבודדת חדשה.
- [Project Status](../PROJECT_STATUS.md) — ראיות עדכניות וגבולות טענות הסטטוס. תיאור ההיררכיה והדוגמאות בהמשך אינו הוכחת מימוש או מוכנות לשחרור.

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
