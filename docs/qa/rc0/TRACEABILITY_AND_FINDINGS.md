# עקיבות דרישות וממצאי QA — RC-0

מסמך `SSA-RC0-RTM-v1` · 2026-08-27 · [אינדקס ההגשה](README.md) · [STD](STD.md) · [STR](STR.md).

מזהי RQ/UT/OBS הוקצו כעת לצורכי עקיבות; הם אינם מזהי דרישות מקור שאושרו מראש. מקור קוד: `e33cfd88d127c5e7cd1a7266295aa924b9935b3b`. ה־RTM אינו מכריז על כיסוי מלא של הפרויקט או על אישור scope חדש.

## RTM — Requirement Traceability Matrix

| דרישה / גבול | בדיקה או אימות | ראיה קיימת / מצב | משימות קיימות והשלמה נדרשת |
| --- | --- | --- | --- |
| RQ-ISO-01 — בידוד הרצת היחידה | G1 preflight + guards | E01–E05, E07; PASS_BOUNDED להרצה זו בלבד | SSA-1/2; בידוד API+Frontend עדיין לא הוכח |
| RQ-CORE-01 — assertions נבחרים של Feature Store | UT-001–UT-004 | E01/E02/E03; 4 PASS, לא HTTP ולא ששת התחומים במלואם | SSA-2/21; SYS-02/04 לשכבת מערכת |
| RQ-SAFE-01 — lifecycle/admission/orchestration | UT-005–UT-022 | E01/E02/E03; 18 PASS, ללא workers או recovery של שירות | SSA-13/21; Auth ותרחישי מערכת נשארים פתוחים |
| RQ-MSH-01 — event/outbox/Brain עם mocks | UT-023–UT-039 | E01/E02/E03; 17 PASS, לא מודל אמיתי או transaction אטומי | SSA-18/21; SYS-05/07/08 |
| RQ-JAIL-01 — event log | UT-040–UT-041 | E01/E02/E03; 2 PASS, לא שחזור משתתפים חיים | SSA-19/21; SYS-07 |
| RQ-PQS-01 — simulation/proofs/disabled adapters | UT-042–UT-046 | E01/E02/E03; 5 PASS, ללא gameplay HTTP או integration רשמי | SSA-2/21; שערי integrations לא נסגרו |
| RQ-NET-01 — חוזה רשת של מערכת | SYS-01 | NOT_RUN; אין ראיית מערכת | SSA-1; origins, bindings, proxy, IPv4/IPv6 |
| RQ-API-01 — ששת תחומי API ו־health דרך Next | SYS-02 | NOT_RUN; 8 instances מתוכננים | SSA-2/21; רשומת תוצאה לכל נתיב |
| RQ-AUTH-01 — זהות, תפקיד ו־ownership | SYS-03; API variants של SYS-05 | NOT_RUN; OBS-01/02, לא runtime exploit | SSA-3/4/13; מטריצה מאושרת ותוצאות allow/deny |
| RQ-UI-01 — session/credentials/UI guards | SYS-04, SYS-05 | NOT_RUN; OBS-03/04 | SSA-5/15; בדיקת backend→proxy→UI |
| RQ-RT-01 — זהות ו־reconnect ב־Realtime | SYS-06 | NOT_RUN; OBS-05; אין N/A מאושר | SSA-14/16; מימוש ובדיקה או החרגה מפורשת |
| RQ-DATA-01 — durability/restore לפי scope | SYS-07 | NOT_RUN; OBS-08 | SSA-6/7/17/18/19; fixture reload אינו תחליף |
| RQ-EXT-01 — חסימת אינטגרציות חיצוניות | SYS-08 | NOT_RUN; OBS-06/07 | SSA-1/2/21; חסימה טכנית וראיה, לא רק דגל |
| RQ-CI-01 — pipeline ובדיקות candidate | REL-01, REL-02 | NOT_RUN; remote state לא נבדק בסבב החידוד | SSA-8/10; source SHA + run URLs + required checks |
| RQ-REL-01 — diff, runbook ומסירה נבדקים | REL-03 | NOT_RUN כשער מלא; מסמכי QA מוכנים לסקירה בלבד | SSA-9/11/20/21; אישור מסמך, PR ו־Go נפרדים |
| RQ-OPS-01 — deployment/post-deploy/recovery | REL-04 | NOT_RUN / אין אישור פריסה | SSA-12/22; בדיקה על יעד מאושר בפועל |

E01–E10 מוגדרים ב־[EVIDENCE_MANIFEST](EVIDENCE_MANIFEST.json). קוד מקור של ממצא הוא ראיית source review, לא ראיית הרצת testcase. אין לחבר 46 UT עם 12 משפחות SYS/REL ולחשב "58 בדיקות" או אחוז כיסוי.

## כללי סיווג ממצאים

כל שמונת הממצאים להלן הם `SOURCE_OBSERVATION`, במצב `OPEN / NOT_REPRODUCED_THIS_RUN`. השפעה מתוארת כהסקה מהקוד, לא כהתקפה שבוצעה. חלקם יכולים לחסום שחרור גם לפני שחזור, אך אינם מוסיפים failures ל־G1.

חומרה מוצעת: **S1** — סיכון אבטחה/בידוד/נתונים שמונע קבלה בהיקף הרלוונטי; **S2** — תפקוד מרכזי או אמינות שאינם עומדים בחוזה; **S3/S4** — משני/קוסמטי. זו שיטת עבודה לחבילה זו, לא דירוג CVSS או triage מאושר. Priority הוא סדר טיפול; משימות השחרור המקושרות כבר מסומנות P0. חומרה ו־priority אינם אותו שדה.

Idan הוא בעל המשימות הקיים; לא נקבע reviewer ולא הומצא תאריך יעד. הממצאים מקושרים למשימות קיימות, ולא נפתחו issues או משימות כפולות.

## OBS-01 — זהות Feature ניתנת לזיוף וחלק מה־mutations ללא בדיקתה

- **היקף / חומרה מוצעת:** שימוש רב־משתמשים/ציבורי, S1; RQ-AUTH-01.
- **צפוי:** actor נגזר מזהות מאומתת; הרשאות ו־ownership נבדקים לכל mutation שב־scope; deny אינו משנה state.
- **נצפה בקוד:** helper מקבל `x-user-id`/`x-user` כטקסט, ואילו marketplace, quest progress, notification ו־challenge mutations אינם קוראים גם ל־helper הזה. [זהות](../../../backend/api/featureRoutes.js#L10), [marketplace](../../../backend/api/featureRoutes.js#L75), [notifications/challenges](../../../backend/api/featureRoutes.js#L129).
- **השפעה מוסקת:** impersonation או שינוי ללא actor מאומת; לא נשלחו בקשות לניצול הפער.
- **טיפול וסגירה:** SSA-3/4/13; מטריצת SYS-03 על fix SHA, בדיקות allow/deny/ownership וזיוף כותרת, עם אפס שינוי אסור. העברת כותרת דרך proxy לבדה אינה סגירה.

## OBS-02 — שינוי הרשאות MCP ללא שכבת Authentication

- **היקף / חומרה מוצעת:** API נגיש ללקוח לא מהימן, S1; RQ-AUTH-01.
- **צפוי:** שינוי role דורש זהות ותפקיד מאומתים ובדיקת הרשאה לפני כתיבה.
- **נצפה בקוד:** routes של POST/DELETE ל־`/api/mcp/permissions` מבצעים validation של שדות ואז שינוי store, ללא auth middleware מקומי. [POST/DELETE](../../../backend/app.js#L256). אין בכך הוכחה לגבי הגנת reverse proxy חיצוני שלא נבדק.
- **השפעה מוסקת:** שינוי הרשאות בלתי מורשה אם הנתיב נגיש; לא נקראו ולא שונו permissions קיימים.
- **טיפול וסגירה:** SSA-3/4/13; SYS-03 לכל action/role עם fixture ייעודי, response ו־state before/after. אין לקרוא לנתיב של השירות הקיים לצורך שחזור.

## OBS-03 — Next proxy אינו מעביר את כותרת הזהות שה־Feature API הנוכחי דורש

- **היקף / חומרה מוצעת:** event/guild joins ב־production-mode, S2; RQ-UI-01.
- **צפוי:** flow קנוני frontend→proxy→backend משתמש במנגנון זהות מאומת שנבחר ונשמר עד לבדיקת ההרשאה.
- **נצפה בקוד:** ה־proxy מעתיק Authorization ו־Content-Type בלבד; ה־Feature helper קורא `X-User-Id`/`X-User` ודורש אחד מהם ב־production. [proxy](../../../frontend/pages/api/%5B...path%5D.ts#L46), [helper](../../../backend/api/featureRoutes.js#L10).
- **השפעה מוסקת:** flow המבוסס על הכותרת הנוכחית לא יעביר זהות דרך proxy וצפוי להידחות; לא בוצע UI/HTTP retest ב־RC-0.
- **טיפול וסגירה:** SSA-5/15, בתלות SSA-3/4/13; SYS-04 עם משתמשי דמה A/B. תיקון חייב לסגור גם OBS-01, ולא לקבע אמון בכותרת ניתנת לזיוף.

## OBS-04 — MshixPanel שולח fetch ללא credential

- **היקף / חומרה מוצעת:** מסך `/mshix` ב־production-mode, S2; RQ-UI-01.
- **צפוי:** session מורשה מאפשר טעינת מידע, ו־session חסר/לא מורשה מטופל ב־UI בלי מידע רגיש ובלי עקיפת backend auth.
- **נצפה בקוד:** `fetch` ב־panel אינו מוסיף token; ה־router דורש token תקף בקריאות production. [panel](../../../frontend/src/components/MshixPanel.tsx#L66), [authorize](../../../src/server/mshix/mshixRouter.js#L29).
- **השפעה מוסקת:** בקשה ללא token צפויה לקבל 401; אין כאן צילום מסך או תוצאת HTTP מהרצה זו.
- **טיפול וסגירה:** SSA-5/13/15; SYS-05 בשלוש שכבות backend/proxy/UI על fix SHA. אין לחשוף admin token קבוע ל־client ואין להשתמש ב־dev bypass.

## OBS-05 — Socket.IO משתמש בפרופיל משתתף שסופק על ידי הלקוח

- **היקף / חומרה מוצעת:** Realtime רב־משתמשים אם נכלל, S1; RQ-RT-01.
- **צפוי:** handshake ופעולות socket קשורים לזהות מאומתת עם expiry והרשאות; payload אינו בוחר את זהות המשתמש.
- **נצפה בקוד:** `joinJail` שומר profile שסופק, ו־actor id נלקח ממנו; `jailMessage` מקבל username מה־payload. [handlers](../../../backend/app.js#L427).
- **השפעה מוסקת:** זהות משתתף ואירועים עשויות להיות מזויפות; לא בוצע חיבור socket או ניסיון התחזות.
- **טיפול וסגירה:** SSA-14/16; SYS-06 כולל זיוף, expiry ו־reconnect. אם scope משתנה, נדרשים נימוק ואישור והוכחת הסרת המשטח מה־RC; single-node אינו פטור.

## OBS-06 — דגלי "כבוי" אינם מונעים את כל הקריאות החיצוניות

- **היקף / חומרה מוצעת:** בידוד ופרטיות בהרצת G2 הבאה, S1; RQ-EXT-01.
- **צפוי:** אין יציאה לאינטגרציה לא מאושרת; היעדר ספק/שגיאה אינם מפעילים fallback חיצוני.
- **נצפה בקוד:** `/api/pi-auth` יכול לפנות ל־Pi Network וכולל JWT secret fallback קבוע; Brain search יכול לקרוא `provider.embed` גם כאשר auto-enrich כבוי. [Pi handler](../../../frontend/pages/api/pi-auth.ts#L5), [Brain search](../../../src/server/mshix/brainKernel.js#L213). `AI_PROVIDER` אינו מתג כיבוי קנוני שהוכח כאן.
- **השפעה מוסקת:** scope "ללא integrations" אינו הוכחה להשבתה טכנית; fallback secret הוא גם נושא ל־Auth review. G1 לא טען entrypoint ולא פנה לספקים.
- **טיפול וסגירה:** SSA-1/2/3/21; SYS-08 עם egress policy ו־sink מדומה, כולל מסלולי שגיאה. מודל אמיתי או Pi אינם מופעלים לשם שחזור הממצא.

## OBS-07 — build context רחב אינו מבטיח החרגת env ונתוני runtime

- **היקף / חומרה מוצעת:** build/CI/הפצת image עתידיים, S1; RQ-ISO-01, RQ-EXT-01.
- **צפוי:** context ו־layers שמיועדים למסירה מכילים רק allowlist של קוד ותלויות מאושרים, ללא secrets/נתונים קיימים.
- **נצפה בקוד:** root/frontend Dockerfiles משתמשים ב־`COPY . .`; ה־dockerignore בשורש אינו מכסה כל `.env*` או נתון runtime, וב־frontend קיימת רשימת החרגות מצומצמת. [root Dockerfile](../../../Dockerfile#L19), [frontend Dockerfile](../../../frontend/Dockerfile#L13), [root ignore](../../../.dockerignore), [frontend ignore](../../../frontend/.dockerignore).
- **השפעה מוסקת:** context רחב עלול לכלול נתונים שאינם למסירה. זו אינה קביעה שנמצא secret מסוים ב־image; לא נקראו env או נתונים כדי להוכיח דליפה.
- **טיפול וסגירה:** SSA-1/8/9/21; REL-01 ו־SYS-08, inventory של context/layers ו־secret review בערוץ מורשה. masking של `/app` בזמן ריצה אינו ניקוי שכבות image להפצה.

## OBS-08 — גבולות durability אינם שחזור מערכת מלאה

- **היקף / חומרה מוצעת:** שחרור המבטיח persistence/restore, S2, ועשוי להפוך לחסם S1 לפי דרישת הנתונים שתאושר; RQ-DATA-01.
- **צפוי:** רשימת כל ה־stores, גבולות transaction, data loss מותר ותרגיל restore התואמים לחוזה SSA-6.
- **נצפה בקוד/מפרט:** Feature state ו־outbox אינם transaction אחד; permissions נשמרים ליד קוד backend; מצב Jail ומשתתפיו בזיכרון. [גבול transaction](../../MSHIX_CORE_SPEC.md#L114), [permissions path](../../../backend/mcp-permissions.js#L26), [Jail state](../../../backend/app.js#L37).
- **השפעה מוסקת:** crash/restart עשויים להצריך reconciliation או לאבד state שאינו נשמר. UT של reload JSON/JSONL אינם הוכחת restart/restore של השירות.
- **טיפול וסגירה:** SSA-6/7/17/18/19; SYS-07 על fixtures בלבד, עם לפני/אחרי ועמידה ב־RPO/RTO שנקבעו מראש. אין להמציא התחייבות multi-node או להחריג persistence רק בגלל single-node.

## טופס ממצא / Bug — להגשה ול־retest

הטופס מרחיב את [תבנית Bug Report הקיימת](../../../.github/ISSUE_TEMPLATE/bug_report.md). הוא אינו issue שנפתח ולא דיווח על שחזור שכבר התרחש.

```text
ID / title:
Classification: SOURCE_OBSERVATION | REPRODUCED_DEFECT | TOOLING_SETUP
Requirement / testcase / existing task:
Scope / sourceSHA / artifact / environment / configuration hash:
Preconditions / synthetic fixture / authorized resource list:
Expected: exact status, fields and state effect; source of expectation
Observed in source OR Actual execution: identify which one
Evidence: file+line OR run ID+redacted attachment, never invented
Steps to reproduce status: PROPOSED_NOT_EXECUTED | EXECUTED
Steps:
  1. Prepare the specifically approved isolated environment and fixture.
  2. Perform the single named action with the recorded synthetic input.
  3. Compare response/state with the stated expected assertions.
  4. Preserve redacted evidence and clean up only owned test resources.
Reproduction: NOT_RUN or n/m, never assumed from code
Severity: S1/S2/S3/S4 + scope-dependent impact rationale
Priority: P0/P1/P2 + scheduling rationale (separate from severity)
Owner / reviewer / blocking gate / next action:
Status: OPEN | FIX_PROPOSED | READY_FOR_RETEST | VERIFIED | CLOSED
Closure: fixSHA + retest ID + actual result + regression evidence + reviewer
Residual state / cleanup / approved exception if applicable:
```

תיקון קוד לבדו אינו סוגר ממצא. אם הבעיה לא שוחזרה, יש לציין זאת גם אחרי תיקון ולצרף בדיקת רגרסיה שמוכיחה את החוזה הרצוי. exception דורש owner, נימוק, היקף, תוקף ופעולת המשך; אינו PASS ואינו דרך לעקוף Auth או כללי בידוד.

תקריות ENV-01–ENV-03 של האריזה מתועדות ב־[STR](STR.md) בנפרד. הן אינן חלק משמונת ממצאי המוצר, ואינן 3 בדיקות שנכשלו.
