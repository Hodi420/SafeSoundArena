# STD — מפרט בדיקות ותרחישי המשך

מסמך `SSA-RC0-STD-v1` · 2026-08-27 · [STP](STP.md) · [STR](STR.md).

**כל תרחישי SYS/REL במסמך זה מתוכננים בלבד: NOT_RUN.** תנאי הכניסה שלהם לא הושלמו. אין כאן פקודת הרצה או הרשאה להפעיל שרתים, לתקן קוד, לפתוח PR או לפרוס.

46 מקרי הבדיקה שכבר בוצעו מפורטים בנפרד ב־[UNIT_TEST_INVENTORY](UNIT_TEST_INVENTORY.md), עם IDs UT-001–UT-046, קוד וראיית E02. ה־STD הנוכחי אינו משנה את קוד הבדיקות או את תוצאותיהן.

## כללים משותפים

- מזהה SYS/REL מייצג **משפחת תרחישים**, לא ספירה של בדיקה אטומית. לפני הרצה פותחים רשומת instance לכל endpoint/תפקיד/variant, למשל `SYS-02.events` או `SYS-03.mcp-post.anonymous`.
- כל instance כולל expected מדויק לפני הביצוע. אם ה־Auth/error contract לא אושר, `oracleStatus=PENDING_DECISION` ואין להריץ כאילו כבר נבחר פתרון.
- `Actual=NOT_RUN`, `Evidence=NONE`, `Reproduction=NOT_RUN` הם הערכים הנוכחיים לכל SYS/REL. Source observation איננו Actual של הרצת HTTP/UI.
- credential, מזהה משתמש אמיתי, cookie או payload רגיש לא נכנסים ללוג/צילום/HAR. אין לשמור HAR גולמי עם סודות.
- teardown מתייחס רק לרשימת משאבי הבדיקה שב־run record. אין איפוס DB, מחיקת volumes או עצירת שירות משתמש.
- מחיקת fixtures, retry של mutation ותרגיל crash/restore דורשים תנאי בטיחות ייעודיים. כשל אינו מצדיק retry בלתי מוגבל או שינוי scope.

רשומת ביצוע לכל instance:

```text
caseId / variant / requirementId:
runId / sourceSHA / artifactDigest / configHash:
operator / startedAt / endedAt / timezone:
preconditions / oracleStatus / approvedScopeReference:
syntheticDataSetId / resourceAllowlist / timeoutSeconds:
stepsExecuted:
expected (HTTP code, body fields, state effects, forbidden effects):
actual:
status: PASS | FAIL | BLOCKED | NOT_RUN | N/A_APPROVED
evidenceIds / redacted attachment paths:
findingId / reproduction n/m:
teardown / residualResources / nextAction:
```

השדות ריקים עד שיש נתונים אמיתיים. `timeoutSeconds`, חלון ניטור ו־RPO/RTO אינם נקבעים בדיעבד לפי זמן הבדיקה.

## SYS-01 — רשת, origins ו־Next proxy

דרישה: RQ-NET-01 · משימה: SSA-1 · עדיפות: חסם כניסה ל־G2.

**תנאים:** תצורת שני שירותי בדיקה מבודדים, רשימת פורטים/כתובות מאושרת, state חדש, מקור/תצורה ללא סודות. `BACKEND_URL` הוא server-side; יעד Socket אם נדרש חייב להיפתר בדפדפן. אין שימוש בשירותים הקיימים.

1. לתעד inspect/listeners של משאבי הבדיקה בלבד: IPv4/IPv6, binds, published ports, רשתות ו־mounts מול המטריצה המאושרת.
2. מדפדפן בדיקה ב־origin המאושר לשלוח בקשה ל־`/api/health` דרך Next; לתעד target ותגובה מצונזרת.
3. לשלוח preflight מ־origin שאינו מאושר, מתוך סביבת הבדיקה; לבדוק CORS headers מול החוזה.
4. לוודא שהכתובות הפנימיות של Docker אינן נשלחות לדפדפן ושה־API לא נפתח ל־LAN/אינטרנט.

**צפוי:** בדיוק ה־binds/ports המאושרים, ללא `0.0.0.0`/`::` של published host ports בניגוד לחוזה המקומי; `/api` מגיע לשרת הבדיקה; origin לא מורשה אינו מקבל הרשאת CORS. CORS אינו מנגנון Auth ואינו מבטיח שבקשה ישירה נחסמת — זה נבדק ב־SYS-03. היעדר תעבורה יוצאת נבדק בנפרד ב־SYS-08.

**ראיות נדרשות:** config hash, inspect מצומצם, headers מצונזרים, תצלום Network ללא credentials. **ניקוי:** סגירת לקוח הבדיקה בלבד; עצירת סביבה רק לפי allowlist. **מצב:** NOT_RUN.

## SYS-02 — קריאה מששת תחומי Feature API דרך הדפדפן

דרישות: RQ-API-01, RQ-CORE-01 · משימות: SSA-2, SSA-21.

**תנאים:** SYS-01 עבר, fixtures מזוהים, חוזה הקריאה ותפקידי הגישה אושרו. ליצור instance נפרד לכל אחד משמונת הנתיבים:

| Instance | GET דרך Next | assertions מינימליים |
| --- | --- | --- |
| health | `/api/health` | 200, `service=safesoundarena-api`, `status=ok` בסביבה בריאה; לבדוק outbox/JailTime/Brain ולא רק קוד HTTP |
| events | `/api/events` | 200, JSON array; `id` ו־`participants` תואמים fixture, ללא `participantIds` |
| marketplace | `/api/marketplace` | 200, JSON array; IDs, quantity ו־price תואמים fixture |
| quests | `/api/quests` | 200, JSON array; IDs, progress ו־status תואמים fixture |
| guilds | `/api/guilds` | 200, JSON array; `members` תואם fixture, ללא `memberIds`/`messages` בתוצאת list |
| notifications | `/api/notifications` | 200, JSON array; IDs ו־read state תואמים fixture |
| challenges-daily | `/api/challenges/daily` | 200, JSON array של daily בלבד; IDs/progress/goal תואמים fixture |
| challenges-weekly | `/api/challenges/weekly` | 200, JSON array של weekly בלבד; IDs/progress/goal תואמים fixture |

1. לתעד expected fixture לפני הבקשה; להיכנס דרך עמוד הדפדפן הקנוני וה־origin המאושר.
2. לבצע GET לכל instance בנפרד ולשמור status, content-type ו־body מצונזר.
3. להשוות schema וערכים ל־fixture; לוודא שה־UI מציג את הערכים, ולבדוק שלא התבצע שינוי state עקב הקריאה.

ה־assertions נגזרים מ־[featureRoutes](../../../backend/api/featureRoutes.js) ו־[featureStore](../../../backend/api/featureStore.js); שינוי החוזה מחייב עדכון expected לפני הריצה. `health=200` עם גוף `degraded` אינו PASS של readiness.

**ראיות:** response לכל instance + screenshot רלוונטי + בדיקת state. **ניקוי:** ללא mutation יזום; אין מחיקת נתונים. **מצב כל שמונת ה־instances:** NOT_RUN.

## SYS-03 — Authentication ו־Authorization חיוביים ושליליים

דרישה: RQ-AUTH-01 · משימות: SSA-3, SSA-4, SSA-13 · `oracleStatus=PENDING_SSA3`.

**תנאים:** מודל Auth ומטריצת endpoint × role × action מאושרים, משתמשי דמה A/B, test admin, state חדש. קבוצת היעדים כוללת כל mutation שב־scope ב־Feature API, MCP permissions ו־Control Room; אין לבחור רק endpoint שכבר מוגן.

1. ליצור instance לכל יעד ולכל מצב: ללא credential; credential שגוי/פג תוקף; משתמש מאומת ללא הרשאה; actor מורשה; ניסיון זיוף `X-User-Id`; גישה למשאב של משתמש B ממשתמש A.
2. לשלוח בקשה אחת מוגדרת עם payload סינתטי; להשוות state לפני/אחרי ו־audit actor מאומת.
3. לבדוק תגובה ו־error code לפי המטריצה. עבור שינוי מורשה לבדוק בדיוק את אפקט ה־state המבוקש; עבור deny לבדוק **אפס שינוי אסור**.

**צפוי מוצע, לא החלטת Auth חדשה:** 401 לזהות חסרה/לא תקפה, 403 לזהות תקפה ללא הרשאה, ו־2xx מתאים למורשה; קודי validation/lifecycle נשארים לפי החוזה המאושר. כותרת `X-User-Id` לבדה אינה מקנה זהות/תפקיד. אין להפוך בעיית proxy לתיקון באמצעות אמון בכותרת ניתנת לזיוף.

**ראיות:** מטריצת תוצאות לכל variant, response מצונזר, snapshot state של הדמה, audit identity ללא סודות. **ניקוי:** החזרת fixture ייעודי בלבד; אין נגיעה ב־MCP permissions הקיים. **מצב:** NOT_RUN; OBS-01/02 הם תצפיות קוד.

## SYS-04 — Event/Guild join דרך UI עם זהות תקינה

דרישה: RQ-UI-01 · משימות: SSA-5, SSA-15 · תלות: SSA-3/4/13 ו־SYS-01.

**תנאים:** session בדיקה לפי Auth מאושר, event שטרם הסתיים ואינו מלא, guild סינתטי, מדיניות משתמש A/B ברורה. יש להפריד instance לאירוע ולגילדה, ולמקרי allow/deny.

1. בדפדפן הקנוני להציג fixture ולבצע join כמשתמש A דרך רכיב ה־UI, לא ישירות מול backend.
2. לתעד בקשת Next `/api/events/{id}/join` או `/api/guilds/{id}/join`, response ו־UI לאחר הפעולה.
3. לוודא שהשינוי מיוחס ל־A בלבד; לבצע duplicate join ולוודא שלא נרשמת חברות כפולה.
4. לפוג/לבטל את session הבדיקה לפי החוזה ולחזור על הפעולה; לבדוק 401/403 מתאים, הודעת UI ואפס שינוי אסור.

**צפוי:** allow מעדכן fixture ותצוגה עקבית; deny מטופל ללא הודעת הצלחה מזויפת; זהות מגיעה ממנגנון מאומת. אין להעתיק admin token ל־client או להסתפק בהוספת `X-User-Id`.

**ראיות:** screenshot לפני/אחרי, request/response מצונזרים, state ואudit. **ניקוי:** leave/reset על fixture בדיקה מוגדר בלבד. **מצב:** NOT_RUN; בעיית ההעברה הנוכחית היא OBS-03.

## SYS-05 — MSHIX: API מאומת וחיבור מסך ללא עקיפת הרשאות

דרישות: RQ-AUTH-01, RQ-UI-01 · משימות: SSA-5, SSA-13, SSA-15.

**תנאים:** production-mode בסביבת דמה מבודדת, tokens סינתטיים ל־API בלבד, UI session flow מאושר; אין dev auth bypass. מודל אמיתי וחיפוש embeddings לא נכללים בתרחיש.

1. לבקש `GET /api/mshix/health` ישירות בשרת הבדיקה ללא token, עם token שגוי ועם test credential מורשה — שלושה instances.
2. לאמת גם את מעבר ה־credential המאושר דרך Next proxy בלי לחשוף secret ניהולי לדפדפן.
3. לפתוח `/mshix` עם session מורשה ולבדוק שהמידע נטען; לבדוק ללא session ובפקיעתו שהמסך מציג מצב הרשאה מתאים ולא מידע ממטמון של משתמש אחר.

**צפוי בחוזה API הנוכחי:** ללא credential תקף ב־production מתקבל 401 עם `error.code=MSHIX_UNAUTHORIZED`; עם credential מורשה מתקבלת תגובת 200 התואמת fixture. תנאי UI/session מדויקים מחייבים SSA-3/5. אין להפעיל `MSHIX_ALLOW_UNAUTHENTICATED_DEV` כפתרון.

**ראיות:** responses מצונזרים בשלוש שכבות — backend/proxy/UI — ו־screenshots. **ניקוי:** ביטול session הדמה בלבד. **מצב:** NOT_RUN; מקור המסך ללא token הוא OBS-04, לא כשל UI שנמדד כעת.

## SYS-06 — Realtime: זהות, expiry ו־reconnect

דרישה: RQ-RT-01 · משימות: SSA-14, SSA-16 · מותנה בהיקף.

**תנאים:** החלטה מפורשת ש־Realtime נכלל; חוזה Socket.IO ו־origin/CSP מאושרים, test sessions A/B, מנגנון אימות backend. אין workers חיצוניים.

1. להתחבר כ־A, ללא session ועם session שפג; לבדוק handshake לפי החוזה.
2. לשלוח `joinJail` עם profile/ID של B דרך session A; לבדוק שהשרת דוחה זיוף או גוזר זהות מ־A ולא מה־payload.
3. לבצע disconnect/reconnect/expiry ולבדוק שאין ghost participant, כפילות או המשך הרשאה אסור.

**צפוי:** allow/deny ומצב המשתתפים בהתאם לחוזה; זהות מאומתת נשמרת בין reconnects. אין להסיק זאת רק מהצלחת חיבור socket. אם הוחרג — נדרשים החלטת N/A_APPROVED והוכחה שהמשטח אינו פעיל/נצרך בהיקף שנמסר.

**ראיות:** אירועי socket מצונזרים, state לפני/אחרי, זמני expiry. **ניקוי:** ניתוק לקוחות הדמה בלבד. **מצב:** NOT_RUN; אין החרגה מאושרת אוטומטית.

## SYS-07 — Persistence, restart, replay ו־restore

דרישה: RQ-DATA-01 · משימות: SSA-6, SSA-7, SSA-17, SSA-18, SSA-19.

**תנאים:** מפת state מלאה, חוזה durability ו־RPO/RTO מאושרים, snapshot של נתוני דמה בלבד, תצורת restore מבודדת ודרך rollback מאושרת. אין שימוש במופעי/volumes המשתמש.

1. ליצור state סינתטי מזוהה בכל store שב־scope: Feature, permissions, governance, outbox, audit, Brain ו־Jail לפי החוזה; לתעד counts/IDs/hash בסיס.
2. ליצור snapshot ולבצע restart **של שירות הבדיקה**, לא רק יצירת מופע JS נוסף. לבדוק מה נשמר ומה מתאפס לפי החוזה.
3. להפעיל replay מבוקר; לבדוק events חסרים/כפולים, backoff/dead-letter ו־audit continuity.
4. לשחזר snapshot ליעד בדיקה נפרד, לתעד זמני שחזור והתאמה ל־RPO/RTO שהוגדרו מראש. תרחיש crash בין כתיבת Feature ל־outbox יבוצע רק במסגרת failure injection מורשית ומוגבלת.

**צפוי:** אין אובדן/כפילות מעבר לחוזה המאושר; כל divergence מתועד, לא מוסתר. טעינת JSONL אינה הוכחת שחזור מצב Jail חי. local file store אינו הוכחת multi-process transaction.

**ראיות:** snapshot metadata, timestamps, diff של נתוני דמה, replay ואudit. **ניקוי:** רק snapshot/יעד הבדיקה שב־allowlist, לאחר שימור ראיות. **מצב:** NOT_RUN; גבולות קיימים ב־OBS-08.

## SYS-08 — היעדר יציאה לאינטגרציות חיצוניות

דרישה: RQ-EXT-01 · משימות: SSA-1, SSA-2, SSA-21.

**תנאים:** מיפוי כל callsite חיצוני ובקרת egress על סביבת הבדיקה. official adapters, Pi, wallets/rewards חיצוניים ו־IPFS מחוץ להיקף. Ollama אמיתי לא נכלל ללא הרחבת היקף מפורשת.

1. לבדוק configuration של שכבות image, startup hooks, `/api/pi-auth`, Brain search, enrich ו־provider fallback בלי לטעון סודות.
2. להחליף יעדים ב־sink/mock מבודד, ולהפעיל variant מתוכנן לכל callsite; אין לשלוח probe לשירות חיצוני אמיתי.
3. לתעד שה־calls חסומים/מנוטרלים או מגיעים רק ל־sink שהותר; לבדוק שגם שגיאה לא מפעילה fallback חיצוני.

**צפוי:** אפס חיבור ליעד חיצוני לא מאושר; כשל סגור והודעה מתאימה לפי החוזה. `AUTO_ENRICH=false`, `AI_PROVIDER`, disabled PQS adapters או loopback אינם לבדם ראיה מספקת.

**ראיות:** egress policy, רשימת יעדים, sink counters ולוגים מצונזרים. **ניקוי:** mock/sink בבעלות הבדיקה בלבד. **מצב:** NOT_RUN; OBS-06/07 קודמים לאישור הרצת מערכת.

## REL-01 — בדיקות מקומיות מלאות, typecheck ו־build

דרישה: RQ-CI-01 · משימות: SSA-8, SSA-21.

**תנאים:** inventory פקודות מאושר ב־Node 24, source/config/lockfiles מזוהים ו־build context מסונן. מותרות רק ספריות פלט ייעודיות ונתוני דמה.

1. לבדוק כל suite ופקודה לפני הרצה: listeners, network, default data paths, install hooks, generated outputs ו־teardown.
2. להריץ רק פקודות מאושרות; לתעד command, runtime, exit, counts ו־artifact digest בנפרד לכל stage.
3. להריץ typecheck ללא כתיבת incremental files אם הוגדר read-only; לבצע builds/smoke רק כאשר יצירת artifacts והרצת שירותי הבדיקה אושרו ובודדו.

**צפוי:** כל stage שנדרש עבר על אותו candidate; skip/cancel/timeout אינם PASS. אין root `eslint . --fix` בבדיקת QA לא משנה מצב. אין להריץ אוטומטית `npm test`: ה־glob כולל suites עם HTTP ונתיבי state; `tests/notification.test.js` כולל teardown עם `dropDatabase()` ומוחרג מהליך זה; `test_aiClients.js` עלול להפעיל providers אמיתיים.

**ראיות:** לוג לכל stage ומזהה artifact, ללא secrets/dependencies מלאות. **ניקוי:** outputs בבעלות ההרצה בלבד. **מצב:** NOT_RUN; 46/46 אינו תחליף לשלב זה.

## REL-02 — required checks ו־triage של CI

דרישה: RQ-CI-01 · משימות: SSA-8, SSA-10.

**תנאים:** candidate/PR מזוהים, גישה מורשית לקריאה ל־CI, workflow inventory וחוזה required checks. פתיחת PR/הפעלת workflow אינן נכללות אוטומטית באיסוף ראיות.

1. למפות כל workflow/check: שם, trigger, runtime, יעד, owner והחלטת required/optional/obsolete עם מקור ההחלטה.
2. לאסוף לכל check run URL, SHA, זמן, exit/conclusion ותמצית לוג מצונזרת; לבדוק שהריצה על ה־SHA האחרון הנדרש.
3. לסווג כשל: קוד, תשתית, סוד/הרשאה חסרים, flaky או configuration; root cause לא מוכח נרשם כהשערה. לקשר למשימת תיקון קיימת או להציע משימה מוגבלת כשאין כזו.
4. לאחר תיקון מאושר לבצע retest על fix SHA ולבדוק מחדש את **כל** required checks, לא רק את check שתוקן.

**צפוי:** inventory מלא; 0 required checks חסרים/כושלים/מבוטלים/מדולגים בשער השחרור. triage יכול להסתיים עם checks אדומים, אך G3 נשאר NO_GO. אין לשנות branch protection או להסיר check כדי לקבל ירוק.

**ראיות:** check matrix וקישורי ריצות. **ניקוי:** אין פעולת mutation בשלב האיסוף. **מצב:** NOT_RUN / remote state NOT_INSPECTED_THIS_REFINEMENT.

## REL-03 — גבול diff, Runbook וחבילת מסירה

דרישה: RQ-REL-01 · משימות: SSA-9, SSA-11, SSA-20, SSA-21.

**תנאים:** היקף candidate מוגדר, החלטת הכללת שינוי Compose, סוקר וערוץ מסירה. שלב זה מורחב מעבר לבדיקת שלמות המסמכים שנערכה כעת; סגירתו מחייבת גם גבול קוד ו־runbook מאושרים.

1. לרשום base/head SHA, diff hash וקבצים; לשייך כל שינוי לדרישה ולמשימה. להפריד את שינויי המשתמש ואת מסמכי QA; אין `git add .` או reset.
2. לבדוק allowlist של מסמכים/ראיות: לכל PASS יש מקור נגיש, manifests תואמים, כל NOT_RUN וממצא פתוח מופיעים. לראיות מקומיות יש לציין מגבלת נגישות מרחוק.
3. לבדוק Runbook: יעד ו־artifact, env names בלבד, data paths, preflight, פקודות תחומות, expected/timeout, backup/migration, monitoring, rollback trigger, owner ו־recovery check. 0 placeholders קריטיים לפני סימון DOC_REVIEWED; PROCEDURE_VERIFIED דורש תרגול נפרד עם ראיות.
4. להכין טקסט Draft PR עם scope, בדיקות, סיכונים ו־rollback. פתיחה בפועל רק בהרשאה מפורשת, עם PR URL; merge אינו חלק מהשלב.

**צפוי:** קוד/תצורה/ראיות מסונכרנים, אין סודות/שינויים לא מוסברים, וקיים רישום קבלת מסמכים נפרד מ־Go לשחרור. **ראיות:** diff manifest, review record, runbook version ו־PR URL רק אם באמת נפתח. **מצב:** NOT_RUN כשער מלא; חבילת המסמכים הנוכחית מוכנה לסקירה, לא approval.

## REL-04 — פריסה מאושרת, post-deploy ו־recovery

דרישה: RQ-OPS-01 · משימות: SSA-12, SSA-22.

**תנאים:** G3 עבר, אישור נפרד ליעד/פעולת הפריסה, artifact immutable, backup ו־runbook מאומתים, חלון ניטור וספי rollback/RPO/RTO שנקבעו מראש. כיום תנאים אלה אינם מתקיימים.

1. SSA-12 מתעדת deployment ID, target, operator, זמן, source/artifact/config digests ותוצאת backup/migration/deploy; אין לסגור בכך SSA-22.
2. SSA-22 מפעילה על היעד שנפרס instances נדרשים של health, SYS-02–SYS-08, auth allow/deny ו־UI. לקוח הבדיקה נמצא מחוץ לקונטיינר השירות אך בתוך רשת/חשיפה שאושרו; אין פתיחת גישה ציבורית לצורך smoke.
3. לבצע ניטור ותרגול recovery/rollback רק לפי האישור והחלון שנקבעו, על נתוני בדיקה; לתעד state differences, זמני התאוששות ו־artifact שחזר לפעול.
4. לכתוב דוח post-deploy עם actual לכל קריטריון, חריגים, החלטת קבלה או rollback והפעולה הבאה.

**צפוי:** ה־artifact שנבדק הוא זה שנפרס; כל תרחישי החובה וספי ההתאוששות עברו. healthy בלבד אינו קבלה. בעת rollback נרשמים הסיבה, השפעת הנתונים והתנאים לניסיון חדש.

**ראיות:** deployment record, תוצאות על היעד ו־recovery timeline. **ניקוי:** לפי runbook ורשימת משאבים מאושרת בלבד. **מצב:** NOT_RUN / NOT_AUTHORIZED_NOW.
