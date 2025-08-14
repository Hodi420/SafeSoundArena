# MCP Permissions API (SafeSoundArena)

This document describes the available endpoints and usage for the MCP Permissions system.

## Endpoints

### Get user roles
`GET /api/mcp/permissions/:userId`
Response:
```
{
  "userId": "idan",
  "roles": ["read", "admin"]
}
```

### Check if user has a role
`GET /api/mcp/has-permission/:userId/:role`
Response:
```
{
  "userId": "idan",
  "role": "admin",
  "has": true
}
```

### List all users with permissions
`GET /api/mcp/users`
Response:
```
{
  "users": ["idan", "testUser", ...]
}
```

### Add permission to user
`POST /api/mcp/permissions`
Body:
```
{
  "userId": "idan",
  "role": "admin"
}
```

### Remove permission from user
`DELETE /api/mcp/permissions`
Body:
```
{
  "userId": "idan",
  "role": "admin"
}
```

---

## Docker
- Use `docker-compose.backend.yml` to run the backend with persistent permissions.
- MCP permissions are saved in `backend/mcp-permissions.json`.

---

## הרחבות
- ניתן לייבא משתמשים חיצוניים (LDAP, CSV, API) דרך הפונקציה `importExternalUsers`.
- הרשאות ברירת מחדל ניתנות להגדרה דינמית.
- כל שינוי נשמר אוטומטית לקובץ.
