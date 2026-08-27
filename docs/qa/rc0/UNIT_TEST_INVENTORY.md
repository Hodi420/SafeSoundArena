# UNIT_TEST_INVENTORY — RC-0

מלאי בדיקות רטרוספקטיבי, נערך ב־2026-08-27 עבור הריצה המבודדת `rc0-20260827-01`.
Tested SHA: `e33cfd88d127c5e7cd1a7266295aa924b9935b3b`.
זה אינו Test Plan שאושר מראש: המזהים `UT-001` עד `UT-046` הוקצו לאחר ההרצה לצורכי עקיבות ותיעוד. לא בוצעה הרצה חוזרת במסגרת הכנת מסמך זה.

## Scope and evidence — היקף ומקורות

הרשימה משמרת את שמות ה־suites, את כותרות הבדיקות המדויקות ואת סדר הופעתן בלוג. כל `PASS` הוא הצלחת ה־assertions של מקרה הבדיקה בריצה המתועדת, ולא אישור לכיסוי runtime או לאיכות המוצר כולו. ה־Source בכל שורה מפנה לקובץ הבדיקה ולשורת הגדרת `it(...)` במאגר.

| Evidence ID | מקור קיים | תפקיד |
| --- | --- | --- |
| E01 | [unit-result.json](../../../temp/rc0-20260827-01/unit-result.json) | תוצאה מסכמת: 46 tests, 46 passes, 0 failures, 0 pending, exit code 0. |
| E02 | [unit-output.log](../../../temp/rc0-20260827-01/unit-output.log) | ה־precheck, פלט כל מקרה בדיקה ותוצאת השער; בטבלה יש הפניה לשורה המדויקת. |
| E03 | [rc0-manifest.json](../../../temp/rc0-20260827-01/snapshot-02/source/rc0-manifest.json) | ה־revision, רשימת 10 קובצי הבדיקות, hashes של 29 קובצי מקור ומלאי תלויות. |

הסבר על ההכנה, הבידוד, הניקוי והחריגות נמצא ב־[דוח הריצה המקורי](../../../temp/rc0-20260827-01/REPORT.md). הראיות המקוריות לא שונו בעת כתיבת המלאי. הן נמצאות תחת `temp`, המוחרג מ־Git: מסירת קובצי התיעוד בלבד אינה מסירת הראיות. יש לצרף למסירה את הראיות שנבחרו במלאי הראיות הראשי, לשמר את מבנה הנתיבים או לתקן את הקישורים בעותק המסירה ולבדוק אותם. אין לצרף `.env`, נתוני runtime או image של האפליקציה.

## Common preconditions — תנאי קדם משותפים לריצה שתועדה

- הריצה השתמשה בעותק מסונן המוגדר ב־E03: 19 קובצי מימוש ו־10 קובצי בדיקה, עם תלויות מקומיות קיימות בלבד. ה־manifest מתעד גם שינוי מקומי שהיה קיים ב־`docker-compose.yml`; אין להציג את סביבת הבדיקה כ־working tree נקי. בעת הכנת מסמך זה בוצעה השוואת SHA-256 בקריאה בלבד: כל 29 קובצי המקור הנוכחיים התאימו ל־E03.
- Node `v24.19.0`, Mocha `11.3.0`; הרצה חד־פעמית בקונטיינר עם `network=none`, ממשק `lo` בלבד וללא פורטים מפורסמים. קוד ותלויות היו לקריאה בלבד, root filesystem לקריאה בלבד ו־`/app` המקורי הוסתר ב־tmpfs ריק לקריאה בלבד. לא נטען application entrypoint.
- אין host bind mounts או volumes בריצת הבדיקות. נתוני הדמה הוגדרו בקוד; מקרי האחסון יצרו קבצים זמניים ב־`/tmp` בזיכרון. לא הועתקו נתוני משתמשים, קובצי audit, `.env`, workspace junctions או native add-ons. כתיבות אלה אינן כתיבות לנתוני הפרויקט האמיתיים.
- UID/GID `65534:65534`, ללא capabilities, עם `no-new-privileges`, ללא healthcheck או restart; מגבלות CPU אחד, 512MiB, 64 תהליכים ו־deadline חיצוני של 45 שניות. שומרי הבדיקה חסמו שימוש ברשת, פתיחת listener או subprocess; E01/E02 מדווחים על אפס ניסיונות שזוהו.
- דרך האימות היא הרצת מקרי `it(...)` הנבחרים והשוואת ערכים, שגיאות ו־state באמצעות `assert`. אין כאן הוראת rerun: הרצה חדשה מחייבת preflight, מזהים וסביבה מבודדת חדשים לפי תוכנית הבדיקה המאושרת לאותה הרצה.

## Suite context — נתונים, דרך אימות ותוצאה צפויה

התקצירים הבאים נגזרים מקוד הבדיקות המקושר בטבלה. הם משמשים את ה־STD כהקשר למקרים הקיימים, ולא מוסיפים מקרי בדיקה או תוצאות שלא נמדדו.

### feature store — UT-001–UT-004

- תנאי קדם ו־fixtures: `createSeedState()` עם `persist: false` למקרי הזיכרון; מזהה סינתטי `user-1`. מקרה האחסון משתמש בתיקייה זמנית חדשה וב־`state.json` ייעודי.
- דרך אימות ותוצאה צפויה: השתתפות באירוע משתנה מ־0 ל־1 וחזרה ל־0, join כפול אינו מצטרף שוב; progress של 100 מסיים quest; כמות מכירה 0 ופריט קנייה חסר נדחים; טעינה מחדש של קובץ guild מחזירה חבר אחד.
- גבול: ארבעה מקרי store בלבד. אין HTTP, שיוך זהות מאומתת, בדיקת ownership או כיסוי מלא של ששת מסלולי הפיצ'רים.

### Agent execution controller boundary — UT-005–UT-007

- תנאי קדם ו־fixtures: agent סינתטי `worker-1` במצב `ACTIVE`, בקר בטיחות עצמאי ו־`autoStartLeaseMonitor: false`; אין adapter להפעלת worker.
- דרך אימות ותוצאה צפויה: receipt תואם בדיוק ל־`controller-admission-only`, עם `accepted: true` ו־`executionStarted: false`; מצב `JAILED` נדחה ב־`AGENT_JAILED`/423; כיבוי הבטיחות נדחה ב־`GLOBAL_AI_DISABLED`/503.
- גבול: UT-006 מפעיל בפועל את מצב `JAILED` בלבד, אף שכותרתו מזכירה גם non-dispatchable agents. אלה שדות שגיאה של המחלקה, לא responses שנמדדו ב־HTTP.

### Agent lifecycle controller — UT-008–UT-015

- תנאי קדם ו־fixtures: controllers ו־agents בזיכרון; checkpoints סינתטיים `cp-1` ו־`cp-42`. ל־lease מוזרק שעון מ־2026-01-01 עם timeout של 1,000ms והתקדמות של 1,001ms בכל sweep. callbacks של persistence זורקים שגיאות מדומות.
- דרך אימות ותוצאה צפויה: רישום מתחיל ב־`REGISTERED` ואינו מקבל עבודה; ACTIVE/pause/resume משנים admission; מעברים לא חוקיים, agent חסר ו־checkpoint חסר/שונה נדחים; היסטוריית REGISTERED→STARTING→ACTIVE→JAILED→STOPPING→STOPPED נשמרת; מתג הבטיחות שומר את actor; lease מתקדם ל־UNHEALTHY ואז LOST; כשל callback אינו מפרסם שינוי state.
- גבול: היסטוריה נבדקת לפי רצף המצבים המפורש, ו־rollback נבדק בזיכרון בעקבות callback שנכשל. אין snapshot, כשל דיסק אמיתי או שחזור מערכת רצה.

### Agent orchestrator — UT-016–UT-019

- תנאי קדם ו־fixtures: parent סינתטי פעיל ו־children בזיכרון; מגבלות של שני ילדים, שלושה agents חיים ועומק אחד במקרה הקיבולת. מקרים נוספים משתמשים בילד יחיד או בבטיחות כבויה.
- דרך אימות ותוצאה צפויה: ילד שלישי ועומק נוסף נדחים; parent מושהה אינו רשאי ליצור ילד; עצירת ילד לפני התחלה מחזירה `CANCELLED` ומשחררת מקום; parent שאינו מתאים נדחה; כיבוי הבטיחות מחזיר `GLOBAL_AI_DISABLED`.
- גבול: `spawnChildAgent` מתאר רשומות orchestration בבדיקות האלה, לא הפעלת תהליכי מערכת או workers.

### Safety Gate 1 — UT-020–UT-022

- תנאי קדם ו־fixtures: lifecycle/orchestrator בזיכרון עם lease monitor כבוי; checkpoints סינתטיים, שעון ידני 1000→1201→1402, timeout של 100ms ומגבלות ילד אחד, שני agents ועומק אחד.
- דרך אימות ותוצאה צפויה: checkpoint שגוי נדחה והנכון מאפשר resume; `CANCELLED` שונה מ־`STOPPED`; JAILED ו־KILLED אינם מקבלים עבודה; רצף FAILED→ROLLING_BACK→RECOVERING→STARTING→ACTIVE מתקבל; חריגת ילדים נדחית וה־lease יורד ל־UNHEALTHY/LOST.
- גבול: רצף recovery הוא אימות של מכונת מצבים, לא ביצוע rollback של תהליך, של קבצים או של snapshot. אין בדיקת kill של worker אמיתי.

### MSHIX core — UT-023–UT-030

- תנאי קדם ו־fixtures: אירועים סינתטיים, connectors מקומיים שהם callbacks, controllers בזיכרון ו־audit שנרשם למערך. ערך `apiKey` ב־fixture הוא מחרוזת דמה. connector אחד זורק שגיאה ואחר מצליח בניסיון השני.
- דרך אימות ותוצאה צפויה: event version נשמר, `apiKey` מוחלף ב־`[REDACTED]`, idempotency key חוזר מסומן duplicate; safety כבוי ו־agent jailed נחסמים; controller מחזיר admission בלבד; כשל connector יוצר dead-letter; replay מפורש מצליח בניסיון השני; dry-run אינו יוצר history; callback של audit מקבל אירוע accepted יחיד ללא audit failure.
- גבול: UT-025 בודק agent במצב JAILED, לא את שעון JailTime של המוצר. UT-028 בודק replay בליבת MSHIX עם callback, לא commit אטומי או שחזור outbox לאחר crash. אין connector חיצוני או שרת HTTP.

### MSHIX durable outbox — UT-031–UT-033

- תנאי קדם ו־fixtures: ל־reload נוצר `outbox.jsonl` בתיקייה זמנית חדשה; יתר המקרים משתמשים ב־`filePath: null` וב־delivery callbacks מדומים. שעון backoff מתחיל ב־2026-08-19, `retryBaseMs: 10`, `dispatchLeaseMs: 100` ו־`maxAttempts: 3`; מקרה dead-letter מוגבל לניסיון אחד.
- דרך אימות ותוצאה צפויה: enqueue אחרי reload מחזיר אותו ID, סטטוס pending ומספר רשומות 1; כישלון ניסיון ראשון דוחה retry עד להתקדמות של 11ms, ואז מתקבל delivered עם שני ניסיונות; כישלון במגבלת ניסיון אחד יוצר `dead_letter` ושומר הודעת שגיאה.
- גבול: נבדקו קובץ fixture יחיד ו־callbacks, לא טרנזקציה משותפת ל־Feature Store ול־outbox, לא concurrent writers ולא recovery של השירות כולו.

### MSHIX Brain Kernel — UT-034–UT-039

- תנאי קדם ו־fixtures: אירוע `evt-brain-1` סינתטי עם טקסט על Arena; memory store בזיכרון או JSONL זמני. כשל append נוצר באמצעות קובץ רגיל במקום תיקיית אב בתוך temp. ספקי `fake-chat`/`fake-embed` מחזירים תוכן ווקטורים קבועים או זורקים שגיאה; אין Ollama אמיתי.
- דרך אימות ותוצאה צפויה: ingest מאשר observation ללא שדה payload מלא; replay אחרי reload שומר memory ID יחיד; append כושל אינו מפרסם revision בזיכרון; לאחר `drain`, enrichment/search דרך הספק המדומה מחזירים את הרשומה והווקטור `[1, 0]`; כשל enrichment משאיר observation ומדדי כשל; כשל embedding אחרי chat מוצלח משמר summary במצב `enriched_partial`.
- גבול: UT-034 מגדיר `maxMemories: 2` אך מכניס observation אחד בלבד, ולכן אינו בדיקת overflow או eviction. אין הוכחה לאיכות מודל, זמינות מודל אמיתי או אי־שמירת טקסט: `memoryText` נשמר במפורש.

### JailTime event log — UT-040–UT-041

- תנאי קדם ו־fixtures: JSONL זמני חדש; שעון קבוע `2026-08-19T12:00:00.000Z`; אירוע דמה `jail-event-1` מסוג `jail.status.changed`.
- דרך אימות ותוצאה צפויה: schema הוא `jailtime-event-v1`, ה־event ID נשמר, count הוא 1 ו־reload מחזיר רשומה זהה וסטטוס ok; סיווג מקבל `jail.user.joined` או source של `backend.jail.socket`, ודוחה `feature.event.joined`.
- גבול: סיווג ורישום JSONL בלבד, לא מחזור זמני JailTime מלא, חלוקת rewards או Socket.IO בדפדפן.

### PQS — UT-042–UT-046

- תנאי קדם ו־fixtures: סימולציה בזיכרון עם שעון מ־2026-06-01 בקפיצות של שנייה, קבוצות red/blue ושחקנים סינתטיים. לתרחיש החיובי מוקצים scoreCP של 42/30 ו־actionCP של 70 לכל קבוצה; התרחיש השלילי ללא actionCP. fixtures נפרדים מכילים match שהושלם, חמישה אירועים בזמנים סדירים, disconnect מאוחר והיסטוריית מפגשים.
- דרך אימות ותוצאה צפויה: שבע הפעולות שנבחרו מתקבלות ונרשמות, red מנצחת, proof hash הוא 128 ספרות hex וה־preview rewards אינם external/tradable; פעולה ללא CP נדחית ונרשמת; אותו record מפיק hash זהה; חמש קטגוריות anti-abuse מופיעות; שלושת ה־placeholder adapters כבויים ודוחים publish.
- גבול: חמש בדיקות של מודולים/simulation בלבד. אין הפעלת מסלול PQS HTTP, פלטפורמה רשמית, תשלום, token או אימות אבטחה כולל של anti-abuse.

## Executed test inventory — מלאי המקרים בפועל

| ID | Suite | Exact test title | Source | Actual result | Evidence |
| --- | --- | --- | --- | --- | --- |
| UT-001 | feature store | lists seeded events and tracks join/leave state | [Source](../../../backend/api/featureStore.test.js#L9) | PASS | [E02:5](../../../temp/rc0-20260827-01/unit-output.log#L5) |
| UT-002 | feature store | updates quest progress and completion state | [Source](../../../backend/api/featureStore.test.js#L18) | PASS | [E02:6](../../../temp/rc0-20260827-01/unit-output.log#L6) |
| UT-003 | feature store | rejects invalid marketplace mutations | [Source](../../../backend/api/featureStore.test.js#L26) | PASS | [E02:7](../../../temp/rc0-20260827-01/unit-output.log#L7) |
| UT-004 | feature store | persists state through a configured file | [Source](../../../backend/api/featureStore.test.js#L32) | PASS | [E02:8](../../../temp/rc0-20260827-01/unit-output.log#L8) |
| UT-005 | Agent execution controller boundary | admits active work without starting a worker process | [Source](../../../test/agentExecutionController.test.js#L24) | PASS | [E02:11](../../../temp/rc0-20260827-01/unit-output.log#L11) |
| UT-006 | Agent execution controller boundary | blocks jailed and non-dispatchable agents at the controller boundary | [Source](../../../test/agentExecutionController.test.js#L47) | PASS | [E02:12](../../../temp/rc0-20260827-01/unit-output.log#L12) |
| UT-007 | Agent execution controller boundary | honors the independent global safety switch before target dispatch | [Source](../../../test/agentExecutionController.test.js#L61) | PASS | [E02:13](../../../temp/rc0-20260827-01/unit-output.log#L13) |
| UT-008 | Agent lifecycle controller | registers an agent in a safe non-running state | [Source](../../../test/agentLifecycle.test.js#L11) | PASS | [E02:16](../../../temp/rc0-20260827-01/unit-output.log#L16) |
| UT-009 | Agent lifecycle controller | enforces the active, pause and resume lifecycle | [Source](../../../test/agentLifecycle.test.js#L20) | PASS | [E02:17](../../../temp/rc0-20260827-01/unit-output.log#L17) |
| UT-010 | Agent lifecycle controller | rejects unsafe or unknown transitions | [Source](../../../test/agentLifecycle.test.js#L38) | PASS | [E02:18](../../../temp/rc0-20260827-01/unit-output.log#L18) |
| UT-011 | Agent lifecycle controller | requires the same checkpoint to pause and resume an agent | [Source](../../../test/agentLifecycle.test.js#L52) | PASS | [E02:19](../../../temp/rc0-20260827-01/unit-output.log#L19) |
| UT-012 | Agent lifecycle controller | records jail and failure transitions without erasing history | [Source](../../../test/agentLifecycle.test.js#L75) | PASS | [E02:20](../../../temp/rc0-20260827-01/unit-output.log#L20) |
| UT-013 | Agent lifecycle controller | provides an independent global execution switch | [Source](../../../test/agentLifecycle.test.js#L92) | PASS | [E02:21](../../../temp/rc0-20260827-01/unit-output.log#L21) |
| UT-014 | Agent lifecycle controller | moves an inactive agent from unhealthy to lost after lease expiry | [Source](../../../test/agentLifecycle.test.js#L100) | PASS | [E02:22](../../../temp/rc0-20260827-01/unit-output.log#L22) |
| UT-015 | Agent lifecycle controller | rolls back lifecycle and safety mutations when persistence fails | [Source](../../../test/agentLifecycle.test.js#L124) | PASS | [E02:23](../../../temp/rc0-20260827-01/unit-output.log#L23) |
| UT-016 | Agent orchestrator | bounds child fan-out and total live agents | [Source](../../../test/agentOrchestrator.test.js#L13) | PASS | [E02:26](../../../temp/rc0-20260827-01/unit-output.log#L26) |
| UT-017 | Agent orchestrator | prevents nested child trees and requires an active parent | [Source](../../../test/agentOrchestrator.test.js#L34) | PASS | [E02:27](../../../temp/rc0-20260827-01/unit-output.log#L27) |
| UT-018 | Agent orchestrator | stops a child and releases its orchestration slot | [Source](../../../test/agentOrchestrator.test.js#L58) | PASS | [E02:28](../../../temp/rc0-20260827-01/unit-output.log#L28) |
| UT-019 | Agent orchestrator | honors the global safety switch before spawning | [Source](../../../test/agentOrchestrator.test.js#L77) | PASS | [E02:29](../../../temp/rc0-20260827-01/unit-output.log#L29) |
| UT-020 | Safety Gate 1 | proves checkpoint pause/resume and distinct stop/cancel paths | [Source](../../../test/safetyGate1.test.js#L12) | PASS | [E02:32](../../../temp/rc0-20260827-01/unit-output.log#L32) |
| UT-021 | Safety Gate 1 | proves Jail, kill and recovery transitions remain fail-closed | [Source](../../../test/safetyGate1.test.js#L45) | PASS | [E02:33](../../../temp/rc0-20260827-01/unit-output.log#L33) |
| UT-022 | Safety Gate 1 | proves heartbeat lease degradation and bounded child orchestration | [Source](../../../test/safetyGate1.test.js#L72) | PASS | [E02:34](../../../temp/rc0-20260827-01/unit-output.log#L34) |
| UT-023 | MSHIX core | normalizes, redacts, routes and deduplicates events | [Source](../../../test/mshix.test.js#L11) | PASS | [E02:37](../../../temp/rc0-20260827-01/unit-output.log#L37) |
| UT-024 | MSHIX core | blocks execution when the global safety switch is disabled | [Source](../../../test/mshix.test.js#L45) | PASS | [E02:38](../../../temp/rc0-20260827-01/unit-output.log#L38) |
| UT-025 | MSHIX core | honors agent lifecycle and Jail admission gates | [Source](../../../test/mshix.test.js#L56) | PASS | [E02:39](../../../temp/rc0-20260827-01/unit-output.log#L39) |
| UT-026 | MSHIX core | requests execution through the separate controller boundary | [Source](../../../test/mshix.test.js#L77) | PASS | [E02:40](../../../temp/rc0-20260827-01/unit-output.log#L40) |
| UT-027 | MSHIX core | isolates connector failures in a dead-letter record | [Source](../../../test/mshix.test.js#L105) | PASS | [E02:41](../../../temp/rc0-20260827-01/unit-output.log#L41) |
| UT-028 | MSHIX core | allows a durable outbox replay to retry a failed delivery | [Source](../../../test/mshix.test.js#L119) | PASS | [E02:42](../../../temp/rc0-20260827-01/unit-output.log#L42) |
| UT-029 | MSHIX core | supports dry-run admission without creating history | [Source](../../../test/mshix.test.js#L149) | PASS | [E02:43](../../../temp/rc0-20260827-01/unit-output.log#L43) |
| UT-030 | MSHIX core | records accepted events through the optional audit boundary | [Source](../../../test/mshix.test.js#L157) | PASS | [E02:44](../../../temp/rc0-20260827-01/unit-output.log#L44) |
| UT-031 | MSHIX durable outbox | persists pending events and deduplicates them after reload | [Source](../../../test/mshixOutbox.test.js#L10) | PASS | [E02:47](../../../temp/rc0-20260827-01/unit-output.log#L47) |
| UT-032 | MSHIX durable outbox | retries a failed delivery after its backoff window | [Source](../../../test/mshixOutbox.test.js#L26) | PASS | [E02:48](../../../temp/rc0-20260827-01/unit-output.log#L48) |
| UT-033 | MSHIX durable outbox | marks an entry dead-letter after the attempt limit | [Source](../../../test/mshixOutbox.test.js#L56) | PASS | [E02:49](../../../temp/rc0-20260827-01/unit-output.log#L49) |
| UT-034 | MSHIX Brain Kernel | stores bounded observations without requiring Ollama or payload persistence | [Source](../../../test/mshixBrainKernel.test.js#L25) | PASS | [E02:52](../../../temp/rc0-20260827-01/unit-output.log#L52) |
| UT-035 | MSHIX Brain Kernel | deduplicates replayed events using stable event-derived memory identity | [Source](../../../test/mshixBrainKernel.test.js#L39) | PASS | [E02:53](../../../temp/rc0-20260827-01/unit-output.log#L53) |
| UT-036 | MSHIX Brain Kernel | does not publish an in-memory revision when the durable append fails | [Source](../../../test/mshixBrainKernel.test.js#L59) | PASS | [E02:54](../../../temp/rc0-20260827-01/unit-output.log#L54) |
| UT-037 | MSHIX Brain Kernel | enriches and retrieves memories through injected local-model boundaries | [Source](../../../test/mshixBrainKernel.test.js#L71) | PASS | [E02:55](../../../temp/rc0-20260827-01/unit-output.log#L55) |
| UT-038 | MSHIX Brain Kernel | keeps ingestion available when enrichment fails | [Source](../../../test/mshixBrainKernel.test.js#L92) | PASS | [E02:56](../../../temp/rc0-20260827-01/unit-output.log#L56) |
| UT-039 | MSHIX Brain Kernel | keeps successful partial enrichment when the second model operation fails | [Source](../../../test/mshixBrainKernel.test.js#L107) | PASS | [E02:57](../../../temp/rc0-20260827-01/unit-output.log#L57) |
| UT-040 | JailTime event log | persists lifecycle events and restores them from JSONL | [Source](../../../test/jailtimeEvents.test.js#L12) | PASS | [E02:60](../../../temp/rc0-20260827-01/unit-output.log#L60) |
| UT-041 | JailTime event log | keeps the log boundary limited to JailTime events | [Source](../../../test/jailtimeEvents.test.js#L38) | PASS | [E02:61](../../../temp/rc0-20260827-01/unit-output.log#L61) |
| UT-042 | PQS | logs every Carnival Arena action and creates a SHA-512 proof on completion | [Source](../../../test/pqs.test.js#L17) | PASS | [E02:64](../../../temp/rc0-20260827-01/unit-output.log#L64) |
| UT-043 | PQS | records rejected actions as events | [Source](../../../test/pqs.test.js#L55) | PASS | [E02:65](../../../temp/rc0-20260827-01/unit-output.log#L65) |
| UT-044 | PQS | creates deterministic proof hashes from the same completed match record | [Source](../../../test/pqs.test.js#L74) | PASS | [E02:66](../../../temp/rc0-20260827-01/unit-output.log#L66) |
| UT-045 | PQS | detects core anti-abuse patterns | [Source](../../../test/pqs.test.js#L92) | PASS | [E02:67](../../../temp/rc0-20260827-01/unit-output.log#L67) |
| UT-046 | PQS | keeps official platform adapters disabled by default | [Source](../../../test/pqs.test.js#L145) | PASS | [E02:68](../../../temp/rc0-20260827-01/unit-output.log#L68) |

## Result interpretation — משמעות התוצאה

ל־46 מקרי הבדיקה הנבחרים התקבלה תוצאת `PASSED_BOUNDED_UNIT_GATE`: כולם PASS, ללא failures או pending. זהו 100% מעבר של המקרים שנבחרו בלבד, לא אחוז code coverage, לא 46 דרישות מוצר שהושלמו ולא אישור RC-0 מלא. משך Mocha של 60ms אינו מדד ביצועים של המוצר.

HTTP/UI, מסלול Next `/api`, אימות זהות והרשאות, Socket.IO, שירותי API/Frontend פעילים, Ollama אמיתי, snapshot/restart/restore מלא, build חדש, CI ו־deployment אינם מכוסים בריצה זו. מקרי האחסון מוכיחים את assertions ה־fixture שלהם, לא durability מערכתית. פערים שנמצאו בסקירה סטטית אינם failures של ריצה זו, ו־0 failures אינו מעיד שאין פגמים פתוחים. בדיקות עתידיות שאינן ברשימת E03 יישארו `NOT RUN` בתוכנית/דוח המתאימים עד שתתקבל ראיה נפרדת.
