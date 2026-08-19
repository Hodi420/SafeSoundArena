# JailTime Events

המודול מספק יומן append-only מקומי לאירועי JailTime. הוא אינו מנהל את ה־scheduler או את ה־socket בעצמו; `backend/app.js` מזין אליו אירועי `jail.*` ואירועי scheduler/socket הקשורים ל־JailTime.

## מה נרשם

כל רשומה היא JSONL עם הסכמה `jailtime-event-v1` וכוללת:

- `eventId`, `eventType`, `source`, `timestamp`
- `correlationId` ו־`actor` כאשר קיימים
- `payload` מצומצם של אירוע JailTime

ברירת המחדל היא `jailtime-events.jsonl` תחת `SAFESOUND_DATA_DIR`. ניתן לשנות באמצעות `JAILTIME_LOG_PATH` ולהגביל את גודל הזיכרון/הטעינה באמצעות `JAILTIME_LOG_MAX_ENTRIES`.

## API פנימי

- `createJailTimeEventLog(options)` — יצירת logger.
- `JailTimeEventLog.record(event)` — כתיבת אירוע וסנכרון לזיכרון.
- `JailTimeEventLog.list(limit)` — קריאת אירועים אחרונים.
- `JailTimeEventLog.getStatus()` — מצב, מונה, נתיב ושגיאה אחרונה.
- `isJailTimeEvent(event)` — בדיקת גבול האירועים.

כשל כתיבה אינו עוצר את שידור ה־JailTime, אך מופיע ב־`/api/health` כ־`degraded` כדי שהבעיה לא תוסתר.

## בדיקת smoke

```powershell
pwsh -NoProfile -File scripts/qa-jailtime-smoke.ps1
pwsh -NoProfile -File scripts/qa-jailtime-smoke.ps1 -EnableBrainEnrichment
```
