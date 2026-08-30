# STR — דוח תוצאות RC-0

מסמך `SSA-RC0-STR-v1` · נערך ב־2026-08-27 · [אינדקס ההגשה](README.md).

**החלטת QA: ניתן לסקור את ראיות היחידה; אין אישור RC מלא או שחרור.**

## זיהוי ההרצה

| שדה | נתון מוכח / מגבלה |
| --- | --- |
| Run ID | `rc0-20260827-01` |
| Source revision | `e33cfd88d127c5e7cd1a7266295aa924b9935b3b` |
| Branch | `codex/phase-1-proof-layer` |
| יום ההרצה | 2026-08-27; אזור הזמן של העבודה Asia/Jerusalem |
| זמני התחלה/סיום מדויקים | לא נשמרו ב־unit-result; אין להסיק אותם מ־mtime או מזמן יצירת manifest |
| Manifest createdAt | `2026-08-27T12:57:42.523Z` — זמן staging, לא זמן התחלת הבדיקות |
| Runtime | Node `v24.19.0`; Linux container על Docker Desktop מקומי |
| משך Mocha | 60ms — אינו benchmark של האפליקציה או משך ההכנה הכולל |
| Exit code | 0, exited=true |
| Result | `PASSED_BOUNDED_UNIT_GATE` |

E01 מכיל תוצאה וקוד יציאה; E02 מכיל את שמות הבדיקות, תוצאת Mocha ו־isolation precheck. E03 מזהה 29 קובצי מקור ו־10 קובצי בדיקה ברשימת הבדיקות; 29 הוא סך 19 קובצי מימוש + 10 קובצי בדיקה, לא 39.

## תוצאה בפועל

| קובץ בדיקה | Test IDs | עברו | כשלו | דולגו |
| --- | --- | ---: | ---: | ---: |
| `backend/api/featureStore.test.js` | UT-001–UT-004 | 4 | 0 | 0 |
| `test/agentExecutionController.test.js` | UT-005–UT-007 | 3 | 0 | 0 |
| `test/agentLifecycle.test.js` | UT-008–UT-015 | 8 | 0 | 0 |
| `test/agentOrchestrator.test.js` | UT-016–UT-019 | 4 | 0 | 0 |
| `test/safetyGate1.test.js` | UT-020–UT-022 | 3 | 0 | 0 |
| `test/mshix.test.js` | UT-023–UT-030 | 8 | 0 | 0 |
| `test/mshixOutbox.test.js` | UT-031–UT-033 | 3 | 0 | 0 |
| `test/mshixBrainKernel.test.js` | UT-034–UT-039 | 6 | 0 | 0 |
| `test/jailtimeEvents.test.js` | UT-040–UT-041 | 2 | 0 | 0 |
| `test/pqs.test.js` | UT-042–UT-046 | 5 | 0 | 0 |
| **סה״כ בהרצה הנבחרת** | **46 מקרים** | **46** | **0** | **0** |

[מלאי הבדיקות](UNIT_TEST_INVENTORY.md) שומר את הכותרות המקוריות והמיפוי לקוד. PASS פירושו שה־assertions המוגדרים שם עברו. זה אינו 100% code coverage, 100% requirements coverage או "כל בדיקות הפרויקט".

## ראיות בידוד וגבולותיהן

- E02: `lo` בלבד, UID 65534, `/app` מוסתר, קוד ותלויות read-only, 29 source hashes אומתו, 0 ניסיונות רשת/listener/subprocess שזוהו.
- E04: רשומת preflight של הקונטיינר במצב `created`, ללא host mounts, network=none, publishedPorts=0, rootfs read-only, healthcheck/restart כבויים, CPU=1, memory=512MiB, pids=64. זו אינה רשומת מצב סיום.
- E07: קוד ה־runner שנבדק, כולל בדיקת היעדר IPv4 routes, probes לקריאה בלבד, allowlist וחסימת APIs לרשת ול־subprocess. guards הם שכבת זיהוי נוספת, לא הוכחת אבטחה כללית.
- E01: ההרצה הסתיימה בקוד 0 בתוך מגבלת host של 45 שניות; לא הופעלו app servers ולא פורסמו פורטים.
- E05/E06: אריזה copy-only בקונטיינר שמעולם לא הופעל; נגזר image מקומי עם שכבות בסיס קיימות. אין לראות בו image מסונן להפצה.

ההרצה השתמשה ב־fixtures חדשים בזיכרון/`/tmp` וב־providers מוזרקים. בדיקת טעינת קובץ לתוך מופע נוסף באותו תהליך אינה restart של שירות, crash recovery, restore של מערכת או עמידה ב־RPO/RTO.

## סטיות הכנה — לא כשלי מוצר

| מזהה | מה אירע | סיווג נכון | מצב |
| --- | --- | --- | --- |
| ENV-01 | ניסיון `docker create` עם bind mounts לא הושלם; הופסק לקוח ה־CLI המזוהה | בעיית tooling/setup; root cause לא הוכח | נעקף במסלול copy-only ונבדק שלא נשאר קונטיינר בבעלות ההרצה; אין טענה שתוקן Docker |
| ENV-02 | `docker cp` סירב לכתוב לקונטיינר בעל rootfs read-only | התנהגות הגנה צפויה | קונטיינר זה לא הופעל; לא הוחלשה הגנה של קונטיינר רץ |
| ENV-03 | אזהרת CLI לאחר commit הפריעה לפענוח מזהה ה־image | תקרית כלי עזר, לא assertion failure; מקור: E05.note והיסטוריית ההרצה, ללא transcript גולמי של הפקודה | ה־image שנוצר אומת לפי ID ומצב האריזה לפני המשך; לא בוצע commit כפול |

E06 הוא דוח סיכום של בדיקות הניקוי שבוצעו בסבב המקורי; לא נשמר בו transcript גולמי מלא של כל פקודת cleanup. אין להציג אותו כריצת cleanup חדשה שבוצעה בזמן כתיבת STR זה.

## ניקוי ושימור

לפי E06 והבדיקות שתועדו בסבב ההרצה, שלושת קונטיינרי ה־scratch וה־image הנגזר הוסרו לפי IDs מדויקים, ללא force, prune או מחיקת volumes. גם ניסיון היצירה המוקדם נבדק ולא נמצא משאב מאוחר. השירותים הקיימים לא שימשו לבדיקה ולא הופעלו מחדש.

המקור, snapshot-02 והראיות נשמרו; ה־hash של Compose בזמן ההרצה הוא `e1e49876961c50100fd283f901b950f11707916827dd6f3717b1dc5197d1b8e0`. השינוי המקומי ב־Compose הוא של המשתמש ואינו חלק מתיקון QA. במהלך חידוד המסמכים נוספו מסמכי QA וקישורי כניסה בלבד, ולכן אין להעתיק את המשפט ההיסטורי "working tree מכיל רק Compose" לתיאור העץ אחרי חידוד זה.

## מה לא בוצע

כל 12 משפחות התרחישים SYS-01–SYS-08 ו־REL-01–REL-04 ב־[STD](STD.md) הן NOT_RUN. הן אינן 12 test cases אטומיים: חלקן מטריצות שיש להרחיב למופעים לפני ביצוע, ולכן אין לצרפן למכנה 46.

לא בוצעו HTTP/UI, Next proxy, authentication/authorization מערכתי, CORS/port exposure של האפליקציה, Socket.IO בדפדפן, full root/frontend suites, build/typecheck חדשים, CI מרוחק, מודל Ollama אמיתי, snapshot/restart/restore של מערכת, פריסה או post-deploy. לא נבדקה מחדש זמינות GitHub או היעדר PR קיים. לא בוצעו push, PR או merge בסבב זה.

## ממצאים והמלצה

0 failures בבדיקות שנבחרו אינם 0 תקלות במוצר. ב־[רשימת הממצאים](TRACEABILITY_AND_FINDINGS.md) מופיעים פערי Auth, proxy/UI, Realtime, יציאה חיצונית, build context ו־durability שנצפו בקוד. הם `SOURCE_OBSERVATION`, לא תקלות ששוחזרו ב־HTTP/UI בהרצה זו.

- **מותר להסיק:** הליבה הנבחרת עמדה ב־46 הבדיקות על הקלט המבודד המזוהה.
- **המלצת QA:** קבלת ראיות היחידה לסקירה והשלמת preflight/expected של G2 לפני ביצוע נוסף.
- **אסור להסיק:** RC-0 מלא עבר, משתמשי אמת מוגנים, CI ירוק, release/deploy מאושר או restore מלא הוכח.
- **סטטוס משימות:** SSA-1/SSA-2 נשארות בתהליך; השלמת דוח אינה סוגרת SSA-21 או את משימות Auth/Data/CI/Deployment.
- **החלטת שחרור:** NO_GO עד השלמת דרישות החובה. אישור מסמכים אנושי: REVIEW_PENDING.

## רישום סקירה — למילוי בידי הסוקר

```text
Submission: SSA-RC0-QA-20260827-v1
Reviewer: NOT_ASSIGNED
Review date: NOT_RECORDED
Evidence accessibility/redaction review: PENDING_FOR_TARGET_CHANNEL
Documentation disposition: REVIEW_PENDING
Comments / corrections: NOT_RECORDED
Release approval: NOT_GRANTED
Deployment approval: NOT_GRANTED
```
